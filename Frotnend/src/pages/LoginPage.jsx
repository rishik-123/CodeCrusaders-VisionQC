import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoading } from '../components/auth/ProtectedRoute';
import logo from '../assets/favicon.png';
import './AuthPages.css';

export default function LoginPage() {
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [notice] = useState(location.state?.notice || '');
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await login({ username, password }); navigate(location.state?.from?.pathname || '/dashboard', { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="login-title">
    <div className="auth-brand"><img src={logo} alt="VisionQC Logo" className="auth-brand-logo" /><span>VisionQC</span></div>
    <h1 id="login-title">Welcome Back</h1><p className="auth-subtitle">Sign in to your VisionQC account.</p>
    {notice && <p className="auth-notice" role="status">{notice}</p>}
    <form onSubmit={handleSubmit} noValidate>
      <label className="auth-label" htmlFor="username">Username</label>
      <input className="auth-input" id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      <label className="auth-label" htmlFor="password">Password</label>
      <div className="auth-password"><input className="auth-input" id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((v) => !v)}><i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} /></button></div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={submitting || loading}>{submitting ? 'Signing in…' : 'Sign In'}</button>
    </form>
    <p className="auth-switch">Don’t have an account? <Link to="/register">Create one</Link></p>
    <footer className="auth-footer">© {new Date().getFullYear()} VisionQC. All rights reserved.</footer>
  </section></main>;
}
