import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  FileText, Upload, Download, User, CreditCard, CheckCircle, Search, 
  Trash2, Plus, AlertCircle, ChevronDown, BookOpen, Shield, HelpCircle, X
} from 'lucide-react';

export default function DocumentVault({ user }) {
  const isAdmin = user?.role === 'Admin (HR)';
  
  // Tab states
  // Employees: 'personal', 'company'
  // Admins: 'personal_view', 'company_issue', 'mastersheet'
  const [activeTab, setActiveTab] = useState(isAdmin ? 'personal_view' : 'personal');

  // Employees data
  const [employees, setEmployees] = useState([]);
  
  // Vault state
  const [vaultData, setVaultData] = useState({ personal_documents: {}, company_documents: [] });
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states (Employee uploads)
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [pct10th, setPct10th] = useState('');
  const [pct12th, setPct12th] = useState('');
  const [bachelorsCgpa, setBachelorsCgpa] = useState('');
  const [hasExperience, setHasExperience] = useState(false);

  // File states (Employee uploads)
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [academicProofsFile, setAcademicProofsFile] = useState(null);
  const [passbookFile, setPassbookFile] = useState(null);
  const [experienceFile, setExperienceFile] = useState(null);

  // Looping UI state (HR Company uploads)
  const [compDocTitle, setCompDocTitle] = useState('');
  const [compDocFile, setCompDocFile] = useState(null);
  const [companyQueue, setCompanyQueue] = useState([]); // List of { id, title, file, file_url, upload_date }

  // General statuses
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, title }

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      fetchVaultData('me');
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(false); // Fetch all roster (active and pending)
      setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchVaultData = async (empId) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.documents.getVault(empId);
      setVaultData(data);
      
      // If employee side, pre-fill form fields
      if (!isAdmin && data.personal_documents) {
        const pd = data.personal_documents;
        setBankName(pd.bank_name || '');
        setAccountNumber(pd.account_number || '');
        setAccountName(pd.account_name || '');
        setIfscCode(pd.ifsc_code || '');
        setPct10th(pd.percentage_10th || '');
        setPct12th(pd.percentage_12th || '');
        setBachelorsCgpa(pd.bachelors_cgpa || '');
        setHasExperience(pd.has_experience || false);
      }
      
      // If admin side company issue tab, load company documents into queue
      if (isAdmin && activeTab === 'company_issue') {
        setCompanyQueue(data.company_documents || []);
      }
    } catch (err) {
      setError(`Failed to retrieve document vault: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e, setFile) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      await alert("Strict upload constraint violated: File size must be under 10MB.");
      e.target.value = null;
      return;
    }
    setFile(file);
  };

  // Submit Personal Documents (Employee)
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Syncing and uploading personal credentials...');
    setError('');

    // IFSC validation format check
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      setError("IFSC Code must follow the standard 11-digit alphanumeric format (e.g. SBIN0012345).");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('bank_name', bankName);
      formData.append('account_number', accountNumber);
      formData.append('account_name', accountName);
      formData.append('ifsc_code', ifscCode);
      formData.append('percentage_10th', pct10th);
      formData.append('percentage_12th', pct12th);
      formData.append('bachelors_cgpa', bachelorsCgpa);
      formData.append('has_experience', hasExperience ? 'true' : 'false');

      if (aadhaarFile) formData.append('aadhaar', aadhaarFile);
      if (panFile) formData.append('pan', panFile);
      if (profilePhotoFile) formData.append('profile_photo', profilePhotoFile);
      if (academicProofsFile) formData.append('academic_proofs', academicProofsFile);
      if (passbookFile) formData.append('passbook', passbookFile);
      if (experienceFile) formData.append('experience', experienceFile);

      await api.documents.savePersonal(formData);
      
      // Reset input files
      setAadhaarFile(null);
      setPanFile(null);
      setProfilePhotoFile(null);
      setAcademicProofsFile(null);
      setPassbookFile(null);
      setExperienceFile(null);

      setStatus('Personal documents successfully synchronized and saved!');
      setTimeout(() => setStatus(''), 4000);
      setShowSuccessModal(true);
      fetchVaultData('me');
    } catch (err) {
      setError(err.message || 'Submission failed. Please check file sizes and compulsory details.');
    } finally {
      setLoading(false);
    }
  };

  // Select employee from searchable dropdown (Admin)
  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setSearchQuery(emp.name);
    setShowDropdown(false);
    fetchVaultData(emp.id);
  };

  // HR Looping Company upload Submit to Queue
  const handleQueueDocSubmit = async (e) => {
    e.preventDefault();
    if (!compDocTitle || !compDocFile) {
      await alert("Please provide both a Document Title and a File.");
      return;
    }

    const newQueuedItem = {
      id: `temp_${Date.now()}`,
      title: compDocTitle,
      file: compDocFile,
      file_url: URL.createObjectURL(compDocFile),
      upload_date: new Date().toISOString(),
      isNew: true
    };

    setCompanyQueue(prev => [...prev, newQueuedItem]);
    
    // Clear inputs immediately to show brand-new line item row
    setCompDocTitle('');
    setCompDocFile(null);
    const fileInput = document.getElementById('companyDocFileInput');
    if (fileInput) fileInput.value = '';
  };

  // HR Remove document from list
  const handleRemoveQueuedDoc = (itemId) => {
    setCompanyQueue(prev => prev.filter(item => item.id !== itemId));
  };

  // HR Save Changes button execution
  const handleSaveCompanyChanges = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    setStatus('Saving company issued documents loop updates...');
    setError('');

    try {
      const formData = new FormData();
      
      // Extract existing docs (already uploaded)
      const existingDocs = companyQueue.filter(item => !item.isNew).map(item => ({
        id: item.id,
        title: item.title,
        file_url: item.file_url,
        upload_date: item.upload_date
      }));
      formData.append('existing_docs', JSON.stringify(existingDocs));

      // Append new files
      const newItems = companyQueue.filter(item => item.isNew);
      newItems.forEach(item => {
        formData.append('files', item.file);
        formData.append('titles', item.title);
      });

      await api.documents.saveCompany(selectedEmp.id, formData);
      setStatus('Company issued documents successfully saved and synchronized!');
      setTimeout(() => setStatus(''), 4000);
      fetchVaultData(selectedEmp.id);
    } catch (err) {
      setError(`Failed to save changes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = (e, url, title) => {
    if (e) e.preventDefault();
    if (!url) return;
    setPreviewFile({ url, title });
  };

  return (
    <div className="module-container" style={{ width: '100%', padding: '20px 30px' }}>
      
      {/* Header */}
      <div className="module-header" style={{ marginBottom: '25px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#14b8a615', color: '#14b8a6', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-primary)' }}>Document Vault & Self-Service</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              {isAdmin ? "Admin panel to audit employee credentials and issue organizational documents." : "Self-service module to upload credentials and access official company-issued files."}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
        {!isAdmin ? (
          <>
            <button
              onClick={() => setActiveTab('personal')}
              style={{
                background: activeTab === 'personal' ? 'var(--brand-gradient)' : 'var(--bg-card)',
                color: activeTab === 'personal' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <User size={16} />
              My Personal Documents
            </button>
            <button
              onClick={() => setActiveTab('company')}
              style={{
                background: activeTab === 'company' ? 'var(--brand-gradient)' : 'var(--bg-card)',
                color: activeTab === 'company' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <BookOpen size={16} />
              Company Issued Documents
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setActiveTab('personal_view'); if (selectedEmp) fetchVaultData(selectedEmp.id); }}
              style={{
                background: activeTab === 'personal_view' ? 'var(--brand-gradient)' : 'var(--bg-card)',
                color: activeTab === 'personal_view' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <User size={16} />
              Employee Personal Documents
            </button>
            <button
              onClick={() => { setActiveTab('company_issue'); if (selectedEmp) fetchVaultData(selectedEmp.id); }}
              style={{
                background: activeTab === 'company_issue' ? 'var(--brand-gradient)' : 'var(--bg-card)',
                color: activeTab === 'company_issue' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={16} />
              Company Issued Documents
            </button>
            <button
              onClick={() => { setActiveTab('mastersheet'); if (selectedEmp) fetchVaultData(selectedEmp.id); }}
              style={{
                background: activeTab === 'mastersheet' ? 'var(--brand-gradient)' : 'var(--bg-card)',
                color: activeTab === 'mastersheet' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-glass)',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Shield size={16} />
              Mastersheet Directory
            </button>
          </>
        )}
      </div>

      {/* Global Status Notifications */}
      {status && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} /> {status}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* ==================== EMPLOYEE PORTAL ==================== */}
      {/* ========================================================= */}
      
      {!isAdmin && activeTab === 'personal' && (
        <form onSubmit={handlePersonalSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* Left Column: Form Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Bank Details Card */}
            <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} style={{ color: '#14b8a6' }} />
                Bank Details (Compulsory)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Name of Bank</label>
                  <input type="text" placeholder="e.g. HDFC Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input type="text" placeholder="Alphanumeric or numeric format" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input type="text" placeholder="Matching bank records exactly" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input type="text" placeholder="e.g. HDFC0000104" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Upload Passbook / Cancelled Cheque (Optional)</label>
                  <input type="file" onChange={(e) => handleFileChange(e, setPassbookFile)} />
                  {vaultData.personal_documents?.passbook_url && (
                    <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.passbook_url, 'Cancelled Cheque / Passbook')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                      🔗 View Existing Cancelled Cheque / Passbook
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Education Details Card */}
            <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} style={{ color: '#14b8a6' }} />
                Education Performance & Marksheets (Compulsory)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>10th Standard Percentage (%)</label>
                  <input type="number" step="0.01" placeholder="e.g. 88.50" value={pct10th} onChange={(e) => setPct10th(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>12th Standard Percentage (%)</label>
                  <input type="number" step="0.01" placeholder="e.g. 91.20" value={pct12th} onChange={(e) => setPct12th(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Bachelor's CGPA / Percentage</label>
                  <input type="number" step="0.01" placeholder="e.g. 8.5" value={bachelorsCgpa} onChange={(e) => setBachelorsCgpa(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Upload Academic Proofs (Combined Sequential File - Compulsory)</label>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                    💡 Please upload a single, combined file (PDF/Zip) containing your 10th marksheet, 12th marksheet, and Bachelor's degree completion certificate sequentially.
                  </p>
                  <input type="file" onChange={(e) => handleFileChange(e, setAcademicProofsFile)} required={!vaultData.personal_documents?.academic_proofs_url} />
                  {vaultData.personal_documents?.academic_proofs_url && (
                    <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.academic_proofs_url, 'Academic Proofs')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                      🔗 View Existing Academic Proofs
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Files & Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Identity & Photograph Card */}
            <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: '#14b8a6' }} />
                Identity Verification & Photo (Compulsory)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="form-group">
                  <label>Aadhaar Card (strictly PDF)</label>
                  <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setAadhaarFile)} required={!vaultData.personal_documents?.aadhaar_url} />
                  {vaultData.personal_documents?.aadhaar_url && (
                    <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.aadhaar_url, 'Aadhaar Card')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>
                      🔗 View Existing Aadhaar PDF
                    </a>
                  )}
                </div>

                <div className="form-group">
                  <label>PAN Card (strictly PDF)</label>
                  <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, setPanFile)} required={!vaultData.personal_documents?.pan_url} />
                  {vaultData.personal_documents?.pan_url && (
                    <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.pan_url, 'PAN Card')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>
                      🔗 View Existing PAN PDF
                    </a>
                  )}
                </div>

                <div className="form-group">
                  <label>Profile Photo (strictly PNG/JPG/JPEG)</label>
                  <input type="file" accept=".png, .jpg, .jpeg" onChange={(e) => handleFileChange(e, setProfilePhotoFile)} required={!vaultData.personal_documents?.profile_photo_url} />
                  {vaultData.personal_documents?.profile_photo_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                      <img src={vaultData.personal_documents.profile_photo_url} alt="Profile preview" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                      <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.profile_photo_url, 'Profile Photograph')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', fontWeight: 'bold' }}>
                        View Full Photo
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Experience Details Card */}
            <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#14b8a6' }} />
                Previous Work Experience (If Any)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={hasExperience} onChange={(e) => setHasExperience(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  I have previous work experience
                </label>

                {hasExperience && (
                  <div className="form-group" style={{ padding: '10px 0', borderTop: '1px solid var(--border-glass)' }}>
                    <label>Upload Experience/Relieving Letters or LORs</label>
                    <input type="file" onChange={(e) => handleFileChange(e, setExperienceFile)} />
                    {vaultData.personal_documents?.experience_url && (
                      <a href="#" onClick={(e) => handleViewFile(e, vaultData.personal_documents.experience_url, 'Experience Letters')} style={{ fontSize: '12px', color: '#14b8a6', textDecoration: 'none', display: 'block', marginTop: '6px', fontWeight: 'bold' }}>
                        🔗 View Existing Experience Certificate
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ background: 'var(--brand-gradient)', padding: '14px', fontSize: '14px', width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> {loading ? 'Synchronizing files...' : 'Save & Sync Personal Documents'}
            </button>
          </div>
        </form>
      )}

      {!isAdmin && activeTab === 'company' && (
        <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px' }}>
            Company Issued Documents
          </h3>
          
          {vaultData.company_documents.length === 0 ? (
            <div style={{ padding: '50px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '15px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No company documents issued yet. HR will publish them here dynamically.
            </div>
          ) : (
            <div className="data-table-wrapper" style={{ border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)' }}>Document Title</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)' }}>Date Issued</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultData.company_documents.map((doc, idx) => (
                    <tr key={doc.id || idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{doc.title}</td>
                      <td style={{ padding: '12px 18px', fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(doc.upload_date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <button onClick={(e) => handleViewFile(e, doc.file_url, doc.title)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#14b8a6', display: 'inline-flex', gap: '6px', alignItems: 'center', border: 'none', cursor: 'pointer' }}>
                          <FileText size={12} /> View File
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ==================== ADMIN PORTAL VIEW ================== */}
      {/* ========================================================= */}

      {isAdmin && (
        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Custom Searchable Dropdown Overlay Selector */}
          <div style={{ maxWidth: '400px', position: 'relative' }}>
            <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Search Employee Profile
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Type to filter employees..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{ width: '100%', padding: '10px 10px 10px 35px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowDropdown(!showDropdown)} />
            </div>

            {showDropdown && (
              <div style={{ position: 'absolute', zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border-glass)', width: '100%', maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
                {employees
                  .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(e => (
                    <div
                      key={e.id}
                      onClick={() => handleSelectEmployee(e)}
                      style={{ padding: '10px 15px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
                      onMouseOver={(ev) => ev.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(ev) => ev.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 'bold' }}>{e.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{e.email}</div>
                    </div>
                  ))
                }
                {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>No matching employees found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Tab 1: Employee Personal Documents View */}
      {isAdmin && activeTab === 'personal_view' && (
        <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
          {!selectedEmp ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              ⚠️ Please search and select an employee from the dropdown above to view their personal documents.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                {vaultData.personal_documents?.profile_photo_url ? (
                  <img src={vaultData.personal_documents.profile_photo_url} alt="Profile photo" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #14b8a6' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={28} />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-primary)', margin: 0 }}>{selectedEmp.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedEmp.email}</span>
                </div>
              </div>

              {!vaultData.personal_documents || Object.keys(vaultData.personal_documents).length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No personal documents uploaded by this employee yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                  
                  {/* Left sub-column: metadata details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Bank block */}
                    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>🏦 Bank Account Credentials</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Bank Name:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.bank_name}</td></tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Account Number:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.account_number}</td></tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Account Holder:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.account_name}</td></tr>
                          <tr><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>IFSC Code:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.ifsc_code}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Education block */}
                    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>🎓 Educational Merits</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>10th Standard:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.percentage_10th}%</td></tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>12th Standard:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.percentage_12th}%</td></tr>
                          <tr><td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Bachelor's CGPA/Percentage:</td><td style={{ padding: '6px 0', fontWeight: 'bold' }}>{vaultData.personal_documents.bachelors_cgpa}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Previous Experience block */}
                    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>💼 Work Experience Status</h4>
                      <div style={{ fontSize: '13px' }}>
                        {vaultData.personal_documents.has_experience ? (
                          <div style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Has Previous Work Experience</div>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)' }}>No previous work experience declared.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right sub-column: document download links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '5px' }}>📁 Uploaded File Audits</h4>
                    
                    {vaultData.personal_documents.aadhaar_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Aadhaar Card (PDF)</span>
                        <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.aadhaar_url, 'Aadhaar Card')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                          <FileText size={12} /> View File
                        </button>
                      </div>
                    )}

                    {vaultData.personal_documents.pan_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>PAN Card (PDF)</span>
                        <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.pan_url, 'PAN Card')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                          <FileText size={12} /> View File
                        </button>
                      </div>
                    )}

                    {vaultData.personal_documents.academic_proofs_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Academic Proofs (Combined)</span>
                        <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.academic_proofs_url, 'Academic Proofs')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                          <FileText size={12} /> View File
                        </button>
                      </div>
                    )}

                    {vaultData.personal_documents.passbook_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Passbook / Cheque (Optional)</span>
                        <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.passbook_url, 'Cancelled Cheque / Passbook')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                          <FileText size={12} /> View File
                        </button>
                      </div>
                    )}

                    {vaultData.personal_documents.experience_url && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Experience Letters (Optional)</span>
                        <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.experience_url, 'Experience Letters')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                          <FileText size={12} /> View File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Tab 2: Company Issued Documents (Looping UI) */}
      {isAdmin && activeTab === 'company_issue' && (
        <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
          {!selectedEmp ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              ⚠️ Please search and select an employee from the dropdown above to issue company documents.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '30px' }}>
              
              {/* Left pane inside: looping submission row card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Issue Organizational Document</h4>
                
                <form onSubmit={handleQueueDocSubmit} style={{ background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label>Document Title (Compulsory)</label>
                    <input type="text" placeholder="e.g. Appointment Letter" value={compDocTitle} onChange={(e) => setCompDocTitle(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label>Select Document File (Universal up to 10MB)</label>
                    <input id="companyDocFileInput" type="file" onChange={(e) => handleFileChange(e, setCompDocFile)} required />
                  </div>

                  <button type="submit" className="btn-primary" style={{ background: 'var(--brand-gradient)', padding: '10px', fontSize: '13px', justifyContent: 'center', marginTop: '5px' }}>
                    <Plus size={14} /> Submit to Queue
                  </button>
                </form>

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  💡 **Looping Workflow**: Click "Submit to Queue" to push a document. An empty form will immediately appear to queue the next document. All queued documents are saved permanently once you click the **"Save Changes"** button on the right.
                </p>
              </div>

              {/* Right pane inside: queued documents queue and Save Changes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Company Documents Queue</h4>
                  <button onClick={handleSaveCompanyChanges} className="btn-primary" disabled={loading} style={{ background: '#10b981', padding: '8px 16px', fontSize: '12px' }}>
                    Save Changes
                  </button>
                </div>

                {companyQueue.length === 0 ? (
                  <div style={{ padding: '40px 10px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    No documents queued or saved for this employee profile.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {companyQueue.map((item, idx) => (
                      <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '12px 18px', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.isNew ? (
                              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Queued (Unsaved)</span>
                            ) : (
                              <span>Saved on {new Date(item.upload_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={(e) => handleViewFile(e, item.file_url, item.title)} className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
                            View
                          </button>
                          <button onClick={() => handleRemoveQueuedDoc(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Tab 3: Mastersheet Audit Directory */}
      {isAdmin && activeTab === 'mastersheet' && (
        <div className="pane-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '25px' }}>
          {!selectedEmp ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              ⚠️ Please search and select an employee from the dropdown above to audit their mastersheet dossier.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-primary)', margin: 0 }}>Mastersheet: {selectedEmp.name}</h3>
                  <span className="tenant-badge" style={{ fontSize: '10px' }}>Audit Mode</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedEmp.email}</span>
              </div>

              {/* Side-by-side display of Personal and Company documents */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                
                {/* Left Side: Personal Info Dossier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', borderLeft: '3px solid #14b8a6', paddingLeft: '8px' }}>
                    Employee Submitted Personal Documents
                  </h4>

                  {!vaultData.personal_documents || Object.keys(vaultData.personal_documents).length === 0 ? (
                    <div style={{ padding: '30px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px dashed var(--border-glass)', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No personal documents uploaded by employee.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      {/* Photo preview */}
                      {vaultData.personal_documents.profile_photo_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <img src={vaultData.personal_documents.profile_photo_url} alt="Profile photo" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Profile Photograph</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Verified Image Format</div>
                          </div>
                          <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.profile_photo_url, 'Profile Photograph')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                            View
                          </button>
                        </div>
                      )}

                      {/* Aadhaar */}
                      {vaultData.personal_documents.aadhaar_url && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Aadhaar Card</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Strict PDF File Format</div>
                          </div>
                          <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.aadhaar_url, 'Aadhaar Card')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                            View
                          </button>
                        </div>
                      )}

                      {/* PAN */}
                      {vaultData.personal_documents.pan_url && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>PAN Card</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Strict PDF File Format</div>
                          </div>
                          <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.pan_url, 'PAN Card')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                            View
                          </button>
                        </div>
                      )}

                      {/* Academic */}
                      {vaultData.personal_documents.academic_proofs_url && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Academic Marksheets</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Combined educational proofs file</div>
                          </div>
                          <button onClick={(e) => handleViewFile(e, vaultData.personal_documents.academic_proofs_url, 'Academic Proofs')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                            View
                          </button>
                        </div>
                      )}

                      {/* Bank Details text preview */}
                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '12px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>🏦 Bank Credentials</div>
                        <div>Bank: <strong>{vaultData.personal_documents.bank_name}</strong></div>
                        <div style={{ marginTop: '3px' }}>Account Number: <strong>{vaultData.personal_documents.account_number}</strong></div>
                        <div style={{ marginTop: '3px' }}>IFSC Code: <strong>{vaultData.personal_documents.ifsc_code}</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Company Issued Dossier */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', borderLeft: '3px solid #14b8a6', paddingLeft: '8px' }}>
                    HR Issued Company Documents
                  </h4>

                  {vaultData.company_documents.length === 0 ? (
                    <div style={{ padding: '40px 10px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px dashed var(--border-glass)', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No company documents issued for this profile.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {vaultData.company_documents.map((doc, idx) => (
                        <div key={doc.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{doc.title}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>Issued: {new Date(doc.upload_date).toLocaleDateString()}</div>
                          </div>
                          <button onClick={(e) => handleViewFile(e, doc.file_url, doc.title)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: '#14b8a6' }}>
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Modal Notification */}
      {showSuccessModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'modalBackdropFadeIn 0.3s ease' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', animation: 'modalContentPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '10px' }}>Sync Successful!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
              Your personal credentials and bank details have been successfully uploaded, synchronized, and locked in the HR Directory.
            </p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="btn-primary"
              style={{ background: 'var(--brand-gradient)', width: '100%', padding: '12px', justifyContent: 'center', fontSize: '14px', borderRadius: '10px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Inline Document Preview Lightbox Modal */}
      {previewFile && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, animation: 'modalBackdropFadeIn 0.3s ease' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '24px', width: '90%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'modalContentPopIn 0.35s cubic-bezier(0.165, 0.84, 0.44, 1)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 25px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: '#14b8a6' }} />
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{previewFile.title}</h4>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <a href={previewFile.url} download className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} /> Download
                </a>
                <button 
                  onClick={() => setPreviewFile(null)} 
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', width: '100%' }}>
              <DocumentPreviewViewer url={previewFile.url} title={previewFile.title} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-component to dynamically parse and preview images, PDFs, Word (.docx) and Excel (.xlsx) files inline.
function DocumentPreviewViewer({ url, title }) {
  const containerRef = React.useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceIframe, setForceIframe] = useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(url);

  // Helper to convert base64 data URIs to Blob URLs to bypass iframe restrictions in Chrome
  const convertDataURIToBlobURL = (dataURI) => {
    if (!dataURI || !dataURI.startsWith('data:')) return dataURI;
    try {
      const parts = dataURI.split(',');
      const meta = parts[0];
      const base64Data = parts[1];
      const mime = meta.split(':')[1].split(';')[0];
      
      const binary = atob(base64Data);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([view], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Failed to convert data URI to blob URL:", e);
      return dataURI;
    }
  };

  useEffect(() => {
    let bUrl = null;
    if (url && url.startsWith('data:')) {
      bUrl = convertDataURIToBlobURL(url);
      setPreviewUrl(bUrl);
    } else {
      setPreviewUrl(url);
    }

    return () => {
      if (bUrl && bUrl.startsWith('blob:')) {
        URL.revokeObjectURL(bUrl);
      }
    };
  }, [url]);

  useEffect(() => {
    if (!previewUrl || forceIframe) return;
    setLoading(true);
    setError(null);
    setHtmlContent(null);

    const isDocx = url.toLowerCase().endsWith('.docx') || url.includes('wordprocessingml.document');
    const isXlsx = url.toLowerCase().endsWith('.xlsx') || url.includes('spreadsheetml.sheet');

    if (!isDocx && !isXlsx) {
      setLoading(false);
      return;
    }

    fetch(previewUrl)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load file contents from server.");
        return res.arrayBuffer();
      })
      .then(buffer => {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Check if the file starts with the standard ZIP header signature: PK\x03\x04
        const uint8 = new Uint8Array(buffer.slice(0, 4));
        const zipSignature = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
        const isZip = zipSignature === 'PK\x03\x04';

        if (isDocx && !isZip) {
          // If it's a plain-text/HTML file disguised as docx, read it as text and load in srcDoc iframe
          const decoder = new TextDecoder("utf-8");
          const decodedText = decoder.decode(buffer);
          
          if (decodedText.includes('<html') || decodedText.includes('xmlns:w') || decodedText.includes('<body') || decodedText.includes('<div') || decodedText.includes('<p')) {
            setHtmlContent(decodedText);
          } else {
            // Render plain text nicely
            const wrappedText = `<html><body style="font-family: sans-serif; background: transparent; padding: 20px; color: var(--text-primary);"><pre style="white-space: pre-wrap; font-size: 13px;">${decodedText}</pre></body></html>`;
            setHtmlContent(wrappedText);
          }
          setLoading(false);
          return;
        }

        if (isDocx) {
          if (window.docx) {
            window.docx.renderAsync(buffer, containerRef.current)
              .then(() => setLoading(false))
              .catch(err => {
                // If rendering fails, fallback to rendering raw text inside srcDoc
                const decoder = new TextDecoder("utf-8");
                const text = decoder.decode(buffer);
                const fallbackHtml = `<html><body style="font-family: sans-serif; padding: 20px;"><pre style="white-space: pre-wrap;">${text}</pre></body></html>`;
                setHtmlContent(fallbackHtml);
                setLoading(false);
              });
          } else {
            setForceIframe(true);
            setLoading(false);
          }
        } else if (isXlsx) {
          if (window.XLSX) {
            try {
              const workbook = window.XLSX.read(new Uint8Array(buffer), { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const html = window.XLSX.utils.sheet_to_html(worksheet);
              
              if (containerRef.current) {
                containerRef.current.innerHTML = `
                  <div style="overflow-x: auto; background: var(--bg-card); color: var(--text-primary); padding: 15px; border-radius: 8px;">
                    <h5 style="margin-bottom: 12px; font-weight: bold; border-bottom: 1px solid var(--border-glass); padding-bottom: 6px; color: #14b8a6;">Sheet: ${firstSheetName}</h5>
                    <style>
                      table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 10px; }
                      th, td { border: 1px solid var(--border-glass); padding: 8px 12px; text-align: left; color: var(--text-primary); }
                      th { background: rgba(255,255,255,0.04); font-weight: bold; }
                    </style>
                    ${html}
                  </div>
                `;
              }
              setLoading(false);
            } catch (err) {
              console.warn("xlsx failed, falling back to iframe view:", err);
              setForceIframe(true);
              setLoading(false);
            }
          } else {
            setForceIframe(true);
            setLoading(false);
          }
        }
      })
      .catch(err => {
        console.warn("file fetch failed, falling back to iframe view:", err);
        setForceIframe(true);
        setLoading(false);
      });
  }, [previewUrl, forceIframe]);

  const isImage = url.toLowerCase().endsWith('.png') || 
                  url.toLowerCase().endsWith('.jpg') || 
                  url.toLowerCase().endsWith('.jpeg') || 
                  url.toLowerCase().endsWith('.gif') || 
                  url.toLowerCase().endsWith('.webp') ||
                  url.toLowerCase().endsWith('.svg') ||
                  url.startsWith('data:image/');

  const isDocx = url.toLowerCase().endsWith('.docx') || url.includes('wordprocessingml.document');
  const isXlsx = url.toLowerCase().endsWith('.xlsx') || url.includes('spreadsheetml.sheet');

  if (htmlContent) {
    return (
      <iframe 
        srcDoc={htmlContent} 
        style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '12px', background: 'white' }} 
        title={title} 
      />
    );
  }

  if (forceIframe) {
    return (
      <iframe 
        src={previewUrl} 
        style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '12px', background: 'white' }} 
        title={title} 
      />
    );
  }

  if (isImage) {
    return (
      <img 
        src={previewUrl} 
        style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '12px', border: '1px solid var(--border-glass)' }} 
        alt={title} 
      />
    );
  }

  if (isDocx || isXlsx) {
    return (
      <div style={{ width: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {loading && !error && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            ⏳ Parsing and rendering document inline...
          </div>
        )}
        {error && (
          <div style={{ padding: '25px', color: '#ef4444', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', marginBottom: '15px' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 10px auto', color: '#ef4444' }} />
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Inline Rendering Issue</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 15px 0', lineHeight: '1.5' }}>{error}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <a href={previewUrl} download className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', textDecoration: 'none', background: 'var(--brand-gradient)' }}>
                Download File
              </a>
              <button 
                onClick={() => {
                  setError(null);
                  setForceIframe(true);
                }} 
                className="btn-primary" 
                style={{ padding: '8px 16px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
              >
                Force Browser View
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', maxHeight: '65vh', overflow: 'auto', background: isDocx ? 'white' : 'transparent', color: isDocx ? 'black' : 'inherit', padding: isDocx && !error ? '25px' : '0', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <iframe 
      src={previewUrl} 
      style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '12px', background: 'white' }} 
      title={title} 
    />
  );
}
