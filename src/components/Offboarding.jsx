import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  UserMinus, ShieldAlert, Calendar, Clock, MapPin, CheckSquare, 
  Trash2, User, Mail, Briefcase, FileText, ChevronRight, AlertTriangle 
} from 'lucide-react';

export default function Offboarding({ activeTenant, user }) {
  const isAdmin = user?.role === 'Admin (HR)';
  
  // State for Admin View
  const [employees, setEmployees] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [schedulingEmpId, setSchedulingEmpId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  
  // State for Employee View
  const [myStatus, setMyStatus] = useState(null);
  const [serveNotice, setServeNotice] = useState(true);
  const [noticeDuration, setNoticeDuration] = useState('3');
  const [noticeUnit, setNoticeUnit] = useState('weeks');
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      fetchMyOffboardingStatus();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // List all employees including offboarding ones
      const data = await api.employees.list(false);
      setEmployees(data || []);
      
      // Auto-select first department if available
      const depts = [...new Set(data.map(e => e.department || 'General'))];
      if (depts.length > 0 && !selectedDept) {
        setSelectedDept(depts[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load employee list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOffboardingStatus = async () => {
    setLoading(true);
    try {
      const res = await api.offboarding.getMyStatus();
      setMyStatus(res);
      if (res && res.notice_period_served !== undefined) {
        setServeNotice(res.notice_period_served);
        setNoticeDuration(res.notice_period_duration || '3');
        setNoticeUnit(res.notice_period_unit || 'weeks');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch personal offboarding status.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOffboarding = async (employeeId, empName) => {
    if (!await confirm(`Are you sure you want to trigger offboarding for ${empName}? This will change their status and email them a link.`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      const res = await api.offboarding.trigger(employeeId);
      setStatusMsg(res.message || 'Offboarding triggered successfully.');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to trigger offboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (e, employeeId) => {
    e.preventDefault();
    if (!interviewDate || !interviewTime) {
      setError('Please provide date and time.');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      const res = await api.offboarding.scheduleInterview(employeeId, {
        date: interviewDate,
        time: interviewTime,
        location: interviewLocation || 'Google Meet'
      });
      setStatusMsg(res.message || 'Exit interview scheduled successfully.');
      setSchedulingEmpId('');
      setInterviewDate('');
      setInterviewTime('');
      setInterviewLocation('');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to schedule exit interview.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChecklistComplete = async (employeeId) => {
    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      const res = await api.offboarding.markChecklistComplete(employeeId);
      setStatusMsg(res.message || 'Checklist formalities marked complete.');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update checklist status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId, empName) => {
    if (!await confirm(`CAUTION: Are you absolutely sure you want to finalize offboarding for ${empName}? This will immediately revoke all portal access, delete their active profile, and safely archive their historical records.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      const res = await api.offboarding.deleteEmployee(employeeId);
      setStatusMsg(res.message || 'Employee safely deleted and archived.');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to finalize offboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNoticePeriod = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatusMsg('');
    try {
      await api.offboarding.submitNotice(user.id, {
        serve_notice: serveNotice,
        duration: serveNotice ? parseInt(noticeDuration) || 0 : 0,
        unit: noticeUnit
      });
      setStatusMsg('Notice period details submitted successfully.');
      fetchMyOffboardingStatus();
    } catch (err) {
      setError(err.message || 'Failed to submit notice period.');
    } finally {
      setLoading(false);
    }
  };

  // List of departments dynamically built
  const departments = [...new Set(employees.map(e => e.department || 'General'))];

  // Filtered employees for current department
  const filteredEmployees = employees.filter(e => (e.department || 'General') === selectedDept);

  // Render Admin View
  const renderAdminView = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserMinus size={24} style={{ color: '#ef4444' }} />
                Offboarding Automator Center
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>Manage resignation pipelines, exit schedules, and secure record archives.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>Department:</span>
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-glass)', 
                  background: 'var(--bg-card)', 
                  color: 'var(--text-primary)', 
                  fontWeight: 'bold' 
                }}
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          {statusMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
              {statusMsg}
            </div>
          )}

          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '14px' }}>
              No active employees found in the {selectedDept} department.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-glass)', color: '#94a3b8', fontWeight: '600' }}>
                    <th style={{ padding: '12px 10px' }}>Employee Name</th>
                    <th style={{ padding: '12px 10px' }}>Role</th>
                    <th style={{ padding: '12px 10px' }}>Email</th>
                    <th style={{ padding: '12px 10px' }}>Status</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    let displayStatus = emp.status || 'Active';
                    let statusColor = '#10b981';
                    if (displayStatus === 'Offboarding Initialized') statusColor = '#ef4444';
                    if (displayStatus === 'Notice Period Submitted') statusColor = '#f59e0b';
                    if (displayStatus === 'Interview Scheduled') statusColor = '#3b82f6';
                    if (displayStatus === 'Checklist Completed') statusColor = '#8b5cf6';
                    if (displayStatus === 'ARCHIVED') statusColor = '#64748b';

                    return (
                      <React.Fragment key={emp.id}>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '16px 10px', fontWeight: '600' }}>{emp.name}</td>
                          <td style={{ padding: '16px 10px', color: '#cbd5e1' }}>{emp.role}</td>
                          <td style={{ padding: '16px 10px', color: '#94a3b8' }}>{emp.email}</td>
                          <td style={{ padding: '16px 10px' }}>
                            <span style={{ 
                              color: statusColor, 
                              background: `${statusColor}12`, 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              fontWeight: 'bold',
                              fontSize: '11px',
                              border: `1px solid ${statusColor}22`
                            }}>
                              {displayStatus === 'ACTIVE' ? 'Active' : displayStatus}
                            </span>
                          </td>
                          <td style={{ padding: '16px 10px', textAlign: 'right' }}>
                            {emp.status === 'ACTIVE' || !emp.status ? (
                              <button 
                                className="btn-danger" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleTriggerOffboarding(emp.id, emp.name)}
                                disabled={loading}
                              >
                                Trigger Offboarding
                              </button>
                            ) : emp.status === 'Offboarding Initialized' ? (
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting Notice Period...</span>
                            ) : emp.status === 'Notice Period Submitted' ? (
                              <button 
                                className="back-btn" 
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#3b82f6', color: '#3b82f6', background: 'rgba(59,130,246,0.05)' }}
                                onClick={() => setSchedulingEmpId(schedulingEmpId === emp.id ? '' : emp.id)}
                              >
                                {schedulingEmpId === emp.id ? 'Cancel' : 'Schedule Interview'}
                              </button>
                            ) : emp.status === 'Interview Scheduled' ? (
                              <button 
                                className="back-btn"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#8b5cf6', color: '#8b5cf6', background: 'rgba(139,92,246,0.05)' }}
                                onClick={() => handleMarkChecklistComplete(emp.id)}
                                disabled={loading}
                              >
                                Mark Checklist Complete
                              </button>
                            ) : emp.status === 'Checklist Completed' ? (
                              <button 
                                className="btn-danger"
                                style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ef4444' }}
                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                disabled={loading}
                              >
                                <Trash2 size={12} /> Schedule for Deletion
                              </button>
                            ) : null}
                          </td>
                        </tr>

                        {/* Collapsible scheduling block */}
                        {schedulingEmpId === emp.id && (
                          <tr>
                            <td colSpan={5} style={{ padding: '15px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-glass)' }}>
                              <form onSubmit={(e) => handleScheduleInterview(e, emp.id)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Exit Interview Date</label>
                                  <input 
                                    type="date" 
                                    value={interviewDate} 
                                    onChange={(e) => setInterviewDate(e.target.value)}
                                    required 
                                    style={{ padding: '8px', fontSize: '13px' }}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Exit Interview Time</label>
                                  <input 
                                    type="time" 
                                    value={interviewTime} 
                                    onChange={(e) => setInterviewTime(e.target.value)}
                                    required 
                                    style={{ padding: '8px', fontSize: '13px' }}
                                  />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Meeting Location / Link</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Google Meet / Room 102"
                                    value={interviewLocation} 
                                    onChange={(e) => setInterviewLocation(e.target.value)}
                                    style={{ padding: '8px', fontSize: '13px' }}
                                  />
                                </div>
                                <button type="submit" className="sso-btn" style={{ padding: '10px', fontSize: '12px', margin: 0 }} disabled={loading}>
                                  Schedule & Email Employee
                                </button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Employee View
  const renderEmployeeView = () => {
    if (!myStatus) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          Loading offboarding details...
        </div>
      );
    }

    if (myStatus.status === 'ACTIVE') {
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '30px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckSquare size={30} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Roster Profile Active</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>No active offboarding workflows initiated for your profile. Everything looks good!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="responsive-grid-offboarding" style={{ maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
        
        {/* Left Column: Flow step panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Phase 1 Notice Period Form */}
          {myStatus.status === 'Offboarding Initialized' ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: '#ef4444' }} />
                Custom Notice Period Definition
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '20px' }}>
                Your offboarding process has been initialized. Please specify how long you intend to serve in your notice period.
              </p>

              {statusMsg && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
                  {statusMsg}
                </div>
              )}

              <form onSubmit={handleSubmitNoticePeriod} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!serveNotice} 
                    onChange={(e) => setServeNotice(!e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>I choose not to serve a notice period</span>
                </label>

                {serveNotice && (
                  <div className="grid-cols-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Notice Duration</label>
                      <input 
                        type="number" 
                        value={noticeDuration} 
                        onChange={(e) => setNoticeDuration(e.target.value)} 
                        required 
                        min="1"
                        style={{ padding: '10px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Unit</label>
                      <select 
                        value={noticeUnit} 
                        onChange={(e) => setNoticeUnit(e.target.value)} 
                        style={{ padding: '10px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </div>
                )}

                <button type="submit" className="sso-btn" style={{ margin: '10px 0 0 0' }} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Notice Period'}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#10b981' }}>✓ Notice Period Submitted</h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                Status: <strong>{myStatus.notice_period_served ? `Serving ${myStatus.notice_period_duration} ${myStatus.notice_period_unit} notice period.` : 'Not serving notice period.'}</strong>
              </p>
            </div>
          )}

          {/* Exit Interview Schedule & Checklist */}
          {(myStatus.status === 'Notice Period Submitted' || myStatus.status === 'Interview Scheduled' || myStatus.status === 'Checklist Completed') && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: '#3b82f6' }} />
                Exit Interview & Checklist Details
              </h3>

              {myStatus.status === 'Notice Period Submitted' ? (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '15px', borderRadius: '10px', color: '#3b82f6', fontSize: '13px', lineHeight: '1.6' }}>
                  ⏳ Awaiting exit interview scheduling by HR administration team. Once scheduled, details and checklist verification steps will be displayed here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Interview Card */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} style={{ color: '#3b82f6' }} /> Scheduled Interview
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                      <div>📅 <strong>Date:</strong> {myStatus.exit_interview_date}</div>
                      <div>⏰ <strong>Time:</strong> {myStatus.exit_interview_time}</div>
                      <div>📍 <strong>Location / Link:</strong> {myStatus.exit_interview_location.startsWith('http') ? (
                        <a href={myStatus.exit_interview_location} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{myStatus.exit_interview_location}</a>
                      ) : myStatus.exit_interview_location}</div>
                    </div>
                  </div>

                  {/* Checklist Task Details */}
                  <div>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={16} style={{ color: '#8b5cf6' }} /> Employee Offboarding Checklist
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span style={{ color: '#8b5cf6' }}>•</span>
                        <span>Schedule handoff sessions with your direct team lead.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span style={{ color: '#8b5cf6' }}>•</span>
                        <span>Return all company assets (laptops, peripherals, badges) on or before your last day.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span style={{ color: '#8b5cf6' }}>•</span>
                        <span>Submit your final business expense claims.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span style={{ color: '#8b5cf6' }}>•</span>
                        <span>Review exit interview documentation.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Workflow sequence details */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px', color: '#ef4444' }}>
            <AlertTriangle size={18} />
            Offboarding Pipeline
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
            <div>
              <strong style={{ color: '#f87171' }}>1. Custom Notice Selection</strong>
              <p style={{ margin: '2px 0 0 0', color: '#94a3b8' }}>Define how many days/weeks you choose to serve as part of standard checkout.</p>
            </div>
            
            <div>
              <strong style={{ color: '#3b82f6' }}>2. Exit Review Coordination</strong>
              <p style={{ margin: '2px 0 0 0', color: '#94a3b8' }}>HR schedules an interview to record feedback and discuss asset logistics.</p>
            </div>
            
            <div>
              <strong style={{ color: '#8b5cf6' }}>3. Checklist Formalities</strong>
              <p style={{ margin: '2px 0 0 0', color: '#94a3b8' }}>Fulfill team handoffs, return devices, and clear accounts before departure.</p>
            </div>

            <div>
              <strong style={{ color: '#64748b' }}>4. Profile Archival</strong>
              <p style={{ margin: '2px 0 0 0', color: '#94a3b8' }}>Profile details are moved to secure storage and logins revoked.</p>
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="attendance-container">
      {isAdmin ? renderAdminView() : renderEmployeeView()}
    </div>
  );
}
