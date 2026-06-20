// src/database/balanceService.js
const db = require('./db');
const { getWorkingDaysCount } = require('../utils/dateUtils');

// Current simulated date from original MVP
const CURRENT_DATE = new Date('2026-06-13T10:00:00Z');

function recalculateBalances() {
  try {
    // Get annualHolidayDays limit from settings
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'annualHolidayDays'").get();
    const totalHoliday = setting ? parseInt(setting.value) : 26;

    // Get all users
    const users = db.prepare("SELECT id, role FROM users").all();

    const updateStmt = db.prepare(`
      UPDATE users 
      SET holiday_total = ?, holiday_taken = ?, holiday_planned = ?, holiday_remaining = ?, sickness_days = ?, study_days = ?
      WHERE id = ?
    `);

    // Perform inside transaction for speed and safety
    const tx = db.transaction(() => {
      users.forEach(user => {
        if (user.role !== 'Dipendente') return;

        let taken = 0;
        let planned = 0;
        let sicknessDays = 0;
        let studyDays = 0;

        // Query all active requests (excluding rejected)
        const requests = db.prepare(`
          SELECT startDate, endDate, status, type 
          FROM holiday_requests 
          WHERE userId = ? AND status != 'Rifiutata'
        `).all(user.id);

        requests.forEach(req => {
          const diffDays = getWorkingDaysCount(req.startDate, req.endDate);

          if (req.type === 'Malattia') {
            if (req.status === 'Approvata') {
              sicknessDays += diffDays;
            }
            return;
          }
          if (req.type === 'Permesso Studio') {
            if (req.status === 'Approvata') {
              studyDays += diffDays;
            }
            return;
          }

          if (req.status === 'In attesa di approvazione') {
            planned += diffDays;
          } else if (req.status === 'Approvata') {
            const start = new Date(req.startDate);
            if (start > CURRENT_DATE) {
              planned += diffDays;
            } else {
              taken += diffDays;
            }
          }
        });

        updateStmt.run(
          totalHoliday,
          taken,
          planned,
          totalHoliday - taken - planned,
          sicknessDays,
          studyDays,
          user.id
        );
      });
    });

    tx();
  } catch (err) {
    console.error('Error recalculating balances in database:', err);
  }
}

module.exports = {
  recalculateBalances
};
