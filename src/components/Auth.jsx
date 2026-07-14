import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { KeyRound, User, Mail, ShieldAlert, Sun, Moon } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [adminRegistered, setAdminRegistered] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [role, setRole] = useState('Admin (HR)');
  const [loginRole, setLoginRole] = useState('Admin (HR)');

  useEffect(() => {
    api.auth.signupStatus()
      .then(res => setAdminRegistered(res.admin_registered))
      .catch(err => console.error("Signup status query failed:", err));
  }, [isSignUp]);

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.auth.login(email, password, loginRole);
      localStorage.setItem('hr_token', response.access_token);
      onLoginSuccess(response.user, response.tenant);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.auth.signup({
        name,
        email,
        password,
        role: adminRegistered ? 'Employee' : role,
        department: adminRegistered ? 'General' : (role === 'Admin (HR)' ? 'HR Ops' : 'General')
      });
      setSuccess('Account created successfully! Switching to sign in...');
      setTimeout(() => {
        setIsSignUp(false);
        setPassword('');
        setError('');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Email might already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Absolute Positioned Theme Toggle Button */}
      <button 
        className="theme-toggle-btn" 
        onClick={toggleTheme} 
        title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          margin: 0
        }}
      >
        {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {/* Top Centered Logo for Auth Page */}
      <div className="logo-container">
        <img src="/logo.png" alt="SEMCO Logo" className="logo-image" />
      </div>

      <div className="auth-card" style={{ maxWidth: '450px' }}>
        <h2 style={{ fontWeight: 'bold' }}>SEMCO Groups HR Operations</h2>
        <p style={{ fontWeight: 'bold' }}>{isSignUp ? 'Create a Corporate Account' : 'Sign In to Corporate Portal'}</p>
        
        {isSignUp && adminRegistered && (
          <div style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', fontWeight: '500', textAlign: 'left' }}>
            ℹ️ Admin (HR) account has already been registered. Sign-up is locked for Employee registrations only.
          </div>
        )}
        {error && (
          <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 'bold' }}>
            {success}
          </div>
        )}
        
        {!isSignUp ? (
          /* SIGN IN FORM */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Corporate or Approved Personal Email</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
            
            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
            
            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Access Portal</label>
              <select 
                value={loginRole} 
                onChange={(e) => setLoginRole(e.target.value)}
                disabled={loading}
                style={{ 
                  fontWeight: 'bold', 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-card)', 
                  color: 'var(--text-main)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Admin (HR)">HR Admin Portal</option>
                <option value="Employee">Employee Portal</option>
              </select>
            </div>
            
            <button type="submit" className="sso-btn" disabled={loading} style={{ fontWeight: 'bold', marginTop: '10px' }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form onSubmit={handleSignUp}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', textAlign: 'left' }}>
              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>Corporate or Approved Personal Email</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    placeholder="Create Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                  />
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {!adminRegistered && (
                <div className="form-group">
                  <label style={{ fontWeight: 'bold' }}>Select Role</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    required
                    style={{ fontWeight: 'bold', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  >
                    <option value="Admin (HR)">Admin (HR)</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              )}
            </div>
            
            <button type="submit" className="sso-btn" disabled={loading} style={{ marginTop: '10px', fontWeight: 'bold' }}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {!isSignUp ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--brand-blue)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {!isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
