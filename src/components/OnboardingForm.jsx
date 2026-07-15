import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, ShieldAlert, Sparkles, Send, User, Mail,
  Briefcase, Calendar, FileText, Upload, Building2, GraduationCap,
  CreditCard, X, Check, AlertCircle
} from 'lucide-react';

export default function OnboardingForm({ token, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Profile fields
  const [salutation, setSalutation] = useState('Mr.');
  const [name, setName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [empId, setEmpId] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [dob, setDob] = useState('');
  const [doj, setDoj] = useState('');
  const [age, setAge] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [officeContact, setOfficeContact] = useState('');
  const [personalContact, setPersonalContact] = useState('');

  // Document files
  const [aadhaar, setAadhaar] = useState(null);
  const [pan, setPan] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [academicProofs, setAcademicProofs] = useState(null);
  const [passbook, setPassbook] = useState(null);
  const [experienceLetter, setExperienceLetter] = useState(null);

  // Bank & academic details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [hasExperience, setHasExperience] = useState(false);
  const [percentage10th, setPercentage10th] = useState('');
  const [percentage12th, setPercentage12th] = useState('');
  const [bachelorsCgpa, setBachelorsCgpa] = useState('');

  useEffect(() => {
    fetch(`https://hrms-backend-gamma.vercel.app/api/invite/verify?token=${encodeURIComponent(token)}`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid or expired invitation link.');
        return res.json();
      })
      .then(data => {
        setSalutation(data.salutation || 'Mr.');
        setName(data.name || '');
        setPersonalEmail(data.personal_email || '');
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Token verification failed.');
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (dob) {
      try {
        const dobDate = new Date(dob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) calculatedAge--;
        setAge(calculatedAge >= 0 ? calculatedAge : '');
      } catch (e) {}
    }
  }, [dob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      // Profile fields
      fd.append('token', token);
      fd.append('salutation', salutation);
      fd.append('name', name);
      fd.append('personal_email', personalEmail);
      fd.append('emp_id', empId);
      fd.append('department', department);
      fd.append('designation', designation);
      fd.append('dob', dob);
      fd.append('doj', doj);
      fd.append('age', age);
      fd.append('current_address', currentAddress);
      fd.append('office_contact', officeContact);
      fd.append('personal_contact', personalContact);

      // Bank & academic details
      fd.append('bank_name', bankName);
      fd.append('account_number', accountNumber);
      fd.append('account_name', accountName);
      fd.append('ifsc_code', ifscCode);
      fd.append('has_experience', hasExperience ? 'true' : 'false');
      fd.append('percentage_10th', percentage10th || '0');
      fd.append('percentage_12th', percentage12th || '0');
      fd.append('bachelors_cgpa', bachelorsCgpa || '0');

      // Document files (optional at this stage)
      if (aadhaar)           fd.append('aadhaar', aadhaar);
      if (pan)               fd.append('pan', pan);
      if (profilePhoto)      fd.append('profile_photo', profilePhoto);
      if (academicProofs)    fd.append('academic_proofs', academicProofs);
      if (passbook)          fd.append('passbook', passbook);
      if (experienceLetter)  fd.append('experience', experienceLetter);

      const res = await fetch('https://hrms-backend-gamma.vercel.app/api/invite/submit', { method: 'POST', body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to submit onboarding details.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Submission failed. Please check your data and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '20px', color: '#374151', fontWeight: '600' }}>Verifying your secure invitation link...</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ────────────────────────────────────────────────────────────
  if (error && !name) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff5f5', padding: '20px' }}>
        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center', background: '#ffffff', border: '2px solid #fecaca', borderRadius: '20px', padding: '50px 40px', boxShadow: '0 8px 32px rgba(239,68,68,0.1)' }}>
          <ShieldAlert size={60} style={{ color: '#ef4444', marginBottom: '20px' }} />
          <h2 style={{ color: '#b91c1c', marginBottom: '16px', fontSize: '26px', fontWeight: '800' }}>Onboarding Access Denied</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '17px', lineHeight: '1.7' }}>{error}</p>
          <p style={{ fontSize: '15px', color: '#9ca3af' }}>If you believe this is an error, please contact your HR representative to request a new invitation.</p>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '680px', width: '100%', background: '#ffffff', border: '2px solid #bbf7d0', borderRadius: '24px', padding: '60px 50px', textAlign: 'center', boxShadow: '0 20px 60px rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle size={80} style={{ color: '#16a34a', marginBottom: '28px' }} />
          <h1 style={{ color: '#14532d', fontSize: '36px', fontWeight: '900', marginBottom: '16px', lineHeight: '1.2' }}>Onboarding Submitted!</h1>
          <p style={{ color: '#374151', fontSize: '20px', fontWeight: '600', marginBottom: '10px', lineHeight: '1.6' }}>
            Thank you, <span style={{ color: '#15803d' }}>{salutation} {name}</span>.
          </p>
          <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '36px', lineHeight: '1.7' }}>
            Your personal details and documents have been securely submitted to the SEMCO Groups HR roster.
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '28px 32px', textAlign: 'left', lineHeight: '2' }}>
            <p style={{ fontSize: '17px', fontWeight: '800', color: '#14532d', marginBottom: '12px' }}>📋 What Happens Next:</p>
            <p style={{ fontSize: '17px', color: '#374151', fontWeight: '600' }}>1️⃣ &nbsp;HR will formally provision your official <strong>Company Email ID</strong>.</p>
            <p style={{ fontSize: '17px', color: '#374151', fontWeight: '600' }}>2️⃣ &nbsp;You will be notified to <strong>activate and register</strong> your account.</p>
            <p style={{ fontSize: '17px', color: '#374151', fontWeight: '600' }}>3️⃣ &nbsp;Upon first login, all your submitted data and documents will be <strong>fully synced</strong> with your employee workspace.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db',
    borderRadius: '8px', fontSize: '15px', background: '#ffffff', color: '#111827',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px'
  };
  const sectionHeadStyle = {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800',
    color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.8px',
    marginBottom: '14px', paddingBottom: '8px', borderBottom: '2px solid #dbeafe'
  };

  // File picker helper component
  const FilePicker = ({ label, accept, file, setFile, required, hint }) => {
    const ref = useRef();
    return (
      <div>
        <label style={labelStyle}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <div
          onClick={() => ref.current.click()}
          style={{
            border: file ? '2px solid #16a34a' : '2px dashed #d1d5db',
            borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
            background: file ? '#f0fdf4' : '#fafafa',
            display: 'flex', alignItems: 'center', gap: '10px',
            transition: 'all 0.2s'
          }}
        >
          {file
            ? <><Check size={18} style={{ color: '#16a34a', flexShrink: 0 }} /><span style={{ fontSize: '14px', color: '#15803d', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span><button type="button" onClick={(ev) => { ev.stopPropagation(); setFile(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}><X size={16} /></button></>
            : <><Upload size={18} style={{ color: '#9ca3af', flexShrink: 0 }} /><span style={{ fontSize: '14px', color: '#9ca3af' }}>Click to upload {hint || ''}</span></>
          }
        </div>
        <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0] || null)} />
      </div>
    );
  };

  return (
    <div className="onboard-container">
      {/* ── Left branding panel ────────────────────────────────────────────────── */}
      <div className="onboard-sidebar">
        <img
          src="/logo.png"
          alt="SEMCO Logo"
          style={{
            width: '160px',
            height: 'auto',
            marginBottom: '28px',
            borderRadius: '16px',
            display: 'block',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.15)',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
          }}
        />
        <h1 style={{ fontSize: '28px', fontWeight: '900', lineHeight: '1.2', marginBottom: '14px', color: '#ffffff' }}>Employee Onboarding</h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: '1.7', marginBottom: '32px' }}>
          Welcome to SEMCO Groups! Fill out the form and upload your documents to complete onboarding.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            ['✅', 'Secure & Encrypted'],
            ['📄', 'Document upload included'],
            ['⚡', 'Instant HR sync'],
            ['🔒', 'One-time invitation link']
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.88)', fontWeight: '600' }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          SEMCO Groups HR Operations · Powered by SEMCO
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────────── */}
      <div className="onboard-main">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Sparkles size={26} style={{ color: '#15803d' }} />
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>Complete Your Onboarding Form</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Welcome, <strong style={{ color: '#15803d' }}>{salutation} {name}</strong>! Fill in the details below and click Submit when ready.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '14px 16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '600' }}>
            <ShieldAlert size={18} /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

          {/* ── Personal Identity ──────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><User size={16} />Personal Identity</div>
            <div className="grid-onboard-avatar">
              <div>
                <label style={labelStyle}>Salutation</label>
                <select value={salutation} onChange={(e) => setSalutation(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Your full name" />
              </div>
            </div>
          </div>

          {/* ── Contact Information ────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><Mail size={16} />Contact Information</div>
            <div className="grid-cols-2">
              <div>
                <label style={labelStyle}>Personal Email Address</label>
                <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} style={inputStyle} placeholder="your@gmail.com" />
              </div>
              <div>
                <label style={labelStyle}>Personal Contact Number</label>
                <input type="text" value={personalContact} onChange={(e) => setPersonalContact(e.target.value)} style={inputStyle} placeholder="+91 9876543210" />
              </div>
              <div>
                <label style={labelStyle}>Office Contact Number</label>
                <input type="text" value={officeContact} onChange={(e) => setOfficeContact(e.target.value)} style={inputStyle} placeholder="+91 1234567890" />
              </div>
              <div>
                <label style={labelStyle}>Current Address</label>
                <input type="text" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} style={inputStyle} placeholder="Residential address" />
              </div>
            </div>
          </div>

          {/* ── Employment Details ─────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><Briefcase size={16} />Employment Details</div>
            <div className="grid-cols-3">
              <div>
                <label style={labelStyle}>Employee ID</label>
                <input type="text" value={empId} onChange={(e) => setEmpId(e.target.value)} style={inputStyle} placeholder="SEMCO-001" />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} style={inputStyle} placeholder="Engineering" />
              </div>
              <div>
                <label style={labelStyle}>Designation</label>
                <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={inputStyle} placeholder="Lead Engineer" />
              </div>
            </div>
          </div>

          {/* ── Dates & Age ────────────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><Calendar size={16} />Dates &amp; Age</div>
            <div className="grid-cols-3">
              <div>
                <label style={labelStyle}>Date of Birth (DOB)</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date of Joining (DOJ)</label>
                <input type="date" value={doj} onChange={(e) => setDoj(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Age (Years)</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} placeholder="Auto" min="0" max="100" />
              </div>
            </div>
          </div>

          {/* ── Document Upload ────────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><FileText size={16} />Document Upload</div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={18} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
                Upload your documents now to save time. All files are encrypted and securely stored.
                Documents marked <strong style={{ color: '#ef4444' }}>*</strong> are required for payroll and onboarding completion.
                You may skip and upload later through the <strong>Employee Document Vault</strong> once your account is active.
              </p>
            </div>

            {/* Mandatory Documents */}
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Identity & KYC Documents</p>
            <div className="grid-cols-2" style={{ marginBottom: '20px' }}>
              <FilePicker label="Aadhaar Card" accept=".pdf" file={aadhaar} setFile={setAadhaar} required hint="(PDF)" />
              <FilePicker label="PAN Card" accept=".pdf" file={pan} setFile={setPan} required hint="(PDF)" />
              <FilePicker label="Profile Photo" accept=".jpg,.jpeg,.png" file={profilePhoto} setFile={setProfilePhoto} required hint="(JPG / PNG)" />
              <FilePicker label="Academic Proofs (10th, 12th, Degree)" accept=".pdf,.jpg,.jpeg,.png" file={academicProofs} setFile={setAcademicProofs} required hint="(PDF / Image)" />
            </div>

            {/* Optional Documents */}
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Optional Documents</p>
            <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
              <FilePicker label="Bank Passbook / Cancelled Cheque" accept=".pdf,.jpg,.jpeg,.png" file={passbook} setFile={setPassbook} hint="(PDF / Image)" />
              <FilePicker label="Experience / Relieving Letter" accept=".pdf" file={experienceLetter} setFile={setExperienceLetter} hint="(PDF)" />
            </div>

            {/* Has experience toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <input type="checkbox" id="has_exp" checked={hasExperience} onChange={(e) => setHasExperience(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="has_exp" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>I have prior work experience</label>
            </div>
          </div>

          {/* ── Academic Performance ───────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><GraduationCap size={16} />Academic Performance</div>
            <div className="grid-cols-3">
              <div>
                <label style={labelStyle}>10th Percentage (%)</label>
                <input type="number" value={percentage10th} onChange={(e) => setPercentage10th(e.target.value)} style={inputStyle} placeholder="e.g. 85.5" min="0" max="100" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>12th Percentage (%)</label>
                <input type="number" value={percentage12th} onChange={(e) => setPercentage12th(e.target.value)} style={inputStyle} placeholder="e.g. 78.0" min="0" max="100" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Bachelor's CGPA</label>
                <input type="number" value={bachelorsCgpa} onChange={(e) => setBachelorsCgpa(e.target.value)} style={inputStyle} placeholder="e.g. 8.4" min="0" max="10" step="0.01" />
              </div>
            </div>
          </div>

          {/* ── Bank Details ───────────────────────────────────────────────────── */}
          <div>
            <div style={sectionHeadStyle}><CreditCard size={16} />Bank Details <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'none', letterSpacing: '0' }}>&nbsp;— Required for Payroll Processing</span></div>
            <div className="grid-cols-2">
              <div>
                <label style={labelStyle}>Bank Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} placeholder="e.g. State Bank of India" />
              </div>
              <div>
                <label style={labelStyle}>Account Holder Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} style={inputStyle} placeholder="Name as on passbook" />
              </div>
              <div>
                <label style={labelStyle}>Account Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={inputStyle} placeholder="e.g. 00112233445566" />
              </div>
              <div>
                <label style={labelStyle}>IFSC Code <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} style={inputStyle} placeholder="e.g. SBIN0001234" />
              </div>
            </div>
          </div>

          {/* ── Submit ─────────────────────────────────────────────────────────── */}
          <div style={{ paddingTop: '8px', paddingBottom: '48px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '16px 24px',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #15803d, #1d4ed8)',
                color: '#ffffff', border: 'none', borderRadius: '12px',
                fontSize: '18px', fontWeight: '800',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: submitting ? 'none' : '0 6px 20px rgba(21, 128, 61, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={20} />
              {submitting ? 'Submitting Details...' : 'Submit Onboarding Information'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
              Document uploads are optional at this stage and can be completed later via the Employee Document Vault.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
