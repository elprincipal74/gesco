// src/database/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database.db');
const legacyDbPath = process.env.LEGACY_DB_PATH || path.join(__dirname, '..', '..', 'database.json');

// Initialize SQLite database
const db = new Database(dbPath);

// Enable WAL (Write-Ahead Logging) and busy timeout for concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

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
      holiday_remaining INTEGER DEFAULT 30,
      sickness_days INTEGER DEFAULT 0,
      study_days INTEGER DEFAULT 0,
      internal_cost REAL DEFAULT 0.0,
      corporate_level TEXT DEFAULT ''
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

  // 8. Projects Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      sale_price REAL DEFAULT 0.0,
      margin REAL DEFAULT 0.0,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      responsible TEXT DEFAULT '',
      project_manager TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `);

  // 9. User Projects Table (Association)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_projects (
      userId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      PRIMARY KEY(userId, projectId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 9.1 Project Expenses Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_expenses (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 10. Absence Types Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS absence_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL
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
            INSERT INTO users (id, name, email, password, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining, sickness_days, study_days, internal_cost, corporate_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          data.users.forEach(user => {
            const hashedPassword = bcrypt.hashSync(user.email.toLowerCase(), 10); // email as password for compatibility
            const balance = user.holidayBalance || { totalDays: 30, takenDays: 0, plannedDays: 0, remainingDays: 30, sicknessDays: 0, studyDays: 0 };
            const role = user.email.toLowerCase() === 'giuseppe.verdi@azienda.it' ? 'Team Leader' : user.role;
            let costVal = user.internal_cost || 0.0;
            if (costVal === 0.0 || costVal === 0) {
              if (user.email.toLowerCase() === 'mario.rossi@azienda.it') costVal = 120.0;
              else if (user.email.toLowerCase() === 'luigi.bianchi@azienda.it') costVal = 100.0;
              else if (user.email.toLowerCase() === 'giuseppe.verdi@azienda.it') costVal = 150.0;
              else if (user.email.toLowerCase() === 'admin@azienda.it') costVal = 200.0;
              else if (user.email.toLowerCase() === 'hr@azienda.it') costVal = 140.0;
            }
            let levelVal = user.corporate_level || '';
            if (!levelVal) {
              if (user.email.toLowerCase() === 'mario.rossi@azienda.it') levelVal = 'A1';
              else if (user.email.toLowerCase() === 'luigi.bianchi@azienda.it') levelVal = 'B1';
              else if (user.email.toLowerCase() === 'giuseppe.verdi@azienda.it') levelVal = 'TL';
              else if (user.email.toLowerCase() === 'admin@azienda.it') levelVal = 'ADM';
              else if (user.email.toLowerCase() === 'hr@azienda.it') levelVal = 'HR';
            }
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
              balance.remainingDays,
              balance.sicknessDays || 0,
              balance.studyDays || 0,
              costVal,
              levelVal
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

        // Seed default projects
        const defaultProjects = [
          { id: 'proj-1', name: 'Progetto Alpha', description: 'Sviluppo software core' },
          { id: 'proj-2', name: 'Progetto Beta', description: 'Attività di manutenzione e R&D' },
          { id: 'proj-3', name: 'Attività Interne', description: 'Attività interne generali' }
        ];
        
        const insertProject = db.prepare(`
          INSERT INTO projects (id, name, description, createdAt)
          VALUES (?, ?, ?, ?)
        `);
        
        const nowStr = new Date().toISOString();
        defaultProjects.forEach(p => {
          insertProject.run(p.id, p.name, p.description, nowStr);
        });

        // Assign all default projects to all seeded users
        if (data.users && Array.isArray(data.users)) {
          const insertUserProj = db.prepare(`
            INSERT INTO user_projects (userId, projectId)
            VALUES (?, ?)
          `);
          data.users.forEach(user => {
            defaultProjects.forEach(p => {
              insertUserProj.run(user.id, p.id);
            });
          });
        }

        // Seed default absence types
        const defaultAbsences = [
          { id: 'abs-1', name: 'Ferie', description: 'Ferie annuali' },
          { id: 'abs-2', name: 'Malattia', description: 'Giorni di malattia' },
          { id: 'abs-3', name: 'Permesso Studio', description: 'Permesso per studio/esami' },
          { id: 'abs-4', name: 'Assenza Generica', description: 'Altro tipo di assenza' }
        ];
        const insertAbsence = db.prepare(`
          INSERT INTO absence_types (id, name, description, createdAt)
          VALUES (?, ?, ?, ?)
        `);
        defaultAbsences.forEach(a => {
          insertAbsence.run(a.id, a.name, a.description, nowStr);
        });
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
      INSERT INTO settings (key, value) VALUES ('annualHolidayDays', '26'), ('maxStudyLeaveDays', '5')
      ON CONFLICT DO NOTHING;
    `);
  }
}

function resetDatabase() {
  const backupPath = process.env.BACKUP_DB_PATH || path.join(__dirname, '..', '..', 'database.json.bak');
  const backupPathAlternative = process.env.LEGACY_DB_PATH || path.join(__dirname, '..', '..', 'database.json');
  
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
    db.prepare('DELETE FROM user_projects').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM absence_types').run();
    db.prepare('DELETE FROM project_expenses').run();
    
    // Seed Users
    if (data.users && Array.isArray(data.users)) {
      const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password, role, phone, address, iban, holiday_total, holiday_taken, holiday_planned, holiday_remaining, sickness_days, study_days, internal_cost, corporate_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.users.forEach(user => {
        const hashedPassword = bcrypt.hashSync(user.email.toLowerCase(), 10);
        const balance = user.holidayBalance || { totalDays: 30, takenDays: 0, plannedDays: 0, remainingDays: 30, sicknessDays: 0, studyDays: 0 };
        const role = user.email.toLowerCase() === 'giuseppe.verdi@azienda.it' ? 'Team Leader' : user.role;
        let costVal = user.internal_cost || 0.0;
        if (costVal === 0.0 || costVal === 0) {
          if (user.email.toLowerCase() === 'mario.rossi@azienda.it') costVal = 120.0;
          else if (user.email.toLowerCase() === 'luigi.bianchi@azienda.it') costVal = 100.0;
          else if (user.email.toLowerCase() === 'giuseppe.verdi@azienda.it') costVal = 150.0;
          else if (user.email.toLowerCase() === 'admin@azienda.it') costVal = 200.0;
          else if (user.email.toLowerCase() === 'hr@azienda.it') costVal = 140.0;
        }
        let levelVal = user.corporate_level || '';
        if (!levelVal) {
          if (user.email.toLowerCase() === 'mario.rossi@azienda.it') levelVal = 'A1';
          else if (user.email.toLowerCase() === 'luigi.bianchi@azienda.it') levelVal = 'B1';
          else if (user.email.toLowerCase() === 'giuseppe.verdi@azienda.it') levelVal = 'TL';
          else if (user.email.toLowerCase() === 'admin@azienda.it') levelVal = 'ADM';
          else if (user.email.toLowerCase() === 'hr@azienda.it') levelVal = 'HR';
        }
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
          balance.remainingDays,
          balance.sicknessDays || 0,
          balance.studyDays || 0,
          costVal,
          levelVal
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

    // Seed default projects
    const defaultProjects = [
      { id: 'proj-1', name: 'Progetto Alpha', description: 'Sviluppo software core' },
      { id: 'proj-2', name: 'Progetto Beta', description: 'Attività di manutenzione e R&D' },
      { id: 'proj-3', name: 'Attività Interne', description: 'Attività interne generali' }
    ];
    
    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, description, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    
    const nowStr = new Date().toISOString();
    defaultProjects.forEach(p => {
      insertProject.run(p.id, p.name, p.description, nowStr);
    });

    // Assign all default projects to all seeded users
    if (data.users && Array.isArray(data.users)) {
      const insertUserProj = db.prepare(`
        INSERT INTO user_projects (userId, projectId)
        VALUES (?, ?)
      `);
      data.users.forEach(user => {
        defaultProjects.forEach(p => {
          insertUserProj.run(user.id, p.id);
        });
      });
    }

    // Seed default absence types
    const defaultAbsences = [
      { id: 'abs-1', name: 'Ferie', description: 'Ferie annuali' },
      { id: 'abs-2', name: 'Malattia', description: 'Giorni di malattia' },
      { id: 'abs-3', name: 'Permesso Studio', description: 'Permesso per studio/esami' },
      { id: 'abs-4', name: 'Assenza Generica', description: 'Altro tipo di assenza' }
    ];
    const insertAbsence = db.prepare(`
      INSERT INTO absence_types (id, name, description, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    defaultAbsences.forEach(a => {
      insertAbsence.run(a.id, a.name, a.description, nowStr);
    });
  })();

  const { recalculateBalances } = require('./balanceService');
  recalculateBalances();
}

// Dynamic migrations for existing databases
try {
  db.prepare("SELECT sickness_days FROM users LIMIT 1").get();
} catch (err) {
  console.log("Aggiunta colonna sickness_days alla tabella users...");
  try {
    db.exec("ALTER TABLE users ADD COLUMN sickness_days INTEGER DEFAULT 0");
  } catch (alterErr) {
    console.error("Errore nell'aggiunta di sickness_days:", alterErr);
  }
}

try {
  db.prepare("SELECT study_days FROM users LIMIT 1").get();
} catch (err) {
  console.log("Aggiunta colonna study_days alla tabella users...");
  try {
    db.exec("ALTER TABLE users ADD COLUMN study_days INTEGER DEFAULT 0");
  } catch (alterErr) {
    console.error("Errore nell'aggiunta di study_days:", alterErr);
  }
}

// Migration for projects and user_projects tables in existing databases
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_projects (
      userId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      PRIMARY KEY(userId, projectId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
} catch (err) {
  console.error("Errore durante la creazione delle tabelle progetti nei database esistenti:", err);
}

// Migration for absence_types table in existing databases
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS absence_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `);
  // check if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM absence_types").get().count;
  if (count === 0) {
    const defaultAbsences = [
      { id: 'abs-1', name: 'Ferie', description: 'Ferie annuali' },
      { id: 'abs-2', name: 'Malattia', description: 'Giorni di malattia' },
      { id: 'abs-3', name: 'Permesso Studio', description: 'Permesso per studio/esami' },
      { id: 'abs-4', name: 'Assenza Generica', description: 'Altro tipo di assenza' }
    ];
    const insertAbsence = db.prepare(`
      INSERT INTO absence_types (id, name, description, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    const nowStr = new Date().toISOString();
    defaultAbsences.forEach(a => {
      insertAbsence.run(a.id, a.name, a.description, nowStr);
    });
  }
} catch (err) {
  console.error("Errore durante la creazione della tabella absence_types nei database esistenti:", err);
}

// Migrazione colonne per i prezzi e margini delle commesse
try {
  db.prepare("SELECT sale_price FROM projects LIMIT 1").get();
} catch (err) {
  console.log("Aggiunta colonne sale_price e margin alla tabella projects...");
  try {
    db.exec("ALTER TABLE projects ADD COLUMN sale_price REAL DEFAULT 0.0");
    db.exec("ALTER TABLE projects ADD COLUMN margin REAL DEFAULT 0.0");
  } catch (alterErr) {
    console.error("Errore nell'aggiunta di sale_price e margin a projects:", alterErr);
  }
}

// Migrazione colonne per il costo interno e il livello aziendale dei dipendenti
try {
  db.prepare("SELECT internal_cost FROM users LIMIT 1").get();
} catch (err) {
  console.log("Aggiunta colonne internal_cost e corporate_level alla tabella users...");
  try {
    db.exec("ALTER TABLE users ADD COLUMN internal_cost REAL DEFAULT 0.0");
    db.exec("ALTER TABLE users ADD COLUMN corporate_level TEXT DEFAULT ''");
  } catch (alterErr) {
    console.error("Errore nell'aggiunta di internal_cost e corporate_level a users:", alterErr);
  }
}

// Migrazione colonne temporali e gestionali alla tabella projects per database esistenti
try {
  db.prepare("SELECT start_date FROM projects LIMIT 1").get();
} catch (err) {
  console.log("Aggiunta colonne temporali e gestionali alla tabella projects...");
  try {
    db.exec("ALTER TABLE projects ADD COLUMN start_date TEXT DEFAULT ''");
    db.exec("ALTER TABLE projects ADD COLUMN end_date TEXT DEFAULT ''");
    db.exec("ALTER TABLE projects ADD COLUMN responsible TEXT DEFAULT ''");
    db.exec("ALTER TABLE projects ADD COLUMN project_manager TEXT DEFAULT ''");
  } catch (alterErr) {
    console.error("Errore nell'aggiunta di colonne temporali e gestionali a projects:", alterErr);
  }
}

// Migrazione per la tabella project_expenses nei database esistenti
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_expenses (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
} catch (err) {
  console.error("Errore durante la creazione della tabella project_expenses nei database esistenti:", err);
}

db.resetDatabase = resetDatabase;
module.exports = db;

