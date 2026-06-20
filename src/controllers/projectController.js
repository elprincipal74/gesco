// src/controllers/projectController.js
const db = require('../database/db');

// GET /api/projects
function getProjects(req, res) {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero delle commesse' });
  }
}

// POST /api/projects
function createProject(req, res) {
  const { name, description, sale_price, margin, start_date, end_date, responsible, project_manager } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Il nome della commessa è obbligatorio.' });
  }

  try {
    const id = 'proj-' + Date.now();
    const createdAt = new Date().toISOString();
    const salePriceVal = parseFloat(sale_price) || 0.0;
    const marginVal = parseFloat(margin) || 0.0;

    db.prepare(`
      INSERT INTO projects (id, name, description, sale_price, margin, start_date, end_date, responsible, project_manager, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      name.trim(), 
      description || '', 
      salePriceVal, 
      marginVal, 
      start_date || '', 
      end_date || '', 
      responsible || '', 
      project_manager || '', 
      createdAt
    );

    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ message: 'Commessa creata con successo', project: newProject });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Esiste già una commessa con questo nome.' });
    }
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Errore interno del server durante la creazione della commessa' });
  }
}

// PUT /api/projects/:id
function updateProject(req, res) {
  const { id } = req.params;
  const { name, description, sale_price, margin, start_date, end_date, responsible, project_manager } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Il nome della commessa è obbligatorio.' });
  }

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Commessa non trovata.' });
    }

    const salePriceVal = parseFloat(sale_price) || 0.0;
    const marginVal = parseFloat(margin) || 0.0;

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, sale_price = ?, margin = ?, start_date = ?, end_date = ?, responsible = ?, project_manager = ?
      WHERE id = ?
    `).run(
      name.trim(), 
      description || '', 
      salePriceVal, 
      marginVal, 
      start_date || '', 
      end_date || '', 
      responsible || '', 
      project_manager || '', 
      id
    );

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json({ message: 'Commessa aggiornata con successo', project: updatedProject });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Esiste già un\'altra commessa con questo nome.' });
    }
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'aggiornamento della commessa' });
  }
}

// DELETE /api/projects/:id
function deleteProject(req, res) {
  const { id } = req.params;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Commessa non trovata.' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ message: 'Commessa eliminata con successo' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'eliminazione della commessa' });
  }
}

// GET /api/users/:id/projects
function getUserProjects(req, res) {
  const { id: userId } = req.params;

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Collaboratore non trovato.' });
    }

    const rows = db.prepare('SELECT projectId FROM user_projects WHERE userId = ?').all(userId);
    const projectIds = rows.map(r => r.projectId);
    res.json(projectIds);
  } catch (err) {
    console.error('Error fetching user projects:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero delle commesse dell\'utente' });
  }
}

// POST /api/users/:id/projects
function setUserProjects(req, res) {
  const { id: userId } = req.params;
  const { projectIds } = req.body;

  if (!Array.isArray(projectIds)) {
    return res.status(400).json({ error: 'Il corpo della richiesta deve contenere un array di projectIds.' });
  }

  // Deduplicate project IDs to avoid primary key violations
  const uniqueProjectIds = [...new Set(projectIds)];

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Collaboratore non trovato.' });
    }

    const setTx = db.transaction(() => {
      db.prepare('DELETE FROM user_projects WHERE userId = ?').run(userId);
      const insert = db.prepare('INSERT INTO user_projects (userId, projectId) VALUES (?, ?)');
      for (const projId of uniqueProjectIds) {
        insert.run(userId, projId);
      }
    });

    setTx();
    res.json({ message: 'Commesse assegnate con successo al collaboratore' });
  } catch (err) {
    console.error('Error setting user projects:', err);
    res.status(500).json({ error: 'Errore interno del server durante l\'assegnazione delle commesse' });
  }
}

// GET /api/my-projects
function getMyProjects(req, res) {
  const userId = req.user.id;

  try {
    const myProjects = db.prepare(`
      SELECT p.* 
      FROM projects p
      JOIN user_projects up ON p.id = up.projectId
      WHERE up.userId = ?
      ORDER BY p.name ASC
    `).all(userId);

    res.json(myProjects);
  } catch (err) {
    console.error('Error fetching my projects:', err);
    res.status(500).json({ error: 'Errore interno del server durante il recupero delle tue commesse' });
  }
}

// GET /api/reports/projects
function getProjectHoursReport(req, res) {
  try {
    // 1. Get all projects from projects table
    const projects = db.prepare('SELECT * FROM projects ORDER BY name ASC').all();

    // 2. Query total hours per project from daily_reports
    const totalHoursRows = db.prepare(`
      SELECT dr.projectName, SUM(dr.hours) as totalHours
      FROM daily_reports dr
      JOIN monthly_reports mr ON dr.monthlyReportId = mr.id
      WHERE dr.projectName IS NOT NULL AND dr.projectName != ''
      GROUP BY dr.projectName
    `).all();

    // 3. Query breakdown by employee
    const breakdownRows = db.prepare(`
      SELECT dr.projectName, mr.userId, mr.userName, SUM(dr.hours) as totalHours
      FROM daily_reports dr
      JOIN monthly_reports mr ON dr.monthlyReportId = mr.id
      WHERE dr.projectName IS NOT NULL AND dr.projectName != ''
      GROUP BY dr.projectName, mr.userId, mr.userName
    `).all();

    // Compile reports
    const reportMap = {};

    // Initialize map with projects from database
    projects.forEach(p => {
      reportMap[p.name] = {
        projectId: p.id,
        projectName: p.name,
        description: p.description,
        totalHours: 0,
        breakdown: []
      };
    });

    // Populate total hours
    totalHoursRows.forEach(row => {
      if (!reportMap[row.projectName]) {
        // Legacy or manual entry project name
        reportMap[row.projectName] = {
          projectId: '',
          projectName: row.projectName,
          description: 'Inserito manualmente o legacy',
          totalHours: 0,
          breakdown: []
        };
      }
      reportMap[row.projectName].totalHours = row.totalHours;
    });

    // Populate breakdown
    breakdownRows.forEach(row => {
      if (reportMap[row.projectName]) {
        reportMap[row.projectName].breakdown.push({
          userId: row.userId,
          userName: row.userName,
          hours: row.totalHours
        });
      }
    });

    const reportList = Object.values(reportMap).sort((a, b) => b.totalHours - a.totalHours);
    res.json(reportList);
  } catch (err) {
    console.error('Error compiling project hours report:', err);
    res.status(500).json({ error: 'Errore interno del server durante la compilazione del report commesse' });
  }
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getUserProjects,
  setUserProjects,
  getMyProjects,
  getProjectHoursReport
};
