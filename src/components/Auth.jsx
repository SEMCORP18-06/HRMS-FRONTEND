import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { KeyRound, User, Mail, ShieldAlert, Sun, Moon, CheckCircle, ArrowLeft, Hash, RefreshCw } from 'lucide-react';

// ── OTP Input Component ──────────────────────────────────────────────────
function OtpInput({ length = 6, value, onChange }) {
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newOtp = value.split('');
    newOtp[index] = val.slice(-1);
    const joined = newOtp.join('');
    onChange(joined);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData.padEnd(length, ''));
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="otp-input-container">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={value[i] ? 'filled' : ''}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

// ── Step Indicator Component ─────────────────────────────────────────────
function StepIndicator({ totalSteps, currentStep }) {
  return (
    <div className="auth-step-indicator">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`auth-step-dot ${i + 1 === currentStep ? 'active' : i + 1 < currentStep ? 'completed' : ''}`} />
          {i < totalSteps - 1 && (
            <div className={`auth-step-line ${i + 1 < currentStep ? 'completed' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Resend Timer Component ───────────────────────────────────────────────
function ResendTimer({ onResend, loading }) {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    onResend();
  };

  return (
    <div className="resend-timer">
      {canResend ? (
        <button onClick={handleResend} disabled={loading}>
          <RefreshCw size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Resend Code
        </button>
      ) : (
        <span>Resend code in <strong>{countdown}s</strong></span>
      )}
    </div>
  );
}

// ── Main Auth Component ──────────────────────────────────────────────────
export default function Auth({ onLoginSuccess }) {
  // View: 'login', 'signup', 'forgot'
  const [view, setView] = useState('login');
  const [adminRegistered, setAdminRegistered] = useState(false);

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Signup fields
  const [signupStep, setSignupStep] = useState(1); // 1: email, 2: OTP, 3: profile
  const [name, setName] = useState('');
  const [role, setRole] = useState('Admin (HR)');
  const [otp, setOtp] = useState('');

  // Forgot password fields
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: OTP + new password
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Theme
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true') {
      setView('signup');
    }
  }, []);

  useEffect(() => {
    api.auth.signupStatus()
      .then(res => setAdminRegistered(res.admin_registered))
      .catch(err => console.error("Signup status query failed:", err));
  }, [view]);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  const resetState = useCallback(() => {
    setEmail('');
    setPassword('');
    setName('');
    setOtp('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setSignupStep(1);
    setForgotStep(1);
  }, []);

  const switchView = (newView) => {
    resetState();
    setView(newView);
  };

  // ── LOGIN ────────────────────────────────────────────────────────────
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
      const response = await api.auth.login(email, password, undefined);
      localStorage.setItem('hr_token', response.access_token);
      onLoginSuccess(response.user, response.tenant);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP STEP 1: Send Verification OTP ─────────────────────────────
  const handleSendVerificationOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.auth.sendVerificationOtp(email);
      setSuccess('Verification code sent! Check your inbox.');
      setSignupStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP STEP 2: Verify OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.replace(/\s/g, '').length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.auth.verifyOtp(email, otp.trim());
      setSuccess('Email verified successfully!');
      setSignupStep(3);
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // ── SIGNUP STEP 3: Complete Registration ─────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      setError('Name and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.auth.signup({
        name,
        email,
        password,
        role: adminRegistered ? 'Employee' : role,
        department: adminRegistered ? 'General' : (role === 'Admin (HR)' ? 'HR Ops' : 'General'),
        email_verified: true
      });
      setSuccess('Account created successfully! Switching to sign in...');
      setTimeout(() => {
        switchView('login');
        setSuccess('Account created! Please sign in.');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD STEP 1: Send Reset OTP ──────────────────────────
  const handleForgotSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.auth.forgotPassword(email);
      setSuccess('Reset code sent! Check your inbox.');
      setForgotStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD STEP 2: Reset Password ──────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotOtp.replace(/\s/g, '').length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.auth.resetPassword(email, forgotOtp.trim(), newPassword);
      setSuccess(res.message || 'Password reset successfully!');
      setTimeout(() => {
        switchView('login');
        setSuccess('Password reset! Please sign in with your new password.');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength indicator ──────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { width: '0%', color: '#64748b', label: '' };
    if (pwd.length < 4) return { width: '20%', color: '#ef4444', label: 'Weak' };
    if (pwd.length < 6) return { width: '40%', color: '#f59e0b', label: 'Fair' };
    if (pwd.length < 8) return { width: '60%', color: '#eab308', label: 'Good' };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*]/.test(pwd);
    if (hasUpper && hasNumber && hasSpecial) return { width: '100%', color: '#10b981', label: 'Strong' };
    return { width: '80%', color: '#22c55e', label: 'Good' };
  };

  // ── RENDER ───────────────────────────────────────────────────────────
  const renderError = () => error && (
    <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
      <ShieldAlert size={16} />
      <span>{error}</span>
    </div>
  );

  const renderSuccess = () => success && (
    <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <CheckCircle size={16} />
      <span>{success}</span>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────
  // LOGIN VIEW
  // ────────────────────────────────────────────────────────────────────
  const renderLoginForm = () => (
    <div className="auth-fade-in">
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
          <div style={{ textAlign: 'right', marginTop: '6px' }}>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => switchView('forgot')}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <button type="submit" className="sso-btn" disabled={loading} style={{ fontWeight: 'bold', marginTop: '10px' }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────
  // SIGNUP VIEW (3-step wizard)
  // ────────────────────────────────────────────────────────────────────
  const renderSignupForm = () => (
    <div className="auth-fade-in" key={`signup-step-${signupStep}`}>
      <StepIndicator totalSteps={3} currentStep={signupStep} />

      {signupStep === 1 && (
        <form onSubmit={handleSendVerificationOtp}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', fontWeight: '600' }}>
            Enter your corporate email to receive a verification code
          </p>
          <div className="form-group">
            <label style={{ fontWeight: 'bold' }}>Corporate or Approved Personal Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="name@semcogroups.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                style={{ paddingLeft: '38px', fontWeight: 'bold' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
          <button type="submit" className="sso-btn" disabled={loading} style={{ fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {signupStep === 2 && (
        <form onSubmit={handleVerifyOtp}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
            Enter the 6-digit code sent to
          </p>
          <p style={{ fontSize: '14px', color: 'var(--brand-blue)', fontWeight: '800', marginBottom: '16px', wordBreak: 'break-all' }}>
            {email}
          </p>
          <OtpInput length={6} value={otp} onChange={setOtp} />
          <button type="submit" className="sso-btn" disabled={loading || otp.replace(/\s/g, '').length < 6} style={{ fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
          <ResendTimer onResend={handleSendVerificationOtp} loading={loading} />
          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => { setSignupStep(1); setOtp(''); setError(''); setSuccess(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={12} /> Change Email
            </button>
          </div>
        </form>
      )}

      {signupStep === 3 && (
        <form onSubmit={handleSignUp}>
          <div className="verification-badge">
            <CheckCircle size={14} /> {email} verified
          </div>

          {adminRegistered && (
            <div style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', fontWeight: '500', textAlign: 'left' }}>
              ℹ️ Admin (HR) account has already been registered. Sign-up is locked for Employee registrations only.
            </div>
          )}

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
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Create Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {password && (
                <div className="password-strength">
                  <div
                    className="password-strength-bar"
                    style={{
                      width: getPasswordStrength(password).width,
                      background: getPasswordStrength(password).color
                    }}
                  />
                </div>
              )}
              {password && (
                <span style={{ fontSize: '11px', color: getPasswordStrength(password).color, fontWeight: '700', marginTop: '4px', display: 'block' }}>
                  {getPasswordStrength(password).label}
                </span>
              )}
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
    </div>
  );

  // ────────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD VIEW (2-step)
  // ────────────────────────────────────────────────────────────────────
  const renderForgotForm = () => (
    <div className="auth-fade-in" key={`forgot-step-${forgotStep}`}>
      <StepIndicator totalSteps={2} currentStep={forgotStep} />

      {forgotStep === 1 && (
        <form onSubmit={handleForgotSendOtp}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', fontWeight: '600' }}>
            Enter your registered email to receive a password reset code
          </p>
          <div className="form-group">
            <label style={{ fontWeight: 'bold' }}>Corporate or Approved Personal Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="name@semcogroups.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                style={{ paddingLeft: '38px', fontWeight: 'bold' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
          <button type="submit" className="sso-btn" disabled={loading} style={{ fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>
        </form>
      )}

      {forgotStep === 2 && (
        <form onSubmit={handleResetPassword}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
            Enter the 6-digit code sent to
          </p>
          <p style={{ fontSize: '14px', color: 'var(--brand-blue)', fontWeight: '800', marginBottom: '16px', wordBreak: 'break-all' }}>
            {email}
          </p>

          <OtpInput length={6} value={forgotOtp} onChange={setForgotOtp} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', textAlign: 'left', marginTop: '18px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {newPassword && (
                <div className="password-strength">
                  <div
                    className="password-strength-bar"
                    style={{
                      width: getPasswordStrength(newPassword).width,
                      background: getPasswordStrength(newPassword).color
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{ paddingLeft: '38px', fontWeight: 'bold' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '4px', display: 'block' }}>
                  Passwords do not match
                </span>
              )}
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={11} /> Passwords match
                </span>
              )}
            </div>
          </div>

          <button type="submit" className="sso-btn" disabled={loading || forgotOtp.replace(/\s/g, '').length < 6} style={{ fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <ResendTimer onResend={handleForgotSendOtp} loading={loading} />
        </form>
      )}

      <div style={{ marginTop: '15px' }}>
        <button
          type="button"
          onClick={() => switchView('login')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>
      </div>
    </div>
  );

  // ── Page title / subtitle ────────────────────────────────────────────
  const getTitle = () => {
    if (view === 'login') return 'Sign In to Corporate Portal';
    if (view === 'signup') {
      if (signupStep === 1) return 'Create a Corporate Account';
      if (signupStep === 2) return 'Verify Your Email';
      return 'Complete Your Profile';
    }
    if (view === 'forgot') {
      if (forgotStep === 1) return 'Reset Your Password';
      return 'Enter Reset Code';
    }
    return '';
  };

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="auth-wrapper" style={{ flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Theme Toggle */}
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

      {/* Logo */}
      <div className="logo-container">
        <img src="/logo.png" alt="SEMCO Logo" className="logo-image" />
      </div>

      {/* Auth Card */}
      <div className="auth-card" style={{ maxWidth: '450px' }}>
        <h2 style={{ fontWeight: 'bold' }}>SEMCO Groups HR Operations</h2>
        <p style={{ fontWeight: 'bold' }}>{getTitle()}</p>

        {renderError()}
        {renderSuccess()}

        {view === 'login' && renderLoginForm()}
        {view === 'signup' && renderSignupForm()}
        {view === 'forgot' && renderForgotForm()}

        {/* Bottom navigation links */}
        {view !== 'forgot' && (
          <div style={{ marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {view === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
              style={{ background: 'transparent', border: 'none', color: 'var(--brand-blue)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {view === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
