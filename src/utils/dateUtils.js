// src/utils/dateUtils.js

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

// Helper to format date as DD/MM/YYYY
function formatDateIt(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

module.exports = {
  getEasterDate,
  isItalianHoliday,
  getWorkingDaysCount,
  formatDateIt
};
