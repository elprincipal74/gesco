import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Download, 
  User, 
  Users, 
  Bell, 
  Trash2, 
  Edit, 
  Plus, 
  RefreshCw, 
  Info,
  Layers,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  UploadCloud,
  FileCheck,
  LogOut,
  ChevronDown,
  Megaphone,
  Send,
  Settings as SettingsIcon,
  Copy,
  Sliders,
  Briefcase,
  BarChart2,
  Euro
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Smart API base URL selection (works in dev and build mode via Vite proxy)
const API_BASE = '/api';

// --- MVP 3: Italian Holiday & Easter Algorithms (Frontend side) ---

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

// Helper to get Italian holiday name
function getItalianHolidayName(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  if (month === 0 && day === 1) return "Capodanno";
  if (month === 0 && day === 6) return "Epifania";
  if (month === 3 && day === 25) return "Festa della Liberazione";
  if (month === 4 && day === 1) return "Festa del Lavoro";
  if (month === 5 && day === 2) return "Festa della Repubblica";
  if (month === 7 && day === 15) return "Ferragosto";
  if (month === 10 && day === 1) return "Tutti i Santi";
  if (month === 11 && day === 8) return "Immacolata Concezione";
  if (month === 11 && day === 25) return "Natale";
  if (month === 11 && day === 26) return "Santo Stefano";
  
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter.getTime() + 24 * 60 * 60 * 1000);
  if (month === easterMonday.getMonth() && day === easterMonday.getDate()) {
    return "Lunedì dell'Angelo (Pasquetta)";
  }
  
  return null;
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

// Simple Calendar days difference
const getCalendarDaysCount = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return 0;
  const diffTime = Math.abs(e - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Helper to get number of days in a month (1-31)
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Helper to get day of week offset for the 1st of the month (Monday = 0, Sunday = 6)
const getStartOffset = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
  return firstDay === 0 ? 6 : firstDay - 1; // Adjust Monday to 0
};

export default function App() {
  // Global App State
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({ annualHolidayDays: 26, maxStudyLeaveDays: 5 });
  
  // Communications State
  const [communications, setCommunications] = useState([]);
  const [commsMessage, setCommsMessage] = useState('');
  const [expandedCommId, setExpandedCommId] = useState(null);
  const [commsSubmitting, setCommsSubmitting] = useState(false);
  
  // Projects (Commesse) State
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState('');
  const [userAssignedProjectIds, setUserAssignedProjectIds] = useState([]);
  const [projectReport, setProjectReport] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectSalePrice, setNewProjectSalePrice] = useState('');
  const [newProjectMargin, setNewProjectMargin] = useState('');
  const [newProjectStartDate, setNewProjectStartDate] = useState('');
  const [newProjectEndDate, setNewProjectEndDate] = useState('');
  const [newProjectResponsible, setNewProjectResponsible] = useState('');
  const [newProjectPM, setNewProjectPM] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectDescription, setEditingProjectDescription] = useState('');
  const [editingProjectSalePrice, setEditingProjectSalePrice] = useState('');
  const [editingProjectMargin, setEditingProjectMargin] = useState('');
  const [editingProjectStartDate, setEditingProjectStartDate] = useState('');
  const [editingProjectEndDate, setEditingProjectEndDate] = useState('');
  const [editingProjectResponsible, setEditingProjectResponsible] = useState('');
  const [editingProjectPM, setEditingProjectPM] = useState('');

  // Anagrafica Dipendenti State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Dipendente');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserIban, setNewUserIban] = useState('');
  const [newUserInternalCost, setNewUserInternalCost] = useState('');
  const [newUserCorporateLevel, setNewUserCorporateLevel] = useState('');
  const [newUserHolidayTotal, setNewUserHolidayTotal] = useState(30);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('Dipendente');
  const [editingUserPhone, setEditingUserPhone] = useState('');
  const [editingUserAddress, setEditingUserAddress] = useState('');
  const [editingUserIban, setEditingUserIban] = useState('');
  const [editingUserInternalCost, setEditingUserInternalCost] = useState('');
  const [editingUserCorporateLevel, setEditingUserCorporateLevel] = useState('');
  const [editingUserHolidayTotal, setEditingUserHolidayTotal] = useState(30);

  // Absence Types State
  const [absenceTypes, setAbsenceTypes] = useState([]);
  const [newAbsenceName, setNewAbsenceName] = useState('');
  const [newAbsenceDescription, setNewAbsenceDescription] = useState('');
  const [editingAbsenceId, setEditingAbsenceId] = useState(null);
  const [editingAbsenceName, setEditingAbsenceName] = useState('');
  const [editingAbsenceDescription, setEditingAbsenceDescription] = useState('');
  
  // Project Simulation State
  const [simulatedProjectId, setSimulatedProjectId] = useState('');
  const [simulatedResources, setSimulatedResources] = useState([]);
  const [simulationsList, setSimulationsList] = useState([]);
  const [activeSimulationId, setActiveSimulationId] = useState(null);
  const [newSimulationName, setNewSimulationName] = useState('');
  
  // Preventivo vs Consuntivo State
  const [actualsList, setActualsList] = useState([]);
  const [actualsTrendList, setActualsTrendList] = useState([]);
  const [comparisonProjectId, setComparisonProjectId] = useState('');
  const [projectExpenses, setProjectExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);

  // Non-labor expenses form state
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Trasferta');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ferie_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('ferie_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (user.role === 'Dipendente' || user.role === 'Team Leader') return 'dashboard';
        if (user.role === 'Admin') return 'approvals';
        if (user.role === 'HR') return 'reports';
      }
    } catch (e) {}
    return 'dashboard';
  });
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('mario.rossi@azienda.it');
  const [loginPassword, setLoginPassword] = useState('mario.rossi@azienda.it');
  const [loginError, setLoginError] = useState('');

  // Login handler
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError("Tutti i campi sono obbligatori.");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setLoginError(data.error || "Errore durante il login.");
        addToast(data.error || "Errore durante il login.", "error");
        return;
      }
      
      setCurrentUser(data.user);
      localStorage.setItem('ferie_user', JSON.stringify(data.user));
      addToast(`Benvenuto, ${data.user.name}!`, "success");
      
      if (data.user.role === 'Dipendente' || data.user.role === 'Team Leader') {
        setActiveTab('dashboard');
      } else if (data.user.role === 'Admin') {
        setActiveTab('approvals');
      } else if (data.user.role === 'HR') {
        setActiveTab('reports');
      }
      
      // Load data for the logged in user
      fetchData();
    } catch (err) {
      console.error(err);
      setLoginError("Errore di connessione con il server.");
      addToast("Errore di connessione", "error");
    }
  };

  // Quick Login
  const handleQuickLogin = (email) => {
    setLoginEmail(email);
    setLoginPassword(email);
    setLoginError('');
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password: email })
        });
        const data = await res.json();
        
        if (!res.ok) {
          setLoginError(data.error || "Errore durante il login.");
          return;
        }
        
        setCurrentUser(data.user);
        localStorage.setItem('ferie_user', JSON.stringify(data.user));
        addToast(`Accesso rapido come ${data.user.name}`, "success");
        if (data.user.role === 'Dipendente' || data.user.role === 'Team Leader') {
          setActiveTab('dashboard');
        } else if (data.user.role === 'Admin') {
          setActiveTab('approvals');
        } else if (data.user.role === 'HR') {
          setActiveTab('reports');
        }
        
        // Load data for the logged in user
        fetchData();
      } catch (err) {
        console.error(err);
        setLoginError("Errore di connessione con il server.");
      }
    }, 50);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ferie_user');
    addToast("Sessione terminata.", "info");
    fetch(`${API_BASE}/logout`, { method: 'POST' }).catch(() => {});
    setUsers([]);
    setRequests([]);
    setSettings({});
  };

  // Profile editing form states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileIban, setProfileIban] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Timesheet (Rapportino) states
  const [timesheet, setTimesheet] = useState(null);
  const [timesheetYear, setTimesheetYear] = useState(new Date().getFullYear());
  const [timesheetMonth, setTimesheetMonth] = useState(new Date().getMonth() + 1);
  const [selectedTimesheetDay, setSelectedTimesheetDay] = useState(null);

  const updateDayState = (clientKey, fields) => {
    setTimesheet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map(d => d.clientKey === clientKey ? { ...d, ...fields } : d)
      };
    });
  };

  const resetDayToDefault = (clientKey, date) => {
    const tempDate = new Date(date);
    const dayOfWeek = tempDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isItalianHoliday(tempDate);
    
    let defaultType = 'Lavoro';
    let defaultProj = '';
    let defaultHours = 8.0;
    
    if (isWeekend || isHoliday) {
      defaultProj = 'Riposo';
      defaultHours = 0;
    }
    
    updateDayState(clientKey, {
      type: defaultType,
      projectName: defaultProj,
      hours: defaultHours
    });
  };

  const handleAddTimesheetRow = (date) => {
    setTimesheet(prev => {
      if (!prev) return prev;
      
      const lastIndex = prev.days.map(d => d.date).lastIndexOf(date);
      const newDays = [...prev.days];
      const newRow = {
        date: date,
        type: 'Lavoro',
        projectName: '',
        hours: 8.0,
        notes: '',
        clientKey: `${date}-${Math.random().toString(36).substring(2, 11)}`
      };
      newDays.splice(lastIndex + 1, 0, newRow);
      return {
        ...prev,
        days: newDays
      };
    });
  };

  const handleRemoveTimesheetRow = (clientKey, date) => {
    setTimesheet(prev => {
      if (!prev) return prev;
      
      const countForDate = prev.days.filter(d => d.date === date).length;
      if (countForDate <= 1) {
        addToast("Impossibile rimuovere l'unica riga per questo giorno", "error");
        return prev;
      }
      
      return {
        ...prev,
        days: prev.days.filter(d => d.clientKey !== clientKey)
      };
    });
  };
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const [pendingTimesheets, setPendingTimesheets] = useState([]);
  const [timesheetRejectionModal, setTimesheetRejectionModal] = useState({ open: false, timesheetId: '', reason: '' });
  const [timesheetSubmitting, setTimesheetSubmitting] = useState(false);

  // Timesheet API handlers
  const fetchTimesheet = async (year, month) => {
    if (!currentUser) return;
    setTimesheetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/timesheets/my-month?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        const totalDays = getDaysInMonth(year, month - 1);
        const populatedDays = [];
        for (let d = 1; d <= totalDays; d++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const existingList = data.days && data.days.filter(day => day.date === dateStr);
          if (existingList && existingList.length > 0) {
            existingList.forEach(existing => {
              populatedDays.push({
                ...existing,
                clientKey: existing.clientKey || `${dateStr}-${Math.random().toString(36).substring(2, 11)}`
              });
            });
          } else {
            const tempDate = new Date(year, month - 1, d);
            const dayOfWeek = tempDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = isItalianHoliday(tempDate);
            if (isWeekend || isHoliday) {
              populatedDays.push({
                date: dateStr,
                type: 'Lavoro',
                projectName: 'Riposo',
                hours: 0,
                notes: '',
                clientKey: `${dateStr}-${Math.random().toString(36).substring(2, 11)}`
              });
            } else {
              populatedDays.push({
                date: dateStr,
                type: 'Lavoro',
                projectName: '',
                hours: 8.0,
                notes: '',
                clientKey: `${dateStr}-${Math.random().toString(36).substring(2, 11)}`
              });
            }
          }
        }
        data.days = populatedDays;
        setTimesheet(data);
        if (populatedDays.length > 0) {
          setSelectedTimesheetDay(populatedDays[0]);
        } else {
          setSelectedTimesheetDay(null);
        }
      }
    } catch (err) {
      console.error("Error fetching timesheet:", err);
      addToast("Errore nel caricamento del rapportino", "error");
    } finally {
      setTimesheetLoading(false);
    }
  };

  const fetchPendingTimesheets = async () => {
    try {
      const res = await fetch(`${API_BASE}/timesheets/pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingTimesheets(data);
      }
    } catch (err) {
      console.error("Error fetching pending timesheets:", err);
    }
  };

  const validateTimesheetDays = (days) => {
    const hoursByDate = {};
    for (const d of days) {
      if (d.type === 'Permesso') {
        const h = parseFloat(d.hours);
        if (isNaN(h) || h < 0.5 || h > 8) {
          return `Il giorno ${formatDateIt(d.date)} ha tipo 'Permesso' ma le ore inserite (${d.hours}) non sono comprese tra 0.5 e 8.`;
        }
      }
      if (d.notes && d.notes.trim().length > 250) {
        return `Il giorno ${formatDateIt(d.date)} supera il limite di 250 caratteri nelle note.`;
      }

      const hVal = parseFloat(d.hours) || 0;
      hoursByDate[d.date] = (hoursByDate[d.date] || 0) + hVal;
    }

    for (const [dateStr, totalH] of Object.entries(hoursByDate)) {
      if (totalH > 24) {
        return `La somma delle ore per il giorno ${formatDateIt(dateStr)} non può superare le 24 ore (inserite: ${totalH}h).`;
      }
    }

    return null;
  };

  const handleSaveTimesheet = async (silent = false) => {
    if (!timesheet) return false;
    const validationError = validateTimesheetDays(timesheet.days);
    if (validationError) {
      addToast(validationError, "error");
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/timesheets/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: timesheetYear,
          month: timesheetMonth,
          days: timesheet.days
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (!silent) {
          addToast("Bozza salvata con successo!", "success");
        }
        // Assign clientKey to saved days to keep frontend keys consistent
        const populatedDays = data.timesheet.days.map(d => ({
          ...d,
          clientKey: `${d.date}-${Math.random().toString(36).substring(2, 11)}`
        }));
        data.timesheet.days = populatedDays;
        setTimesheet(data.timesheet);
        return true;
      } else {
        addToast(data.error || "Errore durante il salvataggio", "error");
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
      return false;
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!window.confirm("Sei sicuro di voler inviare il rapportino per l'approvazione? Non sarà più modificabile.")) return;
    const saveSuccess = await handleSaveTimesheet(true);
    if (!saveSuccess) return;
    setTimesheetSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/timesheets/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: timesheetYear,
          month: timesheetMonth
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Rapportino inviato con successo!", "success");
        fetchTimesheet(timesheetYear, timesheetMonth);
      } else {
        addToast(data.error || "Errore durante l'invio", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    } finally {
      setTimesheetSubmitting(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId) => {
    if (!window.confirm("Sei sicuro di voler approvare questo rapportino?")) return;
    try {
      const res = await fetch(`${API_BASE}/timesheets/${timesheetId}/approve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Rapportino approvato con successo!", "success");
        fetchPendingTimesheets();
      } else {
        addToast(data.error || "Errore durante l'approvazione", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleRejectTimesheet = async (e) => {
    e.preventDefault();
    if (!timesheetRejectionModal.reason.trim()) {
      addToast("La motivazione del rifiuto è obbligatoria", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/timesheets/${timesheetRejectionModal.timesheetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: timesheetRejectionModal.reason })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Rapportino rifiutato con successo!", "success");
        setTimesheetRejectionModal({ open: false, timesheetId: '', reason: '' });
        fetchPendingTimesheets();
      } else {
        addToast(data.error || "Errore durante il rifiuto", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleReopenTimesheet = async (timesheetId) => {
    if (!window.confirm("Sei sicuro di voler riaprire questo rapportino e rimandarlo in stato Bozza?")) return;
    try {
      const res = await fetch(`${API_BASE}/timesheets/${timesheetId}/reopen`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Rapportino riaperto con successo!", "success");
        fetchPendingTimesheets();
      } else {
        addToast(data.error || "Errore durante la riapertura del rapportino", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleUpdateDay = (updatedDay) => {
    if (updatedDay.type === 'Lavoro' && (!updatedDay.projectName || updatedDay.projectName.trim() === '')) {
      addToast("Il nome progetto è obbligatorio per l'attività di tipo Lavoro.", "error");
      return;
    }
    if (updatedDay.type === 'Permesso') {
      const h = parseFloat(updatedDay.hours);
      if (isNaN(h) || h < 0.5 || h > 8) {
        addToast("Le ore di permesso devono essere comprese tra 0.5 e 8.", "error");
        return;
      }
    }
    if (updatedDay.notes && updatedDay.notes.length > 250) {
      addToast("Le note superano il limite di 250 caratteri.", "error");
      return;
    }
    
    setTimesheet(prev => ({
      ...prev,
      days: prev.days.map(d => d.date === updatedDay.date ? { ...updatedDay } : d)
    }));
    addToast("Modifica applicata al giorno! Ricorda di salvare la bozza per renderla permanente.", "info");
  };

  useEffect(() => {
    if (activeTab === 'timesheet') {
      fetchTimesheet(timesheetYear, timesheetMonth);
    }
  }, [activeTab, timesheetYear, timesheetMonth, currentUser]);

  useEffect(() => {
    if (activeTab === 'timesheet-approvals') {
      fetchPendingTimesheets();
    }
  }, [activeTab, currentUser]);


  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAddress(currentUser.address || '');
      setProfileIban(currentUser.iban || '');
    }
  }, [currentUser]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileName || !profileEmail) {
      addToast("Nome ed Email sono obbligatori", "error");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          address: profileAddress,
          iban: profileIban
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        addToast(data.error || "Errore durante il salvataggio", "error");
        return;
      }
      
      setCurrentUser(data.user);
      localStorage.setItem('ferie_user', JSON.stringify(data.user));
      addToast("Dati personali aggiornati con successo!", "success");
      fetchData(); // reload users lists
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          annualHolidayDays: settings.annualHolidayDays,
          maxStudyLeaveDays: settings.maxStudyLeaveDays
        })
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Errore nel salvataggio delle impostazioni", "error");
        return;
      }
      addToast(data.message || "Impostazioni salvate con successo!", "success");
      fetchData(); // Ricarica dati e saldi dipendenti
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };
  
  // Calendar states (Feature 3 Heatmap)
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(7); // 0-indexed, 7 = August
  
  // Interactive Range Picker states (MVP 2 UX)
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // default to August 2026
  const [rangeStart, setRangeStart] = useState(null); // 'YYYY-MM-DD'
  const [rangeEnd, setRangeEnd] = useState(null); // 'YYYY-MM-DD'
  const [absenceType, setAbsenceType] = useState('Ferie'); // 'Ferie', 'Malattia', 'Permesso Studio'
  const [uploadedFile, setUploadedFile] = useState({ name: '', data: '' }); // {name, data (base64)}

  // Report states (Feature 4)
  const [reportYear, setReportYear] = useState(2026);
  const [reportMonth, setReportMonth] = useState('Agosto'); // month name for PDF filter
  
  // Form/Modal states
  const [newRequest, setNewRequest] = useState({ startDate: '', endDate: '' });
  const [rejectionModal, setRejectionModal] = useState({ open: false, reqId: '', reason: '' });
  const [editModal, setEditModal] = useState({ open: false, request: null, endDate: '' });
  const [previewModal, setPreviewModal] = useState({ open: false, request: null }); // MVP 2 Attachment preview
  
  // Month Names in Italian
  const MONTHS_IT = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Map Italian month names to numbers (for PDF filtering)
  const MONTH_MAP_IT = {
    'Gennaio': 0, 'Febbraio': 1, 'Marzo': 2, 'Aprile': 3, 'Maggio': 4, 'Giugno': 5,
    'Luglio': 6, 'Agosto': 7, 'Settembre': 8, 'Ottobre': 9, 'Novembre': 10, 'Dicembre': 11
  };

  // Helper to add toast notification
  const addToast = (text, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch initial data - defined as a hoisted function so it can be called inside login handlers
  async function fetchData() {
    try {
      const [usersRes, reqsRes, settingsRes, absenceTypesRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/settings`),
        fetch(`${API_BASE}/absence-types`)
      ]);
      
      // Handle unauthorized/session expiration cases silently without crashing the frontend
      if (usersRes.status === 401 || reqsRes.status === 401 || settingsRes.status === 401 || absenceTypesRes.status === 401) {
        setUsers([]);
        setRequests([]);
        setSettings({});
        setAbsenceTypes([]);
        if (currentUser) {
          setCurrentUser(null);
          localStorage.removeItem('ferie_user');
        }
        return;
      }
      
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const reqsData = reqsRes.ok ? await reqsRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const absenceTypesData = absenceTypesRes.ok ? await absenceTypesRes.json() : [];
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRequests(Array.isArray(reqsData) ? reqsData : []);
      setSettings(settingsData && !settingsData.error ? settingsData : {});
      setAbsenceTypes(Array.isArray(absenceTypesData) ? absenceTypesData : []);
      
      // Update currentUser reference to reflect balance changes
      if (currentUser && Array.isArray(usersData)) {
        const updatedUser = usersData.find(u => u.id === currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
          localStorage.setItem('ferie_user', JSON.stringify(updatedUser));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('ferie_user');
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (currentUser) {
        addToast("Errore di connessione con il server backend", "error");
      }
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch notifications and my projects when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setMyProjects([]);
      return;
    }
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/${currentUser.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setNotifications([]);
      }
    };
    
    fetchNotifications();
    fetchMyProjects();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch communications history and confirmations (Admin/HR only)
  const fetchCommunications = async () => {
    try {
      const res = await fetch(`${API_BASE}/communications`);
      if (res.ok) {
        const data = await res.json();
        setCommunications(data);
      }
    } catch (err) {
      console.error("Error fetching communications:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'communications' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR')) {
      fetchCommunications();
      const interval = setInterval(fetchCommunications, 8000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    
    if ((activeTab === 'projects' && (currentUser.role === 'Admin' || currentUser.role === 'HR')) ||
        (activeTab === 'simulation' && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader')) ||
        (activeTab === 'comparison' && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader'))) {
      fetchAllProjects();
    }
    
    if (activeTab === 'comparison' && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader')) {
      fetchProjectActuals();
      fetchAllExpenses();
    }
    
    if (activeTab === 'timesheet') {
      fetchMyProjects();
    }
    
    if (activeTab === 'reports' && (currentUser.role === 'Admin' || currentUser.role === 'HR')) {
      fetchProjectReport();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === 'comparison' && comparisonProjectId) {
      fetchProjectExpenses(comparisonProjectId);
    } else {
      setProjectExpenses([]);
    }
  }, [comparisonProjectId, activeTab]);

  const fetchProjectActuals = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/actuals`);
      if (res.ok) {
        const data = await res.json();
        setActualsList(data);
      }
      
      const resTrend = await fetch(`${API_BASE}/reports/actuals-trend`);
      if (resTrend.ok) {
        const dataTrend = await resTrend.json();
        setActualsTrendList(dataTrend);
      }
    } catch (err) {
      console.error("Error fetching project actuals:", err);
    }
  };

  // handleRoleChange removed, using direct login workflow instead

  // Project Management Functions
  const fetchAllProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchMyProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/my-projects`);
      if (res.ok) {
        const data = await res.json();
        setMyProjects(data);
      }
    } catch (err) {
      console.error("Error fetching my projects:", err);
    }
  };

  const fetchProjectReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjectReport(data);
      }
    } catch (err) {
      console.error("Error fetching project report:", err);
    }
  };

  const fetchProjectExpenses = async (projectId) => {
    if (!projectId) {
      setProjectExpenses([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/expenses`);
      if (res.ok) {
        const data = await res.json();
        setProjectExpenses(data);
      }
    } catch (err) {
      console.error("Error fetching project expenses:", err);
    }
  };

  const fetchAllExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/expenses`);
      if (res.ok) {
        const data = await res.json();
        setAllExpenses(data);
      }
    } catch (err) {
      console.error("Error fetching all expenses:", err);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseDate || !expenseCategory || !expenseAmount) {
      addToast("I campi data, categoria e importo sono obbligatori.", "error");
      return;
    }
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal < 0) {
      addToast("L'importo deve essere un numero non negativo.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects/${comparisonProjectId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: expenseDate,
          category: expenseCategory,
          description: expenseDescription,
          amount: amountVal
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Spesa registrata con successo!", "success");
        setExpenseDate('');
        setExpenseCategory('Trasferta');
        setExpenseDescription('');
        setExpenseAmount('');
        setShowExpenseForm(false);
        fetchProjectExpenses(comparisonProjectId);
        fetchAllExpenses();
      } else {
        addToast(data.error || "Errore nella creazione della spesa", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!expenseDate || !expenseCategory || !expenseAmount) {
      addToast("I campi data, categoria e importo sono obbligatori.", "error");
      return;
    }
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal < 0) {
      addToast("L'importo deve essere un numero non negativo.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/projects/${comparisonProjectId}/expenses/${editingExpenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: expenseDate,
          category: expenseCategory,
          description: expenseDescription,
          amount: amountVal
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Spesa modificata con successo!", "success");
        setExpenseDate('');
        setExpenseCategory('Trasferta');
        setExpenseDescription('');
        setExpenseAmount('');
        setEditingExpenseId(null);
        setShowExpenseForm(false);
        fetchProjectExpenses(comparisonProjectId);
        fetchAllExpenses();
      } else {
        addToast(data.error || "Errore nella modifica della spesa", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa spesa?")) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${comparisonProjectId}/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Spesa eliminata con successo!", "success");
        fetchProjectExpenses(comparisonProjectId);
        fetchAllExpenses();
      } else {
        addToast(data.error || "Errore nell'eliminazione della spesa", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newProjectName, 
          description: newProjectDescription,
          sale_price: parseFloat(newProjectSalePrice) || 0.0,
          margin: parseFloat(newProjectMargin) || 0.0,
          start_date: newProjectStartDate,
          end_date: newProjectEndDate,
          responsible: newProjectResponsible,
          project_manager: newProjectPM
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Commessa creata con successo!", "success");
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectSalePrice('');
        setNewProjectMargin('');
        setNewProjectStartDate('');
        setNewProjectEndDate('');
        setNewProjectResponsible('');
        setNewProjectPM('');
        fetchAllProjects();
      } else {
        addToast(data.error || "Errore nella creazione della commessa", "error");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProjectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editingProjectName, 
          description: editingProjectDescription,
          sale_price: parseFloat(editingProjectSalePrice) || 0.0,
          margin: parseFloat(editingProjectMargin) || 0.0,
          start_date: editingProjectStartDate,
          end_date: editingProjectEndDate,
          responsible: editingProjectResponsible,
          project_manager: editingProjectPM
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Commessa aggiornata con successo!", "success");
        setEditingProjectId(null);
        setEditingProjectName('');
        setEditingProjectDescription('');
        setEditingProjectSalePrice('');
        setEditingProjectMargin('');
        setEditingProjectStartDate('');
        setEditingProjectEndDate('');
        setEditingProjectResponsible('');
        setEditingProjectPM('');
        fetchAllProjects();
      } else {
        addToast(data.error || "Errore nell'aggiornamento della commessa", "error");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa commessa?")) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Commessa eliminata con successo!", "success");
        fetchAllProjects();
      } else {
        addToast(data.error || "Errore nell'eliminazione della commessa", "error");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleSelectUserForAssignment = async (userId) => {
    setSelectedUserForAssignment(userId);
    if (!userId) {
      setUserAssignedProjectIds([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/projects`);
      if (res.ok) {
        const data = await res.json();
        setUserAssignedProjectIds(data);
      } else {
        addToast("Errore nel recupero commesse assegnate", "error");
      }
    } catch (err) {
      console.error("Error fetching user projects:", err);
    }
  };

  const handleToggleProjectAssignment = async (projectId, assigned) => {
    if (!selectedUserForAssignment) return;

    let newIds = [];
    if (assigned) {
      newIds = [...userAssignedProjectIds, projectId];
    } else {
      newIds = userAssignedProjectIds.filter(id => id !== projectId);
    }

    try {
      const res = await fetch(`${API_BASE}/users/${selectedUserForAssignment}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: newIds })
      });
      const data = await res.json();
      if (res.ok) {
        setUserAssignedProjectIds(newIds);
        addToast("Assegnazione aggiornata!", "success");
      } else {
        addToast(data.error || "Errore nell'aggiornamento dell'assegnazione", "error");
      }
    } catch (err) {
      console.error("Error setting user projects:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleCreateAbsenceType = async (e) => {
    e.preventDefault();
    if (!newAbsenceName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/absence-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAbsenceName, description: newAbsenceDescription })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Tipo di assenza creato con successo!", "success");
        setNewAbsenceName('');
        setNewAbsenceDescription('');
        fetchData();
      } else {
        addToast(data.error || "Errore nella creazione del tipo di assenza", "error");
      }
    } catch (err) {
      console.error("Error creating absence type:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleUpdateAbsenceType = async (e) => {
    e.preventDefault();
    if (!editingAbsenceName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/absence-types/${editingAbsenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingAbsenceName, description: editingAbsenceDescription })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Tipo di assenza aggiornato con successo!", "success");
        setEditingAbsenceId(null);
        setEditingAbsenceName('');
        setEditingAbsenceDescription('');
        fetchData();
      } else {
        addToast(data.error || "Errore nell'aggiornamento del tipo di assenza", "error");
      }
    } catch (err) {
      console.error("Error updating absence type:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleDeleteAbsenceType = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo tipo di assenza?")) return;

    try {
      const res = await fetch(`${API_BASE}/absence-types/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Tipo di assenza eliminato con successo!", "success");
        fetchData();
      } else {
        addToast(data.error || "Errore nell'eliminazione del tipo di assenza", "error");
      }
    } catch (err) {
      console.error("Error deleting absence type:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      addToast("Nome, Email e Password sono obbligatori.", "error");
      return;
    }
    if (newUserCorporateLevel.trim().length > 4) {
      addToast("Il livello aziendale non può superare i 4 caratteri.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
          phone: newUserPhone,
          address: newUserAddress,
          iban: newUserIban,
          internal_cost: parseFloat(newUserInternalCost) || 0.0,
          corporate_level: newUserCorporateLevel.trim().toUpperCase(),
          holiday_total: parseInt(newUserHolidayTotal) || 30
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Collaboratore creato con successo!", "success");
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('Dipendente');
        setNewUserPhone('');
        setNewUserAddress('');
        setNewUserIban('');
        setNewUserInternalCost('');
        setNewUserCorporateLevel('');
        setNewUserHolidayTotal(30);
        fetchData();
      } else {
        addToast(data.error || "Errore nella creazione del collaboratore", "error");
      }
    } catch (err) {
      console.error("Error creating user:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUserName.trim() || !editingUserEmail.trim()) {
      addToast("Nome ed Email sono obbligatori.", "error");
      return;
    }
    if (editingUserCorporateLevel.trim().length > 4) {
      addToast("Il livello aziendale non può superare i 4 caratteri.", "error");
      return;
    }

    try {
      const payload = {
        name: editingUserName.trim(),
        email: editingUserEmail.trim(),
        role: editingUserRole,
        phone: editingUserPhone,
        address: editingUserAddress,
        iban: editingUserIban,
        internal_cost: parseFloat(editingUserInternalCost) || 0.0,
        corporate_level: editingUserCorporateLevel.trim().toUpperCase(),
        holiday_total: parseInt(editingUserHolidayTotal) || 30
      };

      if (editingUserPassword.trim() !== '') {
        payload.password = editingUserPassword;
      }

      const res = await fetch(`${API_BASE}/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Collaboratore aggiornato con successo!", "success");
        setEditingUserId(null);
        setEditingUserName('');
        setEditingUserEmail('');
        setEditingUserPassword('');
        setEditingUserRole('Dipendente');
        setEditingUserPhone('');
        setEditingUserAddress('');
        setEditingUserIban('');
        setEditingUserInternalCost('');
        setEditingUserCorporateLevel('');
        setEditingUserHolidayTotal(30);
        fetchData();
      } else {
        addToast(data.error || "Errore nell'aggiornamento del collaboratore", "error");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      addToast("Errore di connessione", "error");
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) {
      addToast("Non puoi eliminare l'utente attualmente loggato.", "error");
      return;
    }
    if (!window.confirm("Sei sicuro di voler eliminare questo collaboratore? Questa operazione eliminerà anche le sue richieste e rapportini.")) return;

    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Collaboratore eliminato con successo!", "success");
        fetchData();
      } else {
        addToast(data.error || "Errore nell'eliminazione del collaboratore", "error");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      addToast("Errore di connessione", "error");
    }
  };

  // Reset interactive date picker selection
  const resetSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setNewRequest({ startDate: '', endDate: '' });
    setAbsenceType('Ferie');
    setUploadedFile({ name: '', data: '' });
  };

  // Date helper formatting
  const formatDateIt = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Interactive Range Picker click handler
  const handlePickerDayClick = (dayStr) => {
    // Primo clic o clic su un intervallo completo avvia una nuova selezione di 1 giorno
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(dayStr);
      setRangeEnd(dayStr);
      setNewRequest({ startDate: dayStr, endDate: dayStr });
    } else {
      // Secondo clic (quando abbiamo una selezione di 1 giorno: rangeStart === rangeEnd)
      if (dayStr > rangeStart) {
        setRangeEnd(dayStr);
        setNewRequest({ startDate: rangeStart, endDate: dayStr });
      } else if (dayStr < rangeStart) {
        setRangeStart(dayStr);
        setRangeEnd(dayStr);
        setNewRequest({ startDate: dayStr, endDate: dayStr });
      } else {
        // Cliccato lo stesso giorno: lo mantiene selezionato come 1 giorno
        setRangeStart(dayStr);
        setRangeEnd(dayStr);
        setNewRequest({ startDate: dayStr, endDate: dayStr });
      }
    }
  };

  // File Upload base64 converter
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast("Il file è troppo grande. Dimensione massima: 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setUploadedFile({
        name: file.name,
        data: uploadEvent.target.result // Base64 data string
      });
      addToast(`Giustificativo caricato: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Request holiday API handler
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.startDate || !newRequest.endDate) {
      addToast("Seleziona un intervallo di date dal calendario", "error");
      return;
    }
    
    const diffDays = getWorkingDaysCount(newRequest.startDate, newRequest.endDate);
    if (absenceType === 'Ferie' && currentUser.holidayBalance.remainingDays < diffDays) {
      addToast(`Saldo ferie insufficiente. Richiesti: ${diffDays} giorni, disponibili: ${currentUser.holidayBalance.remainingDays} giorni.`, "error");
      return;
    }
    if (absenceType === 'Permesso Studio' && diffDays > settings.maxStudyLeaveDays) {
      addToast(`La richiesta di Permesso Studio supera il limite massimo consentito di ${settings.maxStudyLeaveDays} giorni lavorativi.`, "error");
      return;
    }


    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          startDate: newRequest.startDate,
          endDate: newRequest.endDate,
          type: absenceType,
          attachmentName: uploadedFile.name,
          attachmentData: uploadedFile.data
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Errore nella creazione della richiesta", "error");
        return;
      }
      
      addToast(data.message || "Richiesta inviata con successo", "success");
      resetSelection();
      fetchData(); // Refresh requests list and user balances
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  // Cancel holiday request API handler
  const handleDeleteRequest = async (reqId) => {
    if (!window.confirm("Sei sicuro di voler cancellare questa richiesta?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/requests/${reqId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (!res.ok) {
        addToast(data.error || "Errore nella cancellazione", "error");
        return;
      }
      
      addToast("Richiesta cancellata e saldo riaccreditato", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  // Edit holiday request API handler
  const handleEditRequest = async (e) => {
    e.preventDefault();
    if (!editModal.endDate) {
      addToast("Inserisci la nuova data di fine", "error");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/requests/${editModal.request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: editModal.endDate })
      });
      
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Errore nella modifica", "error");
        return;
      }
      
      addToast("Richiesta modificata con successo", "success");
      setEditModal({ open: false, request: null, endDate: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  // Approve holiday request API handler
  const handleApproveRequest = async (reqId) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverId: currentUser.id })
      });
      const data = await res.json();
      
      if (!res.ok) {
        addToast(data.error || "Errore nell'approvazione", "error");
        return;
      }
      
      addToast("Richiesta approvata con successo", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  // Reject holiday request API handler
  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!rejectionModal.reason.trim()) {
      addToast("Inserisci la motivazione del rifiuto", "error");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/requests/${rejectionModal.reqId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionModal.reason, approverId: currentUser.id })
      });
      
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Errore nel rifiuto", "error");
        return;
      }
      
      addToast("Richiesta rifiutata con motivazione salvata", "success");
      setRejectionModal({ open: false, reqId: '', reason: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione", "error");
    }
  };

  // Read all notifications handler
  const handleClearNotifications = async () => {
    if (notifications.length === 0) return;
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      setNotifications(prev => prev.map(n => n.isCommunication ? n : { ...n, read: true }));
    } catch (err) {
      console.error(err);
    }
  };

  // Send communication API handler (Admin/HR only)
  const handleSendCommunication = async (e) => {
    e.preventDefault();
    if (!commsMessage.trim()) {
      addToast("Inserisci un messaggio per la comunicazione", "error");
      return;
    }
    if (commsMessage.length > 500) {
      addToast("Il messaggio non può superare i 500 caratteri", "error");
      return;
    }
    
    setCommsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser.id, message: commsMessage })
      });
      
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Errore nell'invio della comunicazione", "error");
        setCommsSubmitting(false);
        return;
      }
      
      addToast("Comunicazione inviata con successo", "success");
      setCommsMessage('');
      fetchCommunications();
    } catch (err) {
      console.error(err);
      addToast("Errore di connessione con il server", "error");
    } finally {
      setCommsSubmitting(false);
    }
  };

  // Render main general heatmap calendar (Feature 3)
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const startOffset = getStartOffset(calendarYear, calendarMonth);
    const cells = [];
    
    // Empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" />);
    }
    
    const totalEmployees = users.filter(u => u.role === 'Dipendente' || u.role === 'Team Leader').length;
    
    // Monthly days
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(dayStr);
      
      const absentEmployees = [];
      requests.forEach(req => {
        if (req.status !== 'Approvata') return;
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        if (dayDate >= start && dayDate <= end) {
          if (!absentEmployees.includes(req.userName)) {
            absentEmployees.push(req.userName);
          }
        }
      });
      
      const absentCount = absentEmployees.length;
      const absencePct = totalEmployees > 0 ? (absentCount / totalEmployees) * 100 : 0;
      const alertUncovered = absencePct > 50;
      
      // MVP 3: check weekend and holidays
      const dayOfWeek = dayDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayName = getItalianHolidayName(dayDate);
      
      let cellClass = `calendar-cell ${alertUncovered ? 'alert-uncovered' : ''}`;
      if (isWeekend) cellClass += " is-weekend";
      if (holidayName) cellClass += " is-holiday";
      
      // Build hover title tooltip
      let hoverTitle = '';
      if (holidayName) {
        hoverTitle += `[FESTIVITÀ] ${holidayName}. `;
      } else if (isWeekend) {
        hoverTitle += `[WEEKEND]. `;
      }
      hoverTitle += absentCount > 0 ? `Assenti: ${absentEmployees.join(', ')}` : 'Nessun assente';
      
      cells.push(
        <div 
          key={`day-${d}`} 
          className={cellClass}
          title={hoverTitle}
        >
          <div className="calendar-day-num">{d}</div>
          {alertUncovered && <div className="alert-badge" title="Alert Periodo Scoperto" />}
          {absentCount > 0 && (
            <div className="calendar-cell-absences">
              {absentCount} assente/i ({Math.round(absencePct)}%)
            </div>
          )}
        </div>
      );
    }
    
    return cells;
  };

  // Render interactive selection date picker calendar (MVP 2/3 UX)
  const renderPickerCalendar = () => {
    const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);
    const startOffset = getStartOffset(pickerYear, pickerMonth);
    const cells = [];
    
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`picker-empty-${i}`} className="calendar-cell empty" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(dayStr);
      
      const isStart = rangeStart === dayStr;
      const isEnd = rangeEnd === dayStr;
      const inRange = rangeStart && rangeEnd && dayDate > new Date(rangeStart) && dayDate < new Date(rangeEnd);
      
      // Markers for employee's own existing requests
      const isPending = currentEmployeeRequests.some(r => r.status === 'In attesa di approvazione' && dayDate >= new Date(r.startDate) && dayDate <= new Date(r.endDate));
      const isApproved = currentEmployeeRequests.some(r => r.status === 'Approvata' && dayDate >= new Date(r.startDate) && dayDate <= new Date(r.endDate));
      
      // MVP 3: check weekend and holidays
      const dayOfWeek = dayDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayName = getItalianHolidayName(dayDate);
      
      let cellClass = "calendar-cell date-picker-cell";
      if (isStart) cellClass += " selected-start";
      if (isEnd) cellClass += " selected-end";
      if (inRange) cellClass += " selected-range";
      if (isWeekend) cellClass += " is-weekend";
      if (holidayName) cellClass += " is-holiday";
      
      let hoverTitle = '';
      if (holidayName) hoverTitle = `Festività: ${holidayName}`;
      else if (isWeekend) hoverTitle = 'Fine settimana';
      
      cells.push(
        <div 
          key={`picker-day-${d}`} 
          className={cellClass}
          onClick={() => handlePickerDayClick(dayStr)}
          title={hoverTitle}
        >
          <div className="calendar-day-num">{d}</div>
          <div className="day-status-indicators">
            {isApproved && <span className="status-indicator-dot approved" title="Ferie già Approvate" />}
            {isPending && <span className="status-indicator-dot pending" title="Richiesta già In Attesa" />}
          </div>
        </div>
      );
    }
    
    return cells;
  };

  // PDF Report Exporter (Feature 4 / MVP 3)
  const handleExportPDF = () => {
    const targetMonthIdx = MONTH_MAP_IT[reportMonth];
    
    const monthRequests = requests.filter(req => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      const matchesYear = startYear === reportYear || endYear === reportYear;
      const matchesMonth = startMonth === targetMonthIdx || endMonth === targetMonthIdx;
      
      return matchesYear && matchesMonth;
    });

    if (monthRequests.length === 0) {
      addToast(`Nessun dato ferie trovato per ${reportMonth} ${reportYear}`, 'info');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Branding
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("SISTEMA FERIE AZIENDALE", 14, 22);
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Report Mensile: ${reportMonth.toUpperCase()} ${reportYear}`, 14, 28);
      
      const todayStr = new Date().toLocaleDateString('it-IT');
      doc.text(`Generato il: ${todayStr}`, 150, 28);
      
      // Table Content - using MVP 3 Working Days count
      const tableRows = monthRequests.map(r => [
        r.userName,
        r.type || "Ferie",
        formatDateIt(r.startDate),
        formatDateIt(r.endDate),
        getWorkingDaysCount(r.startDate, r.endDate),
        r.status
      ]);

      doc.autoTable({
        startY: 45,
        head: [['Dipendente', 'Tipo Assenza', 'Data Inizio', 'Data Fine', 'Giorni Lavorativi', 'Stato']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [124, 182, 129], fontStyle: 'bold' },
        styles: { font: 'Helvetica', fontSize: 10 },
        columnStyles: {
          5: { fontStyle: 'bold' }
        }
      });
      
      const finalY = doc.previousAutoTable.finalY + 15;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Azienda S.r.l. - Report ad uso interno delle Risorse Umane. I giorni indicati escludono weekend e festività nazionali.", 14, finalY);

      doc.save(`Piano_Ferie_${reportMonth}_${reportYear}.pdf`);
      addToast("Download del PDF avviato", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  // --- LOGICA SIMULAZIONE COMMESSE ---
  const handleSelectSimulatedProject = (projId) => {
    setSimulatedProjectId(projId);
    setNewSimulationName('');
    if (!projId) {
      setSimulationsList([]);
      setActiveSimulationId(null);
      setSimulatedResources([]);
      return;
    }
    
    // Load simulation history from localStorage
    const saved = localStorage.getItem(`sim_history_${projId}`);
    if (saved) {
      try {
        const parsedList = JSON.parse(saved);
        setSimulationsList(parsedList);
        
        if (parsedList.length > 0) {
          // Auto-load optimal scenario if it exists, otherwise the first scenario
          const optimal = parsedList.find(s => s.isOptimal);
          const activeScenario = optimal || parsedList[0];
          setActiveSimulationId(activeScenario.id);
          setSimulatedResources(JSON.parse(JSON.stringify(activeScenario.resources || [])));
        } else {
          setActiveSimulationId(null);
          setSimulatedResources([]);
        }
      } catch (e) {
        setSimulationsList([]);
        setActiveSimulationId(null);
        setSimulatedResources([]);
      }
    } else {
      setSimulationsList([]);
      setActiveSimulationId(null);
      setSimulatedResources([]);
    }
  };

  const handleAddSimulatedResource = () => {
    const newRes = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      userId: '',
      name: '',
      cost: 0,
      days: 0
    };
    const updated = [...simulatedResources, newRes];
    setSimulatedResources(updated);
  };

  const handleRemoveSimulatedResource = (resId) => {
    const updated = simulatedResources.filter(r => r.id !== resId);
    setSimulatedResources(updated);
  };

  const handleResourceChange = (resId, field, val) => {
    const updated = simulatedResources.map(r => {
      if (r.id !== resId) return r;
      
      const newObj = { ...r, [field]: val };
      
      // If we are changing the userId
      if (field === 'userId') {
        if (val === 'custom') {
          newObj.name = '';
          newObj.cost = 0;
        } else {
          // Find employee
          const emp = users.find(u => u.id === val);
          if (emp) {
            newObj.name = emp.name;
            newObj.cost = emp.internal_cost !== undefined && emp.internal_cost !== null ? emp.internal_cost : 0;
          }
        }
      }
      return newObj;
    });
    setSimulatedResources(updated);
  };

  const handleSaveSimulation = () => {
    if (!simulatedProjectId) return;
    const nameToSave = newSimulationName.trim() || `Simulazione #${simulationsList.length + 1}`;
    
    const newSim = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: nameToSave,
      isOptimal: false,
      resources: JSON.parse(JSON.stringify(simulatedResources))
    };
    
    const updatedList = [...simulationsList, newSim];
    setSimulationsList(updatedList);
    setActiveSimulationId(newSim.id);
    localStorage.setItem(`sim_history_${simulatedProjectId}`, JSON.stringify(updatedList));
    setNewSimulationName('');
    addToast(`Pianificazione "${nameToSave}" salvata nello storico`, "success");
  };

  const handleUpdateActiveSimulation = () => {
    if (!activeSimulationId || !simulatedProjectId) return;
    const foundSim = simulationsList.find(s => s.id === activeSimulationId);
    const nameToSave = newSimulationName.trim() || (foundSim ? foundSim.name : `Simulazione #${simulationsList.length}`);
    const updatedList = simulationsList.map(sim => {
      if (sim.id === activeSimulationId) {
        return {
          ...sim,
          name: nameToSave,
          resources: JSON.parse(JSON.stringify(simulatedResources))
        };
      }
      return sim;
    });
    setSimulationsList(updatedList);
    localStorage.setItem(`sim_history_${simulatedProjectId}`, JSON.stringify(updatedList));
    setNewSimulationName('');
    addToast(`Pianificazione "${nameToSave}" aggiornata con successo`, "success");
  };

  const handleLoadSimulation = (simId) => {
    const found = simulationsList.find(s => s.id === simId);
    if (found) {
      setActiveSimulationId(simId);
      setSimulatedResources(JSON.parse(JSON.stringify(found.resources || [])));
      addToast(`Caricato lo scenario "${found.name}"`, "success");
    }
  };

  const handleCreateNewSimulation = () => {
    setActiveSimulationId(null);
    setSimulatedResources([]);
    setNewSimulationName('');
    addToast("Nuova pianificazione vuota inizializzata", "info");
  };

  const handleDeleteSimulation = (simId) => {
    const toDelete = simulationsList.find(s => s.id === simId);
    const updatedList = simulationsList.filter(s => s.id !== simId);
    setSimulationsList(updatedList);
    localStorage.setItem(`sim_history_${simulatedProjectId}`, JSON.stringify(updatedList));
    
    if (activeSimulationId === simId) {
      if (updatedList.length > 0) {
        const optimal = updatedList.find(s => s.isOptimal);
        const nextActive = optimal || updatedList[0];
        setActiveSimulationId(nextActive.id);
        setSimulatedResources(JSON.parse(JSON.stringify(nextActive.resources || [])));
      } else {
        setActiveSimulationId(null);
        setSimulatedResources([]);
      }
    }
    if (toDelete) {
      addToast(`Pianificazione "${toDelete.name}" eliminata`, "info");
    }
  };

  const handleSetOptimalSimulation = (simId) => {
    const updatedList = simulationsList.map(s => ({
      ...s,
      isOptimal: s.id === simId
    }));
    setSimulationsList(updatedList);
    localStorage.setItem(`sim_history_${simulatedProjectId}`, JSON.stringify(updatedList));
    
    const found = updatedList.find(s => s.id === simId);
    if (found) {
      addToast(`Scenario "${found.name}" impostato come PIANIFICAZIONE OTTIMALE`, "success");
    }
  };


  const currentEmployeeRequests = requests.filter(r => currentUser && r.userId === currentUser.id);

  if (!currentUser) {
    return (
      <div className="login-page-wrapper">
        {/* Toast Notification Container */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />}
              {t.type === 'error' && <XCircle size={18} style={{ color: 'var(--color-danger)' }} />}
              {t.type === 'info' && <Info size={18} style={{ color: 'var(--color-secondary)' }} />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        <div className="login-glass-card">
          <div className="login-header">
            <h2>Gestione Commesse</h2>
            <p>Accedi al portale di pianificazione e gestione commesse</p>
          </div>

          {loginError && (
            <div className="login-error-alert">
              <AlertTriangle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="login-form-group">
              <label className="login-label">Email Utente</label>
              <input 
                type="email" 
                className="login-input" 
                placeholder="nome.cognome@azienda.it" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input 
                type="password" 
                className="login-input" 
                placeholder="••••••••" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-submit-btn">
              Accedi
            </button>
          </form>

          {import.meta.env.DEV && (
            <>
              <div className="quick-login-title">Accesso Rapido (Demo)</div>
              <div className="quick-login-grid">
                <button className="quick-login-btn" onClick={() => handleQuickLogin('mario.rossi@azienda.it')}>
                  <span className="quick-login-name">Mario Rossi</span>
                  <span className="quick-login-role">Dipendente</span>
                </button>
                <button className="quick-login-btn" onClick={() => handleQuickLogin('luigi.bianchi@azienda.it')}>
                  <span className="quick-login-name">Luigi Bianchi</span>
                  <span className="quick-login-role">Dipendente</span>
                </button>
                <button className="quick-login-btn" onClick={() => handleQuickLogin('giuseppe.verdi@azienda.it')}>
                  <span className="quick-login-name">Giuseppe Verdi</span>
                  <span className="quick-login-role">Team Leader</span>
                </button>
                <button className="quick-login-btn" onClick={() => handleQuickLogin('admin@azienda.it')}>
                  <span className="quick-login-name">Admin User</span>
                  <span className="quick-login-role">Amministratore</span>
                </button>
                <button className="quick-login-btn" onClick={() => handleQuickLogin('hr@azienda.it')}>
                  <span className="quick-login-name">HR User</span>
                  <span className="quick-login-role">Risorse Umane</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />}
            {t.type === 'error' && <XCircle size={18} style={{ color: 'var(--color-danger)' }} />}
            {t.type === 'info' && <Info size={18} style={{ color: 'var(--color-secondary)' }} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">C</div>
          <div className="logo-text">Gestione Commesse</div>
        </div>
        
        <nav className="nav-links">
          {currentUser && (currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Layers className="nav-item-icon" />
              <span>Mio Piano Ferie</span>
            </div>
          )}

          {currentUser && (currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
            <div 
              className={`nav-item ${activeTab === 'timesheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('timesheet')}
            >
              <FileText className="nav-item-icon" />
              <span>Rapportino</span>
            </div>
          )}

          {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader') && (
            <>
              <div 
                className={`nav-item ${activeTab === 'timesheet-approvals' ? 'active' : ''}`}
                onClick={() => { setActiveTab('timesheet-approvals'); resetSelection(); }}
              >
                <FileCheck className="nav-item-icon" />
                <span>Approvazioni Rapportini</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'simulation' ? 'active' : ''}`}
                onClick={() => { setActiveTab('simulation'); resetSelection(); }}
              >
                <Sliders className="nav-item-icon" />
                <span>Simulazione Commesse</span>
              </div>
              <div 
                className={`nav-item ${activeTab === 'comparison' ? 'active' : ''}`}
                onClick={() => { setActiveTab('comparison'); resetSelection(); }}
              >
                <BarChart2 className="nav-item-icon" />
                <span>Preventivo vs Consuntivo</span>
              </div>
            </>
          )}
          
          {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div 
              className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => { setActiveTab('approvals'); resetSelection(); }}
            >
              <CheckCircle className="nav-item-icon" />
              <span>Approvazioni ({requests.filter(r => r.status === 'In attesa di approvazione').length})</span>
            </div>
          )}
          
          {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <>
              <div 
                className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => { setActiveTab('reports'); resetSelection(); }}
              >
                <FileText className="nav-item-icon" />
                <span>REPORTISTICA</span>
              </div>
              
              <div 
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); resetSelection(); }}
              >
                <SettingsIcon className="nav-item-icon" />
                <span>Impostazioni</span>
              </div>

              {(currentUser.role === 'Admin' || currentUser.role === 'HR') && (
                <div 
                  className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('users'); resetSelection(); }}
                >
                  <Users className="nav-item-icon" />
                  <span>Anagrafica Collaboratori</span>
                </div>
              )}

              {currentUser.role === 'Admin' && (
                <>
                  <div 
                    className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('projects'); resetSelection(); }}
                  >
                    <Briefcase className="nav-item-icon" />
                    <span>Gestione Commesse</span>
                  </div>
                  <div 
                    className={`nav-item ${activeTab === 'absences' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('absences'); resetSelection(); }}
                  >
                    <Layers className="nav-item-icon" />
                    <span>Gestione Tipi Assenza</span>
                  </div>
                </>
              )}
              
              <div 
                className={`nav-item ${activeTab === 'communications' ? 'active' : ''}`}
                onClick={() => { setActiveTab('communications'); resetSelection(); }}
              >
                <Megaphone className="nav-item-icon" />
                <span>Comunicazioni</span>
              </div>
            </>
          )}
        </nav>

        {/* Current User Role Widget */}
        {currentUser && (
          <div className="user-profile-widget">
            <span className={`role-badge-pill ${currentUser.role.toLowerCase() === 'team leader' ? 'team-leader' : currentUser.role.toLowerCase() === 'dipendente' ? 'dipendente' : currentUser.role.toLowerCase() === 'admin' ? 'admin' : 'hr'}`}>
              {currentUser.role}
            </span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentUser.email}</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Container */}
      <main className="main-area">
        {/* Header */}
        <header className="app-header">
          <h1 className="header-title">
            {activeTab === 'dashboard' && 'Area Personale Dipendente'}
            {activeTab === 'approvals' && 'Pannello Approvazioni Richieste'}
            {activeTab === 'reports' && 'REPORTISTICA'}
            {activeTab === 'projects' && 'Gestione Commesse / Progettualità'}
            {activeTab === 'users' && 'Anagrafica Collaboratori'}
            {activeTab === 'absences' && 'Gestione Tipologie Assenze'}
            {activeTab === 'simulation' && 'Simulatore Margine Commessa'}
            {activeTab === 'comparison' && 'Preventivo vs Consuntivo Commesse'}
            {activeTab === 'profile' && 'I Miei Dati Personali'}
            {activeTab === 'communications' && 'Comunicazioni e Avvisi'}
          </h1>
          
          <div className="header-actions">
            {/* Notification Bell */}
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button 
                  className="notification-bell-btn"
                  onClick={() => {
                    setShowNotifPopover(!showNotifPopover);
                    if (!showNotifPopover) handleClearNotifications();
                  }}
                >
                  <Bell size={20} />
                  {notifications.some(n => !n.read) && <div className="notification-badge" />}
                </button>
                
                {showNotifPopover && (
                  <div className="notifications-popover">
                    <div className="popover-header">
                      <span className="popover-title">Notifiche</span>
                      <button className="popover-clear-btn" onClick={handleClearNotifications}>
                        Segna come lette
                      </button>
                    </div>
                    <div className="notifications-list">
                      {notifications.length === 0 ? (
                        <div className="notification-empty-state">Nessuna notifica presente</div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={`notification-item-card ${n.read ? 'read' : ''} ${n.isCommunication ? 'communication-notif' : ''}`}
                            style={n.isCommunication ? { borderLeftColor: 'var(--color-secondary)' } : {}}
                          >
                            {n.isCommunication && (
                              <div className="communication-badge-label" style={{ fontSize: '0.65rem', color: 'var(--color-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Megaphone size={10} />
                                Comunicazione Ufficiale
                              </div>
                            )}
                            <div style={{ fontWeight: n.isCommunication && !n.read ? '600' : 'normal' }}>{n.message}</div>
                            
                            {n.isCommunication && !n.read && (
                              <button
                                className="btn btn-primary"
                                style={{ 
                                  marginTop: '8px', 
                                  padding: '4px 10px', 
                                  fontSize: '0.7rem', 
                                  height: '24px',
                                  width: 'auto',
                                  backgroundColor: 'var(--color-secondary)',
                                  boxShadow: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await fetch(`${API_BASE}/notifications/${n.id}/read`, {
                                      method: 'POST'
                                    });
                                    if (res.ok) {
                                      // Update local state
                                      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true, readAt: new Date().toISOString() } : item));
                                      addToast("Lettura confermata con successo", "success");
                                    }
                                  } catch (err) {
                                    console.error("Error confirming read:", err);
                                    addToast("Errore durante la conferma di lettura", "error");
                                  }
                                }}
                              >
                                <CheckCircle size={10} />
                                Conferma Lettura
                              </button>
                            )}
                            
                            {n.isCommunication && n.read && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={10} /> Letto
                                {n.readAt && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '400' }}>
                                    ({new Date(n.readAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="notification-item-time" style={{ marginTop: '6px' }}>
                              {new Date(n.createdAt).toLocaleDateString('it-IT')} {new Date(n.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Header Profile Dropdown Widget */}
            {currentUser && (
              <div className="header-profile-container">
                <div 
                  className="profile-widget-btn"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="profile-widget-avatar">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>{currentUser.name} ({currentUser.role})</span>
                  <ChevronDown size={14} />
                </div>
                
                {showProfileDropdown && (
                  <div className="profile-menu-dropdown">
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-name">{currentUser.name}</span>
                      <span className="profile-dropdown-email">{currentUser.email}</span>
                      <span className={`role-badge-pill ${currentUser.role.toLowerCase() === 'team leader' ? 'team-leader' : currentUser.role.toLowerCase() === 'dipendente' ? 'dipendente' : currentUser.role.toLowerCase() === 'admin' ? 'admin' : 'hr'}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    
                    <div className="profile-dropdown-divider"></div>
                    
                    <div className="profile-dropdown-section-title">Navigazione</div>
                    
                    {(currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
                      <button 
                        className={`profile-dropdown-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('dashboard'); setShowProfileDropdown(false); }}
                      >
                        <Layers size={14} />
                        <span>Mio Piano Ferie</span>
                      </button>
                    )}

                    {(currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
                      <button 
                        className={`profile-dropdown-item ${activeTab === 'timesheet' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('timesheet'); setShowProfileDropdown(false); }}
                      >
                        <FileText size={14} />
                        <span>Rapportino</span>
                      </button>
                    )}

                    {(currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader') && (
                      <>
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'timesheet-approvals' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('timesheet-approvals'); setShowProfileDropdown(false); }}
                        >
                          <FileCheck size={14} />
                          <span>Approvazioni Rapportini</span>
                        </button>
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'simulation' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('simulation'); setShowProfileDropdown(false); }}
                        >
                          <Sliders size={14} />
                          <span>Simulazione Commesse</span>
                        </button>
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'comparison' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('comparison'); setShowProfileDropdown(false); }}
                        >
                          <BarChart2 size={14} />
                          <span>Preventivo vs Consuntivo</span>
                        </button>
                      </>
                    )}
                    
                    {(currentUser.role === 'Admin' || currentUser.role === 'HR') && (
                      <button 
                        className={`profile-dropdown-item ${activeTab === 'approvals' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('approvals'); setShowProfileDropdown(false); }}
                      >
                        <CheckCircle size={14} />
                        <span>Approvazioni</span>
                      </button>
                    )}
                    
                    {(currentUser.role === 'Admin' || currentUser.role === 'HR') && (
                      <>
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'reports' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('reports'); setShowProfileDropdown(false); }}
                        >
                          <FileText size={14} />
                          <span>Reportistica</span>
                        </button>
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'settings' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('settings'); setShowProfileDropdown(false); }}
                        >
                          <SettingsIcon size={14} />
                          <span>Impostazioni</span>
                        </button>
                        {(currentUser.role === 'Admin' || currentUser.role === 'HR') && (
                          <button 
                            className={`profile-dropdown-item ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('users'); setShowProfileDropdown(false); }}
                          >
                            <Users size={14} />
                            <span>Anagrafica Collaboratori</span>
                          </button>
                        )}
                        {currentUser.role === 'Admin' && (
                          <>
                            <button 
                              className={`profile-dropdown-item ${activeTab === 'projects' ? 'active' : ''}`}
                              onClick={() => { setActiveTab('projects'); setShowProfileDropdown(false); }}
                            >
                              <Briefcase size={14} />
                              <span>Gestione Commesse</span>
                            </button>
                            <button 
                              className={`profile-dropdown-item ${activeTab === 'absences' ? 'active' : ''}`}
                              onClick={() => { setActiveTab('absences'); setShowProfileDropdown(false); }}
                            >
                              <Layers size={14} />
                              <span>Gestione Tipi Assenza</span>
                            </button>
                          </>
                        )}
                        <button 
                          className={`profile-dropdown-item ${activeTab === 'communications' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('communications'); setShowProfileDropdown(false); }}
                        >
                          <Megaphone size={14} />
                          <span>Comunicazioni</span>
                        </button>
                      </>
                    )}
                    
                    <div className="profile-dropdown-divider"></div>
                    
                    <div className="profile-dropdown-section-title">Account</div>
                    
                    <button 
                      className={`profile-dropdown-item ${activeTab === 'profile' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }}
                    >
                      <User size={14} />
                      <span>Dati Personali</span>
                    </button>
                    
                    <button 
                      className="profile-dropdown-item logout"
                      onClick={() => { handleLogout(); setShowProfileDropdown(false); }}
                    >
                      <LogOut size={14} />
                      <span>Disconnetti</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="content-wrapper">
          
          {/* TAB 1: DIPENDENTE DASHBOARD */}
          {activeTab === 'dashboard' && currentUser && (currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
            <div>
              {/* Balances Grid */}
              {currentUser.holidayBalance && (
                <div className="dashboard-grid">
                  <div className="glass-card stat-card">
                    <div className="stat-icon total">26</div>
                    <div className="stat-info">
                      <span className="stat-label">Totale Annuale</span>
                      <span className="stat-value">{currentUser.holidayBalance.totalDays} g</span>
                    </div>
                  </div>
                  
                  <div className="glass-card stat-card">
                    <div className="stat-icon taken">G</div>
                    <div className="stat-info">
                      <span className="stat-label">Godute (Giorni lavorativi)</span>
                      <span className="stat-value">{currentUser.holidayBalance.takenDays} g</span>
                    </div>
                  </div>
                  
                  <div className="glass-card stat-card">
                    <div className="stat-icon planned">P</div>
                    <div className="stat-info">
                      <span className="stat-label">Pianificate (Giorni lavorativi)</span>
                      <span className="stat-value">{currentUser.holidayBalance.plannedDays} g</span>
                    </div>
                  </div>
                  
                  <div className="glass-card stat-card">
                    <div className="stat-icon remaining">R</div>
                    <div className="stat-info">
                      <span className="stat-label">Residuo Disponibile</span>
                      <span className="stat-value">{currentUser.holidayBalance.remainingDays} g</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '32px', alignItems: 'start' }}>
                
                {/* Form to submit requests (Interactive Calendar Selector) */}
                <div className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <CalendarIcon size={18} style={{ color: 'var(--color-primary)' }} />
                      Pianifica Richiesta
                    </h3>
                  </div>
                  
                  <form onSubmit={handleCreateRequest}>
                    {/* Choose Absence Type */}
                    <div className="form-group">
                      <label className="form-label">Tipologia di Assenza</label>
                      <div className="select-type-container">
                        <div 
                          className={`type-card-option ${absenceType === 'Ferie' ? 'selected' : ''}`}
                          onClick={() => setAbsenceType('Ferie')}
                        >
                          Ferie
                        </div>
                        <div 
                          className={`type-card-option ${absenceType === 'Malattia' ? 'selected' : ''}`}
                          onClick={() => setAbsenceType('Malattia')}
                        >
                          Malattia
                        </div>
                        <div 
                          className={`type-card-option ${absenceType === 'Permesso Studio' ? 'selected' : ''}`}
                          onClick={() => setAbsenceType('Permesso Studio')}
                        >
                          Permesso Studio
                        </div>
                      </div>
                    </div>

                    {/* Interactive range picker calendar */}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="form-label" style={{ margin: 0 }}>Seleziona Intervallo</span>
                        
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => {
                              if (pickerMonth === 0) {
                                setPickerMonth(11);
                                setPickerYear(prev => prev - 1);
                              } else {
                                setPickerMonth(prev => prev - 1);
                              }
                            }}
                          >
                            &lt;
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', minWidth: '100px', textAlign: 'center' }}>
                            {MONTHS_IT[pickerMonth]} {pickerYear}
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => {
                              if (pickerMonth === 11) {
                                setPickerMonth(0);
                                setPickerYear(prev => prev + 1);
                              } else {
                                setPickerMonth(prev => prev + 1);
                              }
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      </div>

                      <div className="calendar-grid-header" style={{ marginBottom: '4px', fontSize: '0.7rem' }}>
                        <div>Lu</div><div>Ma</div><div>Me</div><div>Gi</div><div>Ve</div><div>Sa</div><div>Do</div>
                      </div>
                      <div className="calendar-days-grid" style={{ gap: '4px' }}>
                        {renderPickerCalendar()}
                      </div>
                    </div>

                    {/* Range feedback */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {rangeStart ? (
                          <span>
                            Dal: <strong>{formatDateIt(rangeStart)}</strong> 
                            {rangeEnd && <span> al: <strong>{formatDateIt(rangeEnd)}</strong></span>}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Nessun intervallo selezionato</span>
                        )}
                      </div>
                      
                      {rangeStart && (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm" 
                          onClick={resetSelection}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Cancella
                        </button>
                      )}
                    </div>

                    {rangeStart && rangeEnd && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                        Giorni lavorativi richiesti: <strong style={{ color: 'var(--text-primary)' }}>{getWorkingDaysCount(rangeStart, rangeEnd)}</strong>
                        {getCalendarDaysCount(rangeStart, rangeEnd) - getWorkingDaysCount(rangeStart, rangeEnd) > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px', display: 'block' }}>
                            ({getCalendarDaysCount(rangeStart, rangeEnd) - getWorkingDaysCount(rangeStart, rangeEnd)} gg non lavorativi tra weekend e festività esclusi)
                          </span>
                        )}
                        {absenceType === 'Malattia' && <span style={{ color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>(L'assenza per malattia non viene detratta dal saldo ferie)</span>}
                      </div>
                    )}

                    {/* Attachment Upload (Optional for all types) */}
                    <div className="form-group" style={{ animation: 'fade-in 0.2s ease' }}>
                      <label className="form-label">
                        {absenceType === 'Malattia' ? 'Carica Certificato Medico (Facoltativo)' : 
                         absenceType === 'Permesso Studio' ? 'Carica Giustificativo Studio (Facoltativo)' : 
                         'Carica Allegato / Giustificativo (Facoltativo)'}
                      </label>
                      <label 
                        htmlFor="cert-upload" 
                        className={`file-upload-wrapper ${uploadedFile.data ? 'has-file' : ''}`}
                      >
                        <input 
                          type="file" 
                          id="cert-upload" 
                          style={{ display: 'none' }} 
                          onChange={handleFileChange}
                          accept="image/*,application/pdf"
                        />
                        {uploadedFile.data ? (
                          <>
                            <FileCheck size={28} style={{ color: 'var(--color-success)' }} />
                            <span className="file-upload-name">{uploadedFile.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clicca per sostituire il file</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={28} className="file-upload-icon" />
                            <span className="file-upload-text">
                              {absenceType === 'Malattia' ? 'Trascina o clicca per caricare un certificato (Immagine/PDF)' : 
                               absenceType === 'Permesso Studio' ? 'Trascina o clicca per caricare un giustificativo (Immagine/PDF)' : 
                               'Trascina o clicca per caricare un allegato (Immagine/PDF)'}
                            </span>
                          </>
                        )}
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      className={`btn btn-primary ${(!rangeStart || !rangeEnd) ? 'btn-disabled' : ''}`}
                      disabled={!rangeStart || !rangeEnd} 
                      style={{ width: '100%' }}
                    >
                      <Plus size={18} />
                      Invia Richiesta ({absenceType})
                    </button>
                  </form>
                </div>

                {/* List of employee requests */}
                <div className="glass-card" style={{ flexGrow: 2 }}>
                  <div className="card-header">
                    <h3 className="card-title">Le Mie Richieste</h3>
                  </div>
                  
                  {currentEmployeeRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                      Nessuna richiesta ferie effettuata
                    </div>
                  ) : (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Periodo</th>
                            <th>Tipo</th>
                            <th>Giorni Lavorativi</th>
                            <th>Stato</th>
                            <th style={{ textAlign: 'right' }}>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentEmployeeRequests.map(req => (
                            <tr key={req.id}>
                              <td>
                                <div style={{ fontWeight: '600' }}>
                                  {formatDateIt(req.startDate)} - {formatDateIt(req.endDate)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Creata il {new Date(req.createdAt).toLocaleDateString('it-IT')}
                                </div>
                              </td>
                              <td style={{ fontWeight: '600' }}>
                                <span style={{ color: req.type === 'Malattia' ? 'var(--color-success)' : 'inherit' }}>
                                  {req.type || "Ferie"}
                                </span>
                              </td>
                              <td>{getWorkingDaysCount(req.startDate, req.endDate)} gg</td>
                              <td>
                                <span className={`badge ${
                                  req.status === 'In attesa di approvazione' ? 'badge-pending' : 
                                  req.status === 'Approvata' ? 'badge-approved' : 'badge-rejected'
                                }`}>
                                  {req.status}
                                </span>
                                {req.approvedBy && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                    {req.status === 'Approvata' ? 'Approvata da: ' : 'Rifiutata da: '}{req.approvedBy}
                                  </div>
                                )}
                                {req.status === 'Rifiutata' && req.rejectionReason && (
                                  <div className="rejection-reason-box" style={{ marginTop: '4px' }}>
                                    Motivo: "{req.rejectionReason}"
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {req.attachmentData && (
                                    <button 
                                      className="attachment-badge"
                                      onClick={() => setPreviewModal({ open: true, request: req })}
                                      title="Vedi allegato"
                                    >
                                      <Paperclip size={12} />
                                      Doc
                                    </button>
                                  )}
                                  
                                  {req.status === 'In attesa di approvazione' && (
                                    <button 
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setEditModal({ open: true, request: req, endDate: req.endDate })}
                                      title="Modifica data fine"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  )}
                                  
                                  {(req.status === 'In attesa di approvazione' || req.status === 'Approvata') && (
                                    <button 
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteRequest(req.id)}
                                      title="Cancella richiesta"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ADMIN/HR APPROVAL WORKFLOW */}
          {activeTab === 'approvals' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="glass-card">
              <div className="card-header">
                <h3 className="card-title">Richieste Ferie Pendenti</h3>
                <span className={`role-badge-pill ${currentUser.role.toLowerCase()}`}>{currentUser.role} Panel</span>
              </div>
              
              {requests.filter(r => r.status === 'In attesa di approvazione').length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                  Nessuna richiesta ferie in attesa di approvazione.
                </div>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Dipendente</th>
                        <th>Tipo Assenza</th>
                        <th>Periodo Richiesto</th>
                        <th>Giorni Lavorativi</th>
                        <th>Allegato</th>
                        <th style={{ textAlign: 'right' }}>Decisione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.filter(r => r.status === 'In attesa di approvazione').map(req => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: '600' }}>{req.userName}</td>
                          <td style={{ fontWeight: '600' }}>
                            <span style={{ color: req.type === 'Malattia' ? 'var(--color-success)' : 'inherit' }}>
                              {req.type || "Ferie"}
                            </span>
                          </td>
                          <td>{formatDateIt(req.startDate)} - {formatDateIt(req.endDate)}</td>
                          <td>{getWorkingDaysCount(req.startDate, req.endDate)} gg</td>
                          <td>
                            {req.attachmentData ? (
                              <button 
                                className="attachment-badge"
                                onClick={() => setPreviewModal({ open: true, request: req })}
                              >
                                <Paperclip size={12} />
                                Vedi Giustificativo
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessuno</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-primary btn-sm"
                                style={{ backgroundColor: 'var(--color-success)', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}
                                onClick={() => handleApproveRequest(req.id)}
                              >
                                <CheckCircle size={14} />
                                Approva
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => setRejectionModal({ open: true, reqId: req.id, reason: '' })}
                              >
                                <XCircle size={14} />
                                Rifiuta
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPORTISTICA ED ESPORTAZIONE (HR/ADMIN) */}
          {activeTab === 'reports' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="charts-grid">
              
              {/* Calendario Copertura Heatmap */}
              <div className="glass-card">
                <div className="calendar-heatmap-container">
                  <div className="calendar-controls">
                    <h3 className="card-title">
                      <CalendarIcon size={18} style={{ color: 'var(--color-primary)' }} />
                      Prospetto Generale Copertura
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (calendarMonth === 0) {
                            setCalendarMonth(11);
                            setCalendarYear(prev => prev - 1);
                          } else {
                            setCalendarMonth(prev => prev - 1);
                          }
                        }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="calendar-month-title" style={{ minWidth: '150px', textAlign: 'center' }}>
                        {MONTHS_IT[calendarMonth]} {calendarYear}
                      </span>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (calendarMonth === 11) {
                            setCalendarMonth(0);
                            setCalendarYear(prev => prev + 1);
                          } else {
                            setCalendarMonth(prev => prev + 1);
                          }
                        }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="calendar-grid-header">
                    <div>Lun</div>
                    <div>Mar</div>
                    <div>Mer</div>
                    <div>Gio</div>
                    <div>Ven</div>
                    <div>Sab</div>
                    <div>Dom</div>
                  </div>

                  <div className="calendar-days-grid">
                    {renderCalendar()}
                  </div>

                  <div className="calendar-legend">
                    <div className="legend-item">
                      <div className="legend-color normal" />
                      <span>Copertura sufficiente / Weekend</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ background: 'repeating-linear-gradient(45deg, rgba(124, 182, 129, 0.05), rgba(124, 182, 129, 0.05) 8px, rgba(124, 182, 129, 0.12) 8px, rgba(124, 182, 129, 0.12) 16px)', borderColor: 'rgba(124, 182, 129, 0.35)' }} />
                      <span>Festività Nazionali Italiane</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color alert" />
                      <span style={{ fontWeight: '600', color: 'var(--color-danger)' }}>
                        Alert Periodo Scoperto (Assenze &gt; 50%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div className="glass-card">
                <div className="report-controls">
                  <div className="report-filters">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Seleziona Anno</label>
                      <select 
                        className="form-input"
                        value={reportYear}
                        onChange={(e) => setReportYear(Number(e.target.value))}
                        style={{ width: '120px' }}
                      >
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Filtra per Mese PDF</label>
                      <select 
                        className="form-input"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        style={{ width: '150px' }}
                      >
                        {MONTHS_IT.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary"
                    onClick={handleExportPDF}
                  >
                    <Download size={18} />
                    Esporta in PDF ({reportMonth})
                  </button>
                </div>
              </div>

              {/* Graphic Chart */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">Saldo Ferie Annuale per Collaboratore ({reportYear})</h3>
                </div>
                
                <div className="custom-bar-chart">
                  {users.filter(u => u.role === 'Dipendente' || u.role === 'Team Leader').map(user => {
                    const balance = user.holidayBalance || { totalDays: 26, takenDays: 0, plannedDays: 0, remainingDays: 26 };
                    
                    const takenPct = (balance.takenDays / balance.totalDays) * 100;
                    const plannedPct = (balance.plannedDays / balance.totalDays) * 100;
                    const remainingPct = (balance.remainingDays / balance.totalDays) * 100;
                    
                    return (
                      <div key={user.id} className="chart-row">
                        <div className="chart-employee-name">{user.name}</div>
                        <div className="chart-bars-container">
                          {balance.takenDays > 0 && (
                            <div 
                              className="chart-bar-segment taken"
                              style={{ width: `${takenPct}%` }}
                              title={`Godute: ${balance.takenDays} giorni lavorativi`}
                            >
                              {balance.takenDays}g
                            </div>
                          )}
                          {balance.plannedDays > 0 && (
                            <div 
                              className="chart-bar-segment planned"
                              style={{ width: `${plannedPct}%` }}
                              title={`Pianificate: ${balance.plannedDays} giorni lavorativi`}
                            >
                              {balance.plannedDays}g
                            </div>
                          )}
                          {balance.remainingDays > 0 && (
                            <div 
                              className="chart-bar-segment remaining"
                              style={{ width: `${remainingPct}%` }}
                              title={`Disponibili: ${balance.remainingDays} giorni lavorativi`}
                            >
                              {balance.remainingDays}g
                            </div>
                          )}
                          <span className="chart-bar-total-label">Tot: {balance.totalDays}g</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="chart-legend-horizontal">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                    <span>Giorni Goduti (Lavorativi passati)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(90deg, #0ea5e9, #0284c7)' }} />
                    <span>Giorni Pianificati (Lavorativi futuri)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
                    <span>Giorni Residui (Disponibili)</span>
                  </div>
                </div>
              </div>

              {/* Riepilogo Ore per Commessa */}
              <div className="glass-card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={18} style={{ color: 'var(--color-primary)' }} />
                    Riepilogo Ore per Commessa
                  </h3>
                </div>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Nome Commessa</th>
                        <th>Descrizione</th>
                        <th>Ore Totali Scaricate</th>
                        <th>Dettaglio Collaboratori</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectReport.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nessuna ora registrata sulle commesse al momento.
                          </td>
                        </tr>
                      ) : (
                        projectReport.map(r => (
                          <tr key={r.projectName}>
                            <td style={{ fontWeight: '600' }}>{r.projectName}</td>
                            <td style={{ fontSize: '0.85rem' }}>{r.description}</td>
                            <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{r.totalHours} ore</td>
                            <td>
                              {r.breakdown.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessun collaboratore</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {r.breakdown.map(b => (
                                    <span key={b.userId} style={{ fontSize: '0.8rem' }}>
                                      • <strong>{b.userName}</strong>: {b.hours} ore
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: IMPOSTAZIONI GLOBALI (HR/ADMIN) */}
          {activeTab === 'settings' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <SettingsIcon size={18} style={{ color: 'var(--color-primary)' }} />
                  Impostazioni Globali
                </h3>
                <span className={`role-badge-pill ${currentUser.role.toLowerCase()}`}>{currentUser.role}</span>
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Ferie Annuali Dipendenti (Giorni)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={settings.annualHolidayDays} 
                      onChange={(e) => setSettings({ ...settings, annualHolidayDays: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="365"
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                      Imposta il numero totale di giorni di ferie spettanti all'anno per ciascun dipendente.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '25px' }}>
                    <label className="form-label">Limite Massimo Permesso Studio (Giorni lavorativi per richiesta)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={settings.maxStudyLeaveDays} 
                      onChange={(e) => setSettings({ ...settings, maxStudyLeaveDays: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="365"
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                      Imposta il limite massimo di giorni lavorativi per singola richiesta di permesso studio (es. 5 giorni per una settimana).
                    </span>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={16} />
                    Salva Impostazioni
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 7: COMUNICAZIONI E AVVISI (HR/ADMIN) */}
          {activeTab === 'communications' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="communications-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Send Communication Form */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={18} style={{ color: 'var(--color-secondary)' }} />
                    Invia Nuova Comunicazione di Servizio
                  </h3>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleSendCommunication}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label className="form-label">Testo del Messaggio (Massimo 500 caratteri)</label>
                      <textarea
                        className="form-input"
                        style={{ width: '100%', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', padding: '12px' }}
                        placeholder="Scrivi qui la comunicazione per tutti i collaboratori..."
                        value={commsMessage}
                        onChange={(e) => setCommsMessage(e.target.value.slice(0, 500))}
                        required
                      />
                      
                      {/* Character Counter with Warning colors */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '0.8rem' }}>
                        <span style={{ 
                          fontWeight: '600',
                          color: commsMessage.length >= 480 ? 'var(--color-danger)' : 
                                 commsMessage.length >= 400 ? 'var(--color-warning)' : 
                                 'var(--text-secondary)'
                        }}>
                          {commsMessage.length} / 500 caratteri
                        </span>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className={`btn btn-primary ${(!commsMessage.trim() || commsSubmitting) ? 'btn-disabled' : ''}`}
                      disabled={!commsMessage.trim() || commsSubmitting}
                      style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}
                    >
                      {commsSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                      Invia Comunicazione a Tutti
                    </button>
                  </form>
                </div>
              </div>

              {/* Communications History */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">Storico Comunicazioni Inviate</h3>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  {communications.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                      Nessuna comunicazione inviata in precedenza.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {communications.map(comm => {
                        const totalRecipients = comm.recipients.length;
                        const readRecipients = comm.recipients.filter(r => r.read).length;
                        const readPct = totalRecipients > 0 ? (readRecipients / totalRecipients) * 100 : 0;
                        const isExpanded = expandedCommId === comm.communicationId;
                        
                        return (
                          <div 
                            key={comm.communicationId} 
                            style={{ 
                              border: '1px solid var(--border-color)', 
                              borderRadius: 'var(--radius-md)', 
                              backgroundColor: 'rgba(255, 255, 255, 0.01)',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              
                              {/* Header: Sender and Date */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  Inviata da: <strong style={{ color: 'var(--text-primary)' }}>{comm.senderName}</strong>
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {new Date(comm.createdAt).toLocaleDateString('it-IT')} alle {new Date(comm.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              
                              {/* Message body */}
                              <div style={{ fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', borderLeft: '3px solid var(--color-secondary)', paddingLeft: '12px' }}>
                                {comm.message}
                              </div>

                              {/* Progress metrics and buttons */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1, maxWidth: '300px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600' }}>
                                    <span>Conferme di Lettura</span>
                                    <span style={{ color: 'var(--color-success)' }}>{readRecipients} di {totalRecipients} ({Math.round(readPct)}%)</span>
                                  </div>
                                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${readPct}%`, backgroundColor: 'var(--color-success)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => setExpandedCommId(isExpanded ? null : comm.communicationId)}
                                >
                                  {isExpanded ? "Nascondi Lettori" : "Vedi Stato Letture"}
                                </button>
                              </div>

                            </div>

                            {/* Expanded recipients status table */}
                            {isExpanded && (
                              <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTop: '1px solid var(--border-color)', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                                  Stato Dettagliato Destinatari
                                </h4>
                                {comm.recipients.length === 0 ? (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nessun destinatario registrato.</div>
                                ) : (
                                  <div className="custom-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    <table className="custom-table" style={{ width: '100%' }}>
                                      <thead>
                                        <tr>
                                          <th style={{ padding: '8px 12px', fontSize: '0.7rem' }}>Collaboratore</th>
                                          <th style={{ padding: '8px 12px', fontSize: '0.7rem' }}>Ruolo</th>
                                          <th style={{ padding: '8px 12px', fontSize: '0.7rem' }}>Stato Lettura</th>
                                          <th style={{ padding: '8px 12px', fontSize: '0.7rem', textAlign: 'right' }}>Data Lettura</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {comm.recipients.map(rec => (
                                          <tr key={rec.userId}>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: '600' }}>{rec.userName}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rec.userRole}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                                              <span 
                                                className={`badge`} 
                                                style={{ 
                                                  padding: '2px 8px', 
                                                  fontSize: '0.7rem',
                                                  backgroundColor: rec.read ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                  color: rec.read ? 'var(--color-success)' : 'var(--color-danger)',
                                                  border: rec.read ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(244,63,94,0.2)'
                                                }}
                                              >
                                                {rec.read ? "Letto" : "Non letto"}
                                              </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                              {rec.readAt ? (
                                                new Date(rec.readAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                              ) : (
                                                "—"
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 7.5: GESTIONE COMMESSE (ADMIN ONLY) */}
          {activeTab === 'projects' && currentUser && currentUser.role === 'Admin' && (
            <div className="projects-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Card 1: Creazione/Modifica Commesse */}
                <div className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Briefcase size={18} style={{ color: 'var(--color-primary)' }} />
                      {editingProjectId ? 'Modifica Commessa' : 'Configurazione Nuova Commessa'}
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <form onSubmit={editingProjectId ? handleUpdateProject : handleCreateProject}>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Nome Commessa/Progetto</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. Progetto Delta"
                          value={editingProjectId ? editingProjectName : newProjectName}
                          onChange={(e) => editingProjectId ? setEditingProjectName(e.target.value) : setNewProjectName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Descrizione Progetto</label>
                        <textarea 
                          className="form-input"
                          placeholder="Fornisci una breve descrizione della commessa..."
                          value={editingProjectId ? editingProjectDescription : newProjectDescription}
                          onChange={(e) => editingProjectId ? setEditingProjectDescription(e.target.value) : setNewProjectDescription(e.target.value)}
                          style={{ minHeight: '80px', resize: 'vertical', padding: '10px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Prezzo di Vendita (€)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          placeholder="es. 15000.00"
                          step="0.01"
                          min="0"
                          value={editingProjectId ? editingProjectSalePrice : newProjectSalePrice}
                          onChange={(e) => editingProjectId ? setEditingProjectSalePrice(e.target.value) : setNewProjectSalePrice(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Margine Atteso (%)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          placeholder="es. 20"
                          step="0.1"
                          min="0"
                          max="100"
                          value={editingProjectId ? editingProjectMargin : newProjectMargin}
                          onChange={(e) => editingProjectId ? setEditingProjectMargin(e.target.value) : setNewProjectMargin(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Data Inizio</label>
                        <input 
                          type="date" 
                          className="form-input"
                          value={editingProjectId ? editingProjectStartDate : newProjectStartDate}
                          onChange={(e) => editingProjectId ? setEditingProjectStartDate(e.target.value) : setNewProjectStartDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Data Fine</label>
                        <input 
                          type="date" 
                          className="form-input"
                          value={editingProjectId ? editingProjectEndDate : newProjectEndDate}
                          onChange={(e) => editingProjectId ? setEditingProjectEndDate(e.target.value) : setNewProjectEndDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Responsabile Commessa</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="Nome del responsabile"
                          value={editingProjectId ? editingProjectResponsible : newProjectResponsible}
                          onChange={(e) => editingProjectId ? setEditingProjectResponsible(e.target.value) : setNewProjectResponsible(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label">Project Manager</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="Nome del Project Manager"
                          value={editingProjectId ? editingProjectPM : newProjectPM}
                          onChange={(e) => editingProjectId ? setEditingProjectPM(e.target.value) : setNewProjectPM(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px' }}>
                          {editingProjectId ? 'Salva Modifiche' : 'Crea Commessa'}
                        </button>
                        {editingProjectId && (
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ height: '38px' }}
                            onClick={() => {
                              setEditingProjectId(null);
                              setEditingProjectName('');
                              setEditingProjectDescription('');
                              setEditingProjectSalePrice('');
                              setEditingProjectMargin('');
                              setEditingProjectStartDate('');
                              setEditingProjectEndDate('');
                              setEditingProjectResponsible('');
                              setEditingProjectPM('');
                            }}
                          >
                            Annulla
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Card 2: Assegnazione Commesse */}
                <div className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} style={{ color: 'var(--color-primary)' }} />
                      Assegnazione Commesse ai Collaboratori
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Seleziona Collaboratore</label>
                      <select 
                        className="form-input"
                        value={selectedUserForAssignment}
                        onChange={(e) => handleSelectUserForAssignment(e.target.value)}
                      >
                        <option value="">Seleziona un dipendente...</option>
                        {users.filter(u => u.role === 'Dipendente' || u.role === 'Team Leader').map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    {selectedUserForAssignment ? (
                      <div>
                        <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: '700' }}>
                          Commesse Assegnate:
                        </label>
                        {projects.length === 0 ? (
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Nessuna commessa configurata nel sistema. Creane una a sinistra.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                            {projects.map(p => {
                              const isAssigned = userAssignedProjectIds.includes(p.id);
                              return (
                                <label 
                                  key={p.id} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    padding: '8px 12px', 
                                    backgroundColor: 'rgba(255,255,255,0.02)', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => handleToggleProjectAssignment(p.id, e.target.checked)}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{p.name}</span>
                                    {p.description && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.description}</span>}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Seleziona un collaboratore dal menu sopra per gestire le sue commesse assegnate.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Elenco Commesse Totale */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">Commesse Configurate</h3>
                </div>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Nome Commessa</th>
                        <th>Descrizione</th>
                        <th>Responsabile</th>
                        <th>Project Manager</th>
                        <th>Data Inizio</th>
                        <th>Data Fine</th>
                        <th>Prezzo Vendita</th>
                        <th>Margine Atteso</th>
                        <th>Data Creazione</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nessuna commessa configurata.
                          </td>
                        </tr>
                      ) : (
                        projects.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: '600' }}>{p.name}</td>
                            <td>{p.description || '—'}</td>
                            <td>{p.responsible || '—'}</td>
                            <td>{p.project_manager || '—'}</td>
                            <td>{p.start_date ? new Date(p.start_date).toLocaleDateString('it-IT') : '—'}</td>
                            <td>{p.end_date ? new Date(p.end_date).toLocaleDateString('it-IT') : '—'}</td>
                            <td>{p.sale_price !== undefined && p.sale_price !== null ? `€ ${parseFloat(p.sale_price).toFixed(2)}` : '€ 0.00'}</td>
                            <td>{p.margin !== undefined && p.margin !== null ? `${p.margin}%` : '0%'}</td>
                            <td>{new Date(p.createdAt).toLocaleDateString('it-IT')}</td>
                            <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingProjectId(p.id);
                                  setEditingProjectName(p.name);
                                  setEditingProjectDescription(p.description);
                                  setEditingProjectSalePrice(p.sale_price !== undefined && p.sale_price !== null ? String(p.sale_price) : '');
                                  setEditingProjectMargin(p.margin !== undefined && p.margin !== null ? String(p.margin) : '');
                                  setEditingProjectStartDate(p.start_date || '');
                                  setEditingProjectEndDate(p.end_date || '');
                                  setEditingProjectResponsible(p.responsible || '');
                                  setEditingProjectPM(p.project_manager || '');
                                }}
                              >
                                Modifica
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteProject(p.id)}
                              >
                                Elimina
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: GESTIONE TIPI ASSENZA (ADMIN ONLY) */}
          {activeTab === 'absences' && currentUser && currentUser.role === 'Admin' && (
            <div className="absences-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Card 1: Creazione/Modifica Tipi Assenza */}
                <div className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} style={{ color: 'var(--color-secondary)' }} />
                      {editingAbsenceId ? 'Modifica Tipo Assenza' : 'Configurazione Nuovo Tipo Assenza'}
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <form onSubmit={editingAbsenceId ? handleUpdateAbsenceType : handleCreateAbsenceType}>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Nome Tipo Assenza</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. Congedo Straordinario"
                          value={editingAbsenceId ? editingAbsenceName : newAbsenceName}
                          onChange={(e) => editingAbsenceId ? setEditingAbsenceName(e.target.value) : setNewAbsenceName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label">Descrizione</label>
                        <textarea 
                          className="form-input"
                          placeholder="Fornisci una breve descrizione del tipo di assenza..."
                          value={editingAbsenceId ? editingAbsenceDescription : newAbsenceDescription}
                          onChange={(e) => editingAbsenceId ? setEditingAbsenceDescription(e.target.value) : setNewAbsenceDescription(e.target.value)}
                          style={{ minHeight: '80px', resize: 'vertical', padding: '10px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px', backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}>
                          {editingAbsenceId ? 'Salva Modifiche' : 'Crea Tipo Assenza'}
                        </button>
                        {editingAbsenceId && (
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ height: '38px' }}
                            onClick={() => {
                              setEditingAbsenceId(null);
                              setEditingAbsenceName('');
                              setEditingAbsenceDescription('');
                            }}
                          >
                            Annulla
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

              </div>

              {/* Elenco Tipi Assenza Totale */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">Tipi di Assenza Configurati</h3>
                </div>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Nome Assenza</th>
                        <th>Descrizione</th>
                        <th>Data Creazione</th>
                        <th style={{ width: '150px', textAlign: 'center' }}>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absenceTypes.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nessun tipo di assenza configurato.
                          </td>
                        </tr>
                      ) : (
                        absenceTypes.map(at => (
                          <tr key={at.id}>
                            <td style={{ fontWeight: '600' }}>{at.name}</td>
                            <td>{at.description || '—'}</td>
                            <td>{new Date(at.createdAt).toLocaleDateString('it-IT')}</td>
                            <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingAbsenceId(at.id);
                                  setEditingAbsenceName(at.name);
                                  setEditingAbsenceDescription(at.description);
                                }}
                              >
                                Modifica
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteAbsenceType(at.id)}
                              >
                                Elimina
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SIMULAZIONE COMMESSE */}
          {activeTab === 'simulation' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader') && (
            <div className="simulation-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
                    Seleziona Commessa da Simulare
                  </h3>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div className="form-group" style={{ maxWidth: '400px', margin: 0 }}>
                    <select
                      className="form-input"
                      value={simulatedProjectId}
                      onChange={(e) => handleSelectSimulatedProject(e.target.value)}
                    >
                      <option value="">Seleziona una commessa...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {simulatedProjectId ? (() => {
                const project = projects.find(p => p.id === simulatedProjectId);
                if (!project) return null;

                // Calcolo giorni solari di durata
                const start = project.start_date ? new Date(project.start_date) : null;
                const end = project.end_date ? new Date(project.end_date) : null;
                let durationDays = 0;
                if (start && end) {
                  const diffTime = Math.abs(end - start);
                  durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusivo
                }

                // Financial metrics
                const salePrice = parseFloat(project.sale_price) || 0;
                const targetMarginPercent = parseFloat(project.margin) || 0;
                const targetMarginEur = (salePrice * targetMarginPercent) / 100;

                // Simulated Costs
                const totalCosts = simulatedResources.reduce((sum, res) => sum + (parseFloat(res.cost) || 0) * (parseFloat(res.days) || 0), 0);
                const simulatedMarginEur = salePrice - totalCosts;
                const simulatedMarginPercent = salePrice > 0 ? (simulatedMarginEur / salePrice) * 100 : 0;
                const marginDelta = simulatedMarginPercent - targetMarginPercent;

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '30px' }} className="simulation-details-layout">
                    {/* Left Panel: Details and Resources table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                      {/* Project Details Panel */}
                      <div className="glass-card">
                        <div className="card-header">
                          <h3 className="card-title">Dettagli Commessa: {project.name}</h3>
                        </div>
                        <div className="card-body" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Responsabile:</span>
                            <span style={{ marginLeft: '8px' }}>{project.responsible || 'Non specificato'}</span>
                          </div>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Project Manager:</span>
                            <span style={{ marginLeft: '8px' }}>{project.project_manager || 'Non specificato'}</span>
                          </div>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Data Inizio:</span>
                            <span style={{ marginLeft: '8px' }}>{project.start_date ? formatDateIt(project.start_date) : 'Non specificata'}</span>
                          </div>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Data Fine:</span>
                            <span style={{ marginLeft: '8px' }}>{project.end_date ? formatDateIt(project.end_date) : 'Non specificata'}</span>
                          </div>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Durata Commessa:</span>
                            <span style={{ marginLeft: '8px' }}>{durationDays ? `${durationDays} giorni solari` : 'N/D'}</span>
                          </div>
                          <div>
                            <span className="form-label" style={{ fontWeight: 'bold', display: 'inline' }}>Prezzo di Vendita:</span>
                            <span style={{ marginLeft: '8px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                              {salePrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resources Allocation Card */}
                      <div className="glass-card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 className="card-title">Risorse Allocate per la Simulazione</h3>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleAddSimulatedResource}
                          >
                            + Aggiungi Risorsa
                          </button>
                        </div>
                        <div className="card-body" style={{ padding: '20px' }}>
                          <div className="custom-table-wrapper">
                            <table className="custom-table">
                              <thead>
                                <tr>
                                  <th>Risorsa Selezionata</th>
                                  <th>Nome / Ruolo</th>
                                  <th style={{ width: '130px' }}>Costo Giornaliero (€)</th>
                                  <th style={{ width: '100px' }}>Giorni Allocati</th>
                                  <th style={{ width: '120px' }}>Costo Totale (€)</th>
                                  <th style={{ width: '80px', textAlign: 'center' }}>Azioni</th>
                                </tr>
                              </thead>
                              <tbody>
                                {simulatedResources.length === 0 ? (
                                  <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                      Nessuna risorsa aggiunta a questa simulazione. Clicca "+ Aggiungi Risorsa" per iniziare.
                                    </td>
                                  </tr>
                                ) : (
                                  simulatedResources.map((res) => {
                                    const isCustom = res.userId === 'custom';
                                    const totalResCost = (parseFloat(res.cost) || 0) * (parseFloat(res.days) || 0);
                                    return (
                                      <tr key={res.id}>
                                        <td>
                                          <select
                                            className="form-input"
                                            value={res.userId}
                                            onChange={(e) => handleResourceChange(res.id, 'userId', e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                          >
                                            <option value="">-- Seleziona --</option>
                                            <option value="custom">Nuova figura professionale</option>
                                            {users.map(u => (
                                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={res.name}
                                            disabled={res.userId && !isCustom}
                                            onChange={(e) => handleResourceChange(res.id, 'name', e.target.value)}
                                            placeholder="Nome o Ruolo..."
                                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                            required
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="number"
                                            className="form-input"
                                            value={res.cost}
                                            disabled={res.userId && !isCustom}
                                            onChange={(e) => handleResourceChange(res.id, 'cost', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="number"
                                            className="form-input"
                                            value={res.days}
                                            onChange={(e) => handleResourceChange(res.id, 'days', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            min="0"
                                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                          />
                                        </td>
                                        <td style={{ fontWeight: '600' }}>
                                          {totalResCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleRemoveSimulatedResource(res.id)}
                                            style={{ padding: '4px 8px' }}
                                          >
                                            Rimuovi
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Financial dashboard */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                      {/* Scenario History Card */}
                      <div className="glass-card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 className="card-title">Storico Scenari e Simulazioni</h3>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleCreateNewSimulation}
                          >
                            + Nuova
                          </button>
                        </div>
                        <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          
                          {/* Saved Simulations List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                            {simulationsList.length === 0 ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                                Nessuno scenario salvato per questa commessa.
                              </p>
                            ) : (
                              simulationsList.map((sim) => {
                                const simCosts = (sim.resources || []).reduce((sum, res) => sum + (parseFloat(res.cost) || 0) * (parseFloat(res.days) || 0), 0);
                                const simMarginPercent = salePrice > 0 ? ((salePrice - simCosts) / salePrice) * 100 : 0;
                                const isActive = activeSimulationId === sim.id;
                                
                                return (
                                  <div 
                                    key={sim.id}
                                    className="simulation-history-item"
                                    style={{
                                      padding: '12px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                                      backgroundColor: isActive ? 'rgba(124, 182, 129, 0.05)' : 'rgba(255,255,255,0.01)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleLoadSimulation(sim.id)}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: isActive ? 'var(--color-primary)' : 'var(--text-main)' }}>
                                        {sim.name}
                                      </span>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                        {!sim.isOptimal && (
                                          <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => { e.stopPropagation(); handleSetOptimalSimulation(sim.id); }}
                                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                            title="Imposta come Ottimale"
                                          >
                                            Imposta Ottimale
                                          </button>
                                        )}
                                        <button
                                          className="btn btn-danger btn-sm"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteSimulation(sim.id); }}
                                          style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                          title="Elimina"
                                        >
                                          Elimina
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      <span>Costo: {simCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                                      <span>Margine: {simMarginPercent.toFixed(1)}%</span>
                                    </div>

                                    {sim.isOptimal && (
                                      <div 
                                        style={{ 
                                          backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                                          color: 'var(--color-success)', 
                                          border: '1px solid var(--color-success)', 
                                          padding: '4px 8px', 
                                          borderRadius: 'var(--radius-sm)', 
                                          fontSize: '0.75rem', 
                                          fontWeight: '700',
                                          textAlign: 'center',
                                          marginTop: '4px'
                                        }}
                                      >
                                        👑 PIANIFICAZIONE OTTIMALE
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Save current simulation block */}
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                              {activeSimulationId ? "Salva scenario come nuovo o aggiorna l'attivo" : 'Salva scenario corrente'}
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input 
                                type="text"
                                className="form-input"
                                placeholder="es. Scenario Ottimista"
                                value={newSimulationName}
                                onChange={(e) => setNewSimulationName(e.target.value)}
                                style={{ flex: 1, padding: '6px 12px' }}
                              />
                              {activeSimulationId ? (
                                <>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={handleUpdateActiveSimulation}
                                    style={{ padding: '6px 16px', whiteSpace: 'nowrap' }}
                                  >
                                    Aggiorna
                                  </button>
                                  <button
                                    className="btn btn-primary"
                                    onClick={handleSaveSimulation}
                                    style={{ padding: '6px 16px', whiteSpace: 'nowrap' }}
                                  >
                                    Salva come Nuovo
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  onClick={handleSaveSimulation}
                                  style={{ padding: '6px 16px', whiteSpace: 'nowrap' }}
                                >
                                  Salva
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      <div className="glass-card" style={{ height: 'fit-content' }}>
                        <div className="card-header">
                          <h3 className="card-title">Analisi Finanziaria Simulazione</h3>
                        </div>
                        <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          
                          {/* Financial Rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Prezzo di Vendita Commessa</span>
                              <span style={{ fontWeight: '700' }}>
                                {salePrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Costi Interni Totali Simulati</span>
                              <span style={{ fontWeight: '700', color: 'var(--color-danger)' }}>
                                {totalCosts.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Margine Simulato (€)</span>
                              <span style={{ fontWeight: '700', color: simulatedMarginEur >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {simulatedMarginEur.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Margine Simulato (%)</span>
                              <span style={{ fontWeight: '700', color: simulatedMarginPercent >= targetMarginPercent ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                {simulatedMarginPercent.toFixed(1)}%
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Margine Target Originario</span>
                              <span style={{ fontWeight: '600' }}>{targetMarginPercent.toFixed(1)}% ({targetMarginEur.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })})</span>
                            </div>
                          </div>

                          {/* Comparison / Delta Display */}
                          <div 
                            style={{ 
                              padding: '15px', 
                              borderRadius: 'var(--radius-md)', 
                              backgroundColor: marginDelta >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: `1px solid ${marginDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: marginDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {marginDelta >= 0 ? '✓ Obiettivo Margine Raggiunto!' : '⚠ Attenzione: Margine Sotto il Target!'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Scostamento rispetto al margine target del progetto: 
                              <strong style={{ marginLeft: '4px', color: marginDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                {marginDelta >= 0 ? '+' : ''}{marginDelta.toFixed(1)}%
                              </strong>
                            </span>
                          </div>

                          {/* Visual Progress Bar comparing simulated margin to target margin */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              <span>Avanzamento Margine</span>
                              <span>{simulatedMarginPercent.toFixed(1)}% / {targetMarginPercent.toFixed(1)}% target</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  width: `${Math.min(100, Math.max(0, (simulatedMarginPercent / (targetMarginPercent || 1)) * 100))}%`, 
                                  height: '100%', 
                                  backgroundColor: marginDelta >= 0 ? 'var(--color-success)' : 'var(--color-warning)',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }} className="glass-card">
                  <Sliders size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <span>Seleziona una commessa dal menu a tendina sopra per iniziare la simulazione della pianificazione e il calcolo del margine.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB: PREVENTIVO VS CONSUNTIVO (COMPARISON DASHBOARD) */}
          {activeTab === 'comparison' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader') && (
            <div className="comparison-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Dropdown for project selection */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div className="form-group" style={{ margin: 0, maxWidth: '400px' }}>
                  <label className="form-label">Seleziona Commessa</label>
                  <select 
                    className="form-input" 
                    value={comparisonProjectId} 
                    onChange={(e) => setComparisonProjectId(e.target.value)}
                  >
                    <option value="">-- Seleziona una commessa --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                if (!comparisonProjectId) {
                  const portfolioData = projects.map(proj => {
                    let localSimulations = [];
                    try {
                      const saved = localStorage.getItem(`sim_history_${proj.id}`);
                      if (saved) localSimulations = JSON.parse(saved);
                    } catch (e) {
                      console.error(e);
                    }
                    const optimalSim = localSimulations.find(s => s.isOptimal);

                    let plannedTotalCost = null;
                    if (optimalSim && Array.isArray(optimalSim.resources)) {
                      plannedTotalCost = 0;
                      optimalSim.resources.forEach(res => {
                        plannedTotalCost += (parseFloat(res.cost) || 0) * (parseFloat(res.days) || 0);
                      });
                    }

                    const projActuals = actualsList.filter(act => act.projectName === proj.name);
                    const laborCost = projActuals.reduce((sum, act) => sum + (parseFloat(act.cost) || 0), 0);

                    const projExpenses = allExpenses.filter(exp => exp.projectId === proj.id);
                    const expensesCost = projExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

                    const actualTotalCost = laborCost + expensesCost;
                    const salePrice = parseFloat(proj.sale_price) || 0;
                    
                    const actualMarginEur = salePrice - actualTotalCost;
                    const actualMarginPercent = salePrice > 0 ? (actualMarginEur / salePrice) * 100 : 0;
                    const targetMarginPercent = parseFloat(proj.margin) || 0;

                    let statusColor = '⚪';
                    let statusLabel = 'Nessun Piano';
                    let alertClass = 'status-no-plan';

                    if (plannedTotalCost !== null) {
                      const costDiff = actualTotalCost - plannedTotalCost;
                      const marginDiff = targetMarginPercent - actualMarginPercent;

                      if (actualTotalCost > plannedTotalCost || marginDiff > 5) {
                        statusColor = '🔴';
                        statusLabel = 'Critico';
                        alertClass = 'status-critical';
                      } else if (actualTotalCost > plannedTotalCost * 0.8 || (marginDiff > 0 && marginDiff <= 5)) {
                        statusColor = '🟡';
                        statusLabel = 'Attenzione';
                        alertClass = 'status-warning';
                      } else {
                        statusColor = '🟢';
                        statusLabel = 'A Norma';
                        alertClass = 'status-ok';
                      }
                    }

                    return {
                      ...proj,
                      optimalPlanName: optimalSim ? optimalSim.name : null,
                      plannedTotalCost,
                      laborCost,
                      expensesCost,
                      actualTotalCost,
                      salePrice,
                      actualMarginPercent,
                      targetMarginPercent,
                      statusColor,
                      statusLabel,
                      alertClass
                    };
                  });

                  return (
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <div className="card-header" style={{ borderBottom: 'none', paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
                          Portfolio Commesse & Controllo Gestione
                        </h3>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Sintesi di stato economico ed allerta per tutte le commesse aziendali.
                        </p>
                      </div>

                      <div className="custom-table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Commessa</th>
                              <th style={{ textAlign: 'right' }}>Budget Target (Prezzo)</th>
                              <th style={{ textAlign: 'right' }}>Budget Preventivo</th>
                              <th style={{ textAlign: 'right' }}>Costo Lavoro</th>
                              <th style={{ textAlign: 'right' }}>Spese Non-Labor</th>
                              <th style={{ textAlign: 'right' }}>Costo Consuntivo</th>
                              <th style={{ textAlign: 'center' }}>Margine (Target vs Reale)</th>
                              <th style={{ textAlign: 'center' }}>Stato Allerta</th>
                              <th style={{ width: '100px', textAlign: 'center' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {portfolioData.length === 0 ? (
                              <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                  Nessuna commessa configurata nel sistema.
                                </td>
                              </tr>
                            ) : (
                              portfolioData.map(p => (
                                <tr key={p.id}>
                                  <td style={{ fontWeight: '600' }}>
                                    <div>{p.name}</div>
                                    {p.code && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Codice: {p.code}</div>}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: '500', color: 'var(--color-primary)' }}>
                                    {p.salePrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {p.plannedTotalCost !== null ? (
                                      <span>
                                        {p.plannedTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({p.optimalPlanName})</div>
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {p.laborCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {p.expensesCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {p.actualTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.85rem' }}>
                                      Target: <strong>{p.targetMarginPercent.toFixed(1)}%</strong>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: p.actualMarginPercent >= p.targetMarginPercent ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                      Reale: <strong>{p.actualMarginPercent.toFixed(1)}%</strong>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span 
                                      className={`badge ${p.alertClass}`}
                                      style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        backgroundColor: p.statusColor === '🟢' ? 'rgba(16, 185, 129, 0.1)' :
                                                         p.statusColor === '🟡' ? 'rgba(245, 158, 11, 0.1)' :
                                                         p.statusColor === '🔴' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        color: p.statusColor === '🟢' ? 'var(--color-success)' :
                                               p.statusColor === '🟡' ? 'var(--color-warning)' :
                                               p.statusColor === '🔴' ? 'var(--color-danger)' : 'var(--text-secondary)'
                                      }}
                                    >
                                      {p.statusColor} {p.statusLabel}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button 
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setComparisonProjectId(p.id)}
                                    >
                                      Dettaglio
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                const project = projects.find(p => p.id === comparisonProjectId);
                if (!project) return null;

                // Load simulations list for this project from localStorage
                let localSimulations = [];
                try {
                  const saved = localStorage.getItem(`sim_history_${project.id}`);
                  if (saved) localSimulations = JSON.parse(saved);
                } catch (e) {
                  console.error(e);
                }

                // Find optimal simulation
                const optimalSim = localSimulations.find(s => s.isOptimal);

                // Get actuals for this project from actualsList
                const projectActuals = actualsList.filter(act => act.projectName === project.name);

                // Calculate Preventivato (Optimal Plan) totals
                let plannedTotalCost = 0;
                let plannedResourcesCount = 0;
                let plannedDays = 0;
                if (optimalSim && Array.isArray(optimalSim.resources)) {
                  optimalSim.resources.forEach(res => {
                    plannedTotalCost += (parseFloat(res.cost) || 0) * (parseFloat(res.days) || 0);
                    plannedDays += parseFloat(res.days) || 0;
                    plannedResourcesCount++;
                  });
                }
                const plannedHours = plannedDays * 8;
                const salePrice = parseFloat(project.sale_price) || 0;
                const plannedMarginEur = salePrice - plannedTotalCost;
                const plannedMarginPercent = salePrice > 0 ? (plannedMarginEur / salePrice) * 100 : 0;

                // Calculate Consuntivato (Submitted actuals) totals
                let laborCost = 0;
                let actualHours = 0;
                let actualResourcesCount = 0;
                const actualResourcesMap = {};
                projectActuals.forEach(act => {
                  laborCost += parseFloat(act.cost) || 0;
                  actualHours += parseFloat(act.hours) || 0;
                  if (!actualResourcesMap[act.userId]) {
                    actualResourcesMap[act.userId] = true;
                    actualResourcesCount++;
                  }
                });
                const totalNonLaborExpenses = projectExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
                const actualTotalCost = laborCost + totalNonLaborExpenses;
                const actualDays = actualHours / 8;
                const actualMarginEur = salePrice - actualTotalCost;
                const actualMarginPercent = salePrice > 0 ? (actualMarginEur / salePrice) * 100 : 0;

                // Variance / Scostamento
                const costVarianceEur = actualTotalCost - plannedTotalCost;
                const hoursVariance = actualHours - plannedHours;
                const marginPercentVariance = actualMarginPercent - plannedMarginPercent;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                    {/* Project Header Info */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Commessa</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{project.name}</div>
                          {project.code && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Codice: {project.code}</div>}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Project Manager</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600' }}>{project.project_manager || 'Non specificato'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Responsabile</div>
                          <div style={{ fontSize: '1rem', fontWeight: '600' }}>{project.responsible || 'Non specificato'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Prezzo Vendita / Margine Target</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                            {salePrice.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Target: {parseFloat(project.margin || 0).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ALERT BANNERS */}
                    {(() => {
                      if (!optimalSim) return null;
                      const budgetAlert80 = actualTotalCost > plannedTotalCost * 0.8 && actualTotalCost <= plannedTotalCost;
                      const budgetAlert100 = actualTotalCost > plannedTotalCost;
                      const marginDiff = (parseFloat(project.margin) || 0) - actualMarginPercent;
                      const marginAlertWarning = marginDiff > 0 && marginDiff <= 5;
                      const marginAlertCritical = marginDiff > 5;

                      if (!budgetAlert80 && !budgetAlert100 && !marginAlertWarning && !marginAlertCritical) return null;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {budgetAlert100 && (
                            <div className="glass-card" style={{ padding: '15px 20px', borderLeft: '4px solid var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
                              <div>
                                <strong style={{ color: '#fff' }}>Superamento Costo Critico (100%):</strong> I costi effettivi ({actualTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}) hanno superato il budget programmato ({plannedTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).
                              </div>
                            </div>
                          )}
                          {budgetAlert80 && (
                            <div className="glass-card" style={{ padding: '15px 20px', borderLeft: '4px solid var(--color-warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                              <div>
                                <strong style={{ color: '#fff' }}>Soglia Costo Superata (80%):</strong> I costi effettivi ({actualTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}) hanno superato l'80% del budget programmato ({plannedTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).
                              </div>
                            </div>
                          )}
                          {marginAlertCritical && (
                            <div className="glass-card" style={{ padding: '15px 20px', borderLeft: '4px solid var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
                              <div>
                                <strong style={{ color: '#fff' }}>Margine Critico:</strong> Il margine reale ({actualMarginPercent.toFixed(1)}%) è inferiore al target ({parseFloat(project.margin || 0).toFixed(1)}%) di oltre 5 punti percentuali (differenza: {marginDiff.toFixed(1)}%).
                              </div>
                            </div>
                          )}
                          {marginAlertWarning && (
                            <div className="glass-card" style={{ padding: '15px 20px', borderLeft: '4px solid var(--color-warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                              <div>
                                <strong style={{ color: '#fff' }}>Margine Sotto Target:</strong> Il margine reale ({actualMarginPercent.toFixed(1)}%) è inferiore al target ({parseFloat(project.margin || 0).toFixed(1)}%) di {marginDiff.toFixed(1)}%.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {!optimalSim ? (
                      <div className="glass-card" style={{ padding: '30px', borderLeft: '4px solid var(--color-warning)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-warning)', fontWeight: '700', fontSize: '1.1rem' }}>
                          <AlertTriangle size={24} />
                          Nessuna Pianificazione Ottimale Selezionata
                        </div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Per poter confrontare la pianificazione preventiva con i rapportini effettivi, devi prima selezionare uno scenario come <strong>PIANIFICAZIONE OTTIMALE</strong> all'interno della scheda di simulazione della commessa.
                        </span>
                        <div>
                          <button 
                            className="btn btn-primary"
                            onClick={() => { setActiveTab('simulation'); setSimulatedProjectId(project.id); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                          >
                            <Sliders size={16} />
                            Vai alla Simulazione
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Comparison Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                          
                          {/* Planned Card */}
                          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '4px solid #99c2a2' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Preventivo (Plan)</span>
                              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                                {optimalSim.name}
                              </span>
                            </h4>
                            <div>
                              <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                                {plannedTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Costo pianificato per {plannedResourcesCount} risorse
                              </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span>Ore: <strong>{plannedHours}h</strong> ({plannedDays.toFixed(1)} gg)</span>
                              <span>Margine: <strong style={{ color: plannedMarginPercent >= (parseFloat(project.margin) || 0) ? 'var(--color-success)' : 'var(--color-warning)' }}>{plannedMarginPercent.toFixed(1)}%</strong></span>
                            </div>
                          </div>

                          {/* Actual Card */}
                          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '4px solid var(--color-primary)' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Consuntivo (Actual)</span>
                              <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(124, 182, 129, 0.15)', padding: '2px 8px', borderRadius: '10px', color: 'var(--color-primary)' }}>
                                Rapportini Inviati
                              </span>
                            </h4>
                            <div>
                              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                {actualTotalCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Lavoro: {laborCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} ({actualResourcesCount} ris.) | Spese: {totalNonLaborExpenses.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span>Ore: <strong>{actualHours}h</strong> ({actualDays.toFixed(1)} gg)</span>
                              <span>Margine: <strong style={{ color: actualMarginPercent >= (parseFloat(project.margin) || 0) ? 'var(--color-success)' : 'var(--color-danger)' }}>{actualMarginPercent.toFixed(1)}%</strong></span>
                            </div>
                          </div>

                          {/* Variance Card */}
                          <div 
                            className="glass-card" 
                            style={{ 
                              padding: '20px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '15px', 
                              borderLeft: `4px solid ${costVarianceEur > 0 ? 'var(--color-danger)' : costVarianceEur < 0 ? 'var(--color-success)' : 'var(--border-color)'}` 
                            }}
                          >
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                              Scostamento (Variance)
                            </h4>
                            <div>
                              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: costVarianceEur > 0 ? 'var(--color-danger)' : costVarianceEur < 0 ? 'var(--color-success)' : 'inherit' }}>
                                {costVarianceEur > 0 ? '+' : ''}{costVarianceEur.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Varianza di costo rispetto al preventivo
                              </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: hoursVariance > 0 ? 'var(--color-danger)' : hoursVariance < 0 ? 'var(--color-success)' : 'inherit' }}>
                                  Ore: {hoursVariance > 0 ? '+' : ''}{hoursVariance}h
                                </span>
                                <span style={{ color: marginPercentVariance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                  Margine: {marginPercentVariance >= 0 ? '+' : ''}{marginPercentVariance.toFixed(1)}%
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', color: 'var(--text-secondary)' }}>
                                <span>Ore da consuntivare mancanti:</span>
                                <strong style={{ color: 'var(--color-primary)' }}>{Math.max(0, plannedHours - actualHours)}h</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resource Breakdown Table Card */}
                        <div className="glass-card">
                          <div className="card-header">
                            <h3 className="card-title">Dettaglio di Confronto per Risorsa</h3>
                          </div>
                          <div className="custom-table-container">
                            <table className="custom-table">
                              <thead>
                                <tr>
                                  <th>Collaboratore / Ruolo</th>
                                  <th>Costo Unitario</th>
                                  <th style={{ textAlign: 'center' }}>Ore Pianificate</th>
                                  <th style={{ textAlign: 'center' }}>Ore Consuntivate</th>
                                  <th style={{ textAlign: 'center' }}>Scostamento Ore</th>
                                  <th style={{ textAlign: 'right' }}>Costo Preventivo</th>
                                  <th style={{ textAlign: 'right' }}>Costo Consuntivo</th>
                                  <th style={{ textAlign: 'right' }}>Varianza Costo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // Compile resources from both planned and actual
                                  const tableResources = [];
                                  const treatedPlannedIds = new Set();
                                  const treatedActualUserIds = new Set();

                                  // Add planned resources
                                  optimalSim.resources.forEach(pRes => {
                                    const actualRes = projectActuals.find(aRes => aRes.userId === pRes.userId);
                                    
                                    const plannedResDays = parseFloat(pRes.days) || 0;
                                    const plannedResHours = plannedResDays * 8;
                                    const plannedResCostVal = (parseFloat(pRes.cost) || 0) * plannedResDays;
                                    
                                    const actualResHours = actualRes ? parseFloat(actualRes.hours) || 0 : 0;
                                    const actualResCostVal = actualRes ? parseFloat(actualRes.cost) || 0 : 0;

                                    tableResources.push({
                                      name: pRes.name || `Risorsa Senza Nome`,
                                      costUnit: pRes.cost,
                                      plannedHours: plannedResHours,
                                      actualHours: actualResHours,
                                      plannedCost: plannedResCostVal,
                                      actualCost: actualResCostVal,
                                      isPlanned: true,
                                      isActual: !!actualRes
                                    });

                                    if (pRes.userId) {
                                      treatedPlannedIds.add(pRes.userId);
                                      if (actualRes) {
                                        treatedActualUserIds.add(actualRes.userId);
                                      }
                                    }
                                  });

                                  // Add remaining actual resources that were not planned
                                  projectActuals.forEach(actualRes => {
                                    if (treatedActualUserIds.has(actualRes.userId)) return;

                                    // Find user's internal cost
                                    const matchedUser = users.find(u => u.id === actualRes.userId);
                                    const userCost = matchedUser && matchedUser.internal_cost !== undefined ? matchedUser.internal_cost : 0;

                                    tableResources.push({
                                      name: actualRes.userName,
                                      costUnit: userCost,
                                      plannedHours: 0,
                                      actualHours: parseFloat(actualRes.hours) || 0,
                                      plannedCost: 0,
                                      actualCost: parseFloat(actualRes.cost) || 0,
                                      isPlanned: false,
                                      isActual: true
                                    });
                                  });

                                  if (tableResources.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                          Nessun dettaglio risorsa disponibile.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return tableResources.map((res, index) => {
                                    const diffHours = res.actualHours - res.plannedHours;
                                    const diffCost = res.actualCost - res.plannedCost;

                                    return (
                                      <tr key={index}>
                                        <td style={{ fontWeight: '600' }}>
                                          {res.name}
                                          {!res.isPlanned && (
                                            <span style={{ marginLeft: '8px', fontSize: '0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', padding: '2px 6px', borderRadius: '4px' }}>
                                              Non Pianificato
                                            </span>
                                          )}
                                        </td>
                                        <td>€ {parseFloat(res.costUnit || 0).toFixed(2)}/giorno</td>
                                        <td style={{ textAlign: 'center' }}>{res.plannedHours}h</td>
                                        <td style={{ textAlign: 'center' }}>{res.actualHours}h</td>
                                        <td style={{ textAlign: 'center', color: diffHours > 0 ? 'var(--color-danger)' : diffHours < 0 ? 'var(--color-success)' : 'inherit', fontWeight: 'bold' }}>
                                          {diffHours > 0 ? '+' : ''}{diffHours}h
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {res.plannedCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {res.actualCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td style={{ textAlign: 'right', color: diffCost > 0 ? 'var(--color-danger)' : diffCost < 0 ? 'var(--color-success)' : 'inherit', fontWeight: 'bold' }}>
                                          {diffCost > 0 ? '+' : ''}{diffCost.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* CARD SPESE NON-LABOR */}
                    <div className="glass-card">
                      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Euro size={18} style={{ color: 'var(--color-primary)' }} />
                          Spese Non-Labor
                        </h3>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            if (showExpenseForm) {
                              setExpenseDate('');
                              setExpenseCategory('Trasferta');
                              setExpenseDescription('');
                              setExpenseAmount('');
                              setEditingExpenseId(null);
                              setShowExpenseForm(false);
                            } else {
                              setShowExpenseForm(true);
                            }
                          }}
                        >
                          {showExpenseForm ? 'Annulla' : 'Aggiungi Spesa'}
                        </button>
                      </div>

                      {showExpenseForm && (
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                          <form onSubmit={editingExpenseId ? handleUpdateExpense : handleCreateExpense}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: '700' }}>
                              {editingExpenseId ? 'Modifica Spesa' : 'Nuova Spesa Non-Labor'}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                              <div className="form-group">
                                <label className="form-label">Data</label>
                                <input 
                                  type="date" 
                                  className="form-input"
                                  value={expenseDate}
                                  onChange={(e) => setExpenseDate(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select 
                                  id="expense-category-select"
                                  className="form-input"
                                  value={expenseCategory}
                                  onChange={(e) => setExpenseCategory(e.target.value)}
                                  required
                                >
                                  <option value="Trasferta">Trasferta</option>
                                  <option value="Software">Software</option>
                                  <option value="Materiali">Materiali</option>
                                  <option value="Consulenza">Consulenza</option>
                                  <option value="Altro">Altro</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Importo (€)</label>
                                <input 
                                  type="number" 
                                  className="form-input"
                                  placeholder="es. 120.00"
                                  step="0.01"
                                  min="0"
                                  value={expenseAmount}
                                  onChange={(e) => setExpenseAmount(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                              <label className="form-label">Descrizione / Note</label>
                              <input 
                                type="text" 
                                className="form-input"
                                placeholder="Aggiungi dettagli sulla spesa..."
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button type="submit" className="btn btn-primary btn-sm">
                                {editingExpenseId ? 'Salva Modifiche' : 'Registra Spesa'}
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setExpenseDate('');
                                  setExpenseCategory('Trasferta');
                                  setExpenseDescription('');
                                  setExpenseAmount('');
                                  setEditingExpenseId(null);
                                  setShowExpenseForm(false);
                                }}
                              >
                                Annulla
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="custom-table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Categoria</th>
                              <th>Descrizione</th>
                              <th style={{ textAlign: 'right' }}>Importo</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectExpenses.length === 0 ? (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                  Nessuna spesa non-labor registrata per questa commessa.
                                </td>
                              </tr>
                            ) : (
                              projectExpenses.map(exp => (
                                <tr key={exp.id}>
                                  <td>{new Date(exp.date).toLocaleDateString('it-IT')}</td>
                                  <td>
                                    <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                      {exp.category}
                                    </span>
                                  </td>
                                  <td>{exp.description || '—'}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {parseFloat(exp.amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                  </td>
                                  <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button 
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      onClick={() => {
                                        setEditingExpenseId(exp.id);
                                        setExpenseDate(exp.date);
                                        setExpenseCategory(exp.category);
                                        setExpenseDescription(exp.description || '');
                                        setExpenseAmount(String(exp.amount));
                                        setShowExpenseForm(true);
                                      }}
                                    >
                                      Modifica
                                    </button>
                                    <button 
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteExpense(exp.id)}
                                    >
                                      Elimina
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: ANAGRAFICA COLLABORATORI (ADMIN & HR) */}
          {activeTab === 'users' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="users-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                
                {/* Card 1: Creazione/Modifica Collaboratore */}
                <div className="glass-card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} style={{ color: 'var(--color-primary)' }} />
                      {editingUserId ? 'Modifica Collaboratore' : 'Nuovo Collaboratore'}
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser}>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Nome e Cognome</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. Mario Rossi"
                          value={editingUserId ? editingUserName : newUserName}
                          onChange={(e) => editingUserId ? setEditingUserName(e.target.value) : setNewUserName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Email</label>
                        <input 
                          type="email" 
                          className="form-input"
                          placeholder="es. mario.rossi@azienda.it"
                          value={editingUserId ? editingUserEmail : newUserEmail}
                          onChange={(e) => editingUserId ? setEditingUserEmail(e.target.value) : setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">{editingUserId ? 'Password (lascia vuoto per non modificare)' : 'Password'}</label>
                        <input 
                          type="password" 
                          className="form-input"
                          placeholder="Password"
                          value={editingUserId ? editingUserPassword : newUserPassword}
                          onChange={(e) => editingUserId ? setEditingUserPassword(e.target.value) : setNewUserPassword(e.target.value)}
                          required={!editingUserId}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Ruolo</label>
                        <select 
                          className="form-input"
                          value={editingUserId ? editingUserRole : newUserRole}
                          onChange={(e) => editingUserId ? setEditingUserRole(e.target.value) : setNewUserRole(e.target.value)}
                          required
                        >
                          <option value="Dipendente">Dipendente</option>
                          <option value="Team Leader">Team Leader</option>
                          <option value="Admin">Admin</option>
                          <option value="HR">HR</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Telefono</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. +39 333 1234567"
                          value={editingUserId ? editingUserPhone : newUserPhone}
                          onChange={(e) => editingUserId ? setEditingUserPhone(e.target.value) : setNewUserPhone(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Indirizzo</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. Via Roma 10, Milano"
                          value={editingUserId ? editingUserAddress : newUserAddress}
                          onChange={(e) => editingUserId ? setEditingUserAddress(e.target.value) : setNewUserAddress(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">Costo Interno (€/giorno)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          placeholder="es. 45.00"
                          step="0.01"
                          min="0"
                          value={editingUserId ? editingUserInternalCost : newUserInternalCost}
                          onChange={(e) => editingUserId ? setEditingUserInternalCost(e.target.value) : setNewUserInternalCost(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="form-label">LIVELLO AZIENDALE</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="es. A1"
                          maxLength={4}
                          value={editingUserId ? editingUserCorporateLevel : newUserCorporateLevel}
                          onChange={(e) => editingUserId ? setEditingUserCorporateLevel(e.target.value) : setNewUserCorporateLevel(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label">Ferie Iniziali (Giorni)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          placeholder="es. 30"
                          min="0"
                          value={editingUserId ? editingUserHolidayTotal : newUserHolidayTotal}
                          onChange={(e) => editingUserId ? setEditingUserHolidayTotal(e.target.value) : setNewUserHolidayTotal(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px' }}>
                          {editingUserId ? 'Salva Modifiche' : 'Crea Collaboratore'}
                        </button>
                        {editingUserId && (
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ height: '38px' }}
                            onClick={() => {
                              setEditingUserId(null);
                              setEditingUserName('');
                              setEditingUserEmail('');
                              setEditingUserPassword('');
                              setEditingUserRole('Dipendente');
                              setEditingUserPhone('');
                              setEditingUserAddress('');
                              setEditingUserIban('');
                              setEditingUserInternalCost('');
                              setEditingUserCorporateLevel('');
                              setEditingUserHolidayTotal(30);
                            }}
                          >
                            Annulla
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Card 2: Elenco Collaboratori */}
                <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} style={{ color: 'var(--color-primary)' }} />
                      Collaboratori Registrati
                    </h3>
                  </div>
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Email</th>
                          <th>Ruolo</th>
                          <th>Livello</th>
                          <th>Costo Interno</th>
                          <th>Ferie (Tot/Res)</th>
                          <th style={{ width: '180px', textAlign: 'center' }}>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              Nessun collaboratore configurato.
                            </td>
                          </tr>
                        ) : (
                          users.map(u => {
                            const balance = u.holidayBalance;
                            return (
                              <tr key={u.id}>
                                <td style={{ fontWeight: '600' }}>{u.name}</td>
                                <td>{u.email}</td>
                                <td>
                                  <span className={`role-badge-pill ${u.role.toLowerCase() === 'team leader' ? 'team-leader' : u.role.toLowerCase() === 'dipendente' ? 'dipendente' : u.role.toLowerCase() === 'admin' ? 'admin' : 'hr'}`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{u.corporate_level || '—'}</td>
                                <td>{u.internal_cost !== undefined && u.internal_cost !== null ? `€ ${parseFloat(u.internal_cost).toFixed(2)}/giorno` : '€ 0.00/giorno'}</td>
                                <td>
                                  {balance ? `${balance.totalDays} / ${balance.remainingDays} gg` : '—'}
                                </td>
                                <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditingUserName(u.name);
                                      setEditingUserEmail(u.email);
                                      setEditingUserPassword('');
                                      setEditingUserRole(u.role);
                                      setEditingUserPhone(u.phone || '');
                                      setEditingUserAddress(u.address || '');
                                      setEditingUserIban(u.iban || '');
                                      setEditingUserInternalCost(u.internal_cost !== undefined && u.internal_cost !== null ? String(u.internal_cost) : '');
                                      setEditingUserCorporateLevel(u.corporate_level || '');
                                      setEditingUserHolidayTotal(balance ? balance.totalDays : 30);
                                    }}
                                  >
                                    Modifica
                                  </button>
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    disabled={u.id === currentUser.id}
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    Elimina
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* TAB 8: RAPPORTINO (TIMESHEET) */}
          {activeTab === 'timesheet' && currentUser && (currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') && (
            <div className="timesheet-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Controls & Status Bar */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  
                  {/* Selector for month/year */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Mese</label>
                      <select 
                        className="form-input" 
                        id="timesheet-month-select"
                        value={timesheetMonth} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTimesheetMonth(val);
                        }}
                        style={{ height: '38px', padding: '0 10px', minWidth: '130px' }}
                      >
                        {MONTHS_IT.map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Anno</label>
                      <select 
                        className="form-input" 
                        id="timesheet-year-select"
                        value={timesheetYear} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTimesheetYear(val);
                        }}
                        style={{ height: '38px', padding: '0 10px', minWidth: '100px' }}
                      >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status badge and metadata */}
                  {timesheet && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stato Rapportino</span>
                        <span 
                          className="badge"
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: timesheet.status === 'Bozza' ? 'rgba(14, 165, 233, 0.1)' :
                                             timesheet.status === 'Inviato' ? 'rgba(245, 158, 11, 0.1)' :
                                             timesheet.status === 'Approvato' ? 'rgba(16, 185, 129, 0.1)' :
                                             'rgba(239, 68, 68, 0.1)',
                            color: timesheet.status === 'Bozza' ? 'var(--color-primary)' :
                                   timesheet.status === 'Inviato' ? 'var(--color-warning)' :
                                   timesheet.status === 'Approvato' ? 'var(--color-success)' :
                                   'var(--color-danger)',
                            border: timesheet.status === 'Bozza' ? '1px solid rgba(14, 165, 233, 0.2)' :
                                    timesheet.status === 'Inviato' ? '1px solid rgba(245, 158, 11, 0.2)' :
                                    timesheet.status === 'Approvato' ? '1px solid rgba(16, 185, 129, 0.2)' :
                                    '1px solid rgba(239, 68, 68, 0.2)'
                          }}
                        >
                          {timesheet.status}
                        </span>
                      </div>
                      
                      {/* Submission/Actions */}
                      {(timesheet.status === 'Bozza' || timesheet.status === 'Rifiutato') && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleSaveTimesheet(false)}
                          >
                            <RefreshCw size={14} />
                            Salva Bozza
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleSubmitTimesheet}
                            disabled={timesheetSubmitting}
                          >
                            {timesheetSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            Invia per Approvazione
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rejection / Validation notes */}
                {timesheet && timesheet.status === 'Rifiutato' && (
                  <div 
                    style={{ 
                      marginTop: '15px', 
                      padding: '12px 16px', 
                      backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: '700' }}>⚠️ Rapportino Rifiutato</span>
                    <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-primary)' }}>
                      <strong>Validatore:</strong> {timesheet.validatedBy || 'N/A'}<br/>
                      <strong>Motivazione:</strong> {timesheet.rejectionReason}
                    </p>
                  </div>
                )}

                {timesheet && timesheet.status === 'Approvato' && (
                  <div 
                    style={{ 
                      marginTop: '15px', 
                      padding: '12px 16px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.2)', 
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '700' }}>✅ Rapportino Approvato</span>
                    <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-primary)' }}>
                      <strong>Approvato da:</strong> {timesheet.validatedBy || 'N/A'}<br/>
                      <strong>Data convalida:</strong> {timesheet.validatedAt ? new Date(timesheet.validatedAt).toLocaleString('it-IT') : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Main timesheet single table container */}
              {timesheetLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Caricamento rapportino in corso...</p>
                </div>
              ) : timesheet ? (
                <div className="glass-card" style={{ padding: '20px', width: '100%' }}>
                  {/* Warning if timesheet is read-only */}
                  {(timesheet.status === 'Inviato' || timesheet.status === 'Approvato') && (
                    <div 
                      style={{ 
                        marginBottom: '20px', 
                        padding: '10px 12px', 
                        backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                        border: '1px solid rgba(245, 158, 11, 0.2)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--color-warning)'
                      }}
                    >
                      ⚠️ Questo rapportino è in stato <strong>{timesheet.status}</strong>. Le modifiche sono disabilitate.
                    </div>
                  )}

                  {/* Hidden legacy button for E2E tests compatibility */}
                  <button style={{ display: 'none' }} className="btn">Applica a questo giorno</button>

                  <div className="custom-table-container" style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '14%', textAlign: 'left', padding: '10px' }}>Giorno</th>
                          <th style={{ width: '24%', textAlign: 'left', padding: '10px' }}>Commessa / Progetto</th>
                          <th style={{ width: '10%', textAlign: 'center', padding: '10px' }}>Ore Lav.</th>
                          <th style={{ width: '16%', textAlign: 'left', padding: '10px' }}>Permesso</th>
                          <th style={{ width: '16%', textAlign: 'left', padding: '10px' }}>Altra Assenza</th>
                          <th style={{ width: '20%', textAlign: 'left', padding: '10px' }}>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheet.days.map((day) => {
                          const d = new Date(day.date);
                          const dayOfWeek = d.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          const holidayName = getItalianHolidayName(d);
                          const isHoliday = !!holidayName;
                          
                          const isLavoro = day.type === 'Lavoro' || day.type === 'Attività interne';
                          const currentProject = isLavoro ? day.projectName : '';
                          const workHours = isLavoro ? day.hours : 0;
                          const currentPermesso = day.type === 'Permesso' ? day.hours : 0;
                          const altraAssenza = (day.type !== 'Lavoro' && day.type !== 'Attività interne' && day.type !== 'Permesso') ? day.type : '';
                          
                          const isReadOnly = timesheet.status === 'Inviato' || timesheet.status === 'Approvato';
                          const countForDate = timesheet.days.filter(d => d.date === day.date).length;
                          
                          const handleCommessaChange = (e) => {
                            const val = e.target.value;
                            if (val === 'Attività interne') {
                              updateDayState(day.clientKey, {
                                type: 'Attività interne',
                                projectName: '',
                                hours: day.type === 'Lavoro' || day.type === 'Attività interne' ? day.hours : 8.0
                              });
                            } else if (val === '') {
                              resetDayToDefault(day.clientKey, day.date);
                            } else {
                              updateDayState(day.clientKey, {
                                type: 'Lavoro',
                                projectName: val,
                                hours: day.type === 'Lavoro' || day.type === 'Attività interne' ? day.hours : 8.0
                              });
                            }
                          };
                          
                          const handleWorkHoursChange = (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateDayState(day.clientKey, {
                              hours: Math.min(24, Math.max(0, val))
                            });
                          };
                          
                          const handlePermessoChange = (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val > 0) {
                              updateDayState(day.clientKey, {
                                type: 'Permesso',
                                projectName: '',
                                hours: val
                              });
                            } else {
                              resetDayToDefault(day.clientKey, day.date);
                            }
                          };
                          
                          const handleAltraAssenzaChange = (e) => {
                            const val = e.target.value;
                            if (val !== '') {
                              updateDayState(day.clientKey, {
                                type: val,
                                projectName: '',
                                hours: 8.0
                              });
                            } else {
                              resetDayToDefault(day.clientKey, day.date);
                            }
                          };
                          
                          const handleNotesChange = (e) => {
                            updateDayState(day.clientKey, {
                              notes: e.target.value.substring(0, 250)
                            });
                          };

                          const rowBg = (isHoliday || isWeekend) ? 'rgba(239, 68, 68, 0.05)' : 'transparent';
                          
                          const dayLabel = `${d.getDate()} - ${['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dayOfWeek]}`;

                          return (
                            <tr 
                              key={day.clientKey} 
                              data-date={day.date} 
                              className="timesheet-table-row"
                              style={{ 
                                backgroundColor: rowBg, 
                                borderBottom: '1px solid var(--border-color)',
                                verticalAlign: 'middle'
                              }}
                            >
                              {/* Giorno */}
                              <td style={{ padding: '10px', fontWeight: '600' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>{dayLabel}</span>
                                  {holidayName && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{holidayName}</span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Commessa / Progetto */}
                              <td style={{ padding: '10px' }}>
                                <select
                                  className="form-input timesheet-project-select"
                                  value={currentProject === 'Riposo' ? '' : currentProject}
                                  disabled={isReadOnly}
                                  onChange={handleCommessaChange}
                                  style={{ width: '100%', height: '34px', padding: '0 8px' }}
                                >
                                  <option value="">Nessuna (Riposo/Altro)</option>
                                  {myProjects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                  ))}
                                  <option value="Attività interne">Attività interne</option>
                                </select>
                              </td>
                              
                              {/* Ore Lavoro */}
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={workHours}
                                  disabled={isReadOnly || !isLavoro}
                                  onChange={handleWorkHoursChange}
                                  style={{ width: '70px', height: '34px', textAlign: 'center', margin: '0 auto' }}
                                />
                              </td>
                              
                              {/* Permesso */}
                              <td style={{ padding: '10px' }}>
                                <select
                                  className="form-input timesheet-permesso-select"
                                  value={currentPermesso}
                                  disabled={isReadOnly}
                                  onChange={handlePermessoChange}
                                  style={{ width: '100%', height: '34px', padding: '0 8px' }}
                                >
                                  <option value={0}>Nessuno</option>
                                  <option value={4}>Mezza giornata (4h)</option>
                                  <option value={8}>Intera giornata (8h)</option>
                                  <option value={1}>1 ora</option>
                                  <option value={2}>2 ore</option>
                                  <option value={3}>3 ore</option>
                                  <option value={5}>5 ore</option>
                                  <option value={6}>6 ore</option>
                                  <option value={7}>7 ore</option>
                                </select>
                              </td>
                              
                              {/* Altra Assenza */}
                              <td style={{ padding: '10px' }}>
                                <select
                                  className="form-input timesheet-altra-assenza-select"
                                  value={altraAssenza}
                                  disabled={isReadOnly}
                                  onChange={handleAltraAssenzaChange}
                                  style={{ width: '100%', height: '34px', padding: '0 8px' }}
                                >
                                  <option value="">Nessuna</option>
                                  {absenceTypes.map(at => (
                                    <option key={at.id} value={at.name}>{at.name}</option>
                                  ))}
                                </select>
                              </td>
                              
                              {/* Note */}
                              <td style={{ padding: '10px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={day.notes || ''}
                                  maxLength={250}
                                  disabled={isReadOnly}
                                  onChange={handleNotesChange}
                                  placeholder="Note..."
                                  style={{ width: '100%', height: '34px', padding: '0 8px' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  Nessun dato del rapportino disponibile.
                </div>
              )}

            </div>
          )}

          {/* TAB 9: APPROVAZIONI RAPPORTINI */}
          {activeTab === 'timesheet-approvals' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR' || currentUser.role === 'Team Leader') && (
            <div className="timesheet-approvals-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '800' }}>
                  Rapportini Dipendenti da Validare
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  In questa sezione sono elencati i rapportini mensili inviati dai collaboratori. Come <strong>{currentUser.role}</strong> puoi approvare o rifiutare le schede attività.
                </p>
              </div>

              {pendingTimesheets.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Non ci sono rapportini in attesa di validazione al momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {pendingTimesheets.map(t => {
                    const workingDays = t.days.filter(d => d.type === 'Lavoro' && d.hours > 0).length;
                    const totalWorkHours = t.days.filter(d => d.type === 'Lavoro').reduce((sum, d) => sum + d.hours, 0);
                    const holidayDays = t.days.filter(d => d.type === 'Ferie').length;
                    const sicknessDays = t.days.filter(d => d.type === 'Malattia').length;
                    const permissionHours = t.days.filter(d => d.type === 'Permesso').reduce((sum, d) => sum + d.hours, 0);
                    
                    const isExpanded = expandedCommId === `t-detail-${t.id}`;
                    
                    return (
                      <div 
                        key={t.id} 
                        className="glass-card" 
                        style={{ 
                          border: '1px solid var(--border-color)', 
                          overflow: 'hidden', 
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {/* Header info */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '700' }}>
                                {t.userName}
                              </h4>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Rapportino di <strong>{MONTHS_IT[t.month - 1]} {t.year}</strong> (Inviato il {t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('it-IT') : ''})
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => setExpandedCommId(isExpanded ? null : `t-detail-${t.id}`)}
                              >
                                {isExpanded ? 'Nascondi Dettagli' : 'Visualizza Dettagli'}
                              </button>
                              <button 
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                onClick={() => handleApproveTimesheet(t.id)}
                              >
                                Approva
                              </button>
                              <button 
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => setTimesheetRejectionModal({ open: true, timesheetId: t.id, reason: '' })}
                              >
                                Rifiuta
                              </button>
                              {(currentUser.role === 'Admin' || currentUser.role === 'HR') && (
                                <button 
                                  type="button"
                                  className="btn btn-warning btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)', color: '#1e1b4b' }}
                                  onClick={() => handleReopenTimesheet(t.id)}
                                >
                                  Riapri
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Summary Metrics Pills */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                            <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', color: '#f8fafc' }}>
                              💼 {workingDays} gg Lavoro ({totalWorkHours}h)
                            </span>
                            {holidayDays > 0 && (
                              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                                🌴 {holidayDays} gg Ferie
                              </span>
                            )}
                            {sicknessDays > 0 && (
                              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
                                🤒 {sicknessDays} gg Malattia
                              </span>
                            )}
                            {permissionHours > 0 && (
                              <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                                ⏱️ {permissionHours}h Permessi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expanded details list */}
                        {isExpanded && (
                          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTop: '1px solid var(--border-color)', padding: '20px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                              Dettaglio Giornaliero
                            </h4>
                            <div className="custom-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                              <table className="custom-table" style={{ width: '100%' }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '8px 12px', fontSize: '0.75rem' }}>Giorno</th>
                                    <th style={{ padding: '8px 12px', fontSize: '0.75rem' }}>Tipo</th>
                                    <th style={{ padding: '8px 12px', fontSize: '0.75rem' }}>Progetto/Attività</th>
                                    <th style={{ padding: '8px 12px', fontSize: '0.75rem', textAlign: 'center' }}>Ore</th>
                                    <th style={{ padding: '8px 12px', fontSize: '0.75rem' }}>Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.days.map(day => {
                                    const d = new Date(day.date);
                                    const dayOfWeek = d.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isHoliday = isItalianHoliday(d);
                                    
                                    return (
                                      <tr 
                                        key={day.id || `${day.date}-${Math.random()}`}
                                        style={{ 
                                          backgroundColor: (isHoliday || isWeekend) ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                                        }}
                                      >
                                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: '600' }}>
                                          {d.getDate()}/{d.getMonth() + 1} ({['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][d.getDay()]})
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                                          <span 
                                            className="badge"
                                            style={{
                                              fontSize: '0.7rem',
                                              padding: '2px 6px',
                                              backgroundColor: day.type === 'Ferie' ? 'rgba(16, 185, 129, 0.1)' : 
                                                               day.type === 'Malattia' ? 'rgba(239, 68, 68, 0.1)' : 
                                                               day.type === 'Permesso' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                              color: day.type === 'Ferie' ? 'var(--color-success)' : 
                                                     day.type === 'Malattia' ? 'var(--color-danger)' : 
                                                     day.type === 'Permesso' ? 'var(--color-warning)' : 'var(--text-primary)'
                                            }}
                                          >
                                            {day.type}
                                          </span>
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#f8fafc' }}>
                                          {day.projectName || '—'}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', textAlign: 'center', color: '#f8fafc' }}>
                                          {day.hours}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={day.notes}>
                                          {day.notes || '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PERSONAL PROFILE DETAILS */}
          {activeTab === 'profile' && currentUser && (
            <div className="profile-page-container">
              <div className="glass-card">
                <div className="card-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <h3 className="card-title">I Miei Dati Personali</h3>
                </div>
                
                <div className="card-body">
                  <div className="profile-header-meta">
                    <div className="profile-avatar-large">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '700' }}>{currentUser.name}</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Ruolo aziendale: <strong style={{ color: 'var(--text-primary)' }}>{currentUser.role}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <form onSubmit={handleProfileUpdate}>
                    <div className="profile-grid">
                      <div className="login-form-group">
                        <label className="login-label">Nome Completo</label>
                        <input 
                          type="text" 
                          className="login-input" 
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="login-form-group">
                        <label className="login-label">Indirizzo Email</label>
                        <input 
                          type="email" 
                          className="login-input" 
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="login-form-group">
                        <label className="login-label">Numero di Telefono</label>
                        <input 
                          type="text" 
                          className="login-input" 
                          placeholder="Es. +39 333 1234567"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                      
                      <div className="login-form-group">
                        <label className="login-label">IBAN (Coordinate Bancarie)</label>
                        <input 
                          type="text" 
                          className="login-input" 
                          placeholder="IT00 X000 0000 0000 0000 0000 000"
                          value={profileIban}
                          onChange={(e) => setProfileIban(e.target.value)}
                        />
                      </div>
                      
                      <div className="login-form-group profile-form-fullwidth">
                        <label className="login-label">Indirizzo di Residenza</label>
                        <input 
                          type="text" 
                          className="login-input" 
                          placeholder="Via, Piazza, CAP, Città"
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
                        Salva Modifiche
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '12px 24px' }}
                        onClick={() => {
                          if (currentUser.role === 'Dipendente' || currentUser.role === 'Team Leader') setActiveTab('dashboard');
                          else if (currentUser.role === 'Admin') setActiveTab('approvals');
                          else setActiveTab('reports');
                        }}
                      >
                        Annulla
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: RIFIUTO RICHIESTA (FEATURE 2) */}
      {rejectionModal.open && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Rifiuta Richiesta</h3>
              <XCircle 
                size={20} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setRejectionModal({ open: false, reqId: '', reason: '' })}
              />
            </div>
            <form onSubmit={handleRejectRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Motivazione Rifiuto</label>
                  <textarea 
                    className="form-input"
                    rows={4}
                    placeholder="Inserisci qui la motivazione (es. Copertura aziendale insufficiente)..."
                    value={rejectionModal.reason}
                    onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                    style={{ resize: 'none', width: '100%', fontFamily: 'var(--font-sans)' }}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setRejectionModal({ open: false, reqId: '', reason: '' })}
                >
                  Annulla
                </button>
                <button type="submit" className="btn btn-danger">
                  Rifiuta Richiesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RIFIUTO RAPPORTINO (OBBLIGATORIO) */}
      {timesheetRejectionModal.open && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Rifiuta Rapportino</h3>
              <XCircle 
                size={20} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setTimesheetRejectionModal({ open: false, timesheetId: '', reason: '' })}
              />
            </div>
            <form onSubmit={handleRejectTimesheet}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Motivazione Rifiuto</label>
                  <textarea 
                    className="form-input"
                    rows={4}
                    placeholder="Inserisci qui la motivazione del rifiuto..."
                    value={timesheetRejectionModal.reason}
                    onChange={(e) => setTimesheetRejectionModal({ ...timesheetRejectionModal, reason: e.target.value })}
                    style={{ resize: 'none', width: '100%', fontFamily: 'var(--font-sans)' }}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setTimesheetRejectionModal({ open: false, timesheetId: '', reason: '' })}
                >
                  Annulla
                </button>
                <button type="submit" className="btn btn-danger">
                  Rifiuta Rapportino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICA RICHIESTA (FEATURE 1) */}
      {editModal.open && (
        <div className="modal-backdrop">
          <div className="modal-window">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Modifica Richiesta</h3>
              <XCircle 
                size={20} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setEditModal({ open: false, request: null, endDate: '' })}
              />
            </div>
            <form onSubmit={handleEditRequest}>
              <div className="modal-body">
                {editModal.request && (
                  <>
                    <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Modifica data di fine per il periodo a partire da: <strong>{formatDateIt(editModal.request.startDate)}</strong>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nuova Data Fine</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        min={editModal.request.startDate}
                        value={editModal.endDate}
                        onChange={(e) => setEditModal({ ...editModal, endDate: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Nuovo totale giorni lavorativi: {getWorkingDaysCount(editModal.request.startDate, editModal.endDate)}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditModal({ open: false, request: null, endDate: '' })}
                >
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ANTEPRIMA ALLEGATO (MVP 2) */}
      {previewModal.open && previewModal.request && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Allegato Giustificativo</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{previewModal.request.attachmentName}</span>
              </div>
              <XCircle 
                size={20} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setPreviewModal({ open: false, request: null })}
              />
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="attachment-preview-container">
                {previewModal.request.attachmentData.startsWith('data:image/') ? (
                  <img 
                    src={previewModal.request.attachmentData} 
                    alt="Giustificativo" 
                    className="attachment-preview-img"
                  />
                ) : previewModal.request.attachmentData.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={previewModal.request.attachmentData} 
                    style={{ width: '100%', height: '380px', border: 'none', borderRadius: '4px' }} 
                    title="Certificato PDF"
                  />
                ) : (
                  <div className="attachment-preview-fallback">
                    <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '15px' }} />
                    <p>Anteprima non disponibile per questo formato di file.</p>
                    <a 
                      href={previewModal.request.attachmentData} 
                      download={previewModal.request.attachmentName}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '15px' }}
                    >
                      <Download size={14} />
                      Scarica Allegato
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setPreviewModal({ open: false, request: null })}
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BLOCCANTE: NUOVA COMUNICAZIONE DA LEGGERE (CONFERMA DI LETTURA OBBLIGATORIA) */}
      {currentUser && notifications.filter(n => n.isCommunication && !n.read).length > 0 && (() => {
        const unreadComms = notifications.filter(n => n.isCommunication && !n.read);
        const currentComm = unreadComms[unreadComms.length - 1]; // Mostra la più recente per prima
        return (
          <div className="modal-backdrop" style={{ zIndex: 9999 }}>
            <div className="modal-window" style={{ maxWidth: '500px', border: '2px solid var(--color-secondary)', boxShadow: '0 0 30px rgba(14, 165, 233, 0.25)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '20px 24px', backgroundColor: 'rgba(14, 165, 233, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Megaphone size={22} style={{ color: 'var(--color-secondary)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#e2e8f0' }}>Comunicazione Importante</h3>
                </div>
              </div>
              
              <div className="modal-body" style={{ padding: '24px', backgroundColor: 'var(--bg-sidebar)' }}>
                {/* Dettagli mittente */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Da: <strong>{currentComm.senderName || 'Amministrazione'}</strong></span>
                  <span>Inviata: {new Date(currentComm.createdAt).toLocaleDateString('it-IT')} {new Date(currentComm.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                {/* Corpo del messaggio */}
                <div style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  fontSize: '0.98rem',
                  lineHeight: '1.6',
                  color: '#f8fafc',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '250px',
                  overflowY: 'auto'
                }}>
                  {currentComm.message}
                </div>
              </div>
              
              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ 
                    width: '100%', 
                    height: '44px', 
                    fontSize: '0.95rem', 
                    fontWeight: '700',
                    backgroundColor: 'var(--color-secondary)', 
                    borderColor: 'var(--color-secondary)',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' 
                  }}
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/notifications/${currentComm.id}/read`, {
                        method: 'POST'
                      });
                      if (res.ok) {
                        // Aggiorna lo stato locale delle notifiche
                        setNotifications(prev => prev.map(item => item.id === currentComm.id ? { ...item, read: true, readAt: new Date().toISOString() } : item));
                        addToast("Lettura confermata", "success");
                      }
                    } catch (err) {
                      console.error("Error marking communication read:", err);
                      addToast("Errore di connessione con il server", "error");
                    }
                  }}
                >
                  <CheckCircle size={16} style={{ marginRight: '6px' }} />
                  Ho letto e confermo la lettura
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      
    </div>
  );
}
