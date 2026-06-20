// src/controllers/absenceTypeController.js
const db = require('../database/db');

// GET /api/absence-types
function getAbsenceTypes(req, res) {
  try {
    const types = db.prepare('SELECT * FROM absence_types ORDER BY name ASC').all();
    res.json(types);
  } catch (err) {
    console.error('Error fetching absence types:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero delle assenze' });
  }
}

// POST /api/absence-types
function createAbsenceType(req, res) {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Il nome del tipo di assenza è obbligatorio.' });
  }

  try {
    const id = 'abs-' + Date.now();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO absence_types (id, name, description, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), description || '', createdAt);

    const newType = db.prepare('SELECT * FROM absence_types WHERE id = ?').get(id);
    res.status(201).json({ message: 'Tipo di assenza creato con successo', absenceType: newType });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Esiste già un tipo di assenza con questo nome.' });
    }
    console.error('Error creating absence type:', err);
    res.status(500).json({ error: 'Errore interno del server durante la creazione del tipo di assenza' });
  }
}

// PUT /api/absence-types/:id
function updateAbsenceType(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Il nome del tipo di assenza è obbligatorio.' });
  }

  try {
    const type = db.prepare('SELECT * FROM absence_types WHERE id = ?').get(id);
    if (!type) {
      return res.status(404).json({ error: 'Tipo di assenza non trovato.' });
    }

    db.prepare(`
      UPDATE absence_types
      SET name = ?, description = ?
      WHERE id = ?
    `).run(name.trim(), description || '', id);

    const updatedType = db.prepare('SELECT * FROM absence_types WHERE id = ?').get(id);
    res.json({ message: 'Tipo di assenza aggiornato con successo', absenceType: updatedType });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Esiste già un altro tipo di assenza con questo nome.' });
    }
    console.error('Error updating absence type:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'aggiornamento del tipo di assenza' });
  }
}

// DELETE /api/absence-types/:id
function deleteAbsenceType(req, res) {
  const { id } = req.params;

  try {
    const type = db.prepare('SELECT * FROM absence_types WHERE id = ?').get(id);
    if (!type) {
      return res.status(404).json({ error: 'Tipo di assenza non trovato.' });
    }

    db.prepare('DELETE FROM absence_types WHERE id = ?').run(id);
    res.json({ message: 'Tipo di assenza eliminato con successo' });
  } catch (err) {
    console.error('Error deleting absence type:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'eliminazione del tipo di assenza' });
  }
}

module.exports = {
  getAbsenceTypes,
  createAbsenceType,
  updateAbsenceType,
  deleteAbsenceType
};
