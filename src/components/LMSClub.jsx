import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import {
  BookOpen, Library, MessageSquare, Upload, Trash2, Eye, X,
  Plus, Users, ChevronDown, ChevronUp, Check, Info, Send,
  FileText, File, Table, AlertCircle, Clock, Link2, ExternalLink, Globe
} from 'lucide-react';

// ─── File type icons ───────────────────────────────────────────────────────────
function FileIcon({ ext, size = 32 }) {
  if (ext === '.pdf') return <FileText size={size} style={{ color: '#ef4444' }} />;
  if (ext === '.xlsx') return <Table size={size} style={{ color: '#10b981' }} />;
  if (ext === '.docx') return <File size={size} style={{ color: '#3b82f6' }} />;
  return <File size={size} style={{ color: '#94a3b8' }} />;
}

// ─── Preview Modal ──────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  if (!file) return null;
  const token = localStorage.getItem('hr_token');
  // Build a raw URL that includes auth token as query param
  const rawUrl = `${window.location.protocol}//${window.location.hostname}:8000/static/uploads/elibrary/${file.filename}?token=${encodeURIComponent(token || '')}`;

  let content;
  if (file.ext === '.pdf') {
    content = (
      <iframe
        src={rawUrl}
        title={file.title}
        style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '10px' }}
      />
    );
  } else if (file.ext === '.xlsx') {
    content = (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Table size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
        <p style={{ fontSize: '15px' }}>Excel files cannot be previewed inline.</p>
        <a
          href={rawUrl}
          download={file.original_name}
          style={{ color: '#10b981', fontWeight: '700', fontSize: '14px' }}
        >
          Download to view
        </a>
      </div>
    );
  } else if (file.ext === '.docx') {
    // Use Google Docs viewer for DOCX (public-accessible) or fallback message
    content = (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <File size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
        <p style={{ fontSize: '15px' }}>Word documents cannot be previewed inline.</p>
        <a
          href={rawUrl}
          download={file.original_name}
          style={{ color: '#3b82f6', fontWeight: '700', fontSize: '14px' }}
        >
          Download to view
        </a>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1.5px solid var(--border-glass)',
        borderRadius: '20px', padding: '24px', width: '90vw', maxWidth: '900px',
        maxHeight: '90vh', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {file.title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Main LMSClub Component ─────────────────────────────────────────────────────
export default function LMSClub({ user }) {
  const isAdmin = user?.role === 'Admin (HR)';
  const myId = user?.id || user?._id || '';

  const [activeTab, setActiveTab] = useState('elibrary');

  // ── E-Library State
  const [elibraryTab, setElibraryTab] = useState('documents'); // 'documents' or 'links'
  const [files, setFiles] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── E-Library Links State
  const [links, setLinks] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');

  // ── Discussions State
  const [threads, setThreads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadBody, setThreadBody] = useState('');
  const [threadVenue, setThreadVenue] = useState('');
  const [invitedIds, setInvitedIds] = useState([]);
  const [expandedDepts, setExpandedDepts] = useState({});

  // ── Shared UI State
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchLinks();
    fetchThreads();
    if (!isAdmin) fetchEmployees();
  }, []);

  const showStatus = (msg) => { setStatus(msg); setTimeout(() => setStatus(''), 4000); };
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 5000); };

  // ── E-Library handlers ──────────────────────────────────────────────────────
  const fetchFiles = async () => {
    try {
      const data = await api.elibrary.list();
      setFiles(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchLinks = async () => {
    try {
      const data = await api.elibrary.listLinks();
      setLinks(data || []);
    } catch (err) { console.error(err); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { showError('Please select a file to upload.'); return; }
    const ext = uploadFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'xlsx', 'docx'].includes(ext)) { showError('Only PDF, Excel, or Word files are allowed.'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', uploadTitle || uploadFile.name);
      fd.append('description', uploadDesc);
      await api.elibrary.upload(fd);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      showStatus('File uploaded successfully!');
      fetchFiles();
    } catch (err) {
      showError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!await confirm('Permanently delete this file?')) return;
    try {
      await api.elibrary.delete(fileId);
      showStatus('File deleted.');
      fetchFiles();
    } catch (err) {
      showError(err.message || 'Delete failed.');
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) { showError('Title and URL are required.'); return; }
    setUploading(true);
    try {
      await api.elibrary.createLink({ title: linkTitle, url: linkUrl, description: linkDesc });
      setLinkTitle('');
      setLinkUrl('');
      setLinkDesc('');
      showStatus('Course link added successfully!');
      fetchLinks();
    } catch (err) {
      showError(err.message || 'Failed to add link.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!await confirm('Permanently delete this link?')) return;
    try {
      await api.elibrary.deleteLink(linkId);
      showStatus('Link deleted.');
      fetchLinks();
    } catch (err) {
      showError(err.message || 'Delete failed.');
    }
  };

  // ── Discussions handlers ────────────────────────────────────────────────────
  const fetchThreads = async () => {
    try {
      const data = await api.discussions.list();
      setThreads(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(true);
      setEmployees(data || []);
    } catch (err) { console.error(err); }
  };

  const employeesByDept = {};
  employees.forEach(emp => {
    const dept = emp.department || 'General';
    if (!employeesByDept[dept]) employeesByDept[dept] = [];
    employeesByDept[dept].push(emp);
  });

  const toggleInvite = (empId) => {
    setInvitedIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleDeptAll = (deptEmps, checked) => {
    const ids = deptEmps.map(e => e.id || e._id);
    setInvitedIds(prev => {
      const filtered = prev.filter(id => !ids.includes(id));
      return checked ? [...filtered, ...ids] : filtered;
    });
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!threadTitle.trim()) { showError('Please enter a thread title.'); return; }
    if (!threadVenue.trim()) { showError('Please enter a venue where the discussion will be held.'); return; }
    setLoading(true);
    try {
      await api.discussions.create({ title: threadTitle, body: threadBody, venue: threadVenue, invited_ids: invitedIds });
      setThreadTitle(''); setThreadBody(''); setThreadVenue(''); setInvitedIds([]);
      showStatus('Discussion created and invitations sent!');
      fetchThreads();
    } catch (err) {
      showError(err.message || 'Failed to create discussion.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThread = async (threadId) => {
    if (!await confirm('Delete this discussion?')) return;
    try {
      await api.discussions.delete(threadId);
      showStatus('Discussion deleted.');
      fetchThreads();
    } catch (err) {
      showError(err.message || 'Delete failed.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid var(--brand-blue)' : '3px solid transparent',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px'
  });

  return (
    <div className="module-container" style={{ maxWidth: '100%', padding: '20px 30px' }}>

      {/* Header */}
      <div className="module-header" style={{ marginBottom: '20px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#f59e0b15', color: '#f59e0b', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>LMS &amp; Club</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              E-Library resources &amp; employee discussion threads
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {status && (
        <div style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          <Check size={16} /> {status}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px', gap: '4px' }}>
        <button style={tabStyle('elibrary')} onClick={() => setActiveTab('elibrary')}>
          <Library size={16} /> E-Library
        </button>
        <button style={tabStyle('discussions')} onClick={() => setActiveTab('discussions')}>
          <MessageSquare size={16} /> Discussions
        </button>
      </div>

      {/* ══════════════════════ E-LIBRARY TAB ══════════════════════ */}
      {activeTab === 'elibrary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-tab Selection */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border-glass)', width: 'fit-content' }}>
            <button
              onClick={() => setElibraryTab('documents')}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: elibraryTab === 'documents' ? 'var(--brand-blue)' : 'transparent',
                color: elibraryTab === 'documents' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Library size={14} /> Resource Documents
            </button>
            <button
              onClick={() => setElibraryTab('links')}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: elibraryTab === 'links' ? 'var(--brand-blue)' : 'transparent',
                color: elibraryTab === 'links' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Link2 size={14} /> Course Links &amp; Sites
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '340px 1fr' : '1fr', gap: '24px' }}>

            {/* ── Admin Form Panel (Left) ── */}
            {isAdmin && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', height: 'fit-content' }}>
                {elibraryTab === 'documents' ? (
                  <>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={16} style={{ color: '#f59e0b' }} /> Upload Resource
                    </h3>
                    <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>File (PDF, Excel, Word)</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.xlsx,.docx"
                          onChange={e => setUploadFile(e.target.files[0] || null)}
                          style={{ display: 'block', width: '100%', padding: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Title (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Employee Handbook Q3"
                          value={uploadTitle}
                          onChange={e => setUploadTitle(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</label>
                        <textarea
                          placeholder="Brief description of this resource"
                          value={uploadDesc}
                          onChange={e => setUploadDesc(e.target.value)}
                          rows={3}
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={uploading}
                        style={{ padding: '10px', fontWeight: '700', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload File'}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={16} style={{ color: '#f59e0b' }} /> Add Course Link
                    </h3>
                    <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Course Title</label>
                        <input
                          type="text"
                          placeholder="e.g. React Advanced Patterns"
                          value={linkTitle}
                          onChange={e => setLinkTitle(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>URL / Link</label>
                        <input
                          type="url"
                          placeholder="https://example.com/course"
                          value={linkUrl}
                          onChange={e => setLinkUrl(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</label>
                        <textarea
                          placeholder="Brief description of the course content"
                          value={linkDesc}
                          onChange={e => setLinkDesc(e.target.value)}
                          rows={3}
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={uploading}
                        style={{ padding: '10px', fontWeight: '700', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', border: 'none', borderRadius: '10px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Link2 size={16} /> {uploading ? 'Adding...' : 'Add Course Link'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* ── Resource / Link Listing (Right) ── */}
            <div>
              {elibraryTab === 'documents' ? (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Library size={16} style={{ color: '#f59e0b' }} />
                    Resource Library
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: '700' }}>{files.length}</span>
                  </h3>
                  {files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px dashed var(--border-glass)', borderRadius: '16px' }}>
                      <Library size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>No resources uploaded yet.{isAdmin ? ' Use the panel to upload your first document.' : ''}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                      {files.map(file => (
                        <div key={file.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'box-shadow 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <FileIcon ext={file.ext} size={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title}</div>
                              {file.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>{file.description}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{file.ext?.replace('.', '').toUpperCase()}</span>
                            <span>•</span>
                            <span>{file.uploaded_by}</span>
                            <span>•</span>
                            <span>{file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : ''}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setPreviewFile(file)}
                              style={{ flex: 1, padding: '7px', fontSize: '12px', fontWeight: '700', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                            >
                              <Eye size={13} /> Preview
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '700', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} style={{ color: '#f59e0b' }} />
                    External Links &amp; Courses
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: '700' }}>{links.length}</span>
                  </h3>
                  {links.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px dashed var(--border-glass)', borderRadius: '16px' }}>
                      <Link2 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>No external links added yet.{isAdmin ? ' Use the panel to add your first course link.' : ''}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                      {links.map(link => (
                        <div key={link.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'box-shadow 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Globe size={20} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.title}</div>
                              {link.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>{link.description}</div>}
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', color: 'var(--brand-blue)' }}>{link.url}</span>
                            <span>•</span>
                            <span>{link.uploaded_by}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ flex: 1, padding: '7px', fontSize: '12px', fontWeight: '700', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                            >
                              <ExternalLink size={13} /> Open Course
                            </a>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteLink(link.id)}
                                style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '700', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════ DISCUSSIONS TAB ══════════════════════ */}
      {activeTab === 'discussions' && (
        <div style={{ display: 'grid', gridTemplateColumns: !isAdmin ? '360px 1fr' : '1fr', gap: '24px' }}>

          {/* Employee: Start Discussion Form (Left) */}
          {!isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '22px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} style={{ color: '#f59e0b' }} /> Start Discussion
                </h3>
                <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Discussion Topic</label>
                    <input type="text" placeholder="e.g. Q4 Marketing Strategy Review" value={threadTitle} onChange={e => setThreadTitle(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Venue / Meeting Place</label>
                    <input type="text" placeholder="e.g. Conference Room B / Google Meet" value={threadVenue} onChange={e => setThreadVenue(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</label>
                    <textarea placeholder="Describe the discussion agenda..." value={threadBody} onChange={e => setThreadBody(e.target.value)} rows={3} className="form-input" style={{ resize: 'vertical' }} />
                  </div>
                  {/* Employee invite accordion */}
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                      <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Invite Colleagues ({invitedIds.length} selected)
                    </label>
                    <div style={{ border: '1px solid var(--border-glass)', borderRadius: '10px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                      {Object.entries(employeesByDept).map(([dept, deptEmps]) => {
                        const deptIds = deptEmps.map(e => e.id || e._id);
                        const allSelected = deptIds.every(id => invitedIds.includes(id));
                        const isOpen = expandedDepts[dept];
                        return (
                          <div key={dept}>
                            <div
                              onClick={() => setExpandedDepts(p => ({ ...p, [dept]: !p[dept] }))}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)', fontWeight: '600', fontSize: '13px' }}
                            >
                              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={allSelected} onChange={e => toggleDeptAll(deptEmps, e.target.checked)} />
                                {dept} ({deptEmps.length})
                              </label>
                              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                            {isOpen && deptEmps.map(emp => {
                              const empId = emp.id || emp._id;
                              return (
                                <label key={empId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <input type="checkbox" checked={invitedIds.includes(empId)} onChange={() => toggleInvite(empId)} />
                                  {emp.name}
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.email}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '10px', fontWeight: '700', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Send size={15} /> {loading ? 'Sending...' : 'Send Discussion Invite'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Active Discussions List (Right) */}
          <div>
            {/* Admin read-only banner */}
            {isAdmin && (
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#6366f1', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={15} /> Admin View-Only — You can monitor all active discussions but cannot create or modify them.
              </div>
            )}
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: '#f59e0b' }} />
              Active Scheduled Discussions
              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: '700' }}>{threads.length}</span>
            </h3>
            {threads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px dashed var(--border-glass)', borderRadius: '16px' }}>
                <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No active discussions scheduled.{!isAdmin ? ' Schedule the first one!' : ''}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {threads.map(thread => (
                  <div
                    key={thread.id}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{thread.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Organized by <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>{thread.creator_name}</span>
                        </div>
                      </div>
                      {(isAdmin || (!isAdmin && myId === thread.creator_id)) && (
                        <button
                          onClick={() => handleDeleteThread(thread.id)}
                          style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', cursor: 'pointer', flexShrink: 0 }}
                          title="Delete discussion"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Venue tag */}
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#f59e0b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={13} /> {thread.venue}
                    </div>

                    {thread.body && (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1, whiteSpace: 'pre-line' }}>
                        {thread.body}
                      </p>
                    )}

                    {/* Participants section */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={11} /> Participants ({thread.participants_details?.length || 0})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                        {(thread.participants_details || []).map(p => (
                          <span
                            key={p.id}
                            style={{
                              background: p.id === thread.creator_id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                              color: p.id === thread.creator_id ? '#6366f1' : 'var(--text-primary)',
                              border: p.id === thread.creator_id ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border-glass)',
                              borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                            }}
                            title={p.email}
                          >
                            {p.name} {p.id === thread.creator_id ? '👑' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
}
