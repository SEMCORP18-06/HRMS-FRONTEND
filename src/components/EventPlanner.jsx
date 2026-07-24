import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Info,
  Layers,
  Sparkles,
  Map,
  Eye
} from 'lucide-react';

export default function EventPlanner({ activeTenant, user }) {
  const isAdmin = user?.role === 'Admin (HR)';
  const sseRef = React.useRef(null);

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
  
  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  
  // Event & Form States
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [middleTab, setMiddleTab] = useState('create'); // 'create' | 'holidays'
  
  // Employee Selection States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [deptSearch, setDeptSearch] = useState('');
  
  // Status & UI States
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAgendaTab, setActiveAgendaTab] = useState('active'); // 'active' or 'archived'
  
  // Holiday Edit & Create States
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editedHolidayName, setEditedHolidayName] = useState('');
  const [editedHolidayDate, setEditedHolidayDate] = useState('');
  const [editedHolidayType, setEditedHolidayType] = useState('National');

  const [addingHolidayDate, setAddingHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('Bank');

  const handleUpdateHoliday = async (e) => {
    e.preventDefault();
    if (!editingHoliday) return;
    try {
      await api.holidays.update(editingHoliday.id, {
        name: editedHolidayName,
        date: editedHolidayDate,
        type: editedHolidayType
      });
      setStatus('Holiday updated successfully!');
      setTimeout(() => setStatus(''), 3000);
      setEditingHoliday(null);
      fetchHolidays();
    } catch (err) {
      setError(err.message || 'Failed to update holiday.');
    }
  };

  const handleDeleteHoliday = (id, holidayName = 'this holiday') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Holiday',
      message: `Are you sure you want to delete ${holidayName} from the holiday calendar?`,
      confirmText: 'Delete Holiday',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.holidays.delete(id);
          setStatus('Holiday deleted successfully.');
          setTimeout(() => setStatus(''), 3000);
          setEditingHoliday(null);
          fetchHolidays();
        } catch (err) {
          setError(err.message || 'Failed to delete holiday.');
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleCreateHoliday = (e) => {
    e.preventDefault();
    if (!newHolidayName || !addingHolidayDate) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Add New Holiday',
      message: `Are you sure you want to add holiday "${newHolidayName}" on ${addingHolidayDate}?`,
      confirmText: 'Add Holiday',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.holidays.create({
            name: newHolidayName,
            date: addingHolidayDate,
            type: newHolidayType
          });
          setStatus('Holiday successfully added.');
          setTimeout(() => setStatus(''), 3000);
          setAddingHolidayDate('');
          setNewHolidayName('');
          fetchHolidays();
        } catch (err) {
          setError(err.message || 'Failed to add holiday.');
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleArchiveEvent = (id, eventTitle = 'this event') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Archive Corporate Event',
      message: `Are you sure you want to archive "${eventTitle}"?`,
      confirmText: 'Archive Event',
      type: 'warning',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.events.archive(id);
          setStatus('Reminder successfully archived.');
          setTimeout(() => setStatus(''), 3000);
          fetchEvents();
        } catch (err) {
          setError(err.message || 'Failed to archive reminder.');
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleDeleteEvent = (id, eventTitle = 'this event') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Permanently Delete Event',
      message: `WARNING: Are you sure you want to permanently delete "${eventTitle}"? This cannot be undone.`,
      confirmText: 'Permanently Delete',
      type: 'danger',
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.events.delete(id);
          setStatus('Reminder deleted forever.');
          setTimeout(() => setStatus(''), 3000);
          fetchEvents();
        } catch (err) {
          setError(err.message || 'Failed to delete reminder.');
        }
      },
      onCancel: closeConfirm
    });
  };

  useEffect(() => {
    fetchEvents();
    fetchHolidays();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  // ── Employee Polling Sync (15s auto-sync for non-admin) ───────────────────
  useEffect(() => {
    if (isAdmin) return;
    const pollId = setInterval(() => {
      fetchEvents();
    }, 15000);
    return () => clearInterval(pollId);
  }, [isAdmin]);

  const fetchEvents = async () => {
    try {
      const data = await api.events.list();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    }
  };

  const fetchHolidays = async () => {
    try {
      const yearVal = currentDate.getFullYear();
      const data = await api.holidays.list(yearVal);
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
      setHolidays([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(true); // active only
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch employee roster:', err);
      setEmployees([]);
    }
  };

  // Group active employees by department
  const employeesByDept = {};
  employees.forEach(emp => {
    const dept = emp.department || 'General';
    if (!employeesByDept[dept]) {
      employeesByDept[dept] = [];
    }
    employeesByDept[dept].push(emp);
  });

  const departments = Object.keys(employeesByDept).sort();

  // Accordion Logic
  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({
      ...prev,
      [dept]: !prev[dept]
    }));
  };

  // Selection Mechanism
  const isEmployeeSelected = (empId) => {
    return selectedEmployees.some(e => e.id === empId);
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployees(prev => {
      const exists = prev.some(e => e.id === emp.id);
      if (exists) {
        return prev.filter(e => e.id !== emp.id);
      } else {
        return [...prev, emp];
      }
    });
  };

  const isDeptAllSelected = (dept, deptEmps) => {
    if (deptEmps.length === 0) return false;
    return deptEmps.every(emp => selectedEmployees.some(e => e.id === emp.id));
  };

  const handleSelectAllDept = (dept, deptEmps, checked) => {
    setSelectedEmployees(prev => {
      const filtered = prev.filter(e => !deptEmps.some(de => de.id === e.id));
      if (checked) {
        return [...filtered, ...deptEmps];
      }
      return filtered;
    });
  };

  // Handle Event Creation
  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!title || !eventDate || !eventTime) {
      setError('Please fill in Event Title, Date, and Time.');
      return;
    }
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee recipient for reminders.');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Schedule Corporate Event',
      message: `Are you sure you want to schedule "${title}" on ${eventDate} at ${eventTime} for ${selectedEmployees.length} employee(s)?`,
      confirmText: 'Schedule Event',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setError('');
        setStatus('');

        const start_time = `${eventDate}T${eventTime}`;
        const attendees = selectedEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          personal_email: emp.personal_email
        }));

        try {
          await api.events.create({
            title,
            description,
            start_time,
            location,
            attendees
          });

          setTitle('');
          setDescription('');
          setEventDate('');
          setEventTime('');
          setLocation('');
          setSelectedEmployees([]);
          setStatus('Success! Event created & reminders queued.');
          setTimeout(() => setStatus(''), 5000);
          fetchEvents();
        } catch (err) {
          setError(err.message || 'Failed to create event.');
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pad initial empty cells
  const dayCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push({ dayNum: null, dateStr: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push({ dayNum: d, dateStr });
  }

  // Retrieve holidays & events for dateStr
  const getHolidaysForDate = (dateStr) => {
    if (!dateStr || !Array.isArray(holidays)) return [];
    return holidays.filter(h => h && h.date === dateStr);
  };

  const getEventsForDate = (dateStr) => {
    if (!dateStr || !Array.isArray(events)) return [];
    return events.filter(e => e && e.start_time && String(e.start_time).startsWith(dateStr));
  };

  // Sort & categorize events
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
  const upcomingEvents = [...safeEvents].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  const categorizedEvents = {
    upcoming: upcomingEvents.filter(e => e && e.status !== 'ARCHIVED' && new Date(e.start_time || 0) > in24h),
    pending: upcomingEvents.filter(e => e && e.status !== 'ARCHIVED' && new Date(e.start_time || 0) <= in24h && new Date(e.start_time || 0) > now),
    completed: upcomingEvents.filter(e => e && (e.status === 'ARCHIVED' || new Date(e.start_time || 0) <= now))
  };



  return (
    <div className="module-container" style={{ maxWidth: '100%', padding: '20px 30px' }}>
      
      {/* Module Header */}
      <div className="module-header" style={{ marginBottom: '25px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#ec489915', color: '#ec4899', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>Event Planner Hub & Reminders</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Schedule corporate events, link roster contacts, and orchestrate automated notification sequences.
            </p>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {status && (
        <div style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '14px 18px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <Check size={18} />
          <span>{status}</span>
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px 18px', borderRadius: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3-Pane Vertical Divide Layout */}
      <div className="event-planner-three-panes" style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1.5fr 1.2fr',
        gap: '24px',
        width: '100%',
        alignItems: 'stretch'
      }}>
        
        {/* ==================== LEFT PANE: CALENDAR VIEW ==================== */}
        <div className="pane-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Calendar Month Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={18} style={{ color: '#ec4899' }} />
              {currentDate.toLocaleString('default', { month: 'long' })} {year}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePrevMonth} style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNextMonth} style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Weekdays Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {weekDays.map(day => (
              <div key={day} style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', padding: '5px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', flex: 1 }}>
            {dayCells.map((cell, idx) => {
              const { dayNum, dateStr } = cell;
              if (dayNum === null) {
                return <div key={`empty-${idx}`} style={{ minHeight: '85px', opacity: 0.15 }} />;
              }

              const dayHolidays = getHolidaysForDate(dateStr);
              const dayEvents = getEventsForDate(dateStr);

              // Determine styling based on content
              const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();
              const hasNationalHoliday = dayHolidays.some(h => h.type === 'National');
              const hasBankHoliday = dayHolidays.some(h => h.type === 'Bank');
              
              let cellBg = 'rgba(255, 255, 255, 0.02)';
              let borderCol = 'var(--border-glass)';
              
              if (isToday) {
                borderCol = 'var(--brand-blue)';
              } else if (hasNationalHoliday) {
                cellBg = 'rgba(22, 163, 74, 0.06)';
                borderCol = 'rgba(22, 163, 74, 0.2)';
              } else if (hasBankHoliday) {
                cellBg = 'rgba(59, 130, 246, 0.06)';
                borderCol = 'rgba(59, 130, 246, 0.2)';
              } else if (dayEvents.length > 0) {
                cellBg = 'rgba(236, 72, 153, 0.06)';
                borderCol = 'rgba(236, 72, 153, 0.2)';
              }

              return (
                <div 
                  key={`day-${dayNum}`} 
                  className="calendar-day-cell"
                  onClick={() => {
                    if (!isAdmin) return;
                    setAddingHolidayDate(dateStr);
                    setNewHolidayName('');
                    setNewHolidayType('Bank');
                  }}
                  style={{
                    background: cellBg,
                    border: `1.5px solid ${borderCol}`,
                    borderRadius: '10px',
                    padding: '6px',
                    minHeight: '85px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  title={
                    dayHolidays.map(h => `[${h.type} Holiday] ${h.name}`).join('\n') +
                    (dayHolidays.length && dayEvents.length ? '\n' : '') +
                    dayEvents.map(e => `[Event] ${e.title}`).join('\n') +
                    '\n(Click cell to add a new holiday)'
                  }
                >
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: isToday ? 'var(--brand-blue)' : 'var(--text-primary)',
                    alignSelf: 'flex-start'
                  }}>
                    {dayNum}
                  </span>

                  {/* Indicators / Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', marginTop: '4px' }}>
                    {dayHolidays.map((h, i) => (
                      <div 
                        key={i} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) return;
                          setEditingHoliday(h);
                          setEditedHolidayName(h.name);
                          setEditedHolidayDate(h.date);
                          setEditedHolidayType(h.type || 'National');
                        }}
                        style={{ 
                          fontSize: '9px', 
                          fontWeight: '800', 
                          padding: '1px 4px', 
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          background: h.type === 'National' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: h.type === 'National' ? '#16a34a' : '#3b82f6',
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: '1px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        title="Click to edit holiday"
                        onMouseEnter={(e) => e.target.style.borderColor = h.type === 'National' ? '#16a34a' : '#3b82f6'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                      >
                        ✏️ {h.name}
                      </div>
                    ))}
                    {dayEvents.map((e, i) => (
                      <div 
                        key={i} 
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (isAdmin) handleDeleteEvent(e.id, e.title);
                        }}
                        style={{ 
                          fontSize: '9px', 
                          fontWeight: '800', 
                          padding: '1px 4px', 
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          background: 'rgba(236, 72, 153, 0.15)',
                          color: '#ec4899',
                          textAlign: 'center',
                          cursor: isAdmin ? 'pointer' : 'default'
                        }}
                        title={isAdmin ? 'Click to delete event' : e.title}
                      >
                        📅 {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Calendar Legends */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', fontSize: '11px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(22, 163, 74, 0.2)', border: '1px solid #16a34a' }} />
              National Holiday
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }} />
              Bank Holiday
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }} />
              Corporate Event
            </span>
          </div>
        </div>

        {/* ==================== MIDDLE PANE: EVENT FORM ==================== */}
        <div className="pane-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {isAdmin && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '16px', gap: '12px' }}>
              <button
                onClick={() => setMiddleTab('create')}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: middleTab === 'create' ? '3px solid var(--brand-green)' : '3px solid transparent',
                  color: middleTab === 'create' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: '800', padding: '6px 2px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Sparkles size={15} style={{ color: 'var(--brand-green)' }} />
                Schedule Event
              </button>
              <button
                onClick={() => setMiddleTab('holidays')}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: middleTab === 'holidays' ? '3px solid #3b82f6' : '3px solid transparent',
                  color: middleTab === 'holidays' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: '800', padding: '6px 2px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                🌴 Manage Holidays ({holidays.length})
              </button>
            </div>
          )}

          {(!isAdmin || middleTab === 'holidays') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={18} style={{ color: 'var(--brand-green)' }} />
                Official Corporate Holidays
              </h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px' }}>
                {holidays.length === 0 ? (
                  <div style={{ padding: '30px 15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                    No holidays listed for this month.
                  </div>
                ) : (
                  holidays.map(h => (
                    <div key={h.id || h.date + h.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{h.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{h.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 9px', borderRadius: '8px', background: h.type === 'National' ? 'rgba(22,163,74,0.15)' : 'rgba(59,130,246,0.15)', color: h.type === 'National' ? '#16a34a' : '#3b82f6', border: `1px solid ${h.type === 'National' ? 'rgba(22,163,74,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
                          {h.type || 'Holiday'}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteHoliday(h.id, h.name)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                            title="Delete holiday from calendar"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--brand-green)' }} />
                Schedule Corporate Event
              </h3>

              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Event Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q3 Strategic Planning Session" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</label>
                  <textarea 
                    rows="2" 
                    placeholder="Specify meeting details, agenda points, or video conference link..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      background: 'rgba(0,0,0,0.15)', 
                      border: '1px solid var(--border-glass)', 
                      color: 'var(--text-primary)', 
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Date of Event</label>
                    <input 
                      type="date" 
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Time of Event</label>
                    <input 
                      type="time" 
                      value={eventTime} 
                      onChange={(e) => setEventTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Location of Event</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="e.g. Conference Room B / Google Meet link" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)}
                      style={{ paddingLeft: '35px' }}
                    />
                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)' }} />
                  </div>
                </div>

                {/* Employee Selection Component */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Select Employee Recipients ({selectedEmployees.length} selected)
                  </label>

                  {/* Department Filtering & Searching */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="Filter departments..." 
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}
                    />
                  </div>

                  {/* Scrollable Accordion Wrapper */}
                  <div style={{ 
                    flex: 1, 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '10px', 
                    background: 'rgba(0,0,0,0.1)',
                    padding: '8px'
                  }}>
                    {departments
                      .filter(dept => dept.toLowerCase().includes(deptSearch.toLowerCase()))
                      .map(dept => {
                        const deptEmps = employeesByDept[dept];
                        const isExpanded = expandedDepts[dept];
                        const isAllSelected = isDeptAllSelected(dept, deptEmps);
                        const selectedCountInDept = deptEmps.filter(emp => isEmployeeSelected(emp.id)).length;

                        return (
                          <div key={dept} style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', pb: '8px' }}>
                            {/* Accordion Trigger Header */}
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              background: 'rgba(255,255,255,0.02)',
                              padding: '6px 10px', 
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}>
                              {/* Left: Checkbox & Label */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isAllSelected}
                                  onChange={(e) => handleSelectAllDept(dept, deptEmps, e.target.checked)}
                                  style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                                />
                                <span 
                                  onClick={() => toggleDept(dept)} 
                                  style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                  {dept} 
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                    ({selectedCountInDept}/{deptEmps.length})
                                  </span>
                                </span>
                              </div>

                              {/* Right: Expand Arrow */}
                              <div onClick={() => toggleDept(dept)} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Accordion Expanded Content */}
                            {isExpanded && (
                              <div style={{ padding: '8px 12px 4px 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {deptEmps.map(emp => {
                                  const isChecked = isEmployeeSelected(emp.id);
                                  return (
                                    <label 
                                      key={emp.id} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'flex-start', 
                                        gap: '8px', 
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        lineHeight: '1.4'
                                      }}
                                    >
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => handleSelectEmployee(emp)}
                                        style={{ width: '14px', height: '14px', marginTop: '3px', cursor: 'pointer' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>{emp.name}</strong>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                          📧 {emp.email || 'No company mail'} | 📁 {emp.personal_email || 'No personal mail'}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
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
                  style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-gradient)', padding: '14px', fontSize: '15px' }}
                >
                  <Plus size={16} /> 
                  {loading ? 'Creating Event...' : 'Create & Schedule Event'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ==================== RIGHT PANE: SCHEDULED EVENTS AGENDA ==================== */}
        <div className="pane-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#ec4899' }} />
            Scheduled Events Agenda
          </h3>

          {/* Agenda Tabs (Active / Archived) */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '15px', gap: '15px' }}>
            <button 
              onClick={() => setActiveAgendaTab('active')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeAgendaTab === 'active' ? '3px solid #ec4899' : '3px solid transparent',
                color: activeAgendaTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 'bold',
                padding: '6px 2px',
                cursor: 'pointer'
              }}
            >
              Active ({upcomingEvents.filter(e => e.status !== 'ARCHIVED').length})
            </button>
            <button 
              onClick={() => setActiveAgendaTab('archived')}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeAgendaTab === 'archived' ? '3px solid var(--text-muted)' : '3px solid transparent',
                color: activeAgendaTab === 'archived' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 'bold',
                padding: '6px 2px',
                cursor: 'pointer'
              }}
            >
              ⏳ Completed / Archived ({upcomingEvents.filter(e => e.status === 'ARCHIVED').length})
            </button>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px', 
            paddingRight: '4px',
            maxHeight: '480px'
          }}>
            {upcomingEvents.filter(e => activeAgendaTab === 'active' ? e.status !== 'ARCHIVED' : e.status === 'ARCHIVED').length === 0 ? (
              <div style={{ 
                padding: '40px 20px', 
                background: 'rgba(255,255,255,0.01)', 
                borderRadius: '12px', 
                border: '1px dotted var(--border-glass)', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                fontSize: '13px' 
              }}>
                {activeAgendaTab === 'active' 
                  ? "No active corporate reminders scheduled." 
                  : "No completed or archived reminders found."
                }
              </div>
            ) : (
              upcomingEvents
                .filter(e => activeAgendaTab === 'active' ? e.status !== 'ARCHIVED' : e.status === 'ARCHIVED')
                .map(ev => {
                  const dateObj = new Date(ev.start_time);
                  const day = dateObj.getDate();
                  const monthStr = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const attendeesCount = ev.attendees?.length || 0;

                  return (
                    <div 
                      key={ev.id} 
                      style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                        transition: 'transform 0.2s, background 0.2s',
                        cursor: 'default'
                      }}
                    >
                      {/* Left Mini Calendar Icon */}
                      <div style={{ 
                        background: ev.status === 'ARCHIVED' 
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(99,102,241,0.15) 100%)',
                        color: ev.status === 'ARCHIVED' ? 'var(--text-secondary)' : '#ec4899', 
                        borderRadius: '10px', 
                        padding: '8px', 
                        minWidth: '55px', 
                        textAlign: 'center',
                        border: ev.status === 'ARCHIVED' ? '1px solid var(--border-glass)' : '1px solid rgba(236,72,153,0.2)'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' }}>{monthStr}</div>
                        <div style={{ fontSize: '20px', fontWeight: '950', lineHeight: '1.2' }}>{day}</div>
                      </div>

                      {/* Right Details */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', color: ev.status === 'ARCHIVED' ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0 }}>
                            {ev.title}
                          </h4>
                          
                          {/* Manual Archive & Delete Buttons (Admin only) */}
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {ev.status !== 'ARCHIVED' && (
                                <button
                                  onClick={() => handleArchiveEvent(ev.id)}
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title="Archive reminder"
                                >
                                  Archive
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteEvent(ev.id, ev.title)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer'
                                }}
                                title="Delete event from calendar"
                              >
                                {ev.status === 'ARCHIVED' ? 'Delete Forever' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {ev.description && (
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 6px 0', lineHeight: '1.4' }}>
                            {ev.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {timeStr}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {ev.location || 'HQ / Virtual'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: ev.status === 'ARCHIVED' ? 'var(--text-secondary)' : 'var(--brand-blue)' }}>
                            <Users size={12} /> {attendeesCount} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

      </div>

      {/* ==================== EDIT HOLIDAY DIALOG MODAL ==================== */}
      {editingHoliday && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="pane-card" style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '850', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚙️ Edit Maharashtra Holiday
            </h3>
            
            <form onSubmit={handleUpdateHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editedHolidayName}
                  onChange={(e) => setEditedHolidayName(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={editedHolidayDate}
                  onChange={(e) => setEditedHolidayDate(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Type</label>
                <select
                  className="input-field"
                  value={editedHolidayType}
                  onChange={(e) => setEditedHolidayType(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}
                >
                  <option value="National">National Holiday</option>
                  <option value="Bank">Bank / Government / Festival</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => handleDeleteHoliday(editingHoliday.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: '120px'
                  }}
                >
                  Delete Holiday
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setEditingHoliday(null)}
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', minWidth: '80px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', background: 'var(--brand-gradient)', minWidth: '120px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD HOLIDAY DIALOG MODAL ==================== */}
      {addingHolidayDate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="pane-card" style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '850', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              ➕ Add Maharashtra Holiday
            </h3>
            
            <form onSubmit={handleCreateHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Gudi Padwa, Diwali"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={addingHolidayDate}
                  onChange={(e) => setAddingHolidayDate(e.target.value)}
                  required 
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Holiday Type / Category</label>
                <select
                  className="input-field"
                  value={newHolidayType}
                  onChange={(e) => setNewHolidayType(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}
                >
                  <option value="National">National Holiday</option>
                  <option value="Bank">Bank / Government / Festival</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setAddingHolidayDate('')}
                  style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', background: 'var(--brand-gradient)' }}
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Employee View-Only Event Planner Hub
// ══════════════════════════════════════════════════════════════════════════════
function EmployeeEventView({
  currentDate, setCurrentDate,
  holidays, events,
  dayCells, weekDays, year, month,
  getHolidaysForDate, getEventsForDate,
  categorizedEvents,
  handlePrevMonth, handleNextMonth,
  activeAgendaTab, setActiveAgendaTab
}) {
  const safeCategorized = categorizedEvents || { upcoming: [], pending: [], completed: [] };
  const currentTab = ['upcoming', 'pending', 'completed'].includes(activeAgendaTab) ? activeAgendaTab : 'upcoming';

  const TABS = [
    { key: 'upcoming', label: 'Upcoming', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', count: (safeCategorized.upcoming || []).length },
    { key: 'pending',  label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', count: (safeCategorized.pending || []).length },
    { key: 'completed',label: 'Completed',color: '#64748b', bg: 'rgba(100,116,139,0.1)', count: (safeCategorized.completed || []).length },
  ];

  const visibleEvents = safeCategorized[currentTab] || [];

  const getBadgeColor = (ev) => {
    const st = new Date(ev.start_time);
    const now = new Date();
    if (ev.status === 'ARCHIVED' || st <= now) return '#64748b';
    if (st <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) return '#f59e0b';
    return '#ec4899';
  };

  return (
    <div className="module-container" style={{ maxWidth: '100%', padding: '20px 30px' }}>
      {/* Header */}
      <div className="module-header" style={{ marginBottom: '22px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#ec489915', color: '#ec4899', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Event Planner Hub</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Corporate calendar, official holidays &amp; scheduled events
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Eye size={12} /> View-Only Mode
          </span>
        </div>
      </div>

      {/* Event Category Summary Badges */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <div key={tab.key} style={{ background: tab.bg, border: `1px solid ${tab.color}30`, borderRadius: '12px', padding: '12px 20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '22px', fontWeight: '900', color: tab.color }}>{tab.count}</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: tab.color }}>{tab.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>events</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2-column layout: Calendar | Agenda */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* LEFT: Calendar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={16} style={{ color: '#ec4899' }} />
              {currentDate.toLocaleString('default', { month: 'long' })} {year}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePrevMonth} style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={15} /></button>
              <button onClick={handleNextMonth} style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronRight size={15} /></button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center', marginBottom: '6px' }}>
            {weekDays.map(d => (
              <div key={d} style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
            {dayCells.map((cell, idx) => {
              const { dayNum, dateStr } = cell;
              if (dayNum === null) return <div key={`e-${idx}`} style={{ minHeight: '72px' }} />;

              const dayHolidays = getHolidaysForDate(dateStr);
              const dayEvents = getEventsForDate(dateStr);
              const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();
              const hasNatHol = dayHolidays.some(h => h.type === 'National');
              const hasBankHol = dayHolidays.some(h => h.type === 'Bank');

              let cellBg = 'rgba(255,255,255,0.02)';
              let borderCol = 'var(--border-glass)';
              if (isToday) borderCol = 'var(--brand-blue)';
              else if (hasNatHol) { cellBg = 'rgba(22,163,74,0.06)'; borderCol = 'rgba(22,163,74,0.2)'; }
              else if (hasBankHol) { cellBg = 'rgba(59,130,246,0.06)'; borderCol = 'rgba(59,130,246,0.2)'; }
              else if (dayEvents.length > 0) { cellBg = 'rgba(236,72,153,0.06)'; borderCol = 'rgba(236,72,153,0.2)'; }

              return (
                <div
                  key={`day-${dayNum}`}
                  style={{ background: cellBg, border: `1.5px solid ${borderCol}`, borderRadius: '9px', padding: '5px', minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  title={[
                    ...dayHolidays.map(h => `[${h.type}] ${h.name}`),
                    ...dayEvents.map(e => `[Event] ${e.title}`)
                  ].join('\n')}
                >
                  <span style={{ fontSize: '13px', fontWeight: '700', color: isToday ? 'var(--brand-blue)' : 'var(--text-primary)' }}>{dayNum}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayHolidays.map((h, i) => (
                      <div key={i} style={{ fontSize: '8px', fontWeight: '800', padding: '1px 3px', borderRadius: '3px', background: h.type === 'National' ? 'rgba(22,163,74,0.15)' : 'rgba(59,130,246,0.15)', color: h.type === 'National' ? '#16a34a' : '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.name}
                      </div>
                    ))}
                    {dayEvents.map((e, i) => {
                      const badgeColor = getBadgeColor(e);
                      return (
                        <div key={i} style={{ fontSize: '8px', fontWeight: '800', padding: '1px 3px', borderRadius: '3px', background: `${badgeColor}20`, color: badgeColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', fontSize: '11px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            {[['#16a34a', 'National Holiday'], ['#3b82f6', 'Bank Holiday'], ['#ec4899', 'Upcoming Event'], ['#f59e0b', 'Pending Event']].map(([col, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: `${col}30`, border: `1px solid ${col}` }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT: Categorized Agenda */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} style={{ color: '#ec4899' }} /> Events Agenda
          </h3>

          {/* Category tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '16px', gap: '12px' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveAgendaTab(tab.key)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: currentTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                  color: currentTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: '700', padding: '6px 2px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                {tab.label}
                <span style={{ background: tab.bg, color: tab.color, borderRadius: '10px', padding: '0px 7px', fontSize: '11px', fontWeight: '800' }}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div style={{ maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
            {visibleEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                No {currentTab} events.
              </div>
            ) : (
              visibleEvents.map(ev => {
                const dateObj = new Date(ev.start_time);
                const day = dateObj.getDate();
                const monthStr = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const badgeColor = getBadgeColor(ev);
                return (
                  <div key={ev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ background: `${badgeColor}18`, color: badgeColor, borderRadius: '9px', padding: '6px', minWidth: '50px', textAlign: 'center', border: `1px solid ${badgeColor}30` }}>
                      <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px' }}>{monthStr}</div>
                      <div style={{ fontSize: '19px', fontWeight: '900', lineHeight: '1.2' }}>{day}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{ev.title}</div>
                      {ev.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: '1.4' }}>{ev.description}</p>}
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {timeStr}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={10} /> {ev.location || 'HQ / Virtual'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700', color: badgeColor }}><Users size={10} /> {ev.attendees?.length || 0} invited</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
