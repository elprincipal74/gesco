// src/database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', '..', 'database.db');
const legacyDbPath = path.join(__dirname, '..', '..', 'database.json');

// Initialize SQLite database
const db = new Database(dbPath);

// Enable WAL (Write-Ahead Logging) and busy timeout for concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Create tables if they do not exist
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

if (!tableExists) {
  console.log('Database non inizializzato. Creazione tabelle...');

  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      holiday_total INTEGER DEFAULT 30,
      holiday_taken INTEGER DEFAULT 0,
      holiday_planned INTEGER DEFAULT 0,
      holiday_remaining INTEGER DEFAULT 30
    )
  `);

  // 2. Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Holiday Requests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS holiday_requests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      type TEXT NOT NULL,
      attachmentName TEXT DEFAULT '',
      attachmentData TEXT DEFAULT '',
      status TEXT NOT NULL,
      rejectionReason TEXT DEFAULT '',
      approvedBy TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. Notifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      readAt TEXT DEFAULT NULL,
      createdAt TEXT NOT NULL,
      isCommunication INTEGER DEFAULT 0,
      communicationId TEXT DEFAULT NULL,
      senderId TEXT DEFAULT NULL,
      senderName TEXT DEFAULT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 5. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // 6. Monthly Reports Table (Timesheets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_reports (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Bozza',
      validatedBy TEXT DEFAULT NULL,
      rejectionReason TEXT DEFAULT NULL,
      submittedAt TEXT DEFAULT NULL,
      validatedAt TEXT DEFAULT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 7. Daily Reports Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      monthlyReportId TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      projectName TEXT DEFAULT '',
      hours REAL DEFAULT 8.0,
      notes TEXT DEFAULT '',
      FOREIGN KEY(monthlyReportId) REFERENCES monthly_reports(id) ON DELETE CASCADE
    )
  `);

  // Seeding from legacy database.json or database.json.bak if exists
  const seedPath = fs.existsSync(legacyDbPath) ? legacyDbPath : (fs.existsSync(legacyDbPath + '.bak') ? legacyDbPath + '.bak' : null);
  if (seedPath) {
    console.log(`Trovato file ${seedPath}. Avvio migrazione dati...`);
    try {
      const rawData = fs.readFileSync(seedPath, 'utf8');
      const data = JSON.parse(rawData);

      // Perform seeding in a transaction for safety and speed
      const seedTransaction = db.transaction(() => {
        // Seed Users
        if (data.users && Array.isArray(data.users)) {
          const insertUser = db.prepare(`
            INSERT INTO users (id, name, email, password, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          data.users.forEach(user => {
            const hashedPassword = bcrypt.hashSync(user.email.toLowerCase(), 10); // email as password for compatibility
            const balance = user.holidayBalance || { totalDays: 30, takenDays: 0, plannedDays: 0, remainingDays: 30 };
            const role = user.email.toLowerCase() === 'giuseppe.verdi@azienda.it' ? 'Team Leader' : user.role;
            insertUser.run(
              user.id,
              user.name,
              user.email,
              hashedPassword,
              role,
              user.phone || '',
              user.address || '',
              user.iban || '',
              balance.totalDays,
              balance.takenDays,
              balance.plannedDays,
              balance.remainingDays
            );
          });
        }

        // Seed Holiday Requests
        if (data.holidayRequests && Array.isArray(data.holidayRequests)) {
          const insertReq = db.prepare(`
            INSERT INTO holiday_requests (id, userId, userName, startDate, endDate, type, attachmentName, attachmentData, status, rejectionReason, approvedBy, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          data.holidayRequests.forEach(req => {
            insertReq.run(
              req.id,
              req.userId,
              req.userName,
              req.startDate,
              req.endDate,
              req.type || 'Ferie',
              req.attachmentName || '',
              req.attachmentData || '',
              req.status,
              req.rejectionReason || '',
              req.approvedBy || '',
              req.createdAt
            );
          });
        }

        // Seed Notifications
        if (data.notifications && Array.isArray(data.notifications)) {
          const insertNotif = db.prepare(`
            INSERT INTO notifications (id, userId, message, read, readAt, createdAt, isCommunication, communicationId, senderId, senderName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          data.notifications.forEach(n => {
            insertNotif.run(
              n.id,
              n.userId,
              n.message,
              n.read ? 1 : 0,
              n.readAt || null,
              n.createdAt,
              n.isCommunication ? 1 : 0,
              n.communicationId || null,
              n.senderId || null,
              n.senderName || null
            );
          });
        }

        // Seed Settings
        if (data.settings) {
          const insertSetting = db.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
          `);
          Object.entries(data.settings).forEach(([key, value]) => {
            insertSetting.run(key, String(value));
          });
        }
      });

      seedTransaction();
      console.log('Migrazione completata con successo!');
      
      // Rename legacy database.json to backup if we read from it
      if (seedPath === legacyDbPath) {
        fs.renameSync(legacyDbPath, legacyDbPath + '.bak');
        console.log('File database.json rinominato in database.json.bak.');
      }
    } catch (err) {
      console.error('Errore durante la migrazione dei dati:', err);
    }
    db.exec(`
      INSERT INTO settings (key, value) VALUES ('annualHolidayDays', '30'), ('maxStudyLeaveDays', '3')
      ON CONFLICT DO NOTHING;
    `);
  }
}

function resetDatabase() {
  const backupPath = path.join(__dirname, '..', '..', 'database.json.bak');
  const backupPathAlternative = path.join(__dirname, '..', '..', 'database.json');
  
  let rawData = '';
  if (fs.existsSync(backupPath)) {
    rawData = fs.readFileSync(backupPath, 'utf8');
  } else if (fs.existsSync(backupPathAlternative)) {
    rawData = fs.readFileSync(backupPathAlternative, 'utf8');
  } else {
    throw new Error('Backup file database.json.bak not found');
  }
  
  const data = JSON.parse(rawData);
  
  db.transaction(() => {
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM holiday_requests').run();
    db.prepare('DELETE FROM daily_reports').run();
    db.prepare('DELETE FROM monthly_reports').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM settings').run();
    
    // Seed Users
    if (data.users && Array.isArray(data.users)) {
      const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.users.forEach(user => {
        const hashedPassword = bcrypt.hashSync(user.email.toLowerCase(), 10);
        const balance = user.holidayBalance || { totalDays: 30, takenDays: 0, plannedDays: 0, remainingDays: 30 };
        const role = user.email.toLowerCase() === 'giuseppe.verdi@azienda.it' ? 'Team Leader' : user.role;
        insertUser.run(
          user.id,
          user.name,
          user.email,
          hashedPassword,
          role,
          user.phone || '',
          user.address || '',
          user.iban || '',
          balance.totalDays,
          balance.takenDays,
          balance.plannedDays,
          balance.remainingDays
        );
      });
    }

    // Seed Holiday Requests
    if (data.holidayRequests && Array.isArray(data.holidayRequests)) {
      const insertReq = db.prepare(`
        INSERT INTO holiday_requests (id, userId, userName, startDate, endDate, type, attachmentName, attachmentData, status, rejectionReason, approvedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.holidayRequests.forEach(req => {
        insertReq.run(
          req.id,
          req.userId,
          req.userName,
          req.startDate,
          req.endDate,
          req.type || 'Ferie',
          req.attachmentName || '',
          req.attachmentData || '',
          req.status,
          req.rejectionReason || '',
          req.approvedBy || '',
          req.createdAt
        );
      });
    }

    // Seed Notifications
    if (data.notifications && Array.isArray(data.notifications)) {
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, userId, message, read, readAt, createdAt, isCommunication, communicationId, senderId, senderName)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.notifications.forEach(n => {
        insertNotif.run(
          n.id,
          n.userId,
          n.message,
          n.read ? 1 : 0,
          n.readAt || null,
          n.createdAt,
          n.isCommunication ? 1 : 0,
          n.communicationId || null,
          n.senderId || null,
          n.senderName || null
        );
      });
    }

    // Seed Settings
    if (data.settings) {
      const insertSetting = db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
      `);
      Object.entries(data.settings).forEach(([key, value]) => {
        insertSetting.run(key, String(value));
      });
    }
  })();
}

db.resetDatabase = resetDatabase;
module.exports = db;

