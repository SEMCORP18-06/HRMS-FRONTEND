import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User } from 'lucide-react';

export default function RoleSwitcher() {
  const { currentRole, allowedRoles, switchRole } = useAuth();

  // Switcher is strictly restricted to users with both Admin and Employee roles
  if (allowedRoles.length <= 1) {
    return null;
  }

  const isCurrentAdmin = currentRole === 'Admin';

  return (
    <div className="role-switcher-container">
      <div className="role-switcher-bg">
        <div 
          className={`role-switcher-slider ${isCurrentAdmin ? 'slide-left' : 'slide-right'}`}
        />
        <button 
          className={`role-switcher-btn ${isCurrentAdmin ? 'active' : ''}`}
          onClick={() => switchRole('Admin')}
        >
          <Shield size={14} className="role-switcher-icon" />
          <span>Admin View</span>
        </button>
        <button 
          className={`role-switcher-btn ${!isCurrentAdmin ? 'active' : ''}`}
          onClick={() => switchRole('Employee')}
        >
          <User size={14} className="role-switcher-icon" />
          <span>Employee View</span>
        </button>
      </div>
    </div>
  );
}
