import { useState } from 'react';
import { Dropdown, DropdownItem, DropdownDivider } from '../common/UIComponents';
import { products } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onToggle }) {
  const [product, setProduct] = useState(products[0]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); }
    finally { navigate('/login', { replace: true }); }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <i className="fas fa-eye" />
        <span className="brand-text">VisionQC</span>
      </div>

      <button type="button" className="nav-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <i className="fas fa-bars" />
      </button>

      <div className="nav-right">
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
                <span className="avatar avatar-50">{user?.username?.slice(0, 2).toUpperCase() || 'U'}</span>
                <span className="online" />
              </span>
              <span className="user-label">{user?.username || 'Account'}</span>
              <i className="fas fa-chevron-down" style={{ fontSize: 10 }} />
            </button>
          }
        >
          <div className="dd-user-info"><strong>{user?.username}</strong><small>{user?.email}</small></div>
          <DropdownItem icon="far fa-user">Profile</DropdownItem>
          <DropdownItem icon="fas fa-cog">Settings</DropdownItem>
          <DropdownDivider />
          <DropdownItem icon="fas fa-sign-out-alt" onClick={handleLogout}>Logout</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
