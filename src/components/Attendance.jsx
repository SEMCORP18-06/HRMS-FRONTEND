import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { 
  Clock, Calendar, User, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, List, Grid, ShieldAlert, Lock, Unlock, Leaf 
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
  const handleSaveLeaveAllocation = () => {
    const targetEmp = employees.find(e => e.id === allocTarget);
    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Save Leave Allocations',
      message: `Are you sure you want to save leave allocations for ${targetEmp ? targetEmp.name : 'this employee'}?\n\nAllocated: WO: ${allocWO}, SL: ${allocSL}, CL: ${allocCL}, PL: ${allocPL}`,
      confirmText: 'Save Allocations',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setAllocSaving(true);
        try {
          const monthStr = String(currentMonth + 1).padStart(2, '0');
          const data = {
            employee_id: allocTarget,
            year: currentYear,
            month: monthStr,
            wo: Number(allocWO),
            sl: Number(allocSL),
            cl: Number(allocCL),
            pl: Number(allocPL)
          };
          await api.attendance.saveLeaveAllocation(data);
          alert('Leave allocations successfully saved!');
          setShowAllocPanel(false);
        } catch (err) {
          alert(err.message || 'Failed to save leave allocation.');
        } finally {
          setAllocSaving(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleLockMonth = () => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    setConfirmConfig({
      isOpen: true,
      title: 'Lock Month Attendance',
      message: `Are you sure you want to lock attendance logs for ${monthName}?\n\nThis will freeze attendance edits for employees and sync records to the Payroll Engine.`,
      confirmText: 'Yes, Lock Month',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        setLockLoading(true);
        try {
          const res = await api.attendance.lockMonth(currentYear, monthStr);
          alert(res.message || 'Month attendance successfully locked and synced!');
          fetchLockStatus();
        } catch (err) {
          alert(err.message || 'Failed to lock month attendance.');
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
      title: 'Unlock Month Attendance',
      message: `Are you sure you want to unlock attendance logs for ${monthName}?\n\nThis will re-enable attendance edits for all employees.`,
      confirmText: 'Yes, Unlock Month',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        setLockLoading(true);
        try {
          const res = await api.attendance.unlockMonth(currentYear, monthStr);
          alert(res.message || 'Month attendance successfully unlocked!');
          fetchLockStatus();
        } catch (err) {
          alert(err.message || 'Failed to unlock month attendance.');
        } finally {
          setLockLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };


  useEffect(() => {
    fetchLockStatus();
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
      setError('Failed to fetch today\'s attendance.');
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

  const getTimeWindowInfo = () => {
    if (isAdmin) return { isWindowValid: true, reason: 'Admin Access Override', currentTimeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) };
    if (user?.allow_late_attendance_marking) return { isWindowValid: true, reason: 'Late Marking Permitted by HR Admin', currentTimeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) };

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMins = hours * 60 + minutes;

    const startMins = 10 * 60;      // 10:00 AM (600 mins)
    const endMins = 10 * 60 + 30;   // 10:30 AM (630 mins)

    const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (currentMins < startMins) {
      return {
        isWindowValid: false,
        currentTimeStr,
        reason: `Attendance marking opens at 10:00 AM. Current time is ${currentTimeStr}.`
      };
    }

    if (currentMins > endMins) {
      return {
        isWindowValid: false,
        currentTimeStr,
        reason: `Attendance window (10:00 AM – 10:30 AM) is closed. Current time is ${currentTimeStr}.`
      };
    }

    return { isWindowValid: true, currentTimeStr, reason: 'Attendance Window Open (10:00 AM – 10:30 AM)' };
  };

  const handleMarkCheckbox = (selection) => {
    if (markedToday.includes(selection)) return;

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

    const windowInfo = getTimeWindowInfo();

    if (!windowInfo.isWindowValid) {
      setConfirmConfig({
        isOpen: true,
        title: 'Attendance Window Closed',
        message: `Attendance for employees can ONLY be marked between 10:00 AM and 10:30 AM.\n\nCurrent Time: ${windowInfo.currentTimeStr}\nStatus: ${windowInfo.reason}\n\nNo attendance can be marked after 10:30 AM unless permitted by HR Admin.`,
        confirmText: 'Understand',
        cancelText: 'Close',
        type: 'danger',
        onConfirm: closeConfirm,
        onCancel: closeConfirm
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Attendance Status Mark',
      message: `Are you sure you want to mark today's attendance status as "${selection}"?\n\nTime: ${windowInfo.currentTimeStr}\n\nNote: Selections are saved immediately and cannot be deselected by employee.`,
      confirmText: `Confirm ${selection}`,
      cancelText: 'Cancel',
      type: 'success',
      onConfirm: async () => {
        closeConfirm();
        setMarkedToday(prev => [...prev, selection]);
        setError('');
        
        try {
          const res = await api.attendance.mark(selection);
          setMarkedToday(res.selections || []);
          fetchMyMonthData(); // Snappily update calendar view too!
        } catch (err) {
          const errMsg = err.message || 'Failed to mark attendance.';
          setError(errMsg);
          setMarkedToday(prev => prev.filter(x => x !== selection));
        }
      },
      onCancel: closeConfirm
    });
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
    let siteVisitCount = 0;
    let extendedWorkCount = 0;
    
    empRecords.forEach(r => {
      const selections = Object.keys(r.selections || {});
      if (selections.includes('Present')) presentCount++;
      if (selections.includes('Weekly Off')) weeklyOffCount++;
      if (selections.includes('Sick Leave')) sickLeaveCount++;
      if (selections.includes('Casual Leave')) casualLeaveCount++;
      if (selections.includes('Privileged Leave')) privilegedLeaveCount++;
      if (selections.includes('Site Visit') || selections.includes('Back From Site Visit')) siteVisitCount++;
      if (selections.includes('Extended Work')) extendedWorkCount++;
    });
    
    return { presentCount, weeklyOffCount, sickLeaveCount, casualLeaveCount, privilegedLeaveCount, siteVisitCount, extendedWorkCount };
  };

  const renderCountCell = (empId, statusKey) => {
    const empRecords = adminRecords.filter(r => r.employee_id === empId);
    let matchedLogs = [];
    empRecords.forEach(r => {
      const selections = r.selections || {};
      if (statusKey === 'Site Visit') {
        if (selections['Site Visit']) matchedLogs.push(true);
        if (selections['Back From Site Visit']) matchedLogs.push(true);
      } else {
        if (selections[statusKey]) matchedLogs.push(true);
      }
    });
    const count = matchedLogs.length;
    let color = '#10b981';
    if (statusKey === 'Weekly Off') color = '#64748b';
    if (statusKey === 'Sick Leave') color = '#ef4444';
    if (statusKey === 'Casual Leave') color = '#fbbf24';
    if (statusKey === 'Privileged Leave') color = '#a855f7';
    if (statusKey === 'Site Visit') color = '#3b82f6';
    if (statusKey === 'Extended Work') color = '#0d9488';
    return (
      <span style={{ color, fontWeight: '800', fontSize: '16px' }}>{count}</span>
    );
  };

  const renderTimeLogsCell = (empId, statusKey) => {
    const empRecords = adminRecords.filter(r => r.employee_id === empId);
    let matchedLogs = [];
    empRecords.forEach(r => {
      const selections = r.selections || {};
      const day = r.date.split('-')[2];
      if (statusKey === 'Site Visit') {
        if (selections['Site Visit']) matchedLogs.push({ day, time: selections['Site Visit'], label: 'Out' });
        if (selections['Back From Site Visit']) matchedLogs.push({ day, time: selections['Back From Site Visit'], label: 'In' });
      } else {
        if (selections[statusKey]) matchedLogs.push({ day, time: selections[statusKey] });
      }
    });
    if (matchedLogs.length === 0) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {matchedLogs.map((log, i) => (
          <span key={i} style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {log.label ? `Day ${log.day} ${log.label}: ${log.time}` : `Day ${log.day}: ${log.time}`}
          </span>
        ))}
      </div>
    );
  };

  const handleExport = async (format) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hr_token');
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const base = 'https://hrms-backend-gamma.vercel.app';
      const url = `${base}/api/attendance/admin/export?year=${currentYear}&month=${monthStr}&format=${format}`;
      
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const extension = format === 'xls' ? 'xlsx' : format === 'word' ? 'docx' : format;
      const fileName = `attendance_masterlist_${currentYear}_${monthStr}.${extension}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      setError(`Failed to export attendance data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render Employee Attendance Checkbox View
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
    const windowInfo = getTimeWindowInfo();

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
        
        {/* Left Column: Today Check-in Panel */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <Clock size={28} style={{ color: '#10b981' }} />
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Daily Attendance Panel</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>{todayStr}</p>
            </div>
          </div>

          {/* Time Window Notice Banner */}
          {!isAdmin && (
            <div style={{
              background: windowInfo.isWindowValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: windowInfo.isWindowValid ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
              padding: '14px',
              borderRadius: '12px',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} style={{ color: windowInfo.isWindowValid ? '#10b981' : '#ef4444' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: windowInfo.isWindowValid ? '#10b981' : '#ef4444' }}>
                    Attendance Window: 10:00 AM – 10:30 AM
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {windowInfo.reason}
                  </div>
                </div>
              </div>
              <span style={{
                background: windowInfo.isWindowValid ? '#10b981' : '#ef4444',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}>
                {windowInfo.isWindowValid ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          )}

          {isLocked && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#ef4444', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} />
              <span>Attendance portal is locked for this month by HR Admin. Selections cannot be modified until unlocked.</span>
            </div>
          )}

          {isHoliday && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#f59e0b', fontSize: '13px', fontWeight: '500' }}>
              ℹ️ Today is a pre-decided company holiday. Any check-ins submitted will be recorded as active duty override.
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            {STATUS_OPTIONS.map((opt) => {
              const isChecked = markedToday.includes(opt);
              const isDisabled = isChecked || loading || isLocked || !windowInfo.isWindowValid;
              return (
                <div 
                  key={opt} 
                  onClick={() => {
                    if (!isChecked && !loading) {
                      handleMarkCheckbox(opt);
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px', 
                    background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.01)', 
                    border: isChecked ? '1px solid #10b981' : '1px solid var(--border-glass)', 
                    borderRadius: '12px',
                    cursor: isChecked ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isChecked ? 0.8 : isDisabled ? 0.6 : 1
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '600', color: isChecked ? '#10b981' : 'var(--text-primary)' }}>{opt}</span>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    readOnly
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      pointerEvents: 'none',
                      accentColor: '#10b981'
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '25px', display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
            <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
            <span>Lock-in rule: selections are saved immediately and cannot be deselected by employee.</span>
          </div>
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
                  title={`${dStr}\n${titleText}`}
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
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Checked In
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
    
    // Summary of selected date
    const selectedDateRecords = adminRecords.filter(r => r.date === selectedDate);
    const holidayText = isPredecidedHoliday(selectedDate) ? 'Pre-decided Holiday' : 'Active Tracking Day';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '15px' }}>
        {/* Left Column: Calendar & Monthly Summary */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} style={{ color: '#10b981' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>HR Attendance Controller</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="back-btn" onClick={handlePrevMonth} style={{ padding: '4px 8px', margin: 0 }}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{monthLabel}</span>
              <button className="back-btn" onClick={handleNextMonth} style={{ padding: '4px 8px', margin: 0 }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Action Bar: Allocation and Lock controls */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-glass)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setShowAllocPanel(!showAllocPanel)}
              style={{
                background: showAllocPanel ? '#475569' : '#10b981',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Leaf size={14} /> {showAllocPanel ? 'Close Allocation' : 'Allocate Leaves'}
            </button>

            <button
              onClick={lockStatus.locked ? handleUnlockMonth : handleLockMonth}
              disabled={lockLoading}
              title={lockStatus.locked ? "Click to unlock attendance for this month" : "Click to lock attendance for this month"}
              style={{
                background: lockStatus.locked ? '#ef4444' : '#10b981',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: lockLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                boxShadow: lockStatus.locked ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              {lockStatus.locked ? (
                <>
                  <Unlock size={14} /> Unlock Attendance
                </>
              ) : (
                <>
                  <Lock size={14} /> Lock Attendance
                </>
              )}
            </button>
            
            <button
              onClick={async () => {
                setLockLoading(true);
                try {
                  const res = await api.attendance.permitLateAttendanceAll();
                  alert(res.message || 'Late attendance marking permitted for all active employees.');
                  fetchAdminData();
                } catch (err) {
                  alert(err.message || 'Failed to permit late attendance marking.');
                } finally {
                  setLockLoading(false);
                }
              }}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: lockLoading ? 0.6 : 1
              }}
            >
              <Clock size={14} /> Permit All (Late Mark)
            </button>
          </div>

          {/* Leave Allocation Form Panel */}
          {showAllocPanel && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#10b981' }}>Allocate Leaves ({monthLabel})</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Employee</label>
                  <select 
                    value={allocTarget} 
                    onChange={(e) => setAllocTarget(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid var(--border-glass)', color: '#fff', padding: '6px', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option value="all">All Active Employees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Week Off (WO)</label>
                  <input type="number" min="0" step="0.5" value={allocWO} onChange={(e) => setAllocWO(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid var(--border-glass)', color: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '12px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Sick Leave (SL)</label>
                  <input type="number" min="0" step="0.5" value={allocSL} onChange={(e) => setAllocSL(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid var(--border-glass)', color: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Casual Leave (CL)</label>
                  <input type="number" min="0" step="0.5" value={allocCL} onChange={(e) => setAllocCL(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid var(--border-glass)', color: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Privileged Leave (PL)</label>
                  <input type="number" min="0" step="0.5" value={allocPL} onChange={(e) => setAllocPL(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid var(--border-glass)', color: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '12px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowAllocPanel(false)} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveLeaveAllocation} disabled={allocSaving} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {allocSaving ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', marginBottom: '12px', color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          {/* Calendar Grid View */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
              <span key={w} style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', paddingBottom: '3px' }}>{w}</span>
            ))}
            
            {/* Blank padding days for start of month */}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, idx) => (
              <div key={`pad-${idx}`} />
            ))}

            {monthDates.map(dStr => {
              const dayNum = new Date(dStr).getDate();
              const isSelected = dStr === selectedDate;
              const isHoliday = isPredecidedHoliday(dStr);
              
              // Count activities on this day
              const dayRecs = adminRecords.filter(r => r.date === dStr);
              const activityCount = dayRecs.reduce((acc, curr) => acc + Object.keys(curr.selections || {}).length, 0);

              return (
                <div 
                  key={dStr} 
                  onClick={() => setSelectedDate(dStr)}
                  style={{
                    aspectRatio: '2.5',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #10b981' : '1px solid var(--border-glass)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : isHoliday ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2px 4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '800', 
                    color: isHoliday ? '#ef4444' : 'var(--text-primary)',
                    textAlign: 'left',
                    paddingLeft: '1px'
                  }}>
                    {dayNum}
                  </span>
                  
                  {activityCount > 0 ? (
                    <span style={{ fontSize: '8px', background: '#10b981', color: '#fff', borderRadius: '3px', padding: '0px 2px', fontWeight: 'bold', alignSelf: 'flex-end' }}>
                      {activityCount} rec
                    </span>
                  ) : isHoliday ? (
                    <span style={{ fontSize: '8px', color: '#ef4444', fontWeight: 'bold', alignSelf: 'flex-end' }}>Holi</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {/* Master Employee Report */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Employee Log / Month Overview</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleExport('xls')} style={{ padding: '6px 12px', fontSize: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Excel (XLS)</button>
                <button onClick={() => handleExport('csv')} style={{ padding: '6px 12px', fontSize: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>CSV</button>
                <button onClick={() => handleExport('pdf')} style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>PDF</button>
                <button onClick={() => handleExport('word')} style={{ padding: '6px 12px', fontSize: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Word</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                  <th rowSpan={2} style={{ padding: '6px 8px', borderBottom: '2px solid var(--border-glass)', borderRight: '1px solid var(--border-glass)', fontWeight: '700', verticalAlign: 'middle', minWidth: '110px' }}>Employee</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(16,185,129,0.3)', borderLeft: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: '800', background: 'rgba(16,185,129,0.04)' }}>🟢 Present</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '1px solid rgba(100,116,139,0.2)', color: '#64748b', fontWeight: '800', background: 'rgba(100,116,139,0.04)' }}>⚪ Weekly Off</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: '800', background: 'rgba(239,68,68,0.04)' }}>🔴 Sick Leave</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(251,191,36,0.3)', borderLeft: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: '800', background: 'rgba(251,191,36,0.04)' }}>🟡 Casual Leave</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '1px solid rgba(168,85,247,0.2)', color: '#a855f7', fontWeight: '800', background: 'rgba(168,85,247,0.04)' }}>🟣 Privileged Leave</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(59,130,246,0.3)', borderLeft: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontWeight: '800', background: 'rgba(59,130,246,0.04)' }}>🔵 Site Visit</th>
                  <th colSpan={2} style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '1px solid rgba(13,148,136,0.3)', borderLeft: '1px solid rgba(13,148,136,0.2)', color: '#0d9488', fontWeight: '800', background: 'rgba(13,148,136,0.04)' }}>🟢 Extended Work</th>
                </tr>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {[
                    ['#10b981','rgba(16,185,129,0.2)'],
                    ['#64748b','rgba(100,116,139,0.2)'],
                    ['#ef4444','rgba(239,68,68,0.2)'],
                    ['#fbbf24','rgba(251,191,36,0.2)'],
                    ['#a855f7','rgba(168,85,247,0.2)'],
                    ['#3b82f6','rgba(59,130,246,0.2)'],
                    ['#0d9488','rgba(13,148,136,0.2)']
                  ].map(([col, border], i) => [
                    <th key={`c${i}`} style={{ padding: '4px 6px', textAlign: 'center', fontSize: '9.5px', fontWeight: '600', color: col, borderBottom: '2px solid var(--border-glass)', borderLeft: `1px solid ${border}`, minWidth: '38px' }}>Count</th>,
                    <th key={`t${i}`} style={{ padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-glass)', minWidth: '85px' }}>Date & Time</th>
                  ])}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      cursor: 'pointer',
                      background: selectedEmployeeId === emp.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: '600', verticalAlign: 'top', borderRight: '1px solid var(--border-glass)' }}>{emp.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(16,185,129,0.15)' }}>{renderCountCell(emp.id, 'Present')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Present')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(100,116,139,0.15)' }}>{renderCountCell(emp.id, 'Weekly Off')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Weekly Off')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(239,68,68,0.15)' }}>{renderCountCell(emp.id, 'Sick Leave')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Sick Leave')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(251,191,36,0.15)' }}>{renderCountCell(emp.id, 'Casual Leave')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Casual Leave')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(168,85,247,0.15)' }}>{renderCountCell(emp.id, 'Privileged Leave')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Privileged Leave')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(59,130,246,0.15)' }}>{renderCountCell(emp.id, 'Site Visit')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Site Visit')}</td>
                    
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'top', borderLeft: '1px solid rgba(13,148,136,0.15)' }}>{renderCountCell(emp.id, 'Extended Work')}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{renderTimeLogsCell(emp.id, 'Extended Work')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Right Column: Date Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Details for Selected Date */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Daily Log Detail</h3>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Date: {selectedDate}</span>
            <div style={{ fontSize: '11px', background: isPredecidedHoliday(selectedDate) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isPredecidedHoliday(selectedDate) ? '#ef4444' : '#10b981', display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', marginTop: '6px' }}>
              {holidayText}
            </div>

            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDateRecords.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                  No attendance logs marked for this date.
                </div>
              ) : (
                selectedDateRecords.map(r => (
                  <div key={r.employee_id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>{r.employee_name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(r.selections || {}).map(([sel, time]) => (
                        <div key={sel} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', padding: '4px 8px', borderRadius: '6px' }}>
                          <strong>{sel}</strong> at {time}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details for Selected Employee (if selected) */}
          {selectedEmployeeId && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  {employees.find(e => e.id === selectedEmployeeId)?.name || 'Employee Detail'}
                </h3>
                <button 
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} 
                  onClick={() => setSelectedEmployeeId('')}
                >
                  Clear Selection
                </button>
              </div>

              {/* Late Attendance Marking Permit Control */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Late Mark Access:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    fontSize: '11px', 
                    color: employees.find(e => e.id === selectedEmployeeId)?.allow_late_attendance_marking ? '#10b981' : '#ef4444',
                    background: employees.find(e => e.id === selectedEmployeeId)?.allow_late_attendance_marking ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {employees.find(e => e.id === selectedEmployeeId)?.allow_late_attendance_marking ? 'Permitted' : 'Locked'}
                  </span>
                </div>
                {!employees.find(e => e.id === selectedEmployeeId)?.allow_late_attendance_marking && (
                  <button 
                    onClick={() => {
                      const empObj = employees.find(e => e.id === selectedEmployeeId);
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Permit Late Attendance',
                        message: `Are you sure you want to permit late attendance marking for ${empObj ? empObj.name : 'this employee'}?`,
                        confirmText: 'Yes, Permit Late Marking',
                        type: 'warning',
                        onConfirm: async () => {
                          closeConfirm();
                          setLoading(true);
                          try {
                            const res = await api.attendance.permitLateAttendance(selectedEmployeeId);
                            await alert(res.message || 'Late marking permitted successfully!');
                            fetchAdminData();
                          } catch (err) {
                            await alert(err.message || 'Failed to permit late marking.');
                          } finally {
                            setLoading(false);
                          }
                        },
                        onCancel: closeConfirm
                      });
                    }}
                    className="sso-btn"
                    style={{ margin: 0, padding: '8px', fontSize: '12px', width: '100%' }}
                    disabled={loading}
                  >
                    Permit Late Attendance
                  </button>
                )}
                <button
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Permit All Late Attendance',
                      message: 'Are you sure you want to permit late attendance marking for ALL active employees?',
                      confirmText: 'Yes, Permit All',
                      type: 'warning',
                      onConfirm: async () => {
                        closeConfirm();
                        setLockLoading(true);
                        try {
                          const res = await api.attendance.permitLateAttendanceAll();
                          alert(res.message || 'Late attendance marking permitted for all active employees.');
                          fetchAdminData();
                        } catch (err) {
                          alert(err.message || 'Failed to permit late attendance marking.');
                        } finally {
                          setLockLoading(false);
                        }
                      },
                      onCancel: closeConfirm
                    });
                  }}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: lockLoading ? 0.6 : 1,
                    marginTop: '4px'
                  }}
                >
                  Permit All (Late Mark)
                </button>
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
