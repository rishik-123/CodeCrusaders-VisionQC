export function Badge({ children, type = 'info', large = false }) {
  const cls = `badge badge-${type} ${large ? 'badge-lg' : ''}`;
  return <span className={cls}>{children}</span>;
}

export function ProgressBar({ value, max = 100, color = '', label = false, large = false }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={large ? 'progress-bar-lg' : ''}>
      <div className="progress-bar-wrapper">
        <div
          className={`progress-bar-fill ${color}`}
          style={{ width: `${pct}%` }}
        >
          {label && large && `${Math.round(pct)}%`}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ size = '' }) {
  return <div className={`spinner ${size ? `spinner-${size}` : ''}`}></div>;
}
