// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authenticate, requireAuth, requireRoles } = require('./middlewares/authMiddleware');
const { validate } = require('./middlewares/validationMiddleware');

const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const requestController = require('./controllers/requestController');
const notificationController = require('./controllers/notificationController');
const communicationController = require('./controllers/communicationController');
const timesheetController = require('./controllers/timesheetController');
const projectController = require('./controllers/projectController');
const absenceTypeController = require('./controllers/absenceTypeController');

const db = require('./database/db');
const { recalculateBalances } = require('./database/balanceService');

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Support base64 file attachments
app.use(cookieParser());

// Apply global session authentication middleware
app.use(authenticate);

// --- API ROUTES ---

// Test Reset Endpoint
app.post('/api/test/reset', (req, res) => {
  try {
    db.resetDatabase();
    res.json({ message: 'Database resettato con successo.' });
  } catch (err) {
    console.error('Error resetting database:', err);
    res.status(500).json({ error: 'Errore durante il reset del database' });
  }
});

// 0. Auth / Sessions
app.post('/api/login', validate('login'), authController.login);
app.post('/api/logout', authController.logout);
app.get('/api/me', requireAuth, authController.getMe);

// 1. Users
app.get('/api/users', requireAuth, userController.getUsers);
app.put('/api/users/:id', requireAuth, validate('profileUpdate'), userController.updateProfile);

// 2. Requests
app.get('/api/requests', requireAuth, requestController.getRequests);
app.post('/api/requests', requireAuth, validate('requestCreate'), requestController.createRequest);
app.put('/api/requests/:id', requireAuth, validate('requestEdit'), requestController.editRequest);
app.delete('/api/requests/:id', requireAuth, requestController.deleteRequest);

// 2.1 Approvals
app.post('/api/requests/:id/approve', requireAuth, requireRoles(['Admin', 'HR']), requestController.approveRequest);
app.post('/api/requests/:id/reject', requireAuth, requireRoles(['Admin', 'HR']), validate('rejectRequest'), requestController.rejectRequest);

// 3. Notifications
app.get('/api/notifications/:userId', requireAuth, notificationController.getUserNotifications);
app.post('/api/notifications/read-all', requireAuth, notificationController.readAllNotifications);
app.post('/api/notifications/:id/read', requireAuth, notificationController.readSingleNotification);

// 4. Communications
app.post('/api/communications', requireAuth, requireRoles(['Admin', 'HR']), validate('sendCommunication'), communicationController.sendCommunication);
app.get('/api/communications', requireAuth, requireRoles(['Admin', 'HR']), communicationController.getCommunications);

// 5. Settings
app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settingsObj = {};
    rows.forEach(r => {
      settingsObj[r.key] = parseInt(r.value) || r.value;
    });
    res.json(settingsObj);
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: 'Errore nel caricamento impostazioni' });
  }
});

app.post('/api/settings', requireAuth, requireRoles(['Admin', 'HR']), validate('saveSettings'), (req, res) => {
  const { annualHolidayDays, maxStudyLeaveDays } = req.body;
  
  try {
    const updateSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    
    db.transaction(() => {
      updateSetting.run('annualHolidayDays', String(annualHolidayDays));
      updateSetting.run('maxStudyLeaveDays', String(maxStudyLeaveDays));
    })();
    
    recalculateBalances();
    
    res.json({ 
      message: 'Impostazioni salvate con successo.', 
      settings: { annualHolidayDays, maxStudyLeaveDays } 
    });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Errore nel salvataggio delle impostazioni' });
  }
});

// 6. Timesheets (Rapportini)
app.get('/api/timesheets/my-month', requireAuth, timesheetController.getMyMonth);
app.post('/api/timesheets/save', requireAuth, validate('saveTimesheet'), timesheetController.saveTimesheet);
app.post('/api/timesheets/submit', requireAuth, timesheetController.submitTimesheet);
app.get('/api/timesheets/pending', requireAuth, requireRoles(['Admin', 'HR', 'Team Leader']), timesheetController.getPendingTimesheets);
app.post('/api/timesheets/:id/approve', requireAuth, requireRoles(['Admin', 'HR', 'Team Leader']), timesheetController.approveTimesheet);
app.post('/api/timesheets/:id/reject', requireAuth, requireRoles(['Admin', 'HR', 'Team Leader']), validate('rejectTimesheet'), timesheetController.rejectTimesheet);

// 7. Projects (Commesse)
app.get('/api/projects', requireAuth, requireRoles(['Admin', 'HR']), projectController.getProjects);
app.post('/api/projects', requireAuth, requireRoles(['Admin']), projectController.createProject);
app.put('/api/projects/:id', requireAuth, requireRoles(['Admin']), projectController.updateProject);
app.delete('/api/projects/:id', requireAuth, requireRoles(['Admin']), projectController.deleteProject);
app.get('/api/users/:id/projects', requireAuth, requireRoles(['Admin', 'HR']), projectController.getUserProjects);
app.post('/api/users/:id/projects', requireAuth, requireRoles(['Admin']), projectController.setUserProjects);
app.get('/api/my-projects', requireAuth, projectController.getMyProjects);
app.get('/api/reports/projects', requireAuth, requireRoles(['Admin', 'HR']), projectController.getProjectHoursReport);

// 8. Absence Types (Anagrafica Assenze)
app.get('/api/absence-types', requireAuth, absenceTypeController.getAbsenceTypes);
app.post('/api/absence-types', requireAuth, requireRoles(['Admin']), absenceTypeController.createAbsenceType);
app.put('/api/absence-types/:id', requireAuth, requireRoles(['Admin']), absenceTypeController.updateAbsenceType);
app.delete('/api/absence-types/:id', requireAuth, requireRoles(['Admin']), absenceTypeController.deleteAbsenceType);

// Serve frontend static files in production
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

module.exports = app;
