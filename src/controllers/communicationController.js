// src/controllers/communicationController.js
const db = require('../database/db');

// POST /api/communications
function sendCommunication(req, res) {
  const { message } = req.body;
  const senderId = req.user.id;
  
  if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
    return res.status(403).json({ error: 'Non autorizzato. Solo Admin e HR possono inviare comunicazioni.' });
  }
  
  const cleanMessage = message.trim();
  
  try {
    const communicationId = 'comm-' + Date.now();
    const createdAt = new Date().toISOString();
    
    // Get all users except the sender
    const recipients = db.prepare('SELECT id FROM users WHERE id != ?').all(senderId);
    
    // Broadcast notifications in a transaction
    const broadcastTx = db.transaction(() => {
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt, isCommunication, communicationId, senderId, senderName)
        VALUES (?, ?, ?, 0, NULL, ?, 1, ?, ?, ?)
      `);
      
      recipients.forEach(user => {
        const notifId = `notif-${communicationId}-${user.id}`;
        insertNotif.run(
          notifId,
          user.id,
          cleanMessage,
          createdAt,
          communicationId,
          senderId,
          req.user.name
        );
      });
    });
    
    broadcastTx();
    
    res.json({ message: 'Comunicazione inviata con successo', communicationId });
  } catch (err) {
    console.error('Error sending communication:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'invio della comunicazione' });
  }
}

// GET /api/communications
function getCommunications(req, res) {
  if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
    return res.status(403).json({ error: 'Non autorizzato.' });
  }
  
  try {
    // Fetch all users to map names and roles efficiently
    const users = db.prepare('SELECT id, name, role FROM users').all();
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = { name: u.name, role: u.role };
    });
    
    // Fetch all communication notifications
    const notifs = db.prepare('SELECT * FROM notifications WHERE isCommunication = 1').all();
    
    const commsMap = {};
    notifs.forEach(n => {
      const cId = n.communicationId;
      if (!cId) return;
      
      const recipientUser = userMap[n.userId] || { name: n.userId, role: 'Dipendente' };
      const recipientInfo = {
        userId: n.userId,
        userName: recipientUser.name,
        userRole: recipientUser.role,
        read: n.read === 1,
        readAt: n.readAt || null
      };
      
      if (!commsMap[cId]) {
        commsMap[cId] = {
          communicationId: cId,
          message: n.message,
          createdAt: n.createdAt,
          senderId: n.senderId,
          senderName: n.senderName || 'Sistema',
          recipients: []
        };
      }
      commsMap[cId].recipients.push(recipientInfo);
    });
    
    const communications = Object.values(commsMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(communications);
  } catch (err) {
    console.error('Error fetching communications list:', err);
    res.status(500).json({ error: 'Errore interno del server durante il caricamento dello storico' });
  }
}

module.exports = {
  sendCommunication,
  getCommunications
};
