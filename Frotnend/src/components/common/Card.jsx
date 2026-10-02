import { useState } from 'react';

export default function Card({ title, children, className = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
          <button
            className="card-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            title="More options"
          >
            <i className="fas fa-ellipsis-v"></i>
            {menuOpen && (
              <div className="card-dropdown">
                <button onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-sync-alt"></i> Update Data
                </button>
                <button onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-cog"></i> Settings
                </button>
                <button onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-trash"></i> Remove Panel
                </button>
              </div>
            )}
          </button>
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
