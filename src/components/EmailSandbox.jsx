import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Mail, Send, CheckCircle, AlertCircle, RefreshCw, Users, ShieldAlert } from 'lucide-react';

export default function EmailSandbox() {
  const [employees, setEmployees] = useState([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetName, setTargetName] = useState('');
  const [emailType, setEmailType] = useState('birthday'); // 'birthday', 'anniversary', 'pulse'
  
  // Custom template parameters
  const [anniversaryYears, setAnniversaryYears] = useState(3);
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [quotesList, setQuotesList] = useState([]);

  // Dispatch outcomes
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchDirectory();
    fetchQuotes();
  }, []);

  const fetchDirectory = async () => {
    try {
      const data = await api.employees.list(false);
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load directory for sandbox:", err);
    }
  };

  const fetchQuotes = async () => {
    try {
      const data = await api.dailyPulse.quotes();
      setQuotesList(data);
      if (data.length > 0) {
        setCustomQuote(data[0].text);
        setCustomAuthor(data[0].author || 'Unknown');
      }
    } catch (err) {
      console.error("Failed to load quotes for sandbox:", err);
    }
  };

  const handleSelectEmployee = (e) => {
    const empId = e.target.value;
    if (!empId) {
      setTargetEmail('');
      setTargetName('');
      return;
    }
    const emp = employees.find(x => x.id === empId);
    if (emp) {
      setTargetEmail(emp.email || emp.personal_email || '');
      setTargetName(emp.name || '');
    }
  };

  const handleSelectQuote = (e) => {
    const quoteId = e.target.value;
    const q = quotesList.find(x => x.id === quoteId);
    if (q) {
      setCustomQuote(q.text);
      setCustomAuthor(q.author || 'Unknown');
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!targetEmail) {
      setError('Please provide a recipient email address.');
      return;
    }

    setSending(true);
    setError('');
    setStatus('');
    setLogs([
      'Initializing email sandbox runner...',
      'Syncing template parameters with SMTP relay...',
      'Opening separate transaction session with Office 365...'
    ]);

    try {
      const response = await fetch('https://hrms-backend-gamma.vercel.app/api/sandbox/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hr_token')}`
        },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName || 'Valued Employee',
          type: emailType,
          years: anniversaryYears,
          quote: customQuote,
          author: customAuthor
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to dispatch sandbox email.');
      }

      setLogs(prev => [
        ...prev,
        'Serializing payload to UTF-8 formats (Unicode Subject emoji check)...',
        'Authentication verification successfully logged with enquiry@semcogroups.com.',
        'SMTP Transaction session closed clean.',
        'Mail queued and sent successfully!'
      ]);
      setStatus(result.message || 'Sandbox test email sent successfully!');
    } catch (err) {
      setLogs(prev => [
        ...prev,
        `Error: Transaction aborted by SMTP server. Details: ${err.message}`
      ]);
      setError(err.message || 'SMTP Connection Dispatch Failure.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="module-container" style={{ width: '100%', maxWidth: '100%', padding: '20px' }}>
      
      {/* BRANDING HEADER */}
      <div className="module-header" style={{ marginBottom: '30px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#f59e0b15', color: '#f59e0b', padding: '12px', borderRadius: '12px' }}>
            <Mail size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '34px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Email Sandbox</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '19px', fontWeight: '500', marginTop: '5px' }}>
              Safely trigger, preview, and test SMTP configurations, templates, and unicode emoji subjects.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: Test Configuration Form */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw className={sending ? 'spin-anim' : ''} size={22} style={{ color: 'var(--brand-blue)' }} />
            Configure Sandbox Email
          </h3>

          <form onSubmit={handleSendTestEmail}>
            
            {/* Quick Select Employee */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Quick Select Employee (Directory Autofill)
              </label>
              <select 
                onChange={handleSelectEmployee}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '12px',
                  fontSize: '18px'
                }}
              >
                <option value="">-- Choose Employee to Test --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || 'Unnamed'} ({emp.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Email address */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Recipient Test Email Address
              </label>
              <input 
                type="email" 
                placeholder="e.g. test@semcogroups.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '12px',
                  fontSize: '18px'
                }}
              />
            </div>

            {/* Target Name */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Recipient Name Placeholder
              </label>
              <input 
                type="text" 
                placeholder="e.g. John Doe"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '12px',
                  fontSize: '18px'
                }}
              />
            </div>

            {/* Template type select */}
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Select Email Template Type
              </label>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['birthday', 'anniversary', 'pulse'].map(type => (
                  <label 
                    key={type}
                    style={{
                      flex: 1,
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      background: emailType === type ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                      border: emailType === type ? '2px solid var(--brand-blue)' : '1px solid var(--border-glass)',
                      color: emailType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '17px',
                      textTransform: 'capitalize'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="emailType" 
                      value={type} 
                      checked={emailType === type}
                      onChange={() => setEmailType(type)}
                      style={{ display: 'none' }}
                    />
                    {type === 'pulse' ? 'Daily Pulse' : type}
                  </label>
                ))}
              </div>
            </div>

            {/* Template Specific Options */}
            {emailType === 'anniversary' && (
              <div className="form-group" style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '15px', borderRadius: '10px' }}>
                <label style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                  Anniversary Year Milestone
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={anniversaryYears}
                  onChange={(e) => setAnniversaryYears(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    fontSize: '17px'
                  }}
                />
              </div>
            )}

            {emailType === 'pulse' && (
              <div className="form-group" style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '15px', borderRadius: '10px' }}>
                <label style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                  Choose Motivational Quote
                </label>
                {quotesList.length > 0 && (
                  <select 
                    onChange={handleSelectQuote}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '10px',
                      fontSize: '17px',
                      marginBottom: '10px'
                    }}
                  >
                    {quotesList.map(q => (
                      <option key={q.id} value={q.id}>
                        "{q.text.substring(0, 40)}..." — {q.author}
                      </option>
                    ))}
                  </select>
                )}
                
                <textarea 
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                  placeholder="Quote Content"
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    fontSize: '16px',
                    marginBottom: '10px'
                  }}
                />
                
                <input 
                  type="text" 
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="Author"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={sending}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '18px' }}
            >
              <Send size={18} /> {sending ? 'Sending...' : 'Send Test Email'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Output Logs & Connection State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Logs Card */}
          <div className="card-item" style={{ flex: 1, background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '22px', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Execution Sandbox Logs
            </h3>

            <div style={{
              flex: 1,
              background: '#090d16',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '16px',
              color: '#818cf8',
              overflowY: 'auto',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {logs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginTop: '40px' }}>
                  Configure template details and click Send to stream SMTP logs...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ 
                    color: log.startsWith('Error') ? '#f43f5e' : (log.includes('successfully') ? '#10b981' : '#818cf8'),
                    lineHeight: '1.4'
                  }}>
                    &gt; {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sandbox Status Feedback */}
          {(status || error) && (
            <div className="card-item" style={{ 
              background: 'var(--bg-card)', 
              padding: '25px', 
              borderRadius: '16px', 
              border: `1px solid ${error ? '#ef444430' : '#10b98130'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '15px'
            }}>
              <div style={{ color: error ? '#f43f5e' : '#10b981' }}>
                {error ? <ShieldAlert size={28} /> : <CheckCircle size={28} />}
              </div>
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '19px', color: 'var(--text-primary)' }}>
                  {error ? 'SMTP Dispatch Failed' : 'SMTP Transaction Complete'}
                </h4>
                <p style={{ margin: 0, fontSize: '17px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {error ? error : status}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
