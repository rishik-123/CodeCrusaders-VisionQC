import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLoading } from '../components/auth/ProtectedRoute';
import logo from '../assets/favicon.png';
import './AuthPages.css';

export default function RegisterPage() {
  const { register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const change = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (form.username.trim().length < 3 || form.username.trim().length > 30) next.username = 'Username must be 3–30 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next); if (Object.keys(next).length) return;
    setSubmitting(true);
    try { await register({ username: form.username.trim(), email: form.email.trim(), password: form.password }); navigate('/login', { replace: true, state: { notice: 'Account created. Sign in to continue.' } }); }
    catch (err) { setErrors({ form: err.message }); }
    finally { setSubmitting(false); }
  }

  return <main className="auth-page"><section className="auth-card auth-card-register" aria-labelledby="register-title">
    <div className="auth-brand"><img src={logo} alt="VisionQC Logo" className="auth-brand-logo" /><span>VisionQC</span></div>
    <h1 id="register-title">Create Account</h1><p className="auth-subtitle">Get started with VisionQC.</p>
    <form onSubmit={handleSubmit} noValidate>
      <label className="auth-label" htmlFor="username">Username</label><input className="auth-input" id="username" autoComplete="username" value={form.username} onChange={change('username')} />{errors.username && <small className="auth-error">{errors.username}</small>}
      <label className="auth-label" htmlFor="email">Email</label><input className="auth-input" id="email" type="email" autoComplete="email" value={form.email} onChange={change('email')} />{errors.email && <small className="auth-error">{errors.email}</small>}
      <label className="auth-label" htmlFor="password">Password</label><div className="auth-password"><input className="auth-input" id="password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={change('password')} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((v) => !v)}><i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} /></button></div>{errors.password && <small className="auth-error">{errors.password}</small>}
      <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label><input className="auth-input" id="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={change('confirmPassword')} />{errors.confirmPassword && <small className="auth-error">{errors.confirmPassword}</small>}
      {errors.form && <p className="auth-error" role="alert">{errors.form}</p>}
      <button className="auth-submit" type="submit" disabled={submitting || loading}>{submitting ? 'Creating account…' : 'Create Account'}</button>
    </form>
    <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    <footer className="auth-footer">© {new Date().getFullYear()} VisionQC. All rights reserved.</footer>
  </section></main>;
}
