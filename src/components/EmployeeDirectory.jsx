import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, Plus, FileSpreadsheet, ShieldAlert, Check, Archive, RotateCcw, Trash2, Edit2 } from 'lucide-react';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [showRoster, setShowRoster] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
  
  // Roster addition form states
  const [salutation, setSalutation] = useState('Mr.');
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [dob, setDob] = useState('');
  const [doj, setDoj] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [officeContact, setOfficeContact] = useState('');
  const [personalContact, setPersonalContact] = useState('');

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(false);
      setEmployees(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load employee directory.');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!name || !personalEmail) {
      setError('Name and Personal Email ID are required to send an invitation.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      const token = localStorage.getItem('hr_token');
      const res = await fetch('https://hrms-backend-gamma.vercel.app/api/invite/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salutation,
          name,
          personal_email: personalEmail
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to send invite.');
      }

      setStatus(`Onboarding invitation successfully sent to ${personalEmail}!`);
      setSalutation('Mr.');
      setName('');
      setPersonalEmail('');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to import.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.employees.import(formData);
      setStatus(`Import complete! ${res.imported} employee profiles synchronized with Active Roster.`);
      setFile(null);
      const fileInput = document.getElementById('employee-file-input');
      if (fileInput) fileInput.value = '';
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'File import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = (id, empName) => {
    setConfirmDialog({
      message: `Are you sure you want to move ${empName} to the archive section?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          setError('');
          setStatus('');
          await api.employees.archive(id);
          setStatus(`${empName} has been archived successfully.`);
          fetchEmployees();
        } catch (err) {
          setError(err.message || 'Failed to archive employee.');
        }
      }
    });
  };

  const handleRestore = async (id, empName) => {
    try {
      setError('');
      setStatus('');
      await api.employees.restore(id);
      setStatus(`${empName} restored to the Active Roster.`);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to restore employee.');
    }
  };

  const handleDeleteForever = (id, empName) => {
    setConfirmDialog({
      message: `WARNING: Are you absolutely sure you want to permanently delete ${empName}? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          setError('');
          setStatus('');
          await api.employees.delete(id);
          setStatus(`${empName} permanently deleted from database.`);
          fetchEmployees();
        } catch (err) {
          setError(err.message || 'Failed to delete employee.');
        }
      }
    });
  };

  const handleTogglePersonalEmailAccess = async (emp) => {
    try {
      setError('');
      setStatus('');
      await api.employees.update(emp.id, {
        emp_id: emp.emp_id,
        name: emp.name,
        email: emp.email,
        designation: emp.designation,
        department: emp.department,
        dob: emp.dob,
        doj: emp.doj,
        personal_email: emp.personal_email,
        current_address: emp.current_address,
        office_contact: emp.office_contact,
        personal_contact: emp.personal_contact,
        allow_personal_email_access: !emp.allow_personal_email_access
      });
      setStatus(`Personal email access status updated for ${emp.name}.`);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update personal email access.');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.name) return;
    
    setLoading(true);
    setError('');
    setStatus('');
    
    try {
      await api.employees.update(editingEmployee.id, {
        emp_id: editingEmployee.emp_id,
        name: editingEmployee.name,
        email: editingEmployee.email,
        designation: editingEmployee.designation,
        department: editingEmployee.department,
        dob: editingEmployee.dob,
        doj: editingEmployee.doj,
        personal_email: editingEmployee.personal_email,
        current_address: editingEmployee.current_address,
        office_contact: editingEmployee.office_contact,
        personal_contact: editingEmployee.personal_contact,
        allow_personal_email_access: editingEmployee.allow_personal_email_access
      });
      setStatus(`Employee profile for ${editingEmployee.name} updated successfully!`);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update employee.');
    } finally {
      setLoading(false);
    }
  };

  const convertDMYtoYMD = (dmy) => {
    if (!dmy) return '';
    const parts = dmy.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dmy;
  };

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const archivedEmployees = employees.filter(e => e.status === 'ARCHIVED');
  const pendingEmployees = employees.filter(e => e.status === 'PENDING');

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <Users size={32} style={{ color: '#10b981' }} />
          <div>
            <h2>Employee Directory</h2>
            <p>Manage staff profiles, invite new hires, and maintain archived employee accounts</p>
          </div>
        </div>
      </div>

      {status && (
        <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Check size={18} />
          <span>{status}</span>
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Roster Access & Invite Section */}
      {!showRoster ? (
        <div className="grid-2" style={{ marginBottom: '40px', gap: '30px' }}>
          {/* Roster Access Tile */}
          <div 
            className="tile-card" 
            onClick={() => setShowRoster(true)}
            style={{ 
              '--tile-hover-color': '#10b981', 
              cursor: 'pointer', 
              width: '100%', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              margin: 0
            }}
          >
            <div className="tile-glow" style={{ backgroundColor: '#10b981' }}></div>
            <div className="tile-content" style={{ padding: '25px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                <div className="tile-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '12px' }}>
                  <Users size={36} />
                </div>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>Roster Directory</h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                Click to open active roster & archive section
              </p>
            </div>
          </div>

          {/* Invite Employee Form */}
          <div className="card-item" style={{ background: 'var(--bg-card)', width: '100%', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={20} style={{ color: 'var(--brand-green)' }} />
              Invite Employee
            </h3>
            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Salutation</label>
                  <select value={salutation} onChange={(e) => setSalutation(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px' }} disabled={loading}>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Alice Smith" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} required />
                </div>
              </div>

              <div className="form-group">
                <label>Personal Email ID</label>
                <input type="email" placeholder="e.g. alice.personal@gmail.com" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} disabled={loading} required />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }} disabled={loading}>
                <Plus size={16} />
                {loading ? 'Sending Invite...' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ROSTER CONTENT (Toggled by tile-card) */}
      {showRoster && (
        <div style={{ animation: 'fadeIn 0.3s ease', marginBottom: '40px' }}>
          {/* Back Button to close roster directory */}
          <button 
            onClick={() => setShowRoster(false)} 
            className="btn-secondary" 
            style={{ 
              marginBottom: '25px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back to Onboarding Directory
          </button>

          {/* ROSTER TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveTab('active')} 
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'active' ? '3px solid var(--brand-blue)' : '3px solid transparent',
                color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '10px 5px',
                cursor: 'pointer'
              }}
            >
              Active Employee Roster ({activeEmployees.length})
            </button>
            <button 
              onClick={() => setActiveTab('pending')} 
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'pending' ? '3px solid #f59e0b' : '3px solid transparent',
                color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '10px 5px',
                cursor: 'pointer'
              }}
            >
              ⏳ Pending Onboarding ({pendingEmployees.length})
            </button>
            <button 
              onClick={() => setActiveTab('archived')} 
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'archived' ? '3px solid var(--brand-orange)' : '3px solid transparent',
                color: activeTab === 'archived' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '16px',
                fontWeight: 'bold',
                padding: '10px 5px',
                cursor: 'pointer'
              }}
            >
              Archive Section ({archivedEmployees.length})
            </button>
          </div>

          {/* ACTIVE ROSTER TABLE */}
          {activeTab === 'active' && (
            <div>
              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
                Subsection: Active Employee Roster
              </h3>
              <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '1300px' }}>
                  <thead>
                    <tr>
                      <th>Emp. ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>DOJ</th>
                      <th>DOB</th>
                      <th>Age</th>
                      <th>Company Mail ID</th>
                      <th>Personal Mail ID</th>
                      <th>Current Address</th>
                      <th>Office Contact</th>
                      <th>Personal Contact</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="13" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No active employee records found.
                        </td>
                      </tr>
                    ) : (
                      activeEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--brand-orange)' }}>{emp.emp_id || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ fontWeight: 'bold' }}>{emp.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.department || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.designation || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.doj || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.dob || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ fontWeight: 'bold' }}>{emp.age || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.email}</td>
                          <td>{emp.personal_email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emp.current_address}>
                            {emp.current_address || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}
                          </td>
                          <td>{emp.office_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.personal_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="btn-action" 
                                onClick={() => setEditingEmployee(emp)}
                                title="Edit Profile"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button 
                                className="btn-action" 
                                onClick={() => handleArchive(emp.id, emp.name)}
                                title="Move to Archive"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  color: '#f59e0b',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                <Archive size={14} />
                                Archive
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PENDING ONBOARDING TABLE */}
          {activeTab === 'pending' && (
            <div>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>⏳</span>
                <div>
                  <strong style={{ color: '#f59e0b', fontSize: '16px' }}>Pending Onboarding — Submitted, Awaiting Company Email Provisioning</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '2px 0 0 0' }}>These employees have submitted their onboarding form. Provision their Company Email ID via the Edit button below to activate their account.</p>
                </div>
              </div>
              <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '1450px' }}>
                  <thead>
                    <tr>
                      <th>Emp. ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>DOJ</th>
                      <th>DOB</th>
                      <th>Age</th>
                      <th>Company Mail ID</th>
                      <th>Personal Mail ID</th>
                      <th>Personal Email Access</th>
                      <th>Current Address</th>
                      <th>Office Contact</th>
                      <th>Personal Contact</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="14" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No pending onboarding submissions found.
                        </td>
                      </tr>
                    ) : (
                      pendingEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: 'bold', color: '#f59e0b' }}>{emp.emp_id || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ fontWeight: 'bold' }}>{emp.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.department || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.designation || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.doj || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.dob || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ fontWeight: 'bold' }}>{emp.age || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td><span style={{ color: '#f59e0b', fontStyle: 'italic', fontSize: '13px' }}>Not provisioned yet</span></td>
                          <td>{emp.personal_email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePersonalEmailAccess(emp)}
                              className="btn-action"
                              style={{
                                background: emp.allow_personal_email_access ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                color: emp.allow_personal_email_access ? '#10b981' : '#94a3b8',
                                border: emp.allow_personal_email_access ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {emp.allow_personal_email_access ? '✅ Approved' : '❌ Disabled'}
                            </button>
                          </td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emp.current_address}>
                            {emp.current_address || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}
                          </td>
                          <td>{emp.office_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td>{emp.personal_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn-action" 
                              onClick={() => setEditingEmployee(emp)}
                              title="Provision Company Email"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 'bold'
                              }}
                            >
                              <Edit2 size={14} />
                              Provision Email
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ARCHIVE ROSTER TABLE */}
          {activeTab === 'archived' && (
            <div>
              <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
                Subsection: Archive Section
              </h3>
              <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '1300px' }}>
                  <thead>
                    <tr>
                      <th>Emp. ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>DOJ</th>
                      <th>DOB</th>
                      <th>Age</th>
                      <th>Company Mail ID</th>
                      <th>Personal Mail ID</th>
                      <th>Current Address</th>
                      <th>Office Contact</th>
                      <th>Personal Contact</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan="13" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No archived employee records found.
                        </td>
                      </tr>
                    ) : (
                      archivedEmployees.map((emp) => (
                        <tr key={emp.id}>
                           <td style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{emp.emp_id || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{emp.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ color: 'var(--text-secondary)' }}>{emp.department || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ color: 'var(--text-secondary)' }}>{emp.designation || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ color: 'var(--text-secondary)' }}>{emp.doj || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ color: 'var(--text-secondary)' }}>{emp.dob || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                           <td style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{emp.age || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{emp.personal_email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={emp.current_address}>
                            {emp.current_address || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{emp.office_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{emp.personal_contact || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>blank</span>}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                className="btn-action" 
                                onClick={() => setEditingEmployee(emp)}
                                title="Edit Profile"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button 
                                className="btn-action" 
                                onClick={() => handleRestore(emp.id, emp.name)}
                                title="Restore Employee"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                <RotateCcw size={12} />
                                Restore
                              </button>
                              <button 
                                className="btn-action" 
                                onClick={() => handleDeleteForever(emp.id, emp.name)}
                                title="Delete Forever"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}



      {/* EDIT PROFILE MODAL */}
      {editingEmployee && (
        <div className="modal-backdrop">
          <div className="modal-content-popup">
            <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Edit2 size={20} style={{ color: 'var(--brand-blue)' }} />
              Edit Employee Profile Details
            </h3>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Emp. ID</label>
                  <input 
                    type="text" 
                    value={editingEmployee.emp_id || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, emp_id: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={editingEmployee.name} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Company Mail ID (Login Email)</label>
                <input 
                  type="email" 
                  value={editingEmployee.email || ''} 
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Department</label>
                  <input 
                    type="text" 
                    value={editingEmployee.department || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input 
                    type="text" 
                    value={editingEmployee.designation || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>DOB (Date of Birth)</label>
                  <input 
                    type="date" 
                    value={convertDMYtoYMD(editingEmployee.dob)} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, dob: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>DOJ (Date of Joining)</label>
                  <input 
                    type="date" 
                    value={convertDMYtoYMD(editingEmployee.doj)} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, doj: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Personal Mail ID</label>
                  <input 
                    type="email" 
                    value={editingEmployee.personal_email || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, personal_email: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Current Address</label>
                  <input 
                    type="text" 
                    value={editingEmployee.current_address || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, current_address: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Office Contact</label>
                  <input 
                    type="text" 
                    value={editingEmployee.office_contact || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, office_contact: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Personal Contact</label>
                  <input 
                    type="text" 
                    value={editingEmployee.personal_contact || ''} 
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, personal_contact: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <input 
                  type="checkbox" 
                  id="edit_allow_personal" 
                  checked={editingEmployee.allow_personal_email_access || false} 
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, allow_personal_email_access: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="edit_allow_personal" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', cursor: 'pointer', textTransform: 'none', letterSpacing: '0', marginBottom: 0 }}>
                  🟢 Allow Portal Access / Sign Up via Personal Email ID
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '25px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingEmployee(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '8px 20px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="modal-backdrop">
          <div className="modal-content-popup" style={{ width: '460px', textAlign: 'center', padding: '30px' }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>
              {confirmDialog.type === 'danger' ? '⚠️' : '❓'}
            </div>
            <h3 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Confirmation Required</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '18px', lineHeight: '1.5' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                className="btn-action" 
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  fontSize: '17px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  fontSize: '17px',
                  background: confirmDialog.type === 'danger' ? '#ef4444' : 'var(--brand-blue)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
