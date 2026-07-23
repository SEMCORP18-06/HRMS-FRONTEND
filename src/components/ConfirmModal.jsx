import React from 'react';
import { AlertTriangle, HelpCircle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info', // 'danger', 'warning', 'info', 'success'
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <ShieldAlert size={28} style={{ color: '#ef4444' }} />,
          iconBg: 'rgba(239, 68, 68, 0.12)',
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          btnShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
          badgeColor: '#ef4444'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={28} style={{ color: '#f59e0b' }} />,
          iconBg: 'rgba(245, 158, 11, 0.12)',
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
          badgeColor: '#f59e0b'
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={28} style={{ color: '#10b981' }} />,
          iconBg: 'rgba(16, 185, 129, 0.12)',
          btnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          btnShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
          badgeColor: '#10b981'
        };
      case 'info':
      default:
        return {
          icon: <HelpCircle size={28} style={{ color: '#6366f1' }} />,
          iconBg: 'rgba(99, 102, 241, 0.12)',
          btnBg: 'var(--brand-gradient, linear-gradient(135deg, #6366f1 0%, #4f46e5 100%))',
          btnShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
          badgeColor: '#6366f1'
        };
    }
  };

  const styleConfig = getTypeStyles();

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          color: 'var(--text-primary, #f8fafc)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            background: styleConfig.iconBg,
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {styleConfig.icon}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '13.5px', lineHeight: '1.5', color: 'var(--text-secondary, #cbd5e1)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
              color: 'var(--text-secondary, #cbd5e1)',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: styleConfig.btnBg,
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: styleConfig.btnShadow,
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
