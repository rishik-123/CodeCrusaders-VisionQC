// Charts need real hex values (SVG attributes). Keep in sync with variables.css
export const COLORS = {
  primary: '#2bb3c0',
  success: '#009378',
  warning: '#e16123',
  danger: '#e16123',
  grid: '#eeeeee',
  muted: '#888888',
};

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  let str = String(dateStr).trim();
  // Normalize SQLite "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" to standard ISO UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getStatusClass(status) {
  switch (String(status).toLowerCase()) {
    case 'ready':
    case 'pass':
      return 'badge-success';
    case 'fail':
    case 'error':
      return 'badge-danger';
    case 'training':
    case 'processing':
      return 'badge-warning';
    default:
      return 'badge-primary';
  }
}