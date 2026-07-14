import React, { useState, useEffect } from 'react';
import { User, CheckCircle, ShieldAlert, Save } from 'lucide-react';

export default function MyProfile({ user, onUserUpdate }) {
  // My Information Form States
  const [salutation, setSalutation] = useState(user?.salutation || 'Mr.');
  const [name, setName] = useState(user?.name || '');
  const [empId, setEmpId] = useState(user?.emp_id || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [doj, setDoj] = useState(user?.doj || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [age, setAge] = useState(user?.age || '');
  const [companyEmail, setCompanyEmail] = useState(user?.email || '');
  const [personalEmail, setPersonalEmail] = useState(user?.personal_email || '');
  const [currentAddress, setCurrentAddress] = useState(user?.current_address || '');
  const [officeContact, setOfficeContact] = useState(user?.office_contact || '');
  const [personalContact, setPersonalContact] = useState(user?.personal_contact || '');

  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync if user object changes
  useEffect(() => {
    if (user) {
      setSalutation(user.salutation || 'Mr.');
      setName(user.name || '');
      setEmpId(user.emp_id || '');
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
      setDoj(user.doj || '');
      setDob(user.dob || '');
      setAge(user.age || '');
      setCompanyEmail(user.email || '');
      setPersonalEmail(user.personal_email || '');
      setCurrentAddress(user.current_address || '');
      setOfficeContact(user.office_contact || '');
      setPersonalContact(user.personal_contact || '');
    }
  }, [user]);

  // Auto calculate age from DOB
  useEffect(() => {
    if (dob) {
      try {
        const dobDate = new Date(dob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          calculatedAge--;
        }
        setAge(calculatedAge >= 0 ? calculatedAge : '');
      } catch (e) {}
    }
  }, [dob]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    setSaveError('');

    try {
      const token = localStorage.getItem('hr_token');
      const res = await fetch('/api/employees/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salutation,
          name,
          emp_id: empId,
          department,
          designation,
          doj,
          dob,
          age,
          personal_email: personalEmail,
          current_address: currentAddress,
          office_contact: officeContact,
          personal_contact: personalContact
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update profile.');
      }

      setSaveStatus('Profile information updated and synchronized successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      setSaveError(err.message || 'Failed to save details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#3b82f615', color: '#3b82f6' }}>
            <User size={24} />
          </div>
          <div>
            <h2>My Profile Information</h2>
            <p>View, update and manage your personal roster details</p>
          </div>
        </div>
      </div>

      <div className="card-item" style={{ background: 'var(--bg-card)', width: '100%', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', animation: 'fadeIn 0.3s ease' }}>
        {saveStatus && (
          <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
            <CheckCircle size={16} />
            <span>{saveStatus}</span>
          </div>
        )}
          
          {saveError && (
            <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
              <ShieldAlert size={16} />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Salutation</label>
                <select value={salutation} onChange={(e) => setSalutation(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px' }}>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Employee ID (Emp. ID)</label>
                <input type="text" value={empId} onChange={(e) => setEmpId(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Company Mail ID (Login Email)</label>
                <input type="email" value={companyEmail} disabled style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '15px' }}>
              <div className="form-group">
                <label>Date of Birth (DOB)</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Date of Joining (DOJ)</label>
                <input type="date" value={doj} onChange={(e) => setDoj(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Personal Mail ID</label>
                <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Current Address</label>
                <input type="text" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Office Contact</label>
                <input type="text" value={officeContact} onChange={(e) => setOfficeContact(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label>Personal Contact</label>
                <input type="text" value={personalContact} onChange={(e) => setPersonalContact(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save My Information'}
            </button>
          </form>
        </div>
      </div>
    );
  }
