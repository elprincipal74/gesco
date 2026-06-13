// src/controllers/notificationController.js
const db = require('../database/db');

// GET /api/notifications/:userId
function getUserNotifications(req, res) {
  const { userId } = req.params;
  
  // Security check: users can only fetch their own notifications unless Admin/HR
  if (req.user.role !== 'Admin' && req.user.role !== 'HR' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Non autorizzato a visualizzare le notifiche di altri.' });
  }
  
  try {
    const notifs = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC').all(userId);
    const mapped = notifs.map(n => ({
      id: n.id,
      userId: n.userId,
      message: n.message,
      read: n.read === 1,
      readAt: n.readAt,
      createdAt: n.createdAt,
      isCommunication: n.isCommunication === 1,
      communicationId: n.communicationId,
      senderId: n.senderId,
      senderName: n.senderName
    }));
    
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Errore interno del server durante il caricamento notifiche' });
  }
}

// POST /api/notifications/read-all
function readAllNotifications(req, res) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserId mancante" });
  
  // Security check
  if (req.user.role !== 'Admin' && req.user.role !== 'HR' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Non autorizzato.' });
  }
  
  try {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE notifications 
      SET read = 1, readAt = ? 
      WHERE userId = ? AND isCommunication = 0 AND read = 0
    `).run(now, userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error reading all notifications:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

// POST /api/notifications/:id/read
function readSingleNotification(req, res) {
  const { id } = req.params;
  
  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!notif) {
      return res.status(404).json({ error: 'Notifica non trovata.' });
    }
    
    // Security check: users can only mark their own notifications as read
    if (notif.userId !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questa notifica.' });
    }
    
    if (notif.read === 0) {
      const now = new Date().toISOString();
      db.prepare('UPDATE notifications SET read = 1, readAt = ? WHERE id = ?').run(now, id);
    }
    
    const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    res.json({ 
      success: true, 
      notification: {
        ...updated,
        read: updated.read === 1,
        isCommunication: updated.isCommunication === 1
      } 
    });
  } catch (err) {
    console.error('Error reading single notification:', err);
    res.status(500).json({ error: 'Errore interno del server durante la conferma lettura' });
  }
}

module.exports = {
  getUserNotifications,
  readAllNotifications,
  readSingleNotification
};
