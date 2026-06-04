// Vaqt va Tarix Formatlash Utility

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec} soniya oldin`;
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  if (diffHour < 24) return `${diffHour} soat oldin`;
  if (diffDay < 7) return `${diffDay} kun oldin`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} hafta oldin`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} oy oldin`;
  return `${Math.floor(diffDay / 365)} yil oldin`;
}

export function formatDateTimeWithRelative(date: Date | string): string {
  return `${formatDateTime(date)} (${formatRelativeTime(date)})`;
}

export function getWeekday(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  return weekdays[d.getDay()];
}

export function getMonthName(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  return months[d.getMonth()];
}

export function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${getMonthName(d)} ${d.getFullYear()}, ${getWeekday(d)}`;
}

/**
 * Human-readable Uzbek date — replaces broken uz-UZ locale ("2026 M06 3").
 * Examples: "3 Iyun 2026" | "24 Aprel 2026"
 */
export function formatUzDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${getMonthName(d)} ${d.getFullYear()}`;
}

/**
 * Short human-readable: "24 Apr 2026"
 */
export function formatUzDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const SHORT_MONTHS = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
    'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
  ];
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Date + time: "24 Aprel 2026, 14:30"
 */
export function formatUzDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${formatUzDate(d)}, ${hh}:${mm}`;
}

export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

export function isYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getFullYear() === yesterday.getFullYear();
}

export function formatSmartDate(date: Date | string): string {
  if (isToday(date)) return `Bugun, ${formatTime(date)}`;
  if (isYesterday(date)) return `Kecha, ${formatTime(date)}`;
  return formatDateTime(date);
}
