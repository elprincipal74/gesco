// src/controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// POST /api/login
function login(req, res) {
  const { username, password } = req.body;
  const cleanUsername = username.trim().toLowerCase();
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide. Utente non trovato." });
    }
    
    const isPasswordCorrect = bcrypt.compareSync(password.trim(), user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "Credenziali non valide. Password errata." });
    }
    
    // Generate secure session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Save session to database
    db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)').run(
      sessionId,
      user.id,
      expiresAt.toISOString()
    );
    
    // Set cookie
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: false, // Set to true in production if HTTPS is configured
      sameSite: 'lax',
      expires: expiresAt
    });
    
    // Return user info (excluding password hash)
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      iban: user.iban || '',
      holidayBalance: {
        totalDays: user.holiday_total,
        takenDays: user.holiday_taken,
        plannedDays: user.holiday_planned,
        remainingDays: user.holiday_remaining,
        sicknessDays: user.sickness_days || 0,
        studyDays: user.study_days || 0
      }
    };
    
    res.json({ message: "Login effettuato con successo", user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Errore interno del server durante il login' });
  }
}

// POST /api/logout
function logout(req, res) {
  const sessionId = req.cookies.session_id;
  if (sessionId) {
    try {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    } catch (err) {
      console.error('Logout session delete error:', err);
    }
  }
  
  res.clearCookie('session_id');
  res.json({ message: "Disconnessione effettuata con successo" });
}

// GET /api/me
function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Utente non loggato" });
  }
  res.json(req.user);
}

module.exports = {
  login,
  logout,
  getMe
};
