import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { MessageSquare, BarChart2 } from 'lucide-react';

export default function PulseSurveys() {
  const [metrics, setMetrics] = useState({ burnout_avg: 0, alignment_avg: 0, satisfaction_avg: 0, count: 0 });
  const [q1, setQ1] = useState(3);
  const [q2, setQ2] = useState(3);
  const [q3, setQ3] = useState(3);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await api.surveys.metrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitSurvey = async (e) => {
    e.preventDefault();
    try {
      await api.surveys.submit({ q1_burnout: q1, q2_alignment: q2, q3_satisfaction: q3 });
      setStatus('Pulse feedback submitted successfully! Thank you.');
      setTimeout(() => setStatus(''), 3000);
      setQ1(3);
      setQ2(3);
      setQ3(3);
      fetchMetrics();
    } catch (err) {
      setStatus(`Submission failed: ${err.message}`);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#84cc1615', color: '#84cc16' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h2>Pulse Surveys & Employee Sentiment</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Monitor alignment, burnout levels, and overall employee satisfaction.</p>
          </div>
        </div>
      </div>

      {status && (
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {status}
        </div>
      )}

      {/* Metrics overview */}
      <div className="survey-grid">
        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#94a3b8' }}>
            Burnout Level
          </div>
          <div className="metric-val" style={{ color: '#ef4444' }}>{metrics.burnout_avg} / 5</div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Lower is healthier balance</p>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#94a3b8' }}>
            Strategic Alignment
          </div>
          <div className="metric-val" style={{ color: '#3b82f6' }}>{metrics.alignment_avg} / 5</div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Understanding of organization targets</p>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#94a3b8' }}>
            Job Satisfaction
          </div>
          <div className="metric-val" style={{ color: '#10b981' }}>{metrics.satisfaction_avg} / 5</div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Overall happiness index</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Submit survey form */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px' }}>
          <h3 style={{ marginBottom: '15px' }}>Submit Monthly Pulse Feedback</h3>
          <form onSubmit={handleSubmitSurvey}>
            <div className="form-group">
              <label>1. Rate your current workload burnout (1 = Low, 5 = Severe)</label>
              <select value={q1} onChange={(e) => setQ1(parseInt(e.target.value))}>
                <option value={1}>1 - Calm & Balanced</option>
                <option value={2}>2 - Healthy</option>
                <option value={3}>3 - Manageable but busy</option>
                <option value={4}>4 - Elevated Fatigue</option>
                <option value={5}>5 - High Burnout / Exhausted</option>
              </select>
            </div>

            <div className="form-group">
              <label>2. Are you aligned with company objectives? (1 = Lost, 5 = Fully Clear)</label>
              <select value={q2} onChange={(e) => setQ2(parseInt(e.target.value))}>
                <option value={1}>1 - No clarity</option>
                <option value={2}>2 - Weak alignment</option>
                <option value={3}>3 - Somewhat aligned</option>
                <option value={4}>4 - Mostly clear</option>
                <option value={5}>5 - Fully clear and dedicated</option>
              </select>
            </div>

            <div className="form-group">
              <label>3. Rate your overall job satisfaction (1 = Unhappy, 5 = Very Happy)</label>
              <select value={q3} onChange={(e) => setQ3(parseInt(e.target.value))}>
                <option value={1}>1 - Very unhappy</option>
                <option value={2}>2 - Discontent</option>
                <option value={3}>3 - Neutral</option>
                <option value={4}>4 - Satisfied</option>
                <option value={5}>5 - Extremely happy / Excited</option>
              </select>
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Submit Anonymous Response
            </button>
          </form>
        </div>

        {/* Dashboard insights */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <BarChart2 size={18} style={{ color: '#84cc16' }} />
            Sentiment Insights ({metrics.count} Responses)
          </h4>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '12px' }}>
            Pulse Surveys are completely anonymous. An automated scheduler emails employees on the 1st of every month to capture sentiment.
          </p>
          <div style={{ padding: '15px', background: 'rgba(9, 13, 22, 0.4)', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '12px', color: '#94a3b8' }}>
            <strong>💡 HR Recommendations:</strong><br />
            {metrics.burnout_avg >= 4.0 ? (
              <span style={{ color: '#ef4444' }}>⚠️ Burnout indices are highly elevated. HR recommends introducing mental health breaks and project reassessment.</span>
            ) : metrics.satisfaction_avg <= 2.5 ? (
              <span style={{ color: '#f59e0b' }}>⚠️ Satisfaction is low. Coordinate team engagement syncs and review compensation benchmarks.</span>
            ) : (
              <span style={{ color: '#10b981' }}>✅ Employee sentiment metrics are currently within healthy, stable operational ranges. Keep it up!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
