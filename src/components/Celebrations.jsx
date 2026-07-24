import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { Gift, Send, Calendar, ChevronLeft, ChevronRight, User, Mail, Briefcase, Award, CheckCircle, Info } from 'lucide-react';

const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function Celebrations() {
  const [allCelebrations, setAllCelebrations] = useState([]);
  const [matches, setMatches] = useState({ birthdays: [], anniversaries: [] });
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState('');
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // day number

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

  useEffect(() => {
    fetchMatches();
    fetchAllCelebrations();
  }, []);

  const fetchMatches = async () => {
    try {
      const data = await api.celebrations.match();
      setMatches(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllCelebrations = async () => {
    setLoading(true);
    try {
      const data = await api.celebrations.listAll();
      setAllCelebrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCelebration = (employeeId, type, empName = 'Employee') => {
    setConfirmConfig({
      isOpen: true,
      title: `Send ${type} Greetings`,
      message: `Are you sure you want to send official ${type.toLowerCase()} wishes to ${empName}? This will email greetings and broadcast to colleagues.`,
      confirmText: 'Send Greetings',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        try {
          setActionStatus(`Sending ${type} greetings...`);
          await api.celebrations.send(employeeId, type);
          setActionStatus(`Greetings sent successfully!`);
          setTimeout(() => setActionStatus(''), 3000);
          fetchMatches();
        } catch (err) {
          setActionStatus(`Failed to send: ${err.message}`);
        }
      },
      onCancel: closeConfirm
    });
  };
  
  const getOrdinal = (n) => {
    if (n <= 0) return '';
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter celebrations for currently viewed month
  const getCelebrationsForDay = (dayNum) => {
    // MongoDB month is 1-indexed (1-12)
    return allCelebrations.filter(c => c.month === (month + 1) && c.day === dayNum);
  };

  // Compute this month and next month name and celebrations relative to navigated calendar date
  const systemDate = new Date();
  const systemMonth = systemDate.getMonth();
  const systemYear = systemDate.getFullYear();
  const currentDayNum = systemDate.getDate();

  const thisMonthIndex = month;
  const thisMonthName = monthNames[thisMonthIndex];
  
  const nextMonthIndex = (month + 1) % 12;
  const nextMonthName = monthNames[nextMonthIndex];

  const isCurrentMonth = (year === systemYear && thisMonthIndex === systemMonth);
  const isFutureMonth = (year > systemYear) || (year === systemYear && thisMonthIndex > systemMonth);

  const upcomingThisMonth = allCelebrations
    .filter(c => {
      if (c.month !== (thisMonthIndex + 1)) return false;
      if (isCurrentMonth) {
        return c.day >= currentDayNum;
      }
      return isFutureMonth;
    })
    .sort((a, b) => a.day - b.day);

  // For next month, if nextMonthIndex wraps around, year might shift
  const nextMonthYear = nextMonthIndex === 0 ? year + 1 : year;
  const isNextMonthCurrent = (nextMonthYear === systemYear && nextMonthIndex === systemMonth);
  const isNextMonthFuture = (nextMonthYear > systemYear) || (nextMonthYear === systemYear && nextMonthIndex > systemMonth);

  const upcomingNextMonth = allCelebrations
    .filter(c => {
      if (c.month !== (nextMonthIndex + 1)) return false;
      if (isNextMonthCurrent) {
        return c.day >= currentDayNum;
      }
      return isNextMonthFuture;
    })
    .sort((a, b) => a.day - b.day);

  // Calendar days grid list
  const calendarDays = [];
  // Empty slots for days before the 1st of the month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Selected Day Celebrations Details
  const selectedDayCelebrations = selectedDay ? getCelebrationsForDay(selectedDay) : [];

  return (
    <div className="module-container" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="module-header" style={{ marginBottom: '30px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#f43f5e15', color: '#f43f5e', padding: '12px', borderRadius: '12px' }}>
            <Gift size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '34px', fontWeight: 'bold' }}>Celebrations Automation Scheduler</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '19px', marginTop: '4px' }}>
              Autoschedule corporate birthday and work anniversary greetings
            </p>
          </div>
        </div>
      </div>

      {actionStatus && (
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '15px', borderRadius: '10px', marginBottom: '25px', fontSize: '19px', fontWeight: 'bold' }}>
          {actionStatus}
        </div>
      )}

      <div className="grid-2" style={{ gap: '30px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Calendar & Day Detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Calendar Card */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} style={{ color: 'var(--brand-blue)' }} />
                {monthNames[month]} {year}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePrevMonth} className="btn-action" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={handleNextMonth} className="btn-action" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Week Days Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '19px', color: 'var(--text-muted)', marginBottom: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center' }}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ padding: '15px' }} />;
                }

                const dayCelebs = getCelebrationsForDay(day);
                const hasBirthday = dayCelebs.some(c => c.type === 'BIRTHDAY');
                const hasAnniversary = dayCelebs.some(c => c.type === 'ANNIVERSARY');
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: isSelected 
                        ? 'var(--brand-blue)' 
                        : (dayCelebs.length > 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent'),
                      border: isSelected 
                        ? '1px solid var(--brand-blue)' 
                        : (dayCelebs.length > 0 ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'),
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      position: 'relative',
                      fontSize: '19px',
                      fontWeight: dayCelebs.length > 0 ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = dayCelebs.length > 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent';
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    <div>{day}</div>
                    
                    {/* Dots indicators */}
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '4px' }}>
                      {hasBirthday && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? '#ffffff' : '#f43f5e', display: 'inline-block' }} />
                      )}
                      {hasAnniversary && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? '#ffffff' : '#10b981', display: 'inline-block' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '15px' }}>
              {selectedDay 
                ? `Celebrations on ${monthNames[month]} ${selectedDay}, ${year}` 
                : `Select a highlighted calendar day to see employee details`}
            </h3>

            {!selectedDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '19px', padding: '15px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
                  <Info size={20} style={{ color: 'var(--brand-blue)' }} />
                  <span>Select a highlighted day with dots to see specific employee details, or view the current month's overview below.</span>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '15px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                    {monthNames[month]} Overview
                  </h4>
                  {allCelebrations.filter(c => c.month === (month + 1)).length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '19px' }}>No celebrations scheduled for this month.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                      {allCelebrations.filter(c => c.month === (month + 1)).map((celeb, idx) => (
                        <div 
                          key={`summary-${celeb.id}-${idx}`}
                          style={{
                            padding: '12px 15px',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981'}`,
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: '19px', fontWeight: 'bold' }}>{celeb.name}</span>
                          <span style={{ fontSize: '17px', color: 'var(--text-muted)' }}>
                            {celeb.type === 'BIRTHDAY' ? '🎂 Birthday' : '🌟 Anniversary'} ({celeb.date_str})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedDayCelebrations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '19px' }}>No celebrations scheduled for this date.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {selectedDayCelebrations.map((celeb, idx) => {
                  const eventYear = celeb.date_str ? new Date(celeb.date_str).getFullYear() : new Date().getFullYear();
                  const years = new Date().getFullYear() - eventYear;
                  const eventSummary = celeb.type === 'BIRTHDAY'
                    ? `${celeb.name}'s Birthday`
                    : `${celeb.name}'s ${years > 0 ? getOrdinal(years) : ''} Work Anniversary`;

                  return (
                    <div 
                      key={`${celeb.id}-${idx}`}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        borderLeft: `5px solid ${celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981'}`,
                        background: 'rgba(255, 255, 255, 0.01)',
                        borderTop: '1px solid var(--border-glass)',
                        borderRight: '1px solid var(--border-glass)',
                        borderBottom: '1px solid var(--border-glass)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ 
                          fontWeight: 'bold', 
                          fontSize: '20px', 
                          color: celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981',
                          background: celeb.type === 'BIRTHDAY' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px'
                        }}>
                          {eventSummary}
                        </span>
                        <span style={{ fontSize: '19px', color: 'var(--text-muted)' }}>Date: {celeb.date_str}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '19px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={18} style={{ color: 'var(--text-muted)' }} />
                          <strong>Name:</strong> {celeb.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Briefcase size={18} style={{ color: 'var(--text-muted)' }} />
                          <strong>Dept:</strong> {celeb.department || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>blank</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={18} style={{ color: 'var(--text-muted)' }} />
                          <strong>Post:</strong> {celeb.designation || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>blank</span>}
                        </div>
                      </div>

                      {/* Contact Buttons */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        {celeb.email && celeb.email !== '' && (
                          <a 
                            href={`mailto:${celeb.email}`}
                            className="btn-primary"
                            style={{ 
                              textDecoration: 'none', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '16px', 
                              padding: '8px 16px',
                              background: 'var(--brand-blue)',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontWeight: 'bold'
                            }}
                          >
                            <Mail size={16} /> Company Email
                          </a>
                        )}
                        {celeb.personal_email && celeb.personal_email !== '' && (
                          <a 
                            href={`mailto:${celeb.personal_email}`}
                            className="btn-action"
                            style={{ 
                              textDecoration: 'none', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '16px', 
                              padding: '8px 16px', 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--border-glass)', 
                              color: 'var(--text-primary)',
                              borderRadius: '6px',
                              fontWeight: 'bold'
                            }}
                          >
                            <Mail size={16} /> Personal Email
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upcoming This & Next Month */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Upcoming This Month Panel */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gift size={24} style={{ color: 'var(--brand-blue)' }} />
              Upcoming in {thisMonthName} (This Month)
            </h3>

            {loading ? (
              <p style={{ fontSize: '19px', color: 'var(--text-secondary)' }}>Loading upcoming celebrations...</p>
            ) : upcomingThisMonth.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b', fontSize: '19px' }}>
                No celebrations scheduled for the rest of this month.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                {upcomingThisMonth.map((celeb, idx) => (
                  <div 
                    key={`upcoming-this-${celeb.id}-${idx}`}
                    style={{
                      padding: '15px 20px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      borderLeft: `5px solid ${celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981'}`,
                      fontSize: '18px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <strong style={{ color: 'var(--brand-blue)' }}>{celeb.day} {thisMonthName}</strong>
                    &nbsp;&nbsp;—&nbsp;&nbsp;
                    <strong>{celeb.name}</strong>
                    &nbsp;&nbsp;—&nbsp;&nbsp;
                    <span style={{ color: celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981', fontWeight: 'bold' }}>
                      {celeb.type === 'BIRTHDAY' ? 'Birthday' : 'Work Anniversary'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Next Month Panel */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gift size={24} style={{ color: '#f43f5e' }} />
              Upcoming in {nextMonthName} (Next Month)
            </h3>

            {loading ? (
              <p style={{ fontSize: '19px', color: 'var(--text-secondary)' }}>Loading upcoming celebrations...</p>
            ) : upcomingNextMonth.length === 0 ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b', fontSize: '19px' }}>
                No celebrations scheduled for next month.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
                {upcomingNextMonth.map((celeb, idx) => (
                  <div 
                    key={`upcoming-${celeb.id}-${idx}`}
                    style={{
                      padding: '15px 20px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-glass)',
                      borderLeft: `5px solid ${celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981'}`,
                      fontSize: '18px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <strong style={{ color: 'var(--brand-blue)' }}>{celeb.day} {nextMonthName}</strong>
                    &nbsp;&nbsp;—&nbsp;&nbsp;
                    <strong>{celeb.name}</strong>
                    &nbsp;&nbsp;—&nbsp;&nbsp;
                    <span style={{ color: celeb.type === 'BIRTHDAY' ? '#f43f5e' : '#10b981', fontWeight: 'bold' }}>
                      {celeb.type === 'BIRTHDAY' ? 'Birthday' : 'Work Anniversary'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Manual Dispatches Table */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎂 Celebrations Today (Manual Dispatch)
            </h3>
            
            {(!matches.birthdays || matches.birthdays.length === 0) && (!matches.anniversaries || matches.anniversaries.length === 0) ? (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b', fontSize: '19px' }}>
                No celebrations today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Birthdays today list */}
                {matches.birthdays && matches.birthdays.length > 0 && (
                  <div>
                    <h4 style={{ color: '#f43f5e', fontSize: '19px', marginBottom: '8px' }}>Birthdays:</h4>
                    {matches.birthdays.map(emp => (
                      <div key={`bday-today-${emp.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '5px' }}>
                        <span style={{ fontSize: '19px' }}>{emp.name} ({emp.email})</span>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '15px', background: '#f43f5e', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleSendCelebration(emp.id, 'BIRTHDAY')}>
                          <Send size={14} /> Send
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Anniversaries today list */}
                {matches.anniversaries && matches.anniversaries.length > 0 && (
                  <div>
                    <h4 style={{ color: '#10b981', fontSize: '19px', marginBottom: '8px' }}>Work Anniversaries:</h4>
                    {matches.anniversaries.map(emp => (
                      <div key={`anniv-today-${emp.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '5px' }}>
                        <span style={{ fontSize: '19px' }}>{emp.name} ({emp.email})</span>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '15px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleSendCelebration(emp.id, 'ANNIVERSARY')}>
                          <Send size={14} /> Send
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scheduler status info */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px', marginTop: '30px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '19px', color: 'var(--text-primary)' }}>
          <CheckCircle size={18} style={{ color: '#10b981' }} />
          Background Automation Status
        </h4>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          The celebrations scheduler is active. Every day at 10:30 AM, the background daemon checks the active employee roster, identifies all birthday and work anniversary matches, and automatically dispatches individual email wishes, as well as broadcasts to all other active colleagues (excluding the celebrant) with department and designation details, from the HR mailbox (<strong style={{ color: 'var(--brand-blue)' }}>enquiry@semcogroups.com</strong>).
        </p>
      </div>
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
