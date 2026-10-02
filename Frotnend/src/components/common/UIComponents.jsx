import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar } from 'recharts';

export function Badge({ type = 'primary', children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function ProgressBar({ value, color }) {
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

// Thin vertical bars, the small chart style used in DAdmin
export function MiniBars({ data, color, width = 100, height = 30 }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <BarChart width={width} height={height} data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
      <Bar dataKey="v" fill={color} isAnimationActive={false} />
    </BarChart>
  );
}

export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="dd" ref={ref}>
      <div style={{ display: 'flex', height: '100%' }} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </div>
      {open && (
        <div className={`dd-menu ${align === 'left' ? 'left' : ''}`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon, children, onClick }) {
  return (
    <button type="button" className="dd-item" onClick={onClick}>
      {icon && <i className={icon} />}
      {children}
    </button>
  );
}

export const DropdownDivider = () => <div className="dd-divider" />;
