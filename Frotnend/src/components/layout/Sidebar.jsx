import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const menu = [
  { items: [{ to: '/dashboard', icon: 'fas fa-home', label: 'Dashboard' }] },
  {
    heading: 'Setup',
    items: [
      { to: '/setup', icon: 'fas fa-box', label: 'Product Setup' },
      { to: '/setup/references', icon: 'fas fa-images', label: 'Reference Images' },
      { to: '/setup/training', icon: 'fas fa-brain', label: 'Learn Normal' },
    ],
  },
  {
    heading: 'Inspection',
    items: [
      { to: '/inspection', icon: 'fas fa-camera', label: 'Live Inspection' },
      { to: '/history', icon: 'fas fa-history', label: 'Inspection History' },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { to: '/insights', icon: 'fas fa-chart-line', label: 'Quality Insights' },
      { to: '/copilot', icon: 'fas fa-robot', label: 'AI Copilot' },
    ],
  },
  {
    heading: 'Configuration',
    items: [{ to: '/products/1/settings', icon: 'fas fa-cog', label: 'Product Settings' }],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await logout(); }
    finally { navigate('/login', { replace: true }); }
  };
  const [closed, setClosed] = useState({});
  const toggle = (h) => setClosed((c) => ({ ...c, [h]: !c[h] }));

  return (
    <aside className="sidebar">
      <div className="user-block">
        <span className="avatar avatar-80">{user?.username?.slice(0, 2).toUpperCase() || 'U'}</span>
        <div className="user-name">{user?.username || 'VisionQC User'}</div>
        <div className="user-role-badge">OPERATOR</div>
      </div>

      <nav className="menu">
        {menu.map((group, i) => (
          <div key={i} className={group.heading ? '' : 'menu-top'}>
            {group.heading && (
              <button type="button" className="menu-heading" onClick={() => toggle(group.heading)} aria-expanded={!closed[group.heading]}>
                <span className="menu-text">{group.heading}</span>
                <i className={closed[group.heading] ? 'far fa-plus-square' : 'far fa-minus-square'} />
              </button>
            )}
            {!closed[group.heading] &&
              group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/setup'}
                  className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <i className={item.icon} />
                  <span className="menu-text">{item.label}</span>
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
