import { useState } from 'react';
import { Dropdown, DropdownItem } from './UIComponents';

export default function Card({ title, actions, menu = true, flush = false, footer, children }) {
  const [removed, setRemoved] = useState(false);
  if (removed) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div className="card-actions">
          {actions}
          {menu && (
            <Dropdown
              trigger={
                <button type="button" className="icon-btn" aria-label="Panel options">
                  <i className="fas fa-ellipsis-v" />
                </button>
              }
            >
              <DropdownItem icon="fas fa-sync-alt">Update Data</DropdownItem>
              <DropdownItem icon="fas fa-cog">Settings</DropdownItem>
              <DropdownItem icon="fas fa-times" onClick={() => setRemoved(true)}>Remove Panel</DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
