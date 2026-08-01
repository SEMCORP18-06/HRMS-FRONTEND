import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import ConfirmModal from './ConfirmModal';
import { IndianRupee, Upload, Mail, Check, AlertTriangle, Download, FileText, Table2, ChevronDown, User, Building2, BadgeCheck, ShieldCheck, Lock, Save, Sparkles } from 'lucide-react';

const API_BASE = 'https://hrms-backend-gamma.vercel.app/api';

export default function PayrollHub({ user }) {
  const storedRole = localStorage.getItem('hr_role') || localStorage.getItem('user_role');
  const isAdmin = user?.role === 'Admin (HR)' || storedRole === 'Admin (HR)';
  const [payrolls, setPayrolls] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const [activeTab, setActiveTab] = useState(isAdmin ? 'payslips' : 'myPayslips');

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

  // Employee lookup & UAN/ESIC metadata state
  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // One-time persistent employee metadata
  const [uanNo, setUanNo] = useState('');
  const [esicNo, setEsicNo] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [birthdayDate, setBirthdayDate] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [genPayPeriod, setGenPayPeriod] = useState('July 2026');
  const [generatingPayslip, setGeneratingPayslip] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaveMsg, setMetaSaveMsg] = useState('');

  // Employee Portal "My Payslips" state
  const [myPayslips, setMyPayslips] = useState([]);
  const [loadingMyPayslips, setLoadingMyPayslips] = useState(false);

  // CTC Calculator state
  const [calcInputType, setCalcInputType] = useState('gross');
  const [calcAmount, setCalcAmount] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [ptType, setPtType] = useState('standard');
  const [calcMonth, setCalcMonth] = useState('April');

  // Export state
  const [exportLoading, setExportLoading] = useState({ pdf: false, excel: false, word: false });

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
    fetchMyPayslips();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const data = await api.payroll.list();
      setPayrolls(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(true);
      const empList = Array.isArray(data) ? data : (data.employees || []);
      setAllEmployees(empList);
      const depts = [...new Set(empList.map(e => e.department).filter(Boolean))].sort();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchMyPayslips = async () => {
    setLoadingMyPayslips(true);
    try {
      const data = await api.payroll.getMyPayslips();
      setMyPayslips(data || []);
    } catch (err) {
      console.error('Failed to load my payslips:', err);
    } finally {
      setLoadingMyPayslips(false);
    }
  };

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    setSelectedEmpId('');
    setSelectedEmployee(null);
    if (dept) {
      const filtered = allEmployees.filter(e => e.department === dept);
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees([]);
    }
  };

  const handleEmpChange = (empId) => {
    setSelectedEmpId(empId);
    const emp = allEmployees.find(e => (e._id || e.id || e.employee_code) === empId || String(e._id) === empId);
    setSelectedEmployee(emp || null);
    
    // Auto-populate UAN, ESIC, Personal Email, Birthday, and Gross Salary
    setUanNo(emp?.uan_no || emp?.uan || '');
    setEsicNo(emp?.esic_no || emp?.esic || '');
    setPersonalEmail(emp?.personal_email || emp?.email || '');
    setBirthdayDate(emp?.birthday || emp?.dob || '');
    setGrossSalary(emp?.gross_salary || emp?.gross || '');
    setMetaSaveMsg('');

    // Clear previous result when employee changes
    setCalcResult(null);
    setCalcAmount('');
  };

  const handleSaveEmployeeMeta = async () => {
    if (!selectedEmpId) return;
    setSavingMeta(true);
    setMetaSaveMsg('');
    try {
      await api.payroll.updateMeta(selectedEmpId, {
        uan_no: uanNo,
        esic_no: esicNo,
        personal_email: personalEmail,
        birthday: birthdayDate,
        gross_salary: grossSalary
      });
      setMetaSaveMsg('UAN, ESIC, Gross Salary & Personal Email saved permanently to employee profile!');
      fetchEmployees();
    } catch (err) {
      console.error(err);
      setMetaSaveMsg(`Failed to save: ${err.message}`);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleGeneratePayslipFromGross = async () => {
    if (!selectedEmpId) {
      alert('Please select an employee first.');
      return;
    }
    const amt = parseFloat(grossSalary);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter or save a valid Gross Salary for this employee first.');
      return;
    }
    setGeneratingPayslip(true);
    try {
      const res = await api.payroll.generate({
        employee_id: selectedEmpId,
        pay_period: genPayPeriod,
        gross_salary: amt,
        pt_type: ptType
      });
      alert(res.message || 'Payslip generated successfully!');
      fetchPayrolls();
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGeneratingPayslip(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Import Payroll CSV',
      message: `Are you sure you want to upload and parse payroll records from "${file.name}"?`,
      confirmText: 'Import CSV',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        setUploadStatus('Uploading and parsing CSV payroll records...');
        const formData = new FormData();
        formData.append('file', file);
        try {
          const result = await api.payroll.upload(formData);
          setUploadStatus(`Successfully imported ${result.imported} payroll records!`);
          fetchPayrolls();
        } catch (err) {
          setUploadStatus(`Import failed: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleEmailPayslip = (payrollId, empName = 'Employee') => {
    setConfirmConfig({
      isOpen: true,
      title: 'Release & Email Password-Protected Payslip',
      message: `Are you sure you want to release and email official password-protected payslip PDF to ${empName}?

Note: The attached PDF will be encrypted using Option 2 password standard (First 4 letters of name UPPERCASE + Birth Year, e.g. JOHN1995).`,
      confirmText: 'Release & Send Email',
      type: 'info',
      onConfirm: async () => {
        closeConfirm();
        setEmailStatus(prev => ({ ...prev, [payrollId]: 'sending' }));
        try {
          await api.payroll.email(payrollId);
          setEmailStatus(prev => ({ ...prev, [payrollId]: 'sent' }));
          fetchPayrolls();
        } catch (err) {
          setEmailStatus(prev => ({ ...prev, [payrollId]: 'failed' }));
          alert(`Mailing failed: ${err.message}`);
        }
      },
      onCancel: closeConfirm
    });
  };

  const handleDownloadPayslip = async (payrollId, period) => {
    try {
      const token = localStorage.getItem('hr_token');
      const res = await fetch(api.payroll.downloadUrl(payrollId), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${period}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download encrypted payslip PDF: ' + err.message);
    }
  };

  const triggerFileSelect = () => fileInputRef.current.click();

  const runCTCFormula = (grossVal) => {
    const basic = grossVal * 0.5;
    const hra = basic * 0.4;
    const conveyance = 1200;
    const education = 1000;
    const medical = 1250;
    const bonus = Math.round(basic * 0.0833);
    const grossABCDEF = grossVal - bonus;
    const special = grossABCDEF - (basic + hra + conveyance + education + medical);
    const pfBase = Math.min(basic, 15000);
    const employeePF = pfBase * 0.12;
    const employeeESIC = grossVal <= 21000 ? (grossVal * 0.0075) : 0;
    let pt = 200;
    let pt_yearly = 2400;
    if (ptType === 'yearly2500_feb') {
      pt_yearly = 2500;
      if (calcMonth === 'February') {
        pt = 300;
      } else {
        pt = 200;
      }
    } else if (ptType === 'yearly2500_mar') {
      pt_yearly = 2500;
      if (calcMonth === 'March') {
        pt = 300;
      } else {
        pt = 200;
      }
    }
    const totalDeductions = employeePF + employeeESIC + pt;
    const netTakeHome = grossVal - totalDeductions;
    const employerPF = employeePF;
    const employerESIC = grossVal <= 21000 ? (grossVal * 0.0325) : 0;
    const gratuity = Math.round(basic * 0.0481);
    const others = 5000;
    const totalCTC = grossVal + employerPF + employerESIC + gratuity + others;

    return {
      basic, hra, conveyance, education, medical, special,
      gross: grossABCDEF, bonus, finalGross: grossVal,
      employeePF, employeeESIC, pt, pt_yearly, totalDeductions, netTakeHome,
      employerPF, employerESIC, gratuity, others, totalCTC
    };
  };

  const handleCalculateCTC = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const amt = parseFloat(calcAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid positive salary amount.');
      return;
    }
    let gross = amt;
    if (calcInputType === 'net') {
      let low = amt, high = amt * 3;
      for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        const res = runCTCFormula(mid);
        if (res.netTakeHome < amt) low = mid;
        else high = mid;
      }
      gross = (low + high) / 2;
    }
    setCalcResult(runCTCFormula(gross));
  };

  useEffect(() => {
    if (!calcAmount || isNaN(parseFloat(calcAmount))) return;
    const amt = parseFloat(calcAmount);
    let gross = amt;
    if (calcInputType === 'net') {
      let low = amt, high = amt * 3;
      for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        const res = runCTCFormula(mid);
        if (res.netTakeHome < amt) low = mid;
        else high = mid;
      }
      gross = (low + high) / 2;
    }
    setCalcResult(runCTCFormula(gross));
  }, [ptType, calcMonth, calcInputType]);

  const handleExportCTC = async (fmt) => {
    if (!calcResult) {
      alert('Please calculate CTC first.');
      return;
    }
    if (!selectedEmployee) {
      alert('Please select a Department and Employee from the dropdown first.');
      return;
    }
    setExportLoading(prev => ({ ...prev, [fmt]: true }));
    try {
      const employeeInfo = {
        name: selectedEmployee.name || 'N/A',
        emp_id: selectedEmployee.emp_id || selectedEmployee.employee_code || selectedEmployee.id || 'N/A',
        role: selectedEmployee.role || selectedEmployee.designation || 'N/A',
        department: selectedEmployee.department || selectedDept || 'N/A',
      };
      const ctcData = {
        basic: calcResult.basic,
        hra: calcResult.hra,
        conveyance: calcResult.conveyance,
        education: calcResult.education,
        medical: calcResult.medical,
        special: calcResult.special,
        gross: calcResult.gross,
        bonus: calcResult.bonus,
        finalGross: calcResult.finalGross,
        employeePF: calcResult.employeePF,
        employeeESIC: calcResult.employeeESIC,
        pt: calcResult.pt,
        pt_yearly: calcResult.pt_yearly,
        totalDeductions: calcResult.totalDeductions,
        netTakeHome: calcResult.netTakeHome,
        employerPF: calcResult.employerPF,
        employerESIC: calcResult.employerESIC,
        gratuity: calcResult.gratuity,
        others: calcResult.others,
        totalCTC: calcResult.totalCTC,
      };

      const res = await fetch(`${API_BASE}/payroll/ctc/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hr_token')}`
        },
        body: JSON.stringify({ format: fmt, employee_info: employeeInfo, ctc_data: ctcData, location: 'Pune' }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const nameMap = { pdf: 'CTC_Breakup.pdf', excel: 'CTC_Breakup.xlsx', word: 'CTC_Breakup.docx' };
      const filename = nameMap[fmt] || `CTC_Breakup.${fmt}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExportLoading(prev => ({ ...prev, [fmt]: false }));
    }
  };

  const handleCopyMarkdown = async () => {
    if (!calcResult) return;
    const f = (val) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tbl = `| Component | Monthly (INR) | Yearly (INR) |
| :--- | :--- | :--- |
| **Basic Salary** | ${f(calcResult.basic)} | ${f(calcResult.basic * 12)} |
| **HRA** | ${f(calcResult.hra)} | ${f(calcResult.hra * 12)} |
| **Conveyance Allowance** | ${f(calcResult.conveyance)} | ${f(calcResult.conveyance * 12)} |
| **Education Allowance** | ${f(calcResult.education)} | ${f(calcResult.education * 12)} |
| **Medical Allowance** | ${f(calcResult.medical)} | ${f(calcResult.medical * 12)} |
| **Special Allowance** | ${f(calcResult.special)} | ${f(calcResult.special * 12)} |
| **Gross Salary** | ${f(calcResult.gross)} | ${f(calcResult.gross * 12)} |
| **Statutory Bonus (8.33%)** | ${f(calcResult.bonus)} | ${f(calcResult.bonus * 12)} |
| **Final Gross Salary** | **${f(calcResult.finalGross)}** | **${f(calcResult.finalGross * 12)}** |
| **Employee Deductions** | | |
| - PF (12%, Max base 15k) | ${f(calcResult.employeePF)} | ${f(calcResult.employeePF * 12)} |
| - ESIC (0.75%) | ${f(calcResult.employeeESIC)} | ${f(calcResult.employeeESIC * 12)} |
| - Professional Tax | ${f(calcResult.pt)} | ${f(calcResult.pt_yearly)} |
| **Total Deductions** | **${f(calcResult.totalDeductions)}** | **${f((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + calcResult.pt_yearly)}** |
| **Net Take Home Salary** | **${f(calcResult.netTakeHome)}** | **${f((calcResult.finalGross * 12) - ((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + calcResult.pt_yearly))}** |
| **Employer Contributions** | | |
| - PF (Employer) | ${f(calcResult.employerPF)} | ${f(calcResult.employerPF * 12)} |
| - ESIC (3.25%) | ${f(calcResult.employerESIC)} | ${f(calcResult.employerESIC * 12)} |
| - Gratuity (4.81%) | ${f(calcResult.gratuity)} | ${f(calcResult.gratuity * 12)} |
| - Others | ${f(calcResult.others)} | ${f(calcResult.others * 12)} |
| **Total CTC of Employee** | **${f(calcResult.totalCTC)}** | **${f(calcResult.totalCTC * 12)}** |`;
    try {
      await navigator.clipboard.writeText(tbl);
      alert('Markdown table copied to clipboard!');
    } catch (err) {
      alert('Failed to copy: ' + err.message);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────
  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    borderRadius: '16px',
    padding: '22px',
    marginBottom: '20px',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#94a3b8',
    marginBottom: '6px',
    display: 'block',
  };

  const selectStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    borderRadius: '10px',
    width: '100%',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  };

  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '8px',
    width: '100%',
    fontSize: '13px',
    outline: 'none',
  };

  const exportBtnStyle = (color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '10px',
    border: `1px solid ${color}40`,
    background: `${color}12`,
    color: color,
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  // Safe number formatter — never crashes on undefined/null
  const safeFmt = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#10b98115', color: '#10b981' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <h2>Payroll Hub & Payslips Generator</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              Manage employee payslip releases, UAN/ESIC permanent profiles, and encrypted PDF downloads.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('myPayslips')}
              className={activeTab === 'myPayslips' ? 'btn-primary' : 'back-btn'}
              style={{ margin: 0, padding: '8px 16px', fontSize: '13px' }}
            >
              My Released Payslips
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('payslips')}
                className={activeTab === 'payslips' ? 'btn-primary' : 'back-btn'}
                style={{ margin: 0, padding: '6px 14px', fontSize: '12px' }}
              >
                Payslips Dispatcher & UAN/ESIC Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ctcCalculator')}
                className={activeTab === 'ctcCalculator' ? 'btn-primary' : 'back-btn'}
                style={{ margin: 0, padding: '6px 14px', fontSize: '12px' }}
              >
                CTC Break-up Generator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('myPayslips')}
                className={activeTab === 'myPayslips' ? 'btn-primary' : 'back-btn'}
                style={{ margin: 0, padding: '6px 14px', fontSize: '12px' }}
              >
                My Personal Payslips
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Employee Portal: My Payslips Tab ──────────────────────────────── */}
      {activeTab === 'myPayslips' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <ShieldCheck size={24} style={{ color: '#10b981' }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>My Password-Protected Payslips</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>View and download your official monthly payslips securely.</p>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#f59e0b' }}>
            <strong>🔒 Password Protection Notice:</strong><br />
            Downloaded PDF payslips remain encrypted on your disk. To open your downloaded PDF file, enter your password:<br />
            <span style={{ fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
              First 4 Letters of your Name (UPPERCASE) + Year of Birth (e.g. JOHN1995)
            </span>
          </div>

          {loadingMyPayslips ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading your released payslips...</div>
          ) : myPayslips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              No released payslips found for your account. When HR Admin releases your monthly payslips, they will appear here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {myPayslips.map(pr => (
                <div key={pr.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>{pr.pay_period}</span>
                      <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>RELEASED</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Net Salary in Hand:</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginBottom: '14px' }}>
                      ₹{Number(pr.net_salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPayslip(pr.id, pr.pay_period)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Download size={16} />
                    Download Password PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Payslips Tab (Admin Management) ─────────────────────────────────── */}
      {activeTab === 'payslips' && isAdmin && (
        <div className="grid-1-2">
          <div>
            {/* CSV Import Box */}
            <div style={cardStyle}>
              <h3 style={{ marginBottom: '15px' }}>Upload Payroll Document</h3>
              <div className="upload-zone" onClick={triggerFileSelect}>
                <Upload size={32} style={{ marginBottom: '10px', color: '#10b981' }} />
                <p style={{ fontSize: '14px', fontWeight: '500' }}>Click to Browse spreadsheet file</p>
                <p style={{ fontSize: '11px', marginTop: '6px' }}>Supported formats: .csv, .xlsx, .xls, .ods</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls, .ods"
                style={{ display: 'none' }}
              />
              {uploadStatus && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: uploadStatus.includes('failed') ? '#ef4444' : '#10b981' }}>
                  {uploadStatus}
                </div>
              )}
            </div>

            {/* Permanent Employee UAN/ESIC Metadata Entry Box */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: '#3b82f6' }} />
                Employee Permanent UAN & ESIC Profile
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                Enter UAN & ESIC numbers once per employee. They will persist permanently and auto-fetch for all future monthly payslips.
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Select Department</label>
                <select value={selectedDept} onChange={(e) => handleDeptChange(e.target.value)} style={selectStyle}>
                  <option value="">-- All Departments --</option>
                  {departments.map(d => (
                    <option key={d} value={d} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Select Employee</label>
                <select value={selectedEmpId} onChange={(e) => handleEmpChange(e.target.value)} style={selectStyle}>
                  <option value="">-- Select Employee --</option>
                  {(selectedDept ? filteredEmployees : allEmployees).map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {emp.name} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployee && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px', display: 'block' }}>Gross Salary ₹ (Permanent / Default CTC Base)</label>
                    <input
                      type="number"
                      placeholder="e.g. 32000"
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', display: 'block' }}>UAN No. (Permanent)</label>
                    <input
                      type="text"
                      placeholder="e.g. 100987654321"
                      value={uanNo}
                      onChange={(e) => setUanNo(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', display: 'block' }}>ESIC No. (Permanent)</label>
                    <input
                      type="text"
                      placeholder="e.g. 3123456789"
                      value={esicNo}
                      onChange={(e) => setEsicNo(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', display: 'block' }}>Personal Email ID (For Payslip Email Release)</label>
                    <input
                      type="email"
                      placeholder="e.g. employee.personal@gmail.com"
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', display: 'block' }}>Date of Birth / Birthday (For Password Generation)</label>
                    <input
                      type="date"
                      value={birthdayDate}
                      onChange={(e) => setBirthdayDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {metaSaveMsg && (
                    <div style={{ fontSize: '12px', color: metaSaveMsg.includes('Failed') ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                      {metaSaveMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveEmployeeMeta}
                    disabled={savingMeta}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '4px'
                    }}
                  >
                    <Save size={16} />
                    {savingMeta ? 'Saving Metadata...' : 'Save Profile Metadata Permanently'}
                  </button>

                  {/* Generate Monthly Payslip Action */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '6px', display: 'block' }}>
                      ⚡ Generate Payslip for Month (Using Saved Gross & CTC Formula)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Pay Period (e.g. July 2026)"
                        value={genPayPeriod}
                        onChange={(e) => setGenPayPeriod(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePayslipFromGross}
                        disabled={generatingPayslip}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {generatingPayslip ? 'Generating...' : 'Generate Payslip'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!selectedEmployee && (
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px dashed rgba(59, 130, 246, 0.3)', color: '#3b82f6', fontSize: '13px', lineHeight: '1.5' }}>
                  👈 <strong>Select an employee from the dropdown above</strong> to view, save, or update their permanent Gross Salary, UAN, ESIC numbers, and generate monthly payslips.
                </div>
              )}
            </div>
          </div>

          {/* Payslips Dispatch List */}
          <div style={cardStyle}>
            <h3 style={{ marginBottom: '15px' }}>Monthly Payslip Dispatches</h3>
            {payrolls.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                No payroll records found. Import a CSV or calculate CTC above to generate records.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Pay Period</th>
                      <th>Gross Salary</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map(pr => (
                      <tr key={pr.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{pr.employee?.name || 'N/A'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{pr.employee?.email}</div>
                        </td>
                        <td>{pr.pay_period}</td>
                        <td>₹{Number((pr.base_salary || 0) + (pr.allowances || 0)).toLocaleString('en-IN')}</td>
                        <td style={{ color: '#10b981', fontWeight: '700' }}>₹{Number(pr.net_salary || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`status-badge ${pr.status === 'SENT' ? 'status-active' : 'status-pending'}`}>
                            {pr.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleEmailPayslip(pr.id, pr.employee?.name)}
                            disabled={emailStatus[pr.id] === 'sending'}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Mail size={12} />
                            {emailStatus[pr.id] === 'sending' ? 'Sending...' : pr.status === 'SENT' ? 'Resend Encrypted Email' : 'Release Encrypted Email'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CTC Calculator Tab ────────────────────────────────────────────── */}
      {activeTab === 'ctcCalculator' && isAdmin && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Filter by Department</label>
                <select value={selectedDept} onChange={(e) => handleDeptChange(e.target.value)} style={selectStyle}>
                  <option value="">-- All Departments --</option>
                  {departments.map(d => (
                    <option key={d} value={d} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Select Target Employee</label>
                <select value={selectedEmpId} onChange={(e) => handleEmpChange(e.target.value)} style={selectStyle}>
                  <option value="">-- Select Employee --</option>
                  {(selectedDept ? filteredEmployees : allEmployees).map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {emp.name} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div>
                <label style={labelStyle}>Input Type</label>
                <select value={calcInputType} onChange={(e) => setCalcInputType(e.target.value)} style={selectStyle}>
                  <option value="gross" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Final Gross Salary</option>
                  <option value="net" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Net Take-Home Salary</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Monthly Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 32000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Pay Month</label>
                <select value={calcMonth} onChange={(e) => setCalcMonth(e.target.value)} style={selectStyle}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Professional Tax (PT)</label>
                <select value={ptType} onChange={(e) => setPtType(e.target.value)} style={selectStyle}>
                  <option value="standard" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>₹200/month (₹2,400/yr)</option>
                  <option value="yearly2500_feb" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>₹200/month, Feb ₹300 (₹2,500/yr)</option>
                  <option value="yearly2500_mar" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>₹200/month, March ₹300 (₹2,500/yr)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCalculateCTC}
              className="btn-primary"
              style={{ marginTop: '15px', width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold' }}
            >
              Calculate Mathematically Flawless CTC Break-up
            </button>
          </div>

          {/* CTC Results Breakdown */}
          {calcResult && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>CTC Break-up Results</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedEmployee && (
                    <button
                      type="button"
                      onClick={async () => {
                        setGrossSalary(calcResult.finalGross);
                        setSavingMeta(true);
                        try {
                          await api.payroll.updateMeta(selectedEmpId, { gross_salary: calcResult.finalGross });
                          alert(`Successfully saved Gross Salary ₹${safeFmt(calcResult.finalGross)} to ${selectedEmployee.name}'s profile permanently!`);
                          fetchEmployees();
                        } catch (err) {
                          alert(`Failed to save: ${err.message}`);
                        } finally {
                          setSavingMeta(false);
                        }
                      }}
                      style={exportBtnStyle('#8b5cf6')}
                    >
                      <Save size={14} /> Save Gross (₹{safeFmt(calcResult.finalGross)}) to Profile
                    </button>
                  )}
                  <button type="button" onClick={() => handleExportCTC('pdf')} style={exportBtnStyle('#ef4444')}>
                    <Download size={14} /> PDF
                  </button>
                  <button type="button" onClick={() => handleExportCTC('excel')} style={exportBtnStyle('#10b981')}>
                    <Download size={14} /> Excel
                  </button>
                  <button type="button" onClick={() => handleExportCTC('word')} style={exportBtnStyle('#3b82f6')}>
                    <Download size={14} /> Word
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th style={{ textAlign: 'right' }}>Monthly - INR</th>
                      <th style={{ textAlign: 'right' }}>Yearly - INR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Basic Salary</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.basic)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.basic * 12)}</td></tr>
                    <tr><td>HRA</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.hra)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.hra * 12)}</td></tr>
                    <tr><td>Conveyance Allowance (max=Rs. 1600)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.conveyance)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.conveyance * 12)}</td></tr>
                    <tr><td>Education Allowance (max = Rs. 1200)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.education)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.education * 12)}</td></tr>
                    <tr><td>Medical Allowance (max=Rs.1250)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.medical)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.medical * 12)}</td></tr>
                    <tr><td>Special Allowance (Rest Amount)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.special)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.special * 12)}</td></tr>
                    <tr style={{ background: 'rgba(16, 185, 129, 0.05)', fontWeight: 'bold' }}><td>Gross Salary [A+B+C+D+E+F]</td><td style={{ textAlign: 'right', color: '#10b981' }}>{safeFmt(calcResult.gross)}</td><td style={{ textAlign: 'right', color: '#10b981' }}>{safeFmt(calcResult.gross * 12)}</td></tr>
                    <tr style={{ color: '#94a3b8' }}><td>Other Benefits</td><td style={{ textAlign: 'right' }}>-</td><td style={{ textAlign: 'right' }}>-</td></tr>
                    <tr><td>Statutory Bonus (8.33% of Rs. One Basic)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.bonus)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.bonus * 12)}</td></tr>
                    <tr style={{ background: 'rgba(245, 208, 54, 0.15)', fontWeight: 'bold' }}><td>Gross Salary</td><td style={{ textAlign: 'right', color: '#10b981' }}>{safeFmt(calcResult.finalGross)}</td><td style={{ textAlign: 'right', color: '#10b981' }}>{safeFmt(calcResult.finalGross * 12)}</td></tr>
                    <tr><td colSpan={3} style={{ height: '6px', padding: 0, border: 'none' }}></td></tr>
                    <tr style={{ background: 'rgba(239, 68, 68, 0.04)' }}><td style={{ fontWeight: 'bold' }}>Deductions</td><td style={{ textAlign: 'right' }}>-</td><td style={{ textAlign: 'right' }}></td></tr>
                    <tr><td>PF (Employee Contribution) 12% of Basic</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employeePF)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employeePF * 12)}</td></tr>
                    <tr><td>ESIC (Employee Contribution) 0.75% of</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employeeESIC)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employeeESIC * 12)}</td></tr>
                    <tr style={{ color: '#94a3b8' }}><td>Other Deduction</td><td style={{ textAlign: 'right' }}>-</td><td style={{ textAlign: 'right' }}>-</td></tr>
                    <tr><td>Professional Tax</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.pt)}</td><td style={{ textAlign: 'right' }}></td></tr>
                    <tr style={{ background: 'rgba(239, 68, 68, 0.08)', fontWeight: 'bold' }}><td>Total Deduction</td><td style={{ textAlign: 'right', color: '#ef4444' }}>{safeFmt(calcResult.totalDeductions)}</td><td style={{ textAlign: 'right', color: '#ef4444' }}>{safeFmt((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + (calcResult.pt_yearly || 0))}</td></tr>
                    <tr style={{ background: 'rgba(245, 208, 54, 0.15)', fontWeight: 'bold' }}><td>Net Take Home Salary (Gross Salary - Total Deductions)</td><td style={{ textAlign: 'right', color: '#3b82f6' }}>{safeFmt(calcResult.netTakeHome)}</td><td style={{ textAlign: 'right', color: '#3b82f6' }}>{safeFmt((calcResult.finalGross * 12) - ((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + (calcResult.pt_yearly || 0)))}</td></tr>
                    <tr><td colSpan={3} style={{ height: '6px', padding: 0, border: 'none' }}></td></tr>
                    <tr style={{ background: 'rgba(139, 92, 246, 0.04)' }}><td style={{ fontWeight: 'bold' }}>Monthly CTC</td><td style={{ textAlign: 'right' }}></td><td style={{ textAlign: 'right' }}></td></tr>
                    <tr><td>PF (Employer Contribution)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employerPF)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employerPF * 12)}</td></tr>
                    <tr><td>ESIC (Employer Contribution) (3.25% of Gross Salary)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employerESIC)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.employerESIC * 12)}</td></tr>
                    <tr><td>Gratuity (4.81% of Basic)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.gratuity)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.gratuity * 12)}</td></tr>
                    <tr><td>Others (Insurance, Office Consumables, IT equipments etc)</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.others)}</td><td style={{ textAlign: 'right' }}>{safeFmt(calcResult.others * 12)}</td></tr>
                    <tr style={{ background: 'rgba(139, 92, 246, 0.1)', fontWeight: 'bold' }}><td>CTC of Employee</td><td style={{ textAlign: 'right', color: '#8b5cf6' }}>{safeFmt(calcResult.totalCTC)}</td><td style={{ textAlign: 'right', color: '#8b5cf6' }}>{safeFmt(calcResult.totalCTC * 12)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal {...confirmConfig} />
    </div>
  );
}
