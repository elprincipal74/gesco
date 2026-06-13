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
  Settings as SettingsIcon
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
        if (user.role === 'Dipendente') return 'dashboard';
        if (user.role === 'Admin') return 'approvals';
        if (user.role === 'HR') return 'coverage';
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
      
      if (data.user.role === 'Dipendente') {
        setActiveTab('dashboard');
      } else if (data.user.role === 'Admin') {
        setActiveTab('approvals');
      } else if (data.user.role === 'HR') {
        setActiveTab('coverage');
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
        if (data.user.role === 'Dipendente') {
          setActiveTab('dashboard');
        } else if (data.user.role === 'Admin') {
          setActiveTab('approvals');
        } else if (data.user.role === 'HR') {
          setActiveTab('coverage');
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
      const [usersRes, reqsRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/settings`)
      ]);
      
      // Handle unauthorized/session expiration cases silently without crashing the frontend
      if (usersRes.status === 401 || reqsRes.status === 401 || settingsRes.status === 401) {
        setUsers([]);
        setRequests([]);
        setSettings({});
        if (currentUser) {
          setCurrentUser(null);
          localStorage.removeItem('ferie_user');
        }
        return;
      }
      
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const reqsData = reqsRes.ok ? await reqsRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRequests(Array.isArray(reqsData) ? reqsData : []);
      setSettings(settingsData && !settingsData.error ? settingsData : {});
      
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

  // Fetch notifications when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/${currentUser.id}`);
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    
    fetchNotifications();
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

  // handleRoleChange removed, using direct login workflow instead

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
    
    const totalEmployees = users.filter(u => u.role === 'Dipendente').length;
    
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
        headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
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
      addToast("Errore durante la generazione del PDF", "error");
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
            <h2>Sistema Ferie</h2>
            <p>Accedi al portale di gestione ferie e assenze</p>
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
            <button className="quick-login-btn" onClick={() => handleQuickLogin('admin@azienda.it')}>
              <span className="quick-login-name">Admin User</span>
              <span className="quick-login-role">Amministratore</span>
            </button>
            <button className="quick-login-btn" onClick={() => handleQuickLogin('hr@azienda.it')}>
              <span className="quick-login-name">HR User</span>
              <span className="quick-login-role">Risorse Umane</span>
            </button>
          </div>
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
          <div className="logo-icon">F</div>
          <div className="logo-text">Sistema Ferie</div>
        </div>
        
        <nav className="nav-links">
          {currentUser && currentUser.role === 'Dipendente' && (
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Layers className="nav-item-icon" />
              <span>Mio Piano Ferie</span>
            </div>
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
                className={`nav-item ${activeTab === 'coverage' ? 'active' : ''}`}
                onClick={() => { setActiveTab('coverage'); resetSelection(); }}
              >
                <CalendarIcon className="nav-item-icon" />
                <span>Calendario Copertura</span>
              </div>
              
              <div 
                className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => { setActiveTab('reports'); resetSelection(); }}
              >
                <FileText className="nav-item-icon" />
                <span>Reportistica</span>
              </div>
              
              <div 
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); resetSelection(); }}
              >
                <SettingsIcon className="nav-item-icon" />
                <span>Impostazioni</span>
              </div>
              
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
            <span className="role-badge-pill dipendente">
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
            {activeTab === 'coverage' && 'Prospetto Generale Copertura'}
            {activeTab === 'reports' && 'Cruscotto Reportistica'}
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
                      <span className={`role-badge-pill ${currentUser.role.toLowerCase() === 'dipendente' ? 'dipendente' : currentUser.role.toLowerCase() === 'admin' ? 'admin' : 'hr'}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    
                    <div className="profile-dropdown-divider"></div>
                    
                    <div className="profile-dropdown-section-title">Navigazione</div>
                    
                    {currentUser.role === 'Dipendente' && (
                      <button 
                        className={`profile-dropdown-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('dashboard'); setShowProfileDropdown(false); }}
                      >
                        <Layers size={14} />
                        <span>Mio Piano Ferie</span>
                      </button>
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
                          className={`profile-dropdown-item ${activeTab === 'coverage' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('coverage'); setShowProfileDropdown(false); }}
                        >
                          <CalendarIcon size={14} />
                          <span>Calendario Copertura</span>
                        </button>
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
          {activeTab === 'dashboard' && currentUser && currentUser.role === 'Dipendente' && (
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

          {/* TAB 3: CALENDARIO COPERTURA HEATMAP (HR/ADMIN) */}
          {activeTab === 'coverage' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
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
                    <div className="legend-color" style={{ background: 'repeating-linear-gradient(45deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.05) 8px, rgba(99, 102, 241, 0.12) 8px, rgba(99, 102, 241, 0.12) 16px)', borderColor: 'rgba(99, 102, 241, 0.35)' }} />
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
          )}

          {/* TAB 4: REPORTISTICA ED ESPORTAZIONE (HR/ADMIN) */}
          {activeTab === 'reports' && currentUser && (currentUser.role === 'Admin' || currentUser.role === 'HR') && (
            <div className="charts-grid">
              
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
                  {users.filter(u => u.role === 'Dipendente').map(user => {
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
                          if (currentUser.role === 'Dipendente') setActiveTab('dashboard');
                          else if (currentUser.role === 'Admin') setActiveTab('approvals');
                          else setActiveTab('coverage');
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
