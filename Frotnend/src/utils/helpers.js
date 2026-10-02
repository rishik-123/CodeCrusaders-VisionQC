export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(iso) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function getResultClass(result) {
  return result === 'PASS' ? 'badge-pass' : 'badge-fail';
}

export function getStatusClass(status) {
  const map = {
    Ready: 'badge-ready',
    Training: 'badge-training',
    'Not Trained': 'badge-not-trained',
    Pending: 'badge-pending',
    Approved: 'badge-approved',
    Rejected: 'badge-rejected',
  };
  return map[status] || 'badge-info';
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}
