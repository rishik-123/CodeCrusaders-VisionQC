import { useState } from 'react';
import { Dropdown, DropdownItem, DropdownDivider } from '../common/UIComponents';
import { products } from '../../data/mockData';

export default function Navbar({ onToggle }) {
  const [product, setProduct] = useState(products[0]);

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <i className="fas fa-eye" />
        <span className="brand-text">VisionQC</span>
      </div>

      <button type="button" className="nav-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <i className="fas fa-bars" />
      </button>

      <label className="nav-search">
        <input type="text" placeholder="Search Something..." aria-label="Search" />
        <i className="fas fa-search" />
      </label>

      <div className="nav-right">
        <button type="button" className="nav-btn nav-icon" aria-label="Alerts">
          <i className="fas fa-bell" />
          <span className="nav-badge">7</span>
        </button>

        <button type="button" className="nav-btn nav-icon" aria-label="Pending feedback">
          <i className="fas fa-envelope" />
          <span className="nav-badge">4</span>
        </button>

        <Dropdown
          trigger={
            <button type="button" className="nav-btn">
              <i className="fas fa-box" style={{ color: 'var(--orange)' }} />
              <span className="user-label">{product}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10 }} />
            </button>
          }
        >
          {products.map((p) => (
            <DropdownItem key={p} onClick={() => setProduct(p)}>{p}</DropdownItem>
          ))}
        </Dropdown>

        <Dropdown
          trigger={
            <button type="button" className="nav-btn">
              <span className="avatar-wrap">
                <span className="avatar avatar-50">HF</span>
                <span className="online" />
              </span>
              <span className="user-label">Henry Foster</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10 }} />
            </button>
          }
        >
          <DropdownItem icon="far fa-user">Profile</DropdownItem>
          <DropdownItem icon="fas fa-cog">Settings</DropdownItem>
          <DropdownDivider />
          <DropdownItem icon="fas fa-sign-out-alt">Logout</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
