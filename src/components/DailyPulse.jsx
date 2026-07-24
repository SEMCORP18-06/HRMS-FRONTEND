import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { Quote, Send, Plus, Calendar, User, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Search, Mail } from 'lucide-react';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DailyPulse() {
  const [schedule, setSchedule] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPulse, setSelectedPulse] = useState(null);
  const [recipientQuery, setRecipientQuery] = useState('');

  // Quote Library State
  const [quoteLibrary, setQuoteLibrary] = useState([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchSchedule();
    fetchQuoteLibrary();
  }, []);

  const fetchQuoteLibrary = async () => {
    try {
      const data = await api.dailyPulse.quotes();
      setQuoteLibrary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch quote library:", err);
    }
  };

  const handleAddQuote = async (e) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;
    try {
      await api.dailyPulse.createQuote(newQuoteText.trim(), newQuoteAuthor.trim() || 'Unknown');
      setNewQuoteText('');
      setNewQuoteAuthor('');
      setShowAddModal(false);
      setStatus('Custom quote added successfully to library!');
      setTimeout(() => setStatus(''), 4000);
      fetchQuoteLibrary();
    } catch (err) {
      setStatus(`Failed to add quote: ${err.message}`);
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.dailyPulse.schedule();
      setSchedule(data);
      
      // Auto-select today's pulse if it exists
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPulse = data.find(p => p.date === todayStr);
      if (todayPulse) {
        setSelectedPulse(todayPulse);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDailyPulse = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Dispatch Daily Pulse Broadcast',
      message: 'Are you sure you want to manually trigger and broadcast today\'s motivational pulse email to all active corporate channels?',
      confirmText: 'Dispatch Daily Pulse',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        try {
          setStatus('Dispatching Daily Pulse quotes to active corporate channels...');
          const response = await api.dailyPulse.trigger();
          setStatus(response.message || 'Daily Pulse dispatched successfully!');
          setTimeout(() => setStatus(''), 4000);
          fetchSchedule();
        } catch (err) {
          setStatus(`Trigger failed: ${err.message}`);
        }
      },
      onCancel: closeConfirm
    });
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday

  const handlePrevMonth = () => {
    setSelectedPulse(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedPulse(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPulseForDay = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return schedule.find(p => p.date === dateStr);
  };

  // Calendar days grid list
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Filtered schedules for currently navigated month
  const viewedMonthSchedules = schedule.filter(p => {
    const pDate = new Date(p.date);
    return pDate.getFullYear() === year && pDate.getMonth() === month;
  });

  // Filtered recipients in currently selected pulse
  const filteredRecipients = selectedPulse
    ? selectedPulse.recipients.filter(r => 
        r.name.toLowerCase().includes(recipientQuery.toLowerCase()) || 
        r.email.toLowerCase().includes(recipientQuery.toLowerCase())
      )
    : [];

  return (
    <div className="module-container" style={{ width: '100%', maxWidth: '100%', padding: '20px' }}>
      {/* HEADER SECTION */}
      <div className="module-header" style={{ marginBottom: '30px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#3b82f615', color: '#3b82f6', padding: '12px', borderRadius: '12px' }}>
            <Quote size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '34px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Daily Pulse Scheduler</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '19px', fontWeight: '500', marginTop: '5px' }}>
              Automated motivational calendar engagement and corporate broadcasts.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="back-btn" onClick={() => setShowLibraryModal(true)} style={{ padding: '12px 20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Quote size={18} style={{ color: 'var(--brand-blue)' }} /> Library ({quoteLibrary.length} Quotes)
          </button>
          <button className="back-btn" onClick={() => setShowAddModal(true)} style={{ padding: '12px 20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Plus size={18} style={{ color: '#10b981' }} /> Add Quote
          </button>
          <button className="btn-primary" onClick={handleTriggerDailyPulse} style={{ padding: '12px 24px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} /> Trigger Dispatch Now
          </button>
        </div>
      </div>

      {status && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '16px 20px', borderRadius: '12px', marginBottom: '25px', fontSize: '18px', fontWeight: '500' }}>
          {status}
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>
        
        {/* LEFT COLUMN: Calendar & Quote Management (7 Columns) */}
        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Calendar Widget Card */}
          <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} style={{ color: 'var(--brand-blue)' }} />
                {monthNames[month]} {year}
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-action" onClick={handlePrevMonth} style={{ padding: '8px' }}>
                  <ChevronLeft size={20} />
                </button>
                <button className="btn-action" onClick={handleNextMonth} style={{ padding: '8px' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '17px' }}>
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>

            {/* Calendar Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
              {calendarDays.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} style={{ height: '75px' }}></div>;
                }

                const pulse = getPulseForDay(dayNum);
                const isSelected = selectedPulse && selectedPulse.date === `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                return (
                  <div 
                    key={`day-${dayNum}`}
                    onClick={() => pulse && setSelectedPulse(pulse)}
                    style={{
                      height: '75px',
                      background: isSelected 
                        ? 'rgba(59, 130, 246, 0.2)' 
                        : (pulse ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.01)'),
                      border: isSelected
                        ? '2px solid var(--brand-blue)'
                        : (pulse ? '1px dashed rgba(99, 102, 241, 0.4)' : '1px solid var(--border-glass)'),
                      borderRadius: '12px',
                      padding: '8px',
                      cursor: pulse ? 'pointer' : 'default',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: pulse ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)' 
                    }}>
                      {dayNum}
                    </span>

                    {pulse && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: pulse.status === 'Delivered' ? '#10b981' : '#818cf8' 
                        }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                          {pulse.time}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Details & Recipient Manifest (5 Columns) */}
        <div style={{ gridColumn: 'span 5' }}>
          
          {selectedPulse ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Daily Pulse Detail Card */}
              <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>
                    Pulse Details
                  </h3>
                  <div style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '15px', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: selectedPulse.status === 'Delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: selectedPulse.status === 'Delivered' ? '#10b981' : '#818cf8',
                    border: `1px solid ${selectedPulse.status === 'Delivered' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
                  }}>
                    {selectedPulse.status === 'Delivered' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {selectedPulse.status}
                  </div>
                </div>

                {/* Quote details block */}
                <div style={{ position: 'relative', background: 'rgba(0,0,0,0.15)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
                  <span style={{ position: 'absolute', top: '10px', left: '15px', fontSize: '60px', color: 'rgba(255,255,255,0.05)', fontFamily: 'serif', lineHeight: 1 }}>“</span>
                  <p style={{ fontSize: '20px', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0, position: 'relative', zIndex: 1 }}>
                    {selectedPulse.quote}
                  </p>
                  <p style={{ textAlign: 'right', fontSize: '17px', color: 'var(--brand-blue)', fontWeight: 'bold', margin: '15px 0 0 0', position: 'relative', zIndex: 1 }}>
                    — {selectedPulse.author}
                  </p>
                </div>

                {/* Meta details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '18px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Scheduled Date:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedPulse.date}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Broadcast Time:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedPulse.time} AM local</strong>
                  </div>
                  {selectedPulse.delivered_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Delivered Time:</span>
                      <strong style={{ color: '#10b981' }}>
                        {new Date(selectedPulse.delivered_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Manifest Card */}
              <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '22px', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={20} style={{ color: 'var(--brand-blue)' }} />
                    Recipient Manifest
                  </span>
                  <span style={{ fontSize: '16px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>
                    {selectedPulse.recipients.length} Employees
                  </span>
                </h3>

                {/* Recipient manifest search */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.3)' }} />
                  <input 
                    type="text" 
                    placeholder="Search recipients by name or email..."
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '10px 12px 10px 40px',
                      fontSize: '17px'
                    }}
                  />
                </div>

                {/* Recipient list grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                  {filteredRecipients.length === 0 ? (
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '17px' }}>
                      No matching recipients found.
                    </div>
                  ) : (
                    filteredRecipients.map((recipient, index) => (
                      <div 
                        key={`recipient-${index}`} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 15px', 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--border-glass)', 
                          borderRadius: '10px' 
                        }}
                      >
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '17px' }}>
                          {recipient.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Mail size={14} />
                          {recipient.email}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                
                <div style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.4' }}>
                  💡 <strong>Real-time Sync Info:</strong> This manifest updates instantly when employees are hired, updated, or archived in the Directory database.
                </div>
              </div>

            </div>
          ) : (
            /* Monthly overview summary when no day is selected */
            <div className="card-item" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={24} style={{ color: 'var(--brand-blue)' }} />
                Schedules for {monthNames[month]} {year}
              </h3>
              
              {loading ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '19px' }}>Loading schedule manifest...</p>
              ) : viewedMonthSchedules.length === 0 ? (
                <div style={{ padding: '30px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b', fontSize: '18px' }}>
                  No Daily Pulse scheduled for this month.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {viewedMonthSchedules.map((pulse) => (
                    <div 
                      key={pulse.id}
                      onClick={() => setSelectedPulse(pulse)}
                      style={{
                        padding: '20px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderLeft: `5px solid ${pulse.status === 'Delivered' ? '#10b981' : '#818cf8'}`
                      }}
                      className="hover-trigger"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '17px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {new Date(pulse.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </strong>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: pulse.status === 'Delivered' ? '#10b981' : '#818cf8' 
                        }}>
                          {pulse.status}
                        </span>
                      </div>
                      <p style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--text-secondary)', margin: '5px 0' }}>
                        "{pulse.quote}"
                      </p>
                      <p style={{ textAlign: 'right', fontSize: '14px', color: 'var(--brand-blue)', fontWeight: 'bold', margin: 0 }}>
                        — {pulse.author}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      {/* ADD QUOTE MODAL */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content-popup" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} style={{ color: '#10b981' }} /> Add Custom Quote to Library
              </h3>
              <button onClick={() => setShowAddModal(false)} className="back-btn" style={{ padding: '4px 10px', fontSize: '13px' }}>✕</button>
            </div>

            <form onSubmit={handleAddQuote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>Quote Text</label>
                <textarea 
                  rows={4} 
                  required
                  placeholder="Enter inspiring quote text..."
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '15px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>Author / Speaker</label>
                <input 
                  type="text"
                  placeholder="e.g. Steve Jobs, Winston Churchill, Anonymous"
                  value={newQuoteAuthor}
                  onChange={(e) => setNewQuoteAuthor(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '15px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="back-btn" style={{ padding: '10px 20px', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold' }}>
                  Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROWSE QUOTE LIBRARY MODAL */}
      {showLibraryModal && (
        <div className="modal-backdrop">
          <div className="modal-content-popup" style={{ maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Quote size={22} style={{ color: 'var(--brand-blue)' }} /> Quote Library ({quoteLibrary.length} Quotes)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
                  Curated motivational, leadership, and workplace inspiration quotes available for Daily Pulse broadcasts.
                </p>
              </div>
              <button onClick={() => setShowLibraryModal(false)} className="back-btn" style={{ padding: '4px 10px', fontSize: '13px' }}>✕</button>
            </div>

            {/* Library Search Bar */}
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="text" 
                placeholder="Search quotes by author or text..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  padding: '10px 12px 10px 40px',
                  fontSize: '15px'
                }}
              />
            </div>

            {/* Quotes List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
              {quoteLibrary
                .filter(q => 
                  q.text.toLowerCase().includes(librarySearchQuery.toLowerCase()) || 
                  (q.author && q.author.toLowerCase().includes(librarySearchQuery.toLowerCase()))
                )
                .map((q, idx) => (
                  <div key={`lib-q-${idx}`} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '15px', margin: 0, lineHeight: '1.5' }}>
                      "{q.text}"
                    </p>
                    <span style={{ textAlign: 'right', color: 'var(--brand-blue)', fontWeight: 'bold', fontSize: '13px' }}>
                      — {q.author || 'Unknown'}
                    </span>
                  </div>
                ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing {quoteLibrary.filter(q => q.text.toLowerCase().includes(librarySearchQuery.toLowerCase()) || (q.author && q.author.toLowerCase().includes(librarySearchQuery.toLowerCase()))).length} of {quoteLibrary.length} quotes
              </span>
              <button onClick={() => setShowLibraryModal(false)} className="back-btn" style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '14px' }}>
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
