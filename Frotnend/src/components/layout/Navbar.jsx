import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ collapsed, onToggle }) {
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="navbar-left">
        <div className="navbar-logo">
          <i className="fas fa-eye"></i>
          <span>VisionQC</span>
        </div>
        <button className="hamburger" onClick={onToggle} title="Toggle sidebar">
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <div className="navbar-right">
        <select className="nav-product-select" defaultValue="1">
          <option value="1">Bottle Cap</option>
        </select>

        <Link to="/history" className="nav-icon-btn" title="FAIL Alerts">
          <i className="fas fa-bell"></i>
          <span className="badge-dot badge-danger">7</span>
        </Link>

        <Link to="/history" className="nav-icon-btn" title="Feedback Pending">
          <i className="fas fa-comment-dots"></i>
          <span className="badge-dot badge-primary">4</span>
        </Link>

        <div
          className="user-dropdown"
          ref={userRef}
          onClick={() => setUserOpen(!userOpen)}
        >
          <img
            className="avatar"
            src="https://ui-avatars.com/api/?name=Henry+Foster&background=2f80ed&color=fff&size=64"
            alt="Henry Foster"
          />
          <span className="user-name">Henry Foster</span>
          <i className="fas fa-chevron-down"></i>

          <div className={`dropdown-menu ${userOpen ? 'show' : ''}`}>
            <a href="#"><i className="fas fa-user"></i> Profile</a>
            <a href="#"><i className="fas fa-cog"></i> Settings</a>
            <div className="dropdown-divider"></div>
            <button><i className="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
}
