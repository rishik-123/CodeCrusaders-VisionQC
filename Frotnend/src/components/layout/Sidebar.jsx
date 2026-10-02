import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const menuItems = [
  {
    type: 'item',
    label: 'Dashboard',
    icon: 'fa-tachometer-alt',
    path: '/dashboard',
  },
  { type: 'group', label: 'Setup' },
  {
    type: 'parent',
    label: 'Product Setup',
    icon: 'fa-box',
    children: [
      { label: 'Setup Overview', path: '/setup' },
      { label: 'Reference Images', path: '/setup/references' },
      { label: 'Learn Normal (Training)', path: '/setup/training' },
    ],
  },
  { type: 'group', label: 'Inspection' },
  {
    type: 'item',
    label: 'Live Inspection',
    icon: 'fa-search',
    path: '/inspection',
  },
  {
    type: 'item',
    label: 'Inspection History',
    icon: 'fa-history',
    path: '/history',
  },
  { type: 'group', label: 'Analytics' },
  {
    type: 'item',
    label: 'Quality Insights',
    icon: 'fa-chart-line',
    path: '/insights',
  },
  {
    type: 'item',
    label: 'AI Copilot',
    icon: 'fa-robot',
    path: '/copilot',
  },
  { type: 'group', label: 'Configuration' },
  {
    type: 'item',
    label: 'Product Settings',
    icon: 'fa-cog',
    path: '/products/1/settings',
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const [openParents, setOpenParents] = useState({ 'Product Setup': true });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef();

  const toggleParent = (label) => {
    setOpenParents((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on outside click (mobile)
  useEffect(() => {
    const handler = (e) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <aside ref={sidebarRef} className={sidebarClass}>
        {/* User block */}
        <div className="sidebar-user">
          <img
            className="avatar"
            src="https://ui-avatars.com/api/?name=Henry+Foster&background=2f80ed&color=fff&size=128"
            alt="Henry Foster"
          />
          <div className="name">Henry Foster</div>
          <div className="role">Quality Supervisor</div>
          <div className="user-links">
            <a href="#" title="Profile"><i className="fas fa-user"></i></a>
            <a href="#" title="Settings"><i className="fas fa-cog"></i></a>
            <a href="#" title="Logout"><i className="fas fa-sign-out-alt"></i></a>
          </div>
        </div>

        {/* Menu */}
        <nav className="sidebar-menu">
          {menuItems.map((item, idx) => {
            if (item.type === 'group') {
              return (
                <div key={idx} className="menu-group-title">
                  {item.label}
                </div>
              );
            }

            if (item.type === 'parent') {
              const isOpen = !!openParents[item.label];
              const isChildActive = item.children.some(
                (c) => location.pathname === c.path
              );
              return (
                <div key={idx} className="menu-item">
                  <button
                    className={isChildActive ? 'active' : ''}
                    onClick={() => toggleParent(item.label)}
                  >
                    <i className={`fas ${item.icon} menu-icon`}></i>
                    <span className="menu-label">{item.label}</span>
                    <i
                      className={`fas fa-chevron-right menu-arrow ${
                        isOpen ? 'open' : ''
                      }`}
                    ></i>
                  </button>
                  <div className={`submenu ${isOpen ? 'open' : ''}`}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `menu-item-link ${isActive ? 'active' : ''}`
                        }
                        end
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="menu-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  end={item.path === '/inspection'}
                >
                  <i className={`fas ${item.icon} menu-icon`}></i>
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
