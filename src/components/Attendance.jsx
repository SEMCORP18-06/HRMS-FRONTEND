import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { 
  Clock, Calendar, User, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, List, Grid, ShieldAlert, Lock, Unlock, Leaf, Send, Users, Filter, Check, Mail, Search
} from 'lucide-react';

const STATUS_OPTIONS = [
  'Present',
  'Weekly Off',
  'Sick Leave',
  'Casual Leave',
  'Privileged Leave',
  'Site Visit',
  'Back From Site Visit',
  'Extended Work'
];

export default function Attendance({ activeTenant, user }) {
  const isAdmin = user?.role === 'Admin (HR)';
  
  // State for Employee
  const [markedToday, setMarkedToday] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myMonthRecords, setMyMonthRecords] = useState([]);

  // New Employee Attendance Marking State
  const [statusSelection, setStatusSelection] = useState('Leave'); // 'Absent', 'Weekly Off', 'Leave'
  const [leaveCategory, setLeaveCategory] = useState('Casual Leave'); // 'Sick Leave', 'Casual Leave', 'Privileged Leave'
  const [absenceReason, setAbsenceReason] = useState('');
  const [handoverPerson, setHandoverPerson] = useState('');
  const [broadcastMode, setBroadcastMode] = useState('all'); // 'all' or 'selective'
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedRecipients, setSelectedRecipients] = useState([]); // array of emails
  const [employeeList, setEmployeeList] = useState([]);
  const [submittingMarking, setSubmittingMarking] = useState(false);
  const [markingSuccessMsg, setMarkingSuccessMsg] = useState('');
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');

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
  
  // State for Admin
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [adminRecords, setAdminRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [officialHolidays, setOfficialHolidays] = useState([]);

  // Leave Allocation & Lock State (Admin)
  const [showAllocPanel, setShowAllocPanel] = useState(false);
  const [allocTarget, setAllocTarget] = useState('all'); // 'all' or emp ID
  const [allocWO, setAllocWO] = useState(4);
  const [allocSL, setAllocSL] = useState(1);
  const [allocCL, setAllocCL] = useState(1);
  const [allocPL, setAllocPL] = useState(1);
  const [allocSaving, setAllocSaving] = useState(false);
  const [lockStatus, setLockStatus] = useState({ locked: false });
  const [lockLoading, setLockLoading] = useState(false);

  // Leave Summary State (Employee)
  const [leaveSummary, setLeaveSummary] = useState([]);

  const isPredecidedHoliday = (dateStr) => {
    if (!dateStr) return false;
    return officialHolidays.some(h => h.date === dateStr);
  };

  const fetchOfficialHolidays = async () => {
    try {
      const data = await api.holidays.list(currentYear);
      setOfficialHolidays(data || []);
    } catch (err) {
      console.error('Failed to load official holidays:', err);
    }
  };

  useEffect(() => {
    fetchOfficialHolidays();
  }, [currentYear]);
  
  const fetchMyMonthData = async () => {
    try {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const data = await api.attendance.getMyMonth(currentYear, monthStr);
      setMyMonthRecords(data.records || []);
    } catch (err) {
      console.error('Failed to load personal monthly attendance records:', err);
    }
  };

  const fetchLeaveSummary = async () => {
    try {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const data = await api.attendance.getLeaveSummary(currentYear, monthStr);
      setLeaveSummary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leave summary:', err);
    }
  };

  const fetchLockStatus = async () => {
    try {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const data = await api.attendance.getLockStatus(currentYear, monthStr);
      setLockStatus(data || { locked: false });
    } catch (err) {
      console.error('Failed to load lock status:', err);
    }
  };

  const fetchEmployeeList = async () => {
    try {
      const data = await api.employees.list(true);
      const activeEmps = (data || []).filter(e => e.email && e.email.toLowerCase() !== user?.email?.toLowerCase());
      setEmployeeList(activeEmps);
    } catch (err) {
      console.error('Failed to load employees for broadcast:', err);
    }
  };

  const handleSaveLeaveAllocation = async () => {
    setAllocSaving(true);
    try {
      const targetEmp = employees.find(e => e.id === allocTarget);
      const data = {
        year: currentYear,
        month: String(currentMonth + 1).padStart(2, '0'),
        target: allocTarget,
        wo: Number(allocWO),
        sl: Number(allocSL),
        cl: Number(allocCL),
        pl: Number(allocPL)
      };
      await api.attendance.saveLeaveAllocation(data);
      setShowAllocPanel(false);
      if (isAdmin) fetchAdminData();
    } catch (err) {
      console.error('Failed to save leave allocation:', err);
    } finally {
      setAllocSaving(false);
    }
  };

  const handleLockMonth = () => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    setConfirmConfig({
      isOpen: true,
      title: `Lock Attendance - ${monthName}`,
      message: `Locking attendance will finalize all records for ${monthName}. Unmarked days will be automatically tallied as Present, and marked leaves will deduct from HR allocations. Proceed?`,
      confirmText: 'Lock Attendance Month',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setLockLoading(true);
        try {
          const res = await api.attendance.lockMonth(currentYear, monthStr);
          setLockStatus({ locked: true });
          if (isAdmin) fetchAdminData();
        } catch (err) {
          setError(err.message || 'Failed to lock attendance month.');
        } finally {
          setLockLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleUnlockMonth = () => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    setConfirmConfig({
      isOpen: true,
      title: `Unlock Attendance - ${monthName}`,
      message: `Unlocking will allow employees and HR to modify attendance records for ${monthName}. Proceed?`,
      confirmText: 'Unlock Month',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        setLockLoading(true);
        try {
          const res = await api.attendance.unlockMonth(currentYear, monthStr);
          setLockStatus({ locked: false });
          if (isAdmin) fetchAdminData();
        } catch (err) {
          setError(err.message || 'Failed to unlock attendance month.');
        } finally {
          setLockLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  useEffect(() => {
    fetchLockStatus();
    fetchEmployeeList();
    if (isAdmin) {
      fetchAdminData();
    } else {
      fetchTodayAttendance();
      fetchMyMonthData();
      fetchLeaveSummary();
    }
  }, [currentYear, currentMonth, isAdmin]);

  const fetchTodayAttendance = async () => {
    loadingTodayAttendance();
  };

  const loadingTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.attendance.getToday();
      setMarkedToday(res.selections || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch today's attendance.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const data = await api.attendance.getAdminMonth(currentYear, monthStr);
      setAdminRecords(data.records || []);
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getEmployeeStats = (empId) => {
    const empRecords = adminRecords.filter(r => r.employee_id === empId);
    let presentCount = 0;
    let weeklyOffCount = 0;
    let sickLeaveCount = 0;
    let casualLeaveCount = 0;
    let privilegedLeaveCount = 0;

    empRecords.forEach(r => {
      const sels = Object.keys(r.selections || {});
      if (sels.includes('Present')) presentCount++;
      if (sels.includes('Weekly Off')) weeklyOffCount++;
      if (sels.includes('Sick Leave')) sickLeaveCount++;
      if (sels.includes('Casual Leave')) casualLeaveCount++;
      if (sels.includes('Privileged Leave')) privilegedLeaveCount++;
    });

    return { presentCount, weeklyOffCount, sickLeaveCount, casualLeaveCount, privilegedLeaveCount };
  };

  // Helper functions for employee broadcast selection
  const departments = ['All', ...Array.from(new Set(employeeList.map(e => e.department || 'General')))];

  const filteredEmployees = employeeList.filter(emp => {
    if (selectedDeptFilter !== 'All' && emp.department !== selectedDeptFilter) return false;
    if (recipientSearchQuery) {
      const q = recipientSearchQuery.toLowerCase();
      const matchName = emp.name?.toLowerCase().includes(q);
      const matchEmail = emp.email?.toLowerCase().includes(q);
      const matchDept = emp.department?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept) return false;
    }
    return true;
  });

  const toggleRecipient = (email) => {
    setSelectedRecipients(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const selectAllFilteredRecipients = () => {
    const emailsToAdd = filteredEmployees.map(e => e.email);
    setSelectedRecipients(prev => Array.from(new Set([...prev, ...emailsToAdd])));
  };

  const clearAllRecipients = () => {
    setSelectedRecipients([]);
  };

  const handleConfirmAndSubmitMarking = async () => {
    closeConfirm();
    setSubmittingMarking(true);
    setError('');
    setMarkingSuccessMsg('');
    try {
      const payload = {
        status: statusSelection,
        leave_category: statusSelection === 'Leave' ? leaveCategory : '',
        reason: absenceReason,
        handover_person: handoverPerson,
        broadcast_all: broadcastMode === 'all',
        broadcast_recipients: broadcastMode === 'selective' ? selectedRecipients : []
      };

      const res = await api.attendance.mark(payload);
      setMarkedToday(res.selections || []);
      
      const displayStatus = statusSelection === 'Leave' ? leaveCategory : statusSelection;
      let msg = `Successfully marked your status as "${displayStatus}" for today!`;
      if (res.broadcast_sent) {
        msg += ` Broadcast email sent to ${res.recipients_count} recipient(s) on a single thread.`;
      }
      setMarkingSuccessMsg(msg);
      fetchMyMonthData();
      fetchLeaveSummary();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit attendance marking.');
    } finally {
      setSubmittingMarking(false);
    }
  };

  const triggerMarkConfirmation = () => {
    if (lockStatus?.locked === true) {
      setConfirmConfig({
        isOpen: true,
        title: 'Attendance Month Locked',
        message: 'Attendance logs for this month have been locked and finalized by HR Admin. Selections cannot be modified.',
        confirmText: 'Understand',
        cancelText: 'Close',
        type: 'danger',
        onConfirm: closeConfirm,
        onCancel: closeConfirm
      });
      return;
    }

    if (broadcastMode === 'selective' && selectedRecipients.length === 0) {
      setError('Please select at least one employee recipient for your selective broadcast list, or switch to "Select All Employees".');
      return;
    }

    const displayStatus = statusSelection === 'Leave' ? leaveCategory : statusSelection;
    const recipientCount = broadcastMode === 'all' ? employeeList.length : selectedRecipients.length;

    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Attendance Marking & Email Broadcast',
      message: `Mark your status for today as "${displayStatus}" and broadcast announcement email to ${recipientCount} recipient(s)?

Note: All recipients will be included on a single email thread.`,
      confirmText: `Confirm & Send Broadcast`,
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: handleConfirmAndSubmitMarking,
      onCancel: closeConfirm
    });
  };

  // Render Rebuilt Employee Attendance View
  const renderEmployeeView = () => {
    const todayStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const isHoliday = isPredecidedHoliday(new Date().toISOString().split('T')[0]);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      monthDates.push(dateStr);
    }

    const monthLabel = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    const isLocked = lockStatus?.locked === true;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '30px', maxWidth: '1050px', margin: '0 auto', alignItems: 'start' }}>
        
        {/* Left Column: Rebuilt Attendance & Broadcast Marking Form */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px', color: '#3b82f6' }}>
              <Clock size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Daily Attendance & Leave Broadcast</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>{todayStr}</p>
            </div>
          </div>

          {isLocked && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '10px', marginBottom: '20px', color: '#ef4444', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} />
              <span>Attendance portal is locked for this month by HR Admin. Selections cannot be modified until unlocked.</span>
            </div>
          )}

          {isHoliday && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '10px', marginBottom: '20px', color: '#f59e0b', fontSize: '13px', fontWeight: '500' }}>
              ℹ️ Today is a pre-decided company holiday. Any marking submitted will be recorded as active duty override.
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '10px', marginBottom: '20px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          {markingSuccessMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '14px', borderRadius: '10px', marginBottom: '20px', color: '#10b981', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} />
              <span>{markingSuccessMsg}</span>
            </div>
          )}

          {/* Step 1: Select Attendance / Leave Status */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              1. Mark Your Today's Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { id: 'Absent', label: 'Absent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
                { id: 'Weekly Off', label: 'Weekly Off', color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
                { id: 'Leave', label: 'Leave', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' }
              ].map(opt => {
                const isSelected = statusSelection === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusSelection(opt.id)}
                    disabled={isLocked || submittingMarking}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${opt.color}` : '1px solid var(--border-glass)',
                      background: isSelected ? opt.bg : 'rgba(255,255,255,0.01)',
                      color: isSelected ? opt.color : 'var(--text-primary)',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSelected && <Check size={16} />}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Sub-dropdown for Leave Category */}
            {statusSelection === 'Leave' && (
              <div style={{ marginTop: '12px', background: 'rgba(59, 130, 246, 0.04)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#3b82f6', marginBottom: '6px' }}>
                  Select Admin Allocated Leave Category:
                </label>
                <select
                  value={leaveCategory}
                  onChange={(e) => setLeaveCategory(e.target.value)}
                  disabled={isLocked || submittingMarking}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-card, #1e293b)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Privileged Leave">Privileged Leave (PL)</option>
                </select>
              </div>
            )}
          </div>

          {/* Step 2: Optional Details */}
          <div style={{ marginBottom: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Personal emergency..."
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                disabled={isLocked || submittingMarking}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(255,255,255,0.01)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Handover / Contact (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe for urgent tasks"
                value={handoverPerson}
                onChange={(e) => setHandoverPerson(e.target.value)}
                disabled={isLocked || submittingMarking}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(255,255,255,0.01)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Step 3: Broadcast Audience Selection */}
          <div style={{ marginBottom: '25px', borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              2. Email Broadcast Audience
            </label>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => setBroadcastMode('all')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: broadcastMode === 'all' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                  background: broadcastMode === 'all' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.01)',
                  color: broadcastMode === 'all' ? '#10b981' : 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Users size={16} />
                Select All Employees ({employeeList.length})
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMode('selective')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: broadcastMode === 'selective' ? '2px solid #3b82f6' : '1px solid var(--border-glass)',
                  background: broadcastMode === 'selective' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                  color: broadcastMode === 'selective' ? '#3b82f6' : 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Filter size={16} />
                Selective Select ({selectedRecipients.length} Selected)
              </button>
            </div>

            {/* Selective Broadcast Selector */}
            {broadcastMode === 'selective' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '14px' }}>
                {/* Department Filter Tags */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Department Quick Filters:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {departments.map(dept => {
                      const isSel = selectedDeptFilter === dept;
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => setSelectedDeptFilter(dept)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: isSel ? '1px solid #3b82f6' : '1px solid var(--border-glass)',
                            background: isSel ? '#3b82f6' : 'rgba(255,255,255,0.02)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Bar & Actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search colleagues..."
                      value={recipientSearchQuery}
                      onChange={(e) => setRecipientSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 8px 8px 30px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-glass)',
                        background: 'rgba(0,0,0,0.2)',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllFilteredRecipients}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllRecipients}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Clear
                  </button>
                </div>

                {/* Recipient Checklist */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {filteredEmployees.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px' }}>
                      No employees match your search filter.
                    </div>
                  ) : (
                    filteredEmployees.map(emp => {
                      const isChecked = selectedRecipients.includes(emp.email);
                      return (
                        <div
                          key={emp.email}
                          onClick={() => toggleRecipient(emp.email)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.01)',
                            border: isChecked ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>{emp.name}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{emp.department || 'General'} &bull; {emp.email}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confirm & Submit Button */}
          <button
            type="button"
            onClick={triggerMarkConfirmation}
            disabled={isLocked || submittingMarking}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isLocked ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '15px',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isLocked ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.4)',
              opacity: submittingMarking ? 0.7 : 1
            }}
          >
            <Send size={18} />
            {submittingMarking ? 'Submitting & Broadcasting...' : 'Confirm Attendance & Broadcast Email'}
          </button>
        </div>

        {/* Right Column: Employee Month Calendar */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>My Monthly Logs</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="back-btn" onClick={handlePrevMonth} style={{ padding: '2px 6px', margin: 0 }}><ChevronLeft size={12} /></button>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{monthLabel}</span>
              <button className="back-btn" onClick={handleNextMonth} style={{ padding: '2px 6px', margin: 0 }}><ChevronRight size={12} /></button>
            </div>
          </div>

          {/* Calendar days grid header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => (
              <span key={w} style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>{w}</span>
            ))}
            
            {/* Blank padding days for start of month */}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, idx) => (
              <div key={`pad-${idx}`} />
            ))}

            {monthDates.map(dStr => {
              const dayNum = new Date(dStr).getDate();
              const dayRecord = myMonthRecords.find(r => r.date === dStr);
              const hasActivity = dayRecord && Object.keys(dayRecord.selections || {}).length > 0;
              const isHoliday = isPredecidedHoliday(dStr);

              // Colors based on marked statuses
              let bgColor = 'rgba(255,255,255,0.03)';
              let color = 'var(--text-primary)';
              let border = '1px solid var(--border-glass)';
              let titleText = 'No logs marked';

              if (hasActivity) {
                const sels = Object.keys(dayRecord.selections);
                bgColor = 'rgba(16, 185, 129, 0.08)';
                color = '#10b981';
                border = '1px solid #10b981';
                titleText = sels.map(s => `${s} at ${dayRecord.selections[s]}`).join('\n');
              } else if (isHoliday) {
                bgColor = 'rgba(239, 68, 68, 0.05)';
                color = '#ef4444';
                titleText = 'Company Holiday';
              }

              return (
                <div 
                  key={dStr} 
                  title={`${dStr}
${titleText}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '6px',
                    border,
                    background: bgColor,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    position: 'relative',
                    cursor: 'default'
                  }}
                >
                  {dayNum}
                  {hasActivity && (
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', position: 'absolute', bottom: '3px' }} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Checked In / Leave Marked
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Holiday
            </span>
          </div>
        </div>

        {/* Leave Summary Card - spans full width below */}
        <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Leaf size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
              Leave Summary for {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {leaveSummary.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
              No leave allocations found for this month. Contact HR for allocation.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {leaveSummary.map((item, idx) => {
                const catColors = {
                  'Week Off': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', color: '#64748b', icon: '⚪' },
                  'Sick Leave': { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#ef4444', icon: '🔴' },
                  'Casual Leave': { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', color: '#fbbf24', icon: '🟡' },
                  'Privileged Leave': { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', color: '#a855f7', icon: '🟣' },
                };
                const c = catColors[item.category] || catColors['Sick Leave'];
                return (
                  <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: c.color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{c.icon}</span> {item.category}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{item.allocated}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allocated</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{item.consumed}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consumed</div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{item.balance}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    );
  };

  // Render Admin Attendance View
  const renderAdminView = () => {
    // Generate dates for current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      monthDates.push(dateStr);
    }

    const monthLabel = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Admin Header & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Attendance Management (Admin)</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>Manage monthly attendance logs, leave allocations, and locking for payroll.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowAllocPanel(!showAllocPanel)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Leaf size={16} />
              {showAllocPanel ? 'Close Leave Allocations' : 'Set Leave Allocations'}
            </button>

            {lockStatus?.locked ? (
              <button
                onClick={handleUnlockMonth}
                disabled={lockLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Unlock size={16} />
                Unlock Attendance Month
              </button>
            ) : (
              <button
                onClick={handleLockMonth}
                disabled={lockLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                <Lock size={16} />
                Lock Attendance Month
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
              <button className="back-btn" onClick={handlePrevMonth} style={{ padding: '2px 6px', margin: 0 }}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '110px', textAlign: 'center' }}>{monthLabel}</span>
              <button className="back-btn" onClick={handleNextMonth} style={{ padding: '2px 6px', margin: 0 }}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Leave Allocations Panel */}
        {showAllocPanel && (
          <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#10b981' }}>Configure Monthly Leave Allocations ({monthLabel})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>Target Employee</label>
                <select
                  value={allocTarget}
                  onChange={e => setAllocTarget(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-card, #1e293b)', color: '#fff', fontSize: '12px' }}
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>Weekly Offs (WO)</label>
                <input type="number" min="0" value={allocWO} onChange={e => setAllocWO(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>Sick Leave (SL)</label>
                <input type="number" min="0" value={allocSL} onChange={e => setAllocSL(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>Casual Leave (CL)</label>
                <input type="number" min="0" value={allocCL} onChange={e => setAllocCL(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>Privileged Leave (PL)</label>
                <input type="number" min="0" value={allocPL} onChange={e => setAllocPL(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '12px' }} />
              </div>
            </div>
            <button
              onClick={handleSaveLeaveAllocation}
              disabled={allocSaving}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              {allocSaving ? 'Saving...' : 'Save Allocations'}
            </button>
          </div>
        )}

        {/* Employee Grid & Attendance Logs Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
          {/* Employee Directory List */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px', maxHeight: '600px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Employees</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {employees.map(emp => {
                const isSelected = selectedEmployeeId === emp.id;
                const stats = getEmployeeStats(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.01)',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: isSelected ? '#3b82f6' : 'var(--text-primary)' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.department}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '10px' }}>
                      <span style={{ color: '#10b981' }}>P: {stats.presentCount}</span>
                      <span style={{ color: '#fbbf24' }}>CL: {stats.casualLeaveCount}</span>
                      <span style={{ color: '#ef4444' }}>SL: {stats.sickLeaveCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Employee Month Detailed Log */}
          {!selectedEmployeeId ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              Select an employee from the directory list to inspect monthly attendance logs and leave records.
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                    {employees.find(e => e.id === selectedEmployeeId)?.name}'s Attendance Logs
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{monthLabel}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {adminRecords
                  .filter(r => r.employee_id === selectedEmployeeId)
                  .sort((a,b) => b.date.localeCompare(a.date))
                  .map(r => (
                    <div key={r.date} style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>{r.date}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {Object.entries(r.selections || {}).map(([sel, time]) => (
                          <div key={sel} style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>
                            {sel} ({time})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="attendance-container">
      {isAdmin ? renderAdminView() : renderEmployeeView()}
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
