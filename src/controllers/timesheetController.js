// src/controllers/timesheetController.js
const db = require('../database/db');

const MONTHS_IT = [
  "", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// GET /api/timesheets/my-month
function getMyMonth(req, res) {
  const userId = req.user.id;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

  try {
    const reportId = `mr-${userId}-${year}-${month}`;
    const monthlyReport = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(reportId);

    if (!monthlyReport) {
      return res.json({
        id: "",
        userId: userId,
        userName: req.user.name,
        year: year,
        month: month,
        status: "Bozza",
        validatedBy: null,
        rejectionReason: null,
        days: []
      });
    }

    const days = db.prepare('SELECT * FROM daily_reports WHERE monthlyReportId = ?').all(reportId);
    monthlyReport.days = days;

    res.json(monthlyReport);
  } catch (err) {
    console.error('Error fetching timesheet:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero del rapportino' });
  }
}

// POST /api/timesheets/save
function saveTimesheet(req, res) {
  const userId = req.user.id;
  const { year, month, days } = req.body;

  try {
    const reportId = `mr-${userId}-${year}-${month}`;
    let monthlyReport = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(reportId);

    if (monthlyReport && (monthlyReport.status === 'Inviato' || monthlyReport.status === 'Approvato')) {
      return res.status(400).json({ error: 'Non è possibile modificare un rapportino già inviato o approvato.' });
    }

    const nowStr = new Date().toISOString();

    const saveTx = db.transaction(() => {
      // Create monthly report if it does not exist
      if (!monthlyReport) {
        db.prepare(`
          INSERT INTO monthly_reports (id, userId, userName, year, month, status, validatedBy, rejectionReason, submittedAt, validatedAt, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'Bozza', NULL, NULL, NULL, NULL, ?, ?)
        `).run(reportId, userId, req.user.name, year, month, nowStr, nowStr);
      } else {
        db.prepare(`
          UPDATE monthly_reports 
          SET status = 'Bozza', rejectionReason = NULL, validatedBy = NULL, updatedAt = ? 
          WHERE id = ?
        `).run(nowStr, reportId);
      }

      // Delete existing daily reports
      db.prepare('DELETE FROM daily_reports WHERE monthlyReportId = ?').run(reportId);

      // Insert new daily reports
      const insertDaily = db.prepare(`
        INSERT INTO daily_reports (id, monthlyReportId, date, type, projectName, hours, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      days.forEach(day => {
        const dailyId = `dr-${userId}-${day.date}`;
        insertDaily.run(
          dailyId,
          reportId,
          day.date,
          day.type,
          day.projectName || '',
          day.hours || 0,
          day.notes || ''
        );
      });
    });

    saveTx();

    // Fetch and return the updated timesheet
    const updatedReport = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(reportId);
    const updatedDays = db.prepare('SELECT * FROM daily_reports WHERE monthlyReportId = ?').all(reportId);
    updatedReport.days = updatedDays;

    res.json({ message: 'Rapportino salvato con successo in bozza', timesheet: updatedReport });
  } catch (err) {
    console.error('Error saving timesheet:', err);
    res.status(500).json({ error: 'Errore interno del server durante il salvataggio del rapportino' });
  }
}

// POST /api/timesheets/submit
function submitTimesheet(req, res) {
  const userId = req.user.id;
  const { year, month } = req.body;

  try {
    const reportId = `mr-${userId}-${year}-${month}`;
    const monthlyReport = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(reportId);

    if (!monthlyReport) {
      return res.status(404).json({ error: 'Nessuna bozza di rapportino trovata per questo mese. Salva prima di inviare.' });
    }

    if (monthlyReport.status === 'Inviato' || monthlyReport.status === 'Approvato') {
      return res.status(400).json({ error: 'Il rapportino è già stato inviato o approvato.' });
    }

    const nowStr = new Date().toISOString();
    db.prepare(`
      UPDATE monthly_reports 
      SET status = 'Inviato', submittedAt = ?, updatedAt = ? 
      WHERE id = ?
    `).run(nowStr, nowStr, reportId);

    res.json({ message: 'Rapportino inviato con successo per l\'approvazione' });
  } catch (err) {
    console.error('Error submitting timesheet:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'invio del rapportino' });
  }
}

// GET /api/timesheets/pending
function getPendingTimesheets(req, res) {
  try {
    // Team Leader, HR and Admin can read all pending timesheets
    const pendingReports = db.prepare(`
      SELECT * FROM monthly_reports 
      WHERE status = 'Inviato' 
      ORDER BY year DESC, month DESC, userName ASC
    `).all();

    pendingReports.forEach(report => {
      report.days = db.prepare('SELECT * FROM daily_reports WHERE monthlyReportId = ?').all(report.id);
    });

    res.json(pendingReports);
  } catch (err) {
    console.error('Error fetching pending timesheets:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero dei rapportini pendenti' });
  }
}

// POST /api/timesheets/:id/approve
function approveTimesheet(req, res) {
  const { id } = req.params;
  const validator = `${req.user.name} (${req.user.role})`;

  try {
    const report = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ error: 'Rapportino non trovato.' });
    }

    if (report.status !== 'Inviato') {
      return res.status(400).json({ error: 'È possibile approvare solo rapportini in stato "Inviato".' });
    }

    const nowStr = new Date().toISOString();

    const approveTx = db.transaction(() => {
      db.prepare(`
        UPDATE monthly_reports 
        SET status = 'Approvato', validatedBy = ?, validatedAt = ?, updatedAt = ? 
        WHERE id = ?
      `).run(validator, nowStr, nowStr, id);

      // Create notification for employee
      const notifId = 'notif-' + Date.now();
      const monthName = MONTHS_IT[report.month] || report.month;
      const message = `Il tuo rapportino per il mese di ${monthName} ${report.year} è stato approvato da ${validator}.`;
      db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt)
        VALUES (?, ?, ?, 0, NULL, ?)
      `).run(notifId, report.userId, message, nowStr);
    });

    approveTx();

    res.json({ message: 'Rapportino approvato con successo' });
  } catch (err) {
    console.error('Error approving timesheet:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'approvazione' });
  }
}

// POST /api/timesheets/:id/reject
function rejectTimesheet(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const validator = `${req.user.name} (${req.user.role})`;

  try {
    const report = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ error: 'Rapportino non trovato.' });
    }

    if (report.status !== 'Inviato') {
      return res.status(400).json({ error: 'È possibile rifiutare solo rapportini in stato "Inviato".' });
    }

    const nowStr = new Date().toISOString();

    const rejectTx = db.transaction(() => {
      db.prepare(`
        UPDATE monthly_reports 
        SET status = 'Rifiutato', validatedBy = ?, rejectionReason = ?, validatedAt = ?, updatedAt = ? 
        WHERE id = ?
      `).run(validator, reason, nowStr, nowStr, id);

      // Create notification for employee
      const notifId = 'notif-' + Date.now();
      const monthName = MONTHS_IT[report.month] || report.month;
      const message = `Il tuo rapportino per il mese di ${monthName} ${report.year} è stato rifiutato da ${validator}. Motivazione: ${reason}`;
      db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt)
        VALUES (?, ?, ?, 0, NULL, ?)
      `).run(notifId, report.userId, message, nowStr);
    });

    rejectTx();

    res.json({ message: 'Rapportino rifiutato con successo' });
  } catch (err) {
    console.error('Error rejecting timesheet:', err);
    res.status(500).json({ error: 'Errore interno del server durante il rifiuto' });
  }
}

module.exports = {
  getMyMonth,
  saveTimesheet,
  submitTimesheet,
  getPendingTimesheets,
  approveTimesheet,
  rejectTimesheet
};
