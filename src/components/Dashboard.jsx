import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import RoleSwitcher from './RoleSwitcher';
import { 
  Gift, IndianRupee, Quote, Sparkles, BookOpen, Calendar, 
  Cpu, FileText, UserMinus, MessageSquare, Search, Clock, LogOut,
  Sun, Moon, Users, Mail, User, ShieldAlert, CheckCircle, Save
} from 'lucide-react';

const EMPLOYEE_TILES = [
  { id: 'myInfo', name: 'My Information', icon: User, color: '#3b82f6', desc: 'View and update your personal profile details' },
  { id: 'attendance', name: 'Attendance', icon: Clock, color: '#10b981', desc: 'Track daily attendance and check-ins' },
  { id: 'lmsClub', name: 'LMS & Club', icon: BookOpen, color: '#f59e0b', desc: 'E-library and discussion groups' },
  { id: 'eventPlanner', name: 'Event Planner', icon: Calendar, color: '#ec4899', desc: 'Reminders queue & calendar' },
  { id: 'assetManager', name: 'Asset Manager', icon: Cpu, color: '#06b6d4', desc: 'View your checked-out hardware and return due dates' },
  { id: 'docVault', name: 'Document Vault', icon: FileText, color: '#14b8a6', desc: 'Self-service digital certificates' },
  { id: 'offboarding', name: 'Offboarding', icon: UserMinus, color: '#ef4444', desc: 'Custom notice & task checklists' },
  { id: 'surveys', name: 'Pulse Surveys', icon: MessageSquare, color: '#84cc16', desc: 'Burnout & engagement analytics' },
  { id: 'policies', name: 'Centralized Policies', icon: Search, color: '#6366f1', desc: 'Browse company SOPs, guidelines, and benefits' },
];

const ADMIN_TILES = [
  { id: 'attendance', name: 'Attendance', icon: Clock, color: '#10b981', desc: 'Master attendance calendar dashboard' },
  { id: 'directory', name: 'Employee Directory', icon: Users, color: '#10b981', desc: 'Manage staff profiles & Excel imports' },
  { id: 'celebrations', name: 'Celebrations', icon: Gift, color: '#f43f5e', desc: 'Birthday & anniversary scheduler' },
  { id: 'payroll', name: 'Payroll Hub', icon: IndianRupee, color: '#10b981', desc: 'AES-encrypted salary breakups sender' },
  { id: 'dailyPulse', name: 'Daily Pulse', icon: Quote, color: '#3b82f6', desc: 'Motivational quote scheduler' },
  { id: 'surpriseOps', name: 'Surprise Ops', icon: Sparkles, color: '#8b5cf6', desc: 'Instant voucher delivery portal' },
  { id: 'lmsClub', name: 'LMS & Club', icon: BookOpen, color: '#f59e0b', desc: 'E-library and discussion groups' },
  { id: 'eventPlanner', name: 'Event Planner', icon: Calendar, color: '#ec4899', desc: 'Reminders queue & calendar' },
  { id: 'assetManager', name: 'Asset Manager', icon: Cpu, color: '#06b6d4', desc: 'Hardware checkout & return alerts' },
  { id: 'docVault', name: 'Document Vault', icon: FileText, color: '#14b8a6', desc: 'Self-service digital certificates' },
  { id: 'offboarding', name: 'Offboarding', icon: UserMinus, color: '#ef4444', desc: 'Deprovisioning & task checklists' },
  { id: 'surveys', name: 'Pulse Surveys', icon: MessageSquare, color: '#84cc16', desc: 'Burnout & engagement analytics' },
  { id: 'policies', name: 'Centralized Policies', icon: Search, color: '#6366f1', desc: 'Browse company SOPs, guidelines, and benefits' },
];

export default function Dashboard({ user, activeTenant, onLogout, onSelectModule, onUserUpdate }) {
  const [isLightMode, setIsLightMode] = useState(() => {
    // Default to light mode unless user has explicitly set dark
    return localStorage.getItem('theme') !== 'dark';
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

  const { currentRole } = useAuth();
  const isAdmin = currentRole === 'Admin';
  const tiles = isAdmin ? ADMIN_TILES : EMPLOYEE_TILES;



  return (
    <div className="dashboard-container">
      {/* Top Navbar with Centered Logo */}
      <header className="navbar" style={{ flexDirection: 'column', gap: '15px', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div className="logo-container">
            <img src="/logo.png" alt="SEMCO Logo" className="logo-image" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
          <div className="navbar-brand">
            <h1>SEMCO Groups HR Operations</h1>
            <span className="tenant-badge">{activeTenant.name}</span>
          </div>
          <div className="user-profile">
            <RoleSwitcher />
            {/* Light/Dark Mode Toggle Switch */}
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme} 
              title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button className="logout-btn" onClick={onLogout} title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="dashboard-main">
        <div className="welcome-banner">
          <h2>Welcome back, {user.name.split(' ')[0]} 👋</h2>
          <p>Select an operation tile below to access HR modules and automations.</p>
        </div>

        <div className="tiles-grid">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div 
                key={tile.id} 
                className="tile-card" 
                onClick={() => onSelectModule(tile.id)}
                style={{ '--tile-hover-color': tile.color }}
              >
                <div className="tile-glow" style={{ backgroundColor: tile.color }}></div>
                <div className="tile-content">
                  <div className="tile-header">
                    <div className="tile-icon-box" style={{ background: `${tile.color}15`, color: tile.color }}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <h3>{tile.name}</h3>
                  <p>{tile.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
