const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.json');

// Helper to format date as DD/MM/YYYY
function formatDateIt(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Helper to calculate Easter Sunday (local time)
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Helper to check if a Date is an Italian national holiday
function isItalianHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate(); // 1-indexed
  
  // Fixed Italian national holidays
  const fixedHolidays = [
    { m: 0, d: 1 },   // 1 Jan: Capodanno
    { m: 0, d: 6 },   // 6 Jan: Epifania
    { m: 3, d: 25 },  // 25 Apr: Festa della Liberazione
    { m: 4, d: 1 },   // 1 May: Festa del Lavoro
    { m: 5, d: 2 },   // 2 Jun: Festa della Repubblica
    { m: 7, d: 15 },  // 15 Aug: Ferragosto
    { m: 10, d: 1 },  // 1 Nov: Tutti i Santi
    { m: 11, d: 8 },  // 8 Dec: Immacolata Concezione
    { m: 11, d: 25 }, // 25 Dec: Natale
    { m: 11, d: 26 }  // 26 Dec: Santo Stefano
  ];
  
  const isFixed = fixedHolidays.some(h => h.m === month && h.d === day);
  if (isFixed) return true;
  
  // Variable holiday: Easter Monday (Lunedì dell'Angelo)
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter.getTime() + 24 * 60 * 60 * 1000);
  
  if (month === easterMonday.getMonth() && day === easterMonday.getDate()) {
    return true;
  }
  
  return false;
}

// Helper to count working days in an interval (excludes weekends and holidays)
function getWorkingDaysCount(startDateStr, endDateStr) {
  let count = 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
  
  let current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    if (!isWeekend && !isItalianHoliday(current)) {
      count++;
    }
    
    // Increment by 1 day
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Helper to read DB
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file', err);
    return { users: [], holidayRequests: [], notifications: [] };
  }
}

// Helper to write DB
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing database file', err);
  }
}

// Current simulated date: 13 June 2026
const CURRENT_DATE = new Date('2026-06-13T10:00:00Z');

// Dynamic Recalculation of User Balances
function recalculateBalances(db) {
  const totalHoliday = (db.settings && db.settings.annualHolidayDays) || 26;

  db.users.forEach(user => {
    if (user.role !== 'Dipendente') return;
    
    let taken = 0;
    let planned = 0;
    
    db.holidayRequests.forEach(req => {
      if (req.userId !== user.id) return;
      if (req.status === 'Rifiutata') return;
      // Malattia and Permesso Studio do not deduct from holiday balance
      if (req.type === 'Malattia' || req.type === 'Permesso Studio') return;
      
      const diffDays = getWorkingDaysCount(req.startDate, req.endDate);
      
      if (req.status === 'In attesa di approvazione') {
        planned += diffDays;
      } else if (req.status === 'Approvata') {
        // If start date is in the future relative to CURRENT_DATE, it is planned.
        // Otherwise, it is taken.
        const start = new Date(req.startDate);
        if (start > CURRENT_DATE) {
          planned += diffDays;
        } else {
          taken += diffDays;
        }
      }
    });
    
    user.holidayBalance = {
      totalDays: totalHoliday,
      takenDays: taken,
      plannedDays: planned,
      remainingDays: totalHoliday - taken - planned
    };
  });
}

// Helper to read DB and update balances automatically
function getDB() {
  const db = readDB();
  if (!db.settings) {
    db.settings = {
      annualHolidayDays: 26,
      maxStudyLeaveDays: 5
    };
  }
  recalculateBalances(db);
  return db;
}

// API Endpoints

// 0. Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username e password sono richiesti." });
  }
  
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === cleanUsername);
  
  if (!user) {
    return res.status(401).json({ error: "Credenziali non valide. Utente non trovato." });
  }
  
  if (cleanPassword !== user.email) {
    return res.status(401).json({ error: "Credenziali non valide. Per questo MVP la password deve essere uguale all'email." });
  }
  
  res.json({ message: "Login effettuato con successo", user });
});

// 1. Get all users
app.get('/api/users', (req, res) => {
  const db = getDB();
  res.json(db.users);
});

// 1.1 Update user profile details
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, iban } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: "Nome ed Email sono obbligatori." });
  }
  
  const db = getDB();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Utente non trovato." });
  }
  
  const oldName = user.name;
  user.name = name;
  user.email = email;
  user.phone = phone || "";
  user.address = address || "";
  user.iban = iban || "";
  
  // Update userName in all requests belonging to this user
  if (oldName !== name) {
    db.holidayRequests.forEach(req => {
      if (req.userId === id) {
        req.userName = name;
      }
    });
  }
  
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Dati personali aggiornati con successo", user });
});

// 2. Get all requests
app.get('/api/requests', (req, res) => {
  const db = getDB();
  res.json(db.holidayRequests);
});

// 3. Get notifications for a user
app.get('/api/notifications/:userId', (req, res) => {
  const db = getDB();
  const userNotifs = db.notifications.filter(n => n.userId === req.params.userId);
  res.json(userNotifs.reverse()); // latest first
});

// 4. Mark notifications as read (except communications which need explicit confirmation)
app.post('/api/notifications/read-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "UserId mancante" });
  
  const db = getDB();
  db.notifications.forEach(n => {
    if (n.userId === userId && !n.isCommunication) {
      if (!n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
      }
    }
  });
  writeDB(db);
  res.json({ success: true });
});

// 4.1 Mark a single notification as read (with readAt timestamp)
app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const notif = db.notifications.find(n => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: "Notifica non trovata." });
  }
  
  if (!notif.read) {
    notif.read = true;
    notif.readAt = new Date().toISOString();
    writeDB(db);
  }
  
  res.json({ success: true, notification: notif });
});

// 4.2 Send communication to all users (Admin/HR only)
app.post('/api/communications', (req, res) => {
  const { senderId, message } = req.body;
  if (!senderId || !message) {
    return res.status(400).json({ error: "Mittente e messaggio sono obbligatori." });
  }
  
  const cleanMessage = message.trim();
  if (cleanMessage.length === 0) {
    return res.status(400).json({ error: "Il messaggio non può essere vuoto." });
  }
  if (cleanMessage.length > 500) {
    return res.status(400).json({ error: "Il messaggio supera il limite consentito di 500 caratteri." });
  }
  
  const db = getDB();
  const sender = db.users.find(u => u.id === senderId);
  if (!sender || (sender.role !== 'Admin' && sender.role !== 'HR')) {
    return res.status(403).json({ error: "Non autorizzato. Solo Admin e HR possono inviare comunicazioni." });
  }
  
  const communicationId = 'comm-' + Date.now();
  const createdAt = new Date().toISOString();
  
  // Broadcast to all users (excluding the sender)
  const recipients = db.users.filter(u => u.id !== senderId);
  recipients.forEach(user => {
    db.notifications.push({
      id: `notif-${communicationId}-${user.id}`,
      userId: user.id,
      message: cleanMessage,
      read: false,
      readAt: null,
      createdAt: createdAt,
      isCommunication: true,
      communicationId: communicationId,
      senderId: senderId,
      senderName: sender.name
    });
  });
  
  writeDB(db);
  res.json({ message: "Comunicazione inviata con successo", communicationId });
});

// 4.3 Get communications list with read confirmation stats (Admin/HR only)
app.get('/api/communications', (req, res) => {
  const db = getDB();
  const commsMap = {};
  
  db.notifications.forEach(n => {
    if (n.isCommunication && n.communicationId) {
      const cId = n.communicationId;
      const user = db.users.find(u => u.id === n.userId);
      const recipientInfo = {
        userId: n.userId,
        userName: user ? user.name : n.userId,
        userRole: user ? user.role : 'Dipendente',
        read: n.read,
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
    }
  });
  
  const communications = Object.values(commsMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(communications);
});

// 5. Create new holiday request
app.post('/api/requests', (req, res) => {
  const { userId, startDate, endDate, type, attachmentName, attachmentData } = req.body;
  if (!userId || !startDate || !endDate) {
    return res.status(400).json({ error: "Tutti i campi (userId, startDate, endDate) sono obbligatori." });
  }
  
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Utente non trovato." });
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return res.status(400).json({ error: "Date non valide. La data di inizio deve precedere la data di fine." });
  }
  
  const diffDays = getWorkingDaysCount(startDate, endDate);
  
  const requestType = type || "Ferie";
  
  
  // Sickness leave attachment is optional

  // Validate balance (only for Ferie requests)
  if (requestType === "Ferie" && user.holidayBalance.remainingDays < diffDays) {
    return res.status(400).json({ 
      error: `Saldo ferie insufficiente. Richiesti: ${diffDays} giorni, disponibili: ${user.holidayBalance.remainingDays} giorni.` 
    });
  }

  // Validate study leave limit
  if (requestType === "Permesso Studio") {
    const maxStudy = (db.settings && db.settings.maxStudyLeaveDays) || 5;
    if (diffDays > maxStudy) {
      return res.status(400).json({ 
        error: `La richiesta di Permesso Studio supera il limite massimo consentito di ${maxStudy} giorni lavorativi.` 
      });
    }
  }
  
  const newRequest = {
    id: 'req-' + Date.now(),
    userId,
    userName: user.name,
    startDate,
    endDate,
    type: requestType,
    attachmentName: attachmentName || "",
    attachmentData: attachmentData || "",
    status: "In attesa di approvazione",
    rejectionReason: "",
    createdAt: new Date().toISOString()
  };
  
  db.holidayRequests.push(newRequest);
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Richiesta inviata con successo", request: newRequest });
});

// 6. Edit pending holiday request
app.put('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const { endDate } = req.body;
  
  if (!endDate) {
    return res.status(400).json({ error: "La data di fine è obbligatoria per la modifica." });
  }
  
  const db = getDB();
  const request = db.holidayRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: "Richiesta non trovata." });
  }
  
  if (request.status !== "In attesa di approvazione") {
    return res.status(400).json({ error: "È possibile modificare solo richieste in attesa di approvazione." });
  }
  
  const start = new Date(request.startDate);
  const newEnd = new Date(endDate);
  if (isNaN(newEnd.getTime()) || start > newEnd) {
    return res.status(400).json({ error: "Data di fine non valida." });
  }
  
  const originalEndDate = request.endDate;
  request.endDate = endDate;
  
  // Recalculate and verify limits based on type
  if (request.type === "Ferie") {
    recalculateBalances(db);
    const user = db.users.find(u => u.id === request.userId);
    if (user && user.holidayBalance.remainingDays < 0) {
      // Revert changes
      request.endDate = originalEndDate;
      recalculateBalances(db);
      return res.status(400).json({ error: "Modifica fallita: saldo residuo insufficiente." });
    }
  } else if (request.type === "Permesso Studio") {
    const diffDays = getWorkingDaysCount(request.startDate, request.endDate);
    const maxStudy = (db.settings && db.settings.maxStudyLeaveDays) || 5;
    if (diffDays > maxStudy) {
      request.endDate = originalEndDate;
      return res.status(400).json({ error: `Modifica fallita: la richiesta supera il limite massimo di ${maxStudy} giorni lavorativi per Permesso Studio.` });
    }
  }
  
  writeDB(db);
  res.json({ message: "Richiesta modificata con successo", request });
});

// 7. Delete/Cancel holiday request
app.delete('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const reqIndex = db.holidayRequests.findIndex(r => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({ error: "Richiesta non trovata." });
  }
  
  const request = db.holidayRequests[reqIndex];
  const wasApproved = request.status === "Approvata";
  
  db.holidayRequests.splice(reqIndex, 1);
  
  if (wasApproved) {
    const message = `Il dipendente ${request.userName} ha annullato la richiesta di ferie precedentemente approvata dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)}.`;
    
    // Notify Admin
    db.notifications.push({
      id: 'notif-' + Date.now() + '-admin',
      userId: 'admin-1',
      message: message,
      read: false,
      createdAt: new Date().toISOString()
    });
    
    // Notify HR
    db.notifications.push({
      id: 'notif-' + Date.now() + '-hr',
      userId: 'hr-1',
      message: message,
      read: false,
      createdAt: new Date().toISOString()
    });
  }
  
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Richiesta cancellata con successo e giorni riaccreditati." });
});

// 8. Approve holiday request
app.post('/api/requests/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approverId } = req.body;
  
  const db = getDB();
  
  // Find approver and check role
  const approver = db.users.find(u => u.id === approverId);
  if (!approver || (approver.role !== 'Admin' && approver.role !== 'HR')) {
    return res.status(403).json({ error: "Non autorizzato. Solo Admin e HR possono approvare richieste." });
  }

  const request = db.holidayRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: "Richiesta non trovata." });
  }
  
  request.status = "Approvata";
  request.rejectionReason = "";
  request.approvedBy = `${approver.name} (${approver.role})`;
  
  // Create notification
  const newNotif = {
    id: 'notif-' + Date.now(),
    userId: request.userId,
    message: `La tua richiesta di ferie dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)} è stata approvata da ${request.approvedBy}.`,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(newNotif);
  
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Richiesta approvata con successo", request });
});

// 9. Reject holiday request
app.post('/api/requests/:id/reject', (req, res) => {
  const { id } = req.params;
  const { reason, approverId } = req.body;
  
  if (!reason || reason.trim() === "") {
    return res.status(400).json({ error: "La motivazione del rifiuto è obbligatoria." });
  }
  
  const db = getDB();

  // Find approver and check role
  const approver = db.users.find(u => u.id === approverId);
  if (!approver || (approver.role !== 'Admin' && approver.role !== 'HR')) {
    return res.status(403).json({ error: "Non autorizzato. Solo Admin e HR possono rifiutare richieste." });
  }

  const request = db.holidayRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: "Richiesta non trovata." });
  }
  
  request.status = "Rifiutata";
  request.rejectionReason = reason;
  request.approvedBy = `${approver.name} (${approver.role})`;
  
  // Create notification
  const newNotif = {
    id: 'notif-' + Date.now(),
    userId: request.userId,
    message: `La tua richiesta di ferie dal ${formatDateIt(request.startDate)} al ${formatDateIt(request.endDate)} è stata rifiutata da ${request.approvedBy}. Motivazione: ${reason}`,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(newNotif);
  
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Richiesta rifiutata con successo", request });
});


// 10. Get settings
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json(db.settings);
});

// 11. Update settings
app.post('/api/settings', (req, res) => {
  const { annualHolidayDays, maxStudyLeaveDays, userId } = req.body;
  
  const db = getDB();
  
  // Verify user role is Admin or HR
  const user = db.users.find(u => u.id === userId);
  if (!user || (user.role !== 'Admin' && user.role !== 'HR')) {
    return res.status(403).json({ error: "Non autorizzato. Solo Admin e HR possono modificare le impostazioni." });
  }
  
  const hLimit = parseInt(annualHolidayDays);
  const sLimit = parseInt(maxStudyLeaveDays);
  
  if (isNaN(hLimit) || hLimit <= 0 || isNaN(sLimit) || sLimit <= 0) {
    return res.status(400).json({ error: "I valori inseriti devono essere numeri positivi." });
  }
  
  db.settings = {
    annualHolidayDays: hLimit,
    maxStudyLeaveDays: sLimit
  };
  
  recalculateBalances(db);
  writeDB(db);
  
  res.json({ message: "Impostazioni salvate con successo.", settings: db.settings });
});


// Serve frontend build static files in production
const frontendBuildPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
