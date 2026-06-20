// src/middlewares/authMiddleware.js
const db = require('../database/db');

// Middleware to authenticate user via session cookie
async function authenticate(req, res, next) {
  const sessionId = req.cookies.session_id;
  if (!sessionId) {
    req.user = null;
    return next();
  }

  try {
    const session = db.prepare('SELECT userId, expiresAt FROM sessions WHERE id = ?').get(sessionId);
    if (!session) {
      res.clearCookie('session_id');
      req.user = null;
      return next();
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      res.clearCookie('session_id');
      req.user = null;
      return next();
    }

    // Fetch user details
    const user = db.prepare(`
      SELECT id, name, email, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining, sickness_days, study_days
      FROM users WHERE id = ?
    `).get(session.userId);

    if (!user) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      res.clearCookie('session_id');
      req.user = null;
      return next();
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      iban: user.iban,
      holidayBalance: {
        totalDays: user.holiday_total,
        takenDays: user.holiday_taken,
        plannedDays: user.holiday_planned,
        remainingDays: user.holiday_remaining,
        sicknessDays: user.sickness_days || 0,
        studyDays: user.study_days || 0
      }
    };

    next();
  } catch (err) {
    console.error('Session authentication error:', err);
    req.user = null;
    next();
  }
}

// Middleware to enforce authentication
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Accesso negato. È richiesto il login.' });
  }
  next();
}

// Middleware to restrict access to specific roles
function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Accesso negato. È richiesto il login.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Non autorizzato. Permessi insufficienti.' });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireAuth,
  requireRoles
};
