// src/controllers/requestController.js
const db = require('../database/db');
const { getWorkingDaysCount, formatDateIt } = require('../utils/dateUtils');
const { recalculateBalances } = require('../database/balanceService');

// GET /api/requests
function getRequests(req, res) {
  try {
    const requests = db.prepare('SELECT * FROM holiday_requests ORDER BY createdAt DESC').all();
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Errore interno del server durante il caricamento delle richieste' });
  }
}

// POST /api/requests
function createRequest(req, res) {
  const { startDate, endDate, type, attachmentName, attachmentData } = req.body;
  const userId = req.user.id;
  
  if (req.user.role !== 'Dipendente') {
    return res.status(400).json({ error: 'Solo i Dipendenti possono inserire richieste di assenza.' });
  }
  
  try {
    const diffDays = getWorkingDaysCount(startDate, endDate);
    
    if (diffDays === 0) {
      return res.status(400).json({ error: 'L\'intervallo selezionato non contiene giorni lavorativi.' });
    }
    
    const requestType = type || 'Ferie';
    
    // Check balance if type is Ferie
    if (requestType === 'Ferie' && req.user.holidayBalance.remainingDays < diffDays) {
      return res.status(400).json({ 
        error: `Saldo ferie insufficiente. Richiesti: ${diffDays} giorni, disponibili: ${req.user.holidayBalance.remainingDays} giorni.` 
      });
    }
    
    // Check study limit if type is Permesso Studio
    if (requestType === 'Permesso Studio') {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'maxStudyLeaveDays'").get();
      const maxStudy = setting ? parseInt(setting.value) : 5;
      
      if (diffDays > maxStudy) {
        return res.status(400).json({ 
          error: `La richiesta di Permesso Studio supera il limite massimo consentito di ${maxStudy} giorni lavorativi.` 
        });
      }
    }
    
    const requestId = 'req-' + Date.now();
    const createdAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO holiday_requests (id, userId, userName, startDate, endDate, type, attachmentName, attachmentData, status, rejectionReason, approvedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId,
      userId,
      req.user.name,
      startDate,
      endDate,
      requestType,
      attachmentName || '',
      attachmentData || '',
      'In attesa di approvazione',
      '',
      '',
      createdAt
    );
    
    recalculateBalances();
    
    // Fetch newly created request
    const newRequest = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(requestId);
    res.json({ message: 'Richiesta inviata con successo', request: newRequest });
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'invio della richiesta' });
  }
}

// PUT /api/requests/:id
function editRequest(req, res) {
  const { id } = req.params;
  const { endDate } = req.body;
  
  try {
    const request = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata.' });
    }
    
    if (request.status !== 'In attesa di approvazione') {
      return res.status(400).json({ error: 'È possibile modificare solo richieste in attesa di approvazione.' });
    }
    
    // Verify owner
    if (req.user.role !== 'Admin' && req.user.role !== 'HR' && request.userId !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questa richiesta.' });
    }
    
    const start = new Date(request.startDate);
    const newEnd = new Date(endDate);
    if (isNaN(newEnd.getTime()) || start > newEnd) {
      return res.status(400).json({ error: 'Data di fine non valida.' });
    }
    
    const originalEndDate = request.endDate;
    
    // Update request
    db.prepare('UPDATE holiday_requests SET endDate = ? WHERE id = ?').run(endDate, id);
    
    // Recalculate and verify bounds
    recalculateBalances();
    
    // Fetch updated requester balance details
    const requester = db.prepare('SELECT role, holiday_remaining FROM users WHERE id = ?').get(request.userId);
    
    if (request.type === 'Ferie' && requester && requester.holiday_remaining < 0) {
      // Revert change
      db.prepare('UPDATE holiday_requests SET endDate = ? WHERE id = ?').run(originalEndDate, id);
      recalculateBalances();
      return res.status(400).json({ error: 'Modifica fallita: saldo residuo insufficiente.' });
    } else if (request.type === 'Permesso Studio') {
      const diffDays = getWorkingDaysCount(request.startDate, endDate);
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'maxStudyLeaveDays'").get();
      const maxStudy = setting ? parseInt(setting.value) : 5;
      
      if (diffDays > maxStudy) {
        db.prepare('UPDATE holiday_requests SET endDate = ? WHERE id = ?').run(originalEndDate, id);
        recalculateBalances();
        return res.status(400).json({ error: `Modifica fallita: la richiesta supera il limite massimo di ${maxStudy} giorni lavorativi per Permesso Studio.` });
      }
    }
    
    const updatedRequest = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    res.json({ message: 'Richiesta modificata con successo', request: updatedRequest });
  } catch (err) {
    console.error('Error editing request:', err);
    res.status(500).json({ error: 'Errore interno del server durante la modifica della richiesta' });
  }
}

// DELETE /api/requests/:id
function deleteRequest(req, res) {
  const { id } = req.params;
  
  try {
    const request = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata.' });
    }
    
    // Allow cancellation by request owner or Admin/HR
    if (req.user.role !== 'Admin' && req.user.role !== 'HR' && request.userId !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato a cancellare questa richiesta.' });
    }
    
    const wasApproved = request.status === 'Approvata';
    
    // Delete from db
    db.prepare('DELETE FROM holiday_requests WHERE id = ?').run(id);
    
    // If it was already approved, notify Admins and HRs
    if (wasApproved) {
      const message = `Il dipendente ${request.userName} ha annullato la richiesta di ferie precedentemente approvata dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)}.`;
      const createdAt = new Date().toISOString();
      
      const adminHrs = db.prepare("SELECT id FROM users WHERE role = 'Admin' OR role = 'HR'").all();
      
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt)
        VALUES (?, ?, ?, 0, NULL, ?)
      `);
      
      adminHrs.forEach(adminHr => {
        const notifId = `notif-${Date.now()}-${adminHr.id}`;
        insertNotif.run(notifId, adminHr.id, message, createdAt);
      });
    }
    
    recalculateBalances();
    res.json({ message: 'Richiesta cancellata con successo e giorni riaccreditati.' });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ error: 'Errore interno del server durante la cancellazione' });
  }
}

// POST /api/requests/:id/approve
function approveRequest(req, res) {
  const { id } = req.params;
  const approverId = req.user.id;
  
  if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
    return res.status(403).json({ error: 'Non autorizzato. Solo Admin e HR possono approvare richieste.' });
  }
  
  try {
    const request = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata.' });
    }
    
    const approvedBy = `${req.user.name} (${req.user.role})`;
    
    const approveTx = db.transaction(() => {
      db.prepare(`
        UPDATE holiday_requests 
        SET status = 'Approvata', approvedBy = ?, rejectionReason = ''
        WHERE id = ?
      `).run(approvedBy, id);
      
      // Create notification for requester
      const notifId = 'notif-' + Date.now();
      const message = `La tua richiesta di ferie dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)} è stata approvata da ${approvedBy}.`;
      db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt)
        VALUES (?, ?, ?, 0, NULL, ?)
      `).run(notifId, request.userId, message, new Date().toISOString());
    });
    
    approveTx();
    recalculateBalances();
    
    const updatedRequest = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    res.json({ message: 'Richiesta approvata con successo', request: updatedRequest });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'approvazione' });
  }
}

// POST /api/requests/:id/reject
function rejectRequest(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const approverId = req.user.id;
  
  if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
    return res.status(403).json({ error: 'Non autorizzato. Solo Admin e HR possono rifiutare richieste.' });
  }
  
  try {
    const request = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata.' });
    }
    
    const approvedBy = `${req.user.name} (${req.user.role})`;
    
    const rejectTx = db.transaction(() => {
      db.prepare(`
        UPDATE holiday_requests 
        SET status = 'Rifiutata', approvedBy = ?, rejectionReason = ?
        WHERE id = ?
      `).run(approvedBy, reason, id);
      
      // Create notification for requester
      const notifId = 'notif-' + Date.now();
      const message = `La tua richiesta di ferie dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)} è stata rifiutata da ${approvedBy}. Motivazione: ${reason}`;
      db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt)
        VALUES (?, ?, ?, 0, NULL, ?)
      `).run(notifId, request.userId, message, new Date().toISOString());
    });
    
    rejectTx();
    recalculateBalances();
    
    const updatedRequest = db.prepare('SELECT * FROM holiday_requests WHERE id = ?').get(id);
    res.json({ message: 'Richiesta rifiutata con successo', request: updatedRequest });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ error: 'Errore interno del server durante il rifiuto' });
  }
}

module.exports = {
  getRequests,
  createRequest,
  editRequest,
  deleteRequest,
  approveRequest,
  rejectRequest
};
