import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { Sparkles, Send, Plus, Check, Award, Gift, Trash2, FileText, User, Mail, Calendar, Upload, ChevronDown, ChevronUp, Users, Archive } from 'lucide-react';

export default function SurpriseOps() {
  // Tab State: 'appreciation' or 'monetary'
  const [activeTab, setActiveTab] = useState('appreciation');
  
  // Roster
  const [employees, setEmployees] = useState([]);
  
  // Status notifications
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info',
    onConfirm: () => {}
  });

  const closeConfirm = () => {
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  };

  // --- Appreciation States ---
  const [appreciations, setAppreciations] = useState([]);
  const [selectedEmpIdAppr, setSelectedEmpIdAppr] = useState('');
  const [nameOfEmployee, setNameOfEmployee] = useState('');
  const [emailOfEmployee, setEmailOfEmployee] = useState('');
  const [apprDate, setApprDate] = useState(new Date().toISOString().substring(0, 10));
  const [apprReason, setApprReason] = useState('');
  const [apprType, setApprType] = useState('CARD'); // 'CERTIFICATE', 'CARD', 'MONTH'
  const [certificateFile, setCertificateFile] = useState(null);
  
  // Announcement selection accordion states (following event planner logic)
  const [announcementRecipients, setAnnouncementRecipients] = useState([]);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [deptSearch, setDeptSearch] = useState('');

  // --- Monetary States ---
  const [coupons, setCoupons] = useState([]);
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState({}); // Stores personal emails

  useEffect(() => {
    fetchEmployees();
    fetchAppreciations();
    fetchCoupons();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(true); // Active employees only
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchAppreciations = async () => {
    try {
      const data = await api.surpriseOps.appreciations();
      setAppreciations(data);
    } catch (err) {
      console.error('Failed to fetch appreciations:', err);
    }
  };

  const handleDownloadCertificate = (certUrl, title = 'Appreciation_Certificate') => {
    if (!certUrl) return;

    if (certUrl.startsWith('data:')) {
      try {
        const parts = certUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const base64Data = parts[1];
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${title}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      } catch (err) {
        console.error('Error downloading certificate:', err);
      }
    }

    let targetUrl = certUrl;
    if (!certUrl.startsWith('http://') && !certUrl.startsWith('https://')) {
      targetUrl = `https://hrms-backend-gamma.vercel.app${certUrl}`;
    }
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = `${title}_Certificate.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fetchCoupons = async () => {
    try {
      const data = await api.surpriseOps.coupons();
      setCoupons(data);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    }
  };

  // --- Appreciation Actions ---
  const handleSelectEmployeeAppr = (empId) => {
    setSelectedEmpIdAppr(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setNameOfEmployee(emp.name);
      setEmailOfEmployee(emp.email); // Company email for default appreciation delivery
    } else {
      setNameOfEmployee('');
      setEmailOfEmployee('');
    }
  };

  // Roster groupings by department
  const departments = [...new Set(employees.map(e => e.department || 'General'))];
  const employeesByDept = {};
  departments.forEach(dept => {
    employeesByDept[dept] = employees.filter(e => (e.department || 'General') === dept);
  });

  const toggleRecipient = (empId) => {
    setAnnouncementRecipients(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const isEmpSelected = (empId) => announcementRecipients.includes(empId);

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const handleSelectAllDept = (dept, deptEmps, checked) => {
    const deptEmpIds = deptEmps.map(e => e.id);
    if (checked) {
      setAnnouncementRecipients(prev => [...new Set([...prev, ...deptEmpIds])]);
    } else {
      setAnnouncementRecipients(prev => prev.filter(id => !deptEmpIds.includes(id)));
    }
  };

  const isDeptAllSelected = (dept, deptEmps) => {
    const deptEmpIds = deptEmps.map(e => e.id);
    return deptEmpIds.every(id => announcementRecipients.includes(id));
  };

  const handleIssueAppreciation = (e) => {
    e.preventDefault();
    if (!nameOfEmployee || !emailOfEmployee || !apprDate || !apprReason) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Issue Appreciation Award',
      message: `Are you sure you want to issue an appreciation award to ${nameOfEmployee} (${emailOfEmployee})?`,
      confirmText: 'Issue Award',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Issuing appreciation award and saving broadcast list...');
        setError('');
        
        try {
          const formData = new FormData();
          formData.append('employee_name', nameOfEmployee);
          formData.append('employee_email', emailOfEmployee);
          formData.append('date', apprDate);
          formData.append('reason', apprReason);
          formData.append('type', apprType);
          formData.append('announcement_recipients', JSON.stringify(announcementRecipients));
          
          if (apprType === 'CERTIFICATE' && certificateFile) {
            formData.append('certificate', certificateFile);
          }
          
          await api.surpriseOps.createAppreciation(formData);
          
          // Reset Form
          setSelectedEmpIdAppr('');
          setNameOfEmployee('');
          setEmailOfEmployee('');
          setApprReason('');
          setCertificateFile(null);
          setAnnouncementRecipients([]);
          
          setStatus('Appreciation award successfully registered in directory!');
          setTimeout(() => setStatus(''), 4000);
          
          fetchAppreciations();
        } catch (err) {
          setError(`Failed to issue appreciation: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleSendAppreciation = (id, empName = 'Employee') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Send Recognition Email',
      message: `Are you sure you want to dispatch appreciation recognition email for ${empName}?`,
      confirmText: 'Send Email',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Dispatching recognition and announcement emails manually...');
        setError('');
        try {
          await api.surpriseOps.sendAppreciation(id);
          setStatus('Emails successfully dispatched to employee and announcements list!');
          setTimeout(() => setStatus(''), 4000);
          fetchAppreciations();
        } catch (err) {
          setError(`Failed to dispatch emails: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleDeleteAppreciation = (id, empName = 'Employee') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Appreciation Record',
      message: `Are you sure you want to permanently delete this appreciation log for ${empName}?`,
      confirmText: 'Delete Record',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setError('');
        try {
          await api.surpriseOps.deleteAppreciation(id);
          setStatus('Appreciation record removed.');
          setTimeout(() => setStatus(''), 3000);
          fetchAppreciations();
        } catch (err) {
          setError(`Failed to delete: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  // --- Monetary Actions ---
  const handleAddCoupon = (e) => {
    e.preventDefault();
    if (!code || !brand || !amount) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Add Incentive Voucher',
      message: `Are you sure you want to add voucher "${code}" (${brand} - ₹${amount}) to inventory?`,
      confirmText: 'Add Voucher',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setError('');
        setStatus('');
        try {
          await api.surpriseOps.createCoupon({ code, brand, amount: parseFloat(amount) });
          setCode('');
          setBrand('');
          setAmount('');
          setStatus('Incentive voucher added to inventory!');
          setTimeout(() => setStatus(''), 4000);
          fetchCoupons();
        } catch (err) {
          setError(`Failed to add: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleSendCoupon = (couponId) => {
    const targetPersonalEmail = selectedEmployees[couponId];
    if (!targetPersonalEmail) {
      alert("Please select a recipient employee first.");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Send Incentive Voucher',
      message: `Are you sure you want to send this voucher to ${targetPersonalEmail}?`,
      confirmText: 'Send Voucher',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Dispatching incentive voucher to employee\'s personal email...');
        setError('');
        try {
          await api.surpriseOps.send(couponId, targetPersonalEmail);
          setStatus('Voucher successfully delivered to personal mailbox!');
          setTimeout(() => setStatus(''), 4000);
          
          setSelectedEmployees(prev => ({ ...prev, [couponId]: '' }));
          fetchCoupons();
        } catch (err) {
          setError(`Failed to deliver: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleSelectEmployeeMonetary = (couponId, personalEmail) => {
    setSelectedEmployees(prev => ({ ...prev, [couponId]: personalEmail }));
  };

  const handleArchiveCoupon = (couponId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Archive Voucher',
      message: 'Are you sure you want to move this voucher code to the archive?',
      confirmText: 'Archive Voucher',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Archiving coupon...');
        setError('');
        try {
          await api.surpriseOps.archiveCoupon(couponId);
          setStatus('Coupon successfully archived!');
          setTimeout(() => setStatus(''), 4000);
          fetchCoupons();
        } catch (err) {
          setError(`Failed to archive: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleDeleteCoupon = (couponId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Permanently Delete Voucher',
      message: 'WARNING: Are you sure you want to delete this coupon forever from the archive? This action cannot be undone.',
      confirmText: 'Permanently Delete',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Deleting coupon forever...');
        setError('');
        try {
          await api.surpriseOps.deleteCoupon(couponId);
          setStatus('Coupon successfully deleted forever!');
          setTimeout(() => setStatus(''), 4000);
          fetchCoupons();
        } catch (err) {
          setError(`Failed to delete: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  return (
    <div className="module-container" style={{ width: '100%', padding: '20px 30px' }}>
      
      {/* Module Header */}
      <div className="module-header" style={{ marginBottom: '25px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#8b5cf615', color: '#8b5cf6', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-primary)' }}>Surprise Ops Portal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Acknowledge milestones with appreciation awards or deliver direct monetary incentives.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('appreciation')}
          style={{
            background: activeTab === 'appreciation' ? 'var(--brand-gradient)' : 'var(--bg-card)',
            color: activeTab === 'appreciation' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Award size={16} />
          Appreciation Hub
        </button>
        <button
          onClick={() => setActiveTab('monetary')}
          style={{
            background: activeTab === 'monetary' ? 'var(--brand-gradient)' : 'var(--bg-card)',
            color: activeTab === 'monetary' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-glass)',
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Gift size={16} />
          Monetary Incentives
        </button>
      </div>

      {status && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} /> {status}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {activeTab === 'appreciation' ? (
        // ==================== APPRECIATION TAB ====================
        <div className="responsive-grid-surprise-ops-appreciation">
          
          {/* Left Pane: Issue Appreciation Form */}
          <div className="pane-card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '25px',
            alignSelf: 'flex-start'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: '#8b5cf6' }} />
              Issue Appreciation Award
            </h3>

            <form onSubmit={handleIssueAppreciation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Choose Employee Roster</label>
                <select
                  value={selectedEmpIdAppr}
                  onChange={(e) => handleSelectEmployeeAppr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select to auto-populate --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Name of Employee</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. Jane Doe" 
                    value={nameOfEmployee} 
                    onChange={(e) => setNameOfEmployee(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '10px 10px 10px 35px' }}
                  />
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email of Employee</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="email" 
                    placeholder="e.g. jane.doe@semcogroups.com" 
                    value={emailOfEmployee} 
                    onChange={(e) => setEmailOfEmployee(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '10px 10px 10px 35px' }}
                  />
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Award Date</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={apprDate} 
                    onChange={(e) => setApprDate(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '10px 10px 10px 35px' }}
                  />
                  <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Appreciation Type</label>
                <select
                  value={apprType}
                  onChange={(e) => setApprType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="CERTIFICATE">Certificate of Appreciation</option>
                  <option value="CARD">Job Well Done Card</option>
                  <option value="MONTH">Employee of the Month</option>
                </select>
              </div>

              {apprType === 'CERTIFICATE' && (
                <div className="form-group" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', padding: '15px', borderRadius: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    Upload Certificate PDF
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setCertificateFile(e.target.files[0])}
                      required
                      style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Description / Citation Reason</label>
                <textarea 
                  rows="2"
                  placeholder="Describe employee milestones or outstanding achievements..." 
                  value={apprReason} 
                  onChange={(e) => setApprReason(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              {/* Department Accordion Broadcast Announcement selector */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Select Announcement Recipients ({announcementRecipients.length} selected)
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="Filter departments..." 
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', width: '100%' }}
                  />
                </div>
                
                <div style={{ 
                  flex: 1, 
                  maxHeight: '180px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '10px', 
                  background: 'rgba(0,0,0,0.15)',
                  padding: '8px'
                }}>
                  {departments
                    .filter(dept => dept.toLowerCase().includes(deptSearch.toLowerCase()))
                    .map(dept => {
                      const deptEmps = employeesByDept[dept];
                      const isExpanded = expandedDepts[dept];
                      const isAllSelected = isDeptAllSelected(dept, deptEmps);
                      const selectedCount = deptEmps.filter(e => isEmpSelected(e.id)).length;

                      return (
                        <div key={dept} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="checkbox" 
                                checked={isAllSelected}
                                onChange={(e) => handleSelectAllDept(dept, deptEmps, e.target.checked)}
                                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              <span 
                                onClick={() => toggleDept(dept)} 
                                style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer' }}
                              >
                                {dept} ({selectedCount}/{deptEmps.length})
                              </span>
                            </div>
                            <div onClick={() => toggleDept(dept)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '8px 10px 4px 25px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {deptEmps.filter(emp => emp.id !== selectedEmpIdAppr).map(emp => (
                                <label key={emp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isEmpSelected(emp.id)}
                                    onChange={() => toggleRecipient(emp.id)}
                                    style={{ width: '13px', height: '13px', marginTop: '2px', cursor: 'pointer' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{emp.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      📧 {emp.email}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-gradient)', padding: '12px', marginTop: '5px' }}
              >
                <Plus size={16} /> 
                {loading ? 'Processing...' : 'Register Award'}
              </button>
            </form>
          </div>

          {/* Right Pane: Appreciation Directory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '5px' }}>
              Appreciation Award Directory
            </h3>

            {appreciations.length === 0 ? (
              <div style={{ padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No appreciation awards registered. Fill out the form to recognize achievements.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {appreciations.map(a => {
                  let typeLabel = 'Appreciation';
                  let typeColor = '#3b82f6';
                  let typeBg = 'rgba(59, 130, 246, 0.1)';
                  
                  if (a.type === 'CERTIFICATE') {
                    typeLabel = 'Certificate';
                    typeColor = '#10b981';
                    typeBg = 'rgba(16, 185, 129, 0.1)';
                  } else if (a.type === 'CARD') {
                    typeLabel = 'Well Done Card';
                    typeColor = '#f59e0b';
                    typeBg = 'rgba(245, 158, 11, 0.1)';
                  } else if (a.type === 'MONTH') {
                    typeLabel = 'Employee of the Month';
                    typeColor = '#8b5cf6';
                    typeBg = 'rgba(139, 92, 246, 0.1)';
                  }

                  const announcementCount = a.announcement_recipients ? a.announcement_recipients.length : 0;

                  return (
                    <div 
                      key={a.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--text-primary)', margin: 0 }}>
                            {a.employee_name}
                          </h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.employee_email}</span>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: typeBg,
                          color: typeColor
                        }}>
                          {typeLabel}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{a.reason}"
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>📅 Award Date: <strong>{a.date}</strong></span>
                          <span>📢 Broadcase Recipient Count: <strong style={{ color: 'var(--brand-blue)' }}>{announcementCount} employees</strong></span>
                          {a.certificate_url && (
                            <button 
                              onClick={() => handleDownloadCertificate(a.certificate_url, a.title)} 
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 'bold', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: '2px', fontSize: '11px' }}
                            >
                              <FileText size={14} /> Download PDF Certificate
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleDeleteAppreciation(a.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '8px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          {a.status === 'SENT' ? (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', padding: '6px 12px' }}>
                              <Check size={14} /> Emails Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendAppreciation(a.id)}
                              className="btn-primary"
                              style={{
                                padding: '8px 16px',
                                fontSize: '12px',
                                background: 'var(--brand-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                borderRadius: '8px'
                              }}
                            >
                              <Send size={12} /> Dispatch Emails
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==================== MONETARY TAB ====================
        <div className="responsive-grid-surprise-ops-coupon">
          
          {/* Add Coupon form */}
          <div className="pane-card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '25px',
            alignSelf: 'flex-start'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: '#8b5cf6' }} />
              Register Voucher Coupon
            </h3>

            <form onSubmit={handleAddCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Coupon Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. SBUX-COFFEE-15" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  required
                />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Brand / Merchant</label>
                <input 
                  type="text" 
                  placeholder="e.g. Starbucks" 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Voucher Value (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="e.g. 1500.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-gradient)', padding: '12px', marginTop: '5px' }}
              >
                <Plus size={16} /> Add to Stock
              </button>
            </form>
          </div>

          {/* Active Coupons list */}
          <div style={{ marginBottom: '45px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px' }}>
              Active Incentive Inventory
            </h3>
            {coupons.filter(c => !c.is_archived).length === 0 ? (
              <div style={{ padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No active incentive vouchers in stock. Add a coupon above.
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: '1px solid var(--border-glass)', borderRadius: '16px', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                      <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Merchant / Code</th>
                      <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Value</th>
                      <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Distribution (Personal Mail)</th>
                      <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.filter(c => !c.is_archived).map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '15px 20px' }}>
                          <div style={{ fontWeight: '750', color: 'var(--text-primary)' }}>{c.brand}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{c.code}</div>
                        </td>
                        <td style={{ padding: '15px 20px', fontWeight: 'bold', color: '#10b981' }}>₹{c.amount?.toFixed(2)}</td>
                        <td style={{ padding: '15px 20px' }}>
                          {c.is_redeemed ? (
                            <div>
                              <span className="status-pill sent" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>DELIVERED</span>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>To: {c.assigned_to_email}</div>
                            </div>
                          ) : (
                            <select 
                              value={selectedEmployees[c.id] || ''} 
                              onChange={(e) => handleSelectEmployeeMonetary(c.id, e.target.value)}
                              style={{
                                padding: '8px',
                                fontSize: '12px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                width: '100%',
                                maxWidth: '220px'
                              }}
                            >
                              <option value="">-- Select Recipient --</option>
                              {employees.filter(e => e.email).map(e => (
                                <option key={e.id} value={e.email}>{e.name} ({e.email})</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td style={{ padding: '15px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {c.is_redeemed ? (
                              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', marginRight: '5px' }}>
                                <Check size={14} /> Sent
                              </span>
                            ) : (
                              <button 
                                className="btn-primary" 
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: 'var(--brand-gradient)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  opacity: !selectedEmployees[c.id] ? 0.5 : 1,
                                  cursor: !selectedEmployees[c.id] ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => handleSendCoupon(c.id)}
                                disabled={!selectedEmployees[c.id]}
                              >
                                <Send size={12} /> Send
                              </button>
                            )}
                            <button
                              onClick={() => handleArchiveCoupon(c.id)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '8px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Archive Voucher"
                            >
                              <Archive size={12} /> Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Archived Coupons list */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Archive size={18} /> Archived Vouchers (Trash Bin)
            </h3>
            {coupons.filter(c => c.is_archived).length === 0 ? (
              <div style={{ padding: '40px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Archive bin is empty.
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '16px', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(239, 68, 68, 0.02)', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Merchant / Code</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Value</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Delivered Status</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.filter(c => c.is_archived).map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.05)', background: 'rgba(239, 68, 68, 0.01)' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{c.brand}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{c.code}</div>
                        </td>
                        <td style={{ padding: '12px 20px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>₹{c.amount?.toFixed(2)}</td>
                        <td style={{ padding: '12px 20px', fontSize: '12px' }}>
                          {c.is_redeemed ? (
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>Delivered to {c.assigned_to_email}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Not Sent</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#ef4444',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 'bold'
                            }}
                          >
                            <Trash2 size={12} /> Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
