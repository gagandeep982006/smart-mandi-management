/**
 * dateUtils.js - Indian Standard Time (IST, UTC+5:30) Formatting Utilities
 * Ensures all appointment times and dates are accurately rendered in IST without
 * being shifted backward by international/UTC systems.
 */

/**
 * Format any date/time or time string into Indian Standard Time (e.g. "08:50 AM").
 * Handles:
 *  - ISO strings: "2026-10-08T03:20:00.000Z" -> "08:50 AM"
 *  - Plain time strings: "08:50:00" or "08:50" -> "08:50 AM"
 *  - MySQL datetime strings: "2026-10-08 08:50:00" -> "08:50 AM"
 *  - JavaScript Date objects
 */
export function formatIndianTime(val) {
  if (!val) return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Plain time format: HH:MM or HH:MM:SS
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${period}`;
    }
    // MySQL local datetime without timezone: "2026-10-08 08:50:00"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parts = trimmed.split(' ');
      return formatIndianTime(parts[1]);
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);

  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase();
}

/**
 * Format any date or timestamp into Indian Standard Date (e.g. "08 Oct 2026").
 * Handles:
 *  - Plain date strings: "2026-10-08" -> "08 Oct 2026"
 *  - ISO strings: "2026-10-07T18:30:00.000Z" -> "08 Oct 2026" (IST date, not UTC previous day)
 *  - JavaScript Date objects
 */
export function formatIndianDate(val) {
  if (!val) return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);

  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format full date and time in IST (e.g. "08 Oct 2026, 08:50 AM").
 */
export function formatIndianDateTime(val) {
  if (!val) return 'N/A';
  const datePart = formatIndianDate(val);
  const timePart = formatIndianTime(val);
  if (datePart === 'N/A' || timePart === 'N/A') return 'N/A';
  return `${datePart}, ${timePart}`;
}
