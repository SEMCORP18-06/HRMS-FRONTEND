import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Celebrations from './components/Celebrations';
import PayrollHub from './components/PayrollHub';
import DailyPulse from './components/DailyPulse';
import SurpriseOps from './components/SurpriseOps';
import LMSClub from './components/LMSClub';
import EventPlanner from './components/EventPlanner';
import AssetManager from './components/AssetManager';
import DocumentVault from './components/DocumentVault';
import Offboarding from './components/Offboarding';
import PulseSurveys from './components/PulseSurveys';
import PolicySearch from './components/PolicySearch';
import EmployeeDirectory from './components/EmployeeDirectory';
import Attendance from './components/Attendance';
import OnboardingForm from './components/OnboardingForm';
import MyProfile from './components/MyProfile';
import { useAuth } from './context/AuthContext';
import RoleSwitcher from './components/RoleSwitcher';

export default function App() {
  const { 
    user, 
    activeTenant, 
    checkingAuth, 
    currentRole, 
    login, 
    logout, 
    refreshUser 
  } = useAuth();
  
  const [activeModule, setActiveModule] = useState(null);
  const [globalPopup, setGlobalPopup] = useState(null);
  const [inviteToken, setInviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (path === '/invite/activate' || path.startsWith('/invite/activate')) {
      return params.get('token');
    }
    return null;
  });

  useEffect(() => {
    window.customAlert = (message, title = 'Notification') => {
      return new Promise((resolve) => {
        setGlobalPopup({ type: 'alert', message, title, resolve });
      });
    };
    
    window.customConfirm = (message, title = 'Confirm Action') => {
      return new Promise((resolve) => {
        setGlobalPopup({ type: 'confirm', message, title, resolve });
      });
    };
    
    window.alert = window.customAlert;
    window.confirm = window.customConfirm;
  }, []);

  // Secure Layout/Routing Wrapper: protect Admin modules from regular employees
  useEffect(() => {
    if (activeModule && currentRole === 'Employee') {
      const adminOnlyModules = ['directory', 'celebrations', 'payroll', 'dailyPulse', 'surpriseOps'];
      if (adminOnlyModules.includes(activeModule)) {
        window.customAlert('Access Denied: You do not have authorization to view this admin panel.', 'Authorization Error');
        setActiveModule(null);
      }
    }
  }, [activeModule, currentRole]);

  const handleLoginSuccess = (userData, tenantData) => {
    login(userData, tenantData);
  };

  const handleLogout = () => {
    logout();
    setActiveModule(null);
  };

  const handleUserUpdate = () => {
    refreshUser();
  };

  const renderGlobalPopup = () => {
    if (!globalPopup) return null;
    return (
      <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'modalBackdropFadeIn 0.3s ease' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'modalContentPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div style={{ 
            background: globalPopup.type === 'confirm' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
            color: globalPopup.type === 'confirm' ? '#ef4444' : '#10b981', 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px auto' 
          }}>
            {globalPopup.type === 'confirm' ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
          </div>
          <h3 style={{ fontSize: '19px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '10px' }}>{globalPopup.title}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '25px' }}>
            {globalPopup.message}
          </p>
          {globalPopup.type === 'confirm' ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  globalPopup.resolve(false);
                  setGlobalPopup(null);
                }}
                className="back-btn"
                style={{ flex: 1, padding: '11px', fontSize: '13px', borderRadius: '10px', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  globalPopup.resolve(true);
                  setGlobalPopup(null);
                }}
                className="btn-primary"
                style={{ flex: 1, background: 'var(--brand-gradient)', padding: '11px', fontSize: '13px', borderRadius: '10px', fontWeight: 'bold', justifyContent: 'center' }}
              >
                Confirm
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                globalPopup.resolve(true);
                setGlobalPopup(null);
              }}
              className="btn-primary"
              style={{ background: 'var(--brand-gradient)', width: '100%', padding: '11px', justifyContent: 'center', fontSize: '13px', borderRadius: '10px', fontWeight: 'bold' }}
            >
              OK
            </button>
          )}
        </div>
      </div>
    );
  };

  if (inviteToken) {
    return <OnboardingForm token={inviteToken} onComplete={() => setInviteToken(null)} />;
  }

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <h3>Loading HR Portal...</h3>
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const effectiveUser = user ? { 
    ...user, 
    role: currentRole === 'Admin' ? 'Admin (HR)' : 'Employee' 
  } : null;

  if (activeModule) {
    const renderModule = () => {
      switch (activeModule) {
        case 'myInfo': return <MyProfile user={effectiveUser} onUserUpdate={handleUserUpdate} />;
        case 'attendance': return <Attendance activeTenant={activeTenant} user={effectiveUser} />;
        case 'directory': return <EmployeeDirectory activeTenant={activeTenant} />;
        case 'celebrations': return <Celebrations activeTenant={activeTenant} />;
        case 'payroll': return <PayrollHub activeTenant={activeTenant} />;
        case 'dailyPulse': return <DailyPulse activeTenant={activeTenant} />;
        case 'surpriseOps': return <SurpriseOps activeTenant={activeTenant} />;
        case 'lmsClub': return <LMSClub activeTenant={activeTenant} user={effectiveUser} />;
        case 'eventPlanner': return <EventPlanner activeTenant={activeTenant} user={effectiveUser} />;
        case 'assetManager': return <AssetManager activeTenant={activeTenant} user={effectiveUser} />;
        case 'docVault': return <DocumentVault activeTenant={activeTenant} user={effectiveUser} />;
        case 'offboarding': return <Offboarding activeTenant={activeTenant} user={effectiveUser} />;
        case 'surveys': return <PulseSurveys activeTenant={activeTenant} />;
        case 'policies': return <PolicySearch activeTenant={activeTenant} user={effectiveUser} />;
        default: return <div>Module not implemented</div>;
      }
    };

    return (
      <>
        <div className="dashboard-container">
          <header className="navbar" style={{ flexDirection: 'column', gap: '15px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="logo-container">
                <img src="/logo.png" alt="SEMCO Logo" className="logo-image" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
              <div className="navbar-brand" onClick={() => setActiveModule(null)} style={{ cursor: 'pointer' }}>
                <h1 style={{ fontSize: '18px' }}>SEMCO Groups HR Operations</h1>
                <span className="tenant-badge" style={{ fontSize: '10px' }}>{activeTenant.name}</span>
              </div>
              <div className="user-profile">
                <RoleSwitcher />
                <button className="back-btn" onClick={() => setActiveModule(null)} style={{ marginRight: '15px' }}>
                  ← Back to Grid
                </button>
                <div className="user-info">
                  <span className="user-name">{effectiveUser.name}</span>
                  <span className="user-role">{effectiveUser.role}</span>
                </div>
              </div>
            </div>
          </header>
          <main className="dashboard-main">
            {renderModule()}
          </main>
        </div>
        {renderGlobalPopup()}
      </>
    );
  }

  return (
    <>
      <Dashboard 
        user={effectiveUser} 
        activeTenant={activeTenant} 
        onLogout={handleLogout} 
        onSelectModule={setActiveModule} 
        onUserUpdate={handleUserUpdate}
      />
      {renderGlobalPopup()}
    </>
  );
}
