// src/controllers/userController.js
const db = require('../database/db');
const { recalculateBalances } = require('../database/balanceService');

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
      holidayBalance: u.role === 'Dipendente' ? {
        totalDays: u.holiday_total,
        takenDays: u.holiday_taken,
        plannedDays: u.holiday_planned,
        remainingDays: u.holiday_remaining
      } : null
    }));
    
    res.json(mappedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Errore interno del server durante il caricamento utenti' });
  }
}

// PUT /api/users/:id
function updateProfile(req, res) {
  const { id } = req.params;
  const { name, email, phone, address, iban } = req.body;
  
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
      db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, phone = ?, address = ?, iban = ?
        WHERE id = ?
      `).run(name, email, phone || '', address || '', iban || '', id);
      
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
      holidayBalance: updatedUser.role === 'Dipendente' ? {
        totalDays: updatedUser.holiday_total,
        takenDays: updatedUser.holiday_taken,
        plannedDays: updatedUser.holiday_planned,
        remainingDays: updatedUser.holiday_remaining
      } : null
    };
    
    // If the user updated their own profile, we should return the updated details
    res.json({ message: 'Dati personali aggiornati con successo', user: userPayload });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'aggiornamento del profilo' });
  }
}

module.exports = {
  getUsers,
  updateProfile
};
