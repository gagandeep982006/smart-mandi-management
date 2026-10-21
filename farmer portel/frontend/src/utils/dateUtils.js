export function formatIndianTime(val) {
  if (!val) return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const timeMatch = trimmed.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${m} ${period}`;
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

export function formatIndianDate(val) {
  if (!val) return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const dateObj = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
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

export function formatIndianDateTime(val) {
  if (!val) return 'N/A';
  const datePart = formatIndianDate(val);
  const timePart = formatIndianTime(val);
  if (datePart === 'N/A' || timePart === 'N/A') return 'N/A';
  return `${datePart}, ${timePart}`;
}
