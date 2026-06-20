// src/controllers/userController.js
const db = require('../database/db');
const { recalculateBalances } = require('../database/balanceService');
const bcrypt = require('bcryptjs');

// GET /api/users
function getUsers(req, res) {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    const mappedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      address: u.address || '',
      iban: u.iban || '',
      internal_cost: u.internal_cost || 0.0,
      corporate_level: u.corporate_level || '',
      holidayBalance: (u.role === 'Dipendente' || u.role === 'Team Leader') ? {
        totalDays: u.holiday_total,
        takenDays: u.holiday_taken,
        plannedDays: u.holiday_planned,
        remainingDays: u.holiday_remaining,
        sicknessDays: u.sickness_days || 0,
        studyDays: u.study_days || 0
      } : null
    }));
    
    res.json(mappedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Errore interno del server durante il caricamento utenti' });
  }
}

// POST /api/users
function createUser(req, res) {
  const { name, email, password, role, phone, address, iban, internal_cost, corporate_level, holiday_total } = req.body;

  try {
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Un utente con questo indirizzo email esiste già.' });
    }

    const id = 'usr-' + Date.now();
    const hashedPassword = bcrypt.hashSync(password.trim(), 10);
    const holidayTotalVal = parseInt(holiday_total) || 30;

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining, sickness_days, study_days, internal_cost, corporate_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, ?, ?)
    `).run(
      id,
      name.trim(),
      email.trim(),
      hashedPassword,
      role,
      phone || '',
      address || '',
      iban || '',
      holidayTotalVal,
      holidayTotalVal, // holiday_remaining initially matches total
      parseFloat(internal_cost) || 0.0,
      corporate_level || ''
    );

    recalculateBalances();

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const mapped = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone || '',
      address: newUser.address || '',
      iban: newUser.iban || '',
      internal_cost: newUser.internal_cost || 0.0,
      corporate_level: newUser.corporate_level || '',
      holidayBalance: (newUser.role === 'Dipendente' || newUser.role === 'Team Leader') ? {
        totalDays: newUser.holiday_total,
        takenDays: newUser.holiday_taken,
        plannedDays: newUser.holiday_planned,
        remainingDays: newUser.holiday_remaining,
        sicknessDays: newUser.sickness_days || 0,
        studyDays: newUser.study_days || 0
      } : null
    };

    res.status(201).json({ message: 'Collaboratore creato con successo', user: mapped });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Errore interno del server durante la creazione del collaboratore' });
  }
}

// PUT /api/users/:id
function updateProfile(req, res) {
  const { id } = req.params;
  const { name, email, phone, address, iban, role, internal_cost, corporate_level, holiday_total, password } = req.body;
  
  // Security check: users can only update their own profile unless they are Admin/HR
  if (req.user.role !== 'Admin' && req.user.role !== 'HR' && req.user.id !== id) {
    return res.status(403).json({ error: 'Non autorizzato ad aggiornare il profilo di altri utenti.' });
  }
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }
    
    const oldName = user.name;
    
    // Update user in a transaction
    const updateTx = db.transaction(() => {
      if (req.user.role === 'Admin' || req.user.role === 'HR') {
        let query = `
          UPDATE users 
          SET name = ?, email = ?, phone = ?, address = ?, iban = ?, role = ?, internal_cost = ?, corporate_level = ?, holiday_total = ?
        `;
        const params = [name, email, phone || '', address || '', iban || '', role, parseFloat(internal_cost) || 0.0, corporate_level || '', parseInt(holiday_total) || 30];
        
        if (password && password.trim() !== '') {
          query += `, password = ?`;
          params.push(bcrypt.hashSync(password.trim(), 10));
        }
        
        query += ` WHERE id = ?`;
        params.push(id);
        
        db.prepare(query).run(...params);
      } else {
        db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, phone = ?, address = ?, iban = ?
          WHERE id = ?
        `).run(name, email, phone || '', address || '', iban || '', id);
      }
      
      // Cascade name change to holiday requests
      if (oldName !== name) {
        db.prepare('UPDATE holiday_requests SET userName = ? WHERE userId = ?').run(name, id);
      }
    });
    
    updateTx();
    recalculateBalances();
    
    // Fetch updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const userPayload = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone || '',
      address: updatedUser.address || '',
      iban: updatedUser.iban || '',
      internal_cost: updatedUser.internal_cost || 0.0,
      corporate_level: updatedUser.corporate_level || '',
      holidayBalance: (updatedUser.role === 'Dipendente' || updatedUser.role === 'Team Leader') ? {
        totalDays: updatedUser.holiday_total,
        takenDays: updatedUser.holiday_taken,
        plannedDays: updatedUser.holiday_planned,
        remainingDays: updatedUser.holiday_remaining,
        sicknessDays: updatedUser.sickness_days || 0,
        studyDays: updatedUser.study_days || 0
      } : null
    };
    
    res.json({ message: 'Dati personali aggiornati con successo', user: userPayload });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'aggiornamento del profilo' });
  }
}

// DELETE /api/users/:id
function deleteUser(req, res) {
  const { id } = req.params;

  try {
    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Collaboratore non trovato.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    recalculateBalances();

    res.json({ message: `Collaboratore ${user.name} eliminato con successo` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'eliminazione del collaboratore' });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateProfile,
  deleteUser
};
