import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { Clock, Plus, Link } from 'lucide-react';

export default function InterviewAssistant() {
  const [interviews, setInterviews] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [jdTitle, setJdTitle] = useState('Senior Full Stack Developer');
  const [status, setStatus] = useState('');
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

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const data = await api.interviews.list();
      setInterviews(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!candidateName || !candidateEmail || !interviewTime) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Schedule Interview',
      message: `Are you sure you want to schedule an interview with ${candidateName} (${candidateEmail}) for ${jdTitle}?`,
      confirmText: 'Schedule & Send Invite',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setStatus('Generating meeting room, compiling JD document, and dispatching calendar invite...');
        
        try {
          await api.interviews.create({
            candidate_name: candidateName,
            candidate_email: candidateEmail,
            interview_time: interviewTime,
            jd_title: jdTitle
          });
          
          setCandidateName('');
          setCandidateEmail('');
          setInterviewTime('');
          setStatus('Interview scheduled and invitation dispatched successfully!');
          setTimeout(() => setStatus(''), 4000);
          fetchInterviews();
        } catch (err) {
          setStatus(`Scheduling failed: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#a855f715', color: '#a855f7' }}>
            <Clock size={24} />
          </div>
          <div>
            <h2>Interview Scheduling Assistant</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Schedule recruitment interviews, compile JDs, and coordinate calendar dispatches.</p>
          </div>
        </div>
      </div>

      {status && (
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {status}
        </div>
      )}

      <div className="grid-1-2">
        {/* Schedule form */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px' }}>
          <h3 style={{ marginBottom: '15px' }}>Schedule Interview</h3>
          <form onSubmit={handleSchedule}>
            <div className="form-group">
              <label>Candidate Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. Sarah Connor" 
                value={candidateName} 
                onChange={(e) => setCandidateName(e.target.value)} 
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Candidate Email Address</label>
              <input 
                type="email" 
                placeholder="e.g. sarah@outlook.com" 
                value={candidateEmail} 
                onChange={(e) => setCandidateEmail(e.target.value)} 
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Job Description Title</label>
              <select value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} disabled={loading}>
                <option value="Senior Full Stack Developer">Senior Full Stack Developer</option>
                <option value="Lead UI/UX Designer">Lead UI/UX Designer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Data Scientist">Data Scientist</option>
              </select>
            </div>

            <div className="form-group">
              <label>Interview Date & Time</label>
              <input 
                type="datetime-local" 
                value={interviewTime} 
                onChange={(e) => setInterviewTime(e.target.value)} 
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              <Plus size={16} /> {loading ? 'Scheduling...' : 'Dispatch Interview Invite'}
            </button>
          </form>
        </div>

        {/* Interview Log */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>Scheduled Sessions</h3>
          {interviews.length === 0 ? (
            <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b' }}>
              No recruitment interviews scheduled.
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Role</th>
                    <th>Date & Time</th>
                    <th>Meeting Link</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map(i => {
                    const date = new Date(i.interview_time);
                    return (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: '500' }}>{i.candidate_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{i.candidate_email}</div>
                        </td>
                        <td>{i.jd_title}</td>
                        <td>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#a855f7', textDecoration: 'none', fontSize: '12px' }}>
                            <Link size={12} /> Join Meet
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
        </div>
      </div>
      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
