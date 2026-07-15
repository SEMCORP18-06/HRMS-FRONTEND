import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, BookOpen, Tag, FileText, CheckCircle } from 'lucide-react';

export default function PolicySearch({ user }) {
  const [policies, setPolicies] = useState([]);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [policyFile, setPolicyFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const isAdmin = user?.role === 'Admin (HR)';

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const data = await api.policies.list();
      setPolicies(data);
      // Select first policy by default if list has items and none is selected
      if (data.length > 0 && !selectedPolicyId) {
        setSelectedPolicyId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (!title || !category || !policyFile) return;
    try {
      const formData = new FormData();
      formData.append('category', category.trim());
      formData.append('title', title.trim());
      formData.append('content', '');
      formData.append('file', policyFile);

      const newPolicy = await api.policies.create(formData);
      setTitle('');
      setCategory('');
      setPolicyFile(null);
      const fileInput = document.getElementById('policy-file-input');
      if (fileInput) fileInput.value = '';

      setStatus('Policy added to Knowledge Base successfully!');
      setTimeout(() => setStatus(''), 3000);
      fetchPolicies();
      if (newPolicy && newPolicy.id) {
        setSelectedPolicyId(newPolicy.id);
      }
    } catch (err) {
      setError(`Failed to add policy: ${err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Filter policies based on selected category tab
  const filteredPolicies = policies.filter(p => 
    selectedCategoryFilter === 'All' ? true : p.category === selectedCategoryFilter
  );

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);

  const categories = ['All', ...new Set(policies.map(p => p.category).filter(Boolean))];

  return (
    <div className="module-container" style={{ width: '100%', padding: '20px 30px' }}>
      {/* Module Header */}
      <div className="module-header" style={{ marginBottom: '25px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#6366f115', color: '#6366f1', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-primary)' }}>Centralized Policies Knowledge Base</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Search and browse official company standard operating procedures (SOPs), guidelines, and benefits.</p>
          </div>
        </div>
      </div>

      {status && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} /> {status}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600' }}>
          ⚠️ {error}
        </div>
      )}

      {isAdmin ? (
        // ==================== ADMIN VIEW (2 Columns: Register SOP | Browse/Preview) ====================
        <div className="responsive-grid-admin-policies">
          {/* Left Column: Register SOP Form */}
          <div className="pane-card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '25px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            alignSelf: 'flex-start'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: 'var(--brand-blue)' }} />
              Register New Policy SOP
            </h3>
            
            <form onSubmit={handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Category (Custom Made)</label>
                <input 
                  type="text" 
                  placeholder="e.g. WFH, Safety, Leaves, Code of Conduct" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>SOP Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Work From Home SOP" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Policy Document File (Compulsory)</label>
                <input 
                  id="policy-file-input"
                  type="file" 
                  accept=".pdf, .docx, .doc, .png, .jpg, .jpeg"
                  onChange={(e) => setPolicyFile(e.target.files[0])}
                  required
                  style={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-gradient)', padding: '12px' }}>
                <Plus size={16} /> Publish SOP
              </button>
            </form>
          </div>

          {/* Right Column: Browse & Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    background: selectedCategoryFilter === cat ? 'var(--brand-blue)' : 'rgba(255,255,255,0.03)',
                    color: selectedCategoryFilter === cat ? '#white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '30px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat === 'All' ? '📂 All Policies' : cat}
                </button>
              ))}
            </div>

            {/* List and Details Layout */}
            <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '20px' }}>
              {/* Policies List Horizontal/Grid */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Select Document to View ({filteredPolicies.length})
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredPolicies.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '15px 0' }}>No policy documents registered under this category.</div>
                  ) : (
                    filteredPolicies.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setSelectedPolicyId(p.id)}
                        style={{ 
                          background: selectedPolicyId === p.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)', 
                          border: selectedPolicyId === p.id ? '1.5px solid #6366f1' : '1px solid var(--border-glass)', 
                          padding: '12px 16px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: selectedPolicyId === p.id ? '700' : '500',
                          transition: 'all 0.2s',
                          color: selectedPolicyId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <BookOpen size={14} style={{ color: selectedPolicyId === p.id ? '#6366f1' : '#64748b' }} />
                        <span>{p.title}</span> 
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'rgba(255,255,255,0.04)', 
                          padding: '2px 6px', 
                          borderRadius: '6px',
                          color: 'var(--text-muted)'
                        }}>
                          {p.category}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Policy Content Preview Card */}
              {selectedPolicy ? (
                <div className="pane-card" style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '20px',
                  padding: '25px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  minHeight: '260px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} style={{ color: '#6366f1' }} />
                      {selectedPolicy.title}
                    </h3>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '800',
                      background: 'rgba(99, 102, 241, 0.12)', 
                      color: '#818cf8',
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Tag size={10} /> {selectedPolicy.category}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.6', 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'pre-wrap', 
                    overflowY: 'auto',
                    maxHeight: '240px',
                    paddingRight: '6px'
                  }}>
                    {selectedPolicy.content}
                  </div>

                  {selectedPolicy.file_url && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                      <a 
                        href={`https://hrms-backend-gamma.vercel.app${selectedPolicy.file_url}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'var(--brand-gradient)',
                          color: 'white',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={16} /> View/Download Policy Document
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', border: '1px dashed var(--border-glass)', borderRadius: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Please select a policy from the list above to view details.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ==================== EMPLOYEE VIEW (Clean 2-Pane: Directory List on Left | Content View on Right) ====================
        <div className="responsive-grid-employee-policies">
          {/* Left Column: Filter & Policy List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    background: selectedCategoryFilter === cat ? 'var(--brand-blue)' : 'transparent',
                    color: selectedCategoryFilter === cat ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    flex: '1 1 auto',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat === 'All' ? '📂 All' : cat}
                </button>
              ))}
            </div>

            {/* List of filtered policies */}
            <div className="pane-card" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                Policy Documents ({filteredPolicies.length})
              </h4>
              {filteredPolicies.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '15px 0', textAlign: 'center' }}>No policies registered.</div>
              ) : (
                filteredPolicies.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPolicyId(p.id)}
                    style={{ 
                      background: selectedPolicyId === p.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent', 
                      border: selectedPolicyId === p.id ? '1px solid #6366f1' : '1px solid transparent', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      color: selectedPolicyId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <BookOpen size={14} style={{ color: selectedPolicyId === p.id ? '#6366f1' : '#64748b' }} />
                    <span style={{ fontWeight: selectedPolicyId === p.id ? '700' : '500' }}>{p.title}</span> 
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Full content reader pane */}
          <div>
            {selectedPolicy ? (
              <div className="pane-card" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                borderRadius: '20px',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                minHeight: '380px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '850', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} style={{ color: '#6366f1' }} />
                    {selectedPolicy.title}
                  </h3>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '800',
                    background: 'rgba(99, 102, 241, 0.12)', 
                    color: '#818cf8',
                    padding: '4px 12px', 
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Tag size={10} /> {selectedPolicy.category}
                  </span>
                </div>
                
                <div style={{ 
                  fontSize: '15px', 
                  lineHeight: '1.7', 
                  color: 'var(--text-secondary)', 
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: '320px',
                  paddingRight: '10px'
                }}>
                  {selectedPolicy.content}
                </div>

                {selectedPolicy.file_url && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
                    <a 
                      href={`https://hrms-backend-gamma.vercel.app${selectedPolicy.file_url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--brand-gradient)',
                        color: 'white',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={16} /> View/Download Policy Document
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', border: '1px dashed var(--border-glass)', borderRadius: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Please select a policy from the list on the left to read.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
