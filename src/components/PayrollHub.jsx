import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { IndianRupee, Upload, Mail, Check, AlertTriangle, Download, FileText, Table2, ChevronDown, User, Building2, BadgeCheck } from 'lucide-react';

const API_BASE = 'https://hrms-backend-gamma.vercel.app/api';

export default function PayrollHub() {
  const [payrolls, setPayrolls] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const [activeTab, setActiveTab] = useState('payslips');

  // Employee lookup state
  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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
  }, []);

  const fetchPayrolls = async () => {
    try {
      const data = await api.payroll.list();
      setPayrolls(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('hr_token');
      const res = await fetch(`${API_BASE}/employees`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const empList = Array.isArray(data) ? data : (data.employees || data.items || []);
      setAllEmployees(empList);
      const depts = [...new Set(empList.map(e => e.department).filter(Boolean))].sort();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
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
    // Clear previous result when employee changes
    setCalcResult(null);
    setCalcAmount('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
  };

  const handleEmailPayslip = async (payrollId) => {
    setEmailStatus(prev => ({ ...prev, [payrollId]: 'sending' }));
    try {
      await api.payroll.email(payrollId);
      setEmailStatus(prev => ({ ...prev, [payrollId]: 'sent' }));
      fetchPayrolls();
    } catch (err) {
      setEmailStatus(prev => ({ ...prev, [payrollId]: 'failed' }));
      await alert(`Mailing failed: ${err.message}`);
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

  const handleCalculateCTC = async () => {
    const amt = parseFloat(calcAmount);
    if (isNaN(amt) || amt <= 0) {
      await alert('Please enter a valid positive salary amount.');
      return;
    }
    let gross = amt;
    if (calcInputType === 'net') {
      let low = amt, high = amt * 3, iterations = 0;
      while (high - low > 0.001 && iterations < 100) {
        const mid = (low + high) / 2;
        const res = runCTCFormula(mid);
        if (res.netTakeHome < amt) low = mid; else high = mid;
        iterations++;
      }
      gross = (low + high) / 2;
    }
    setCalcResult(runCTCFormula(gross));
  };

  useEffect(() => {
    const amt = parseFloat(calcAmount);
    if (!isNaN(amt) && amt > 0) {
      let gross = amt;
      if (calcInputType === 'net') {
        let low = amt, high = amt * 3, iterations = 0;
        while (high - low > 0.001 && iterations < 100) {
          const mid = (low + high) / 2;
          const res = runCTCFormula(mid);
          if (res.netTakeHome < amt) low = mid; else high = mid;
          iterations++;
        }
        gross = (low + high) / 2;
      }
      setCalcResult(runCTCFormula(gross));
    }
  }, [ptType, calcMonth, calcInputType]);

  // ─── Export Handler ───────────────────────────────────────────────────
  const handleExport = async (fmt) => {
    if (!calcResult) {
      alert('Please calculate CTC first.');
      return;
    }
    setExportLoading(prev => ({ ...prev, [fmt]: true }));

    const employeeInfo = selectedEmployee ? {
      name: selectedEmployee.name || selectedEmployee.full_name || 'N/A',
      emp_id: selectedEmployee.employee_code || selectedEmployee.emp_id || selectedEmployee._id || 'N/A',
      department: selectedEmployee.department || selectedDept || 'N/A',
      designation: selectedEmployee.designation || selectedEmployee.job_title || selectedEmployee.position || 'N/A',
    } : {
      name: 'N/A', emp_id: 'N/A', department: 'N/A', designation: 'N/A'
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

    try {
      const token = localStorage.getItem('hr_token');
      const res = await fetch(`${API_BASE}/payroll/ctc/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ format: fmt, employee_info: employeeInfo, ctc_data: ctcData, location: 'Pune' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const extMap = { pdf: 'pdf', excel: 'xlsx', word: 'docx' };
      const nameMap = { pdf: 'CTC_Breakup.pdf', excel: 'CTC_Breakup.xlsx', word: 'CTC_Breakup.docx' };
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nameMap[fmt];
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
      await alert('Markdown table copied to clipboard!');
    } catch (err) {
      await alert('Failed to copy: ' + err.message);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────
  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-glass)',
    borderRadius: '16px',
    padding: '22px',
    marginBottom: '20px',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '600',
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
    appearance: 'none',
  };

  const empCardStyle = {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(59,130,246,0.07))',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '14px',
    padding: '18px 22px',
    marginTop: '18px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 24px',
  };

  const empFieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
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

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#10b98115', color: '#10b981' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <h2>Payroll Hub & CTC Break-up</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Manage employee payroll dispatches or compute mathematically flawless CTC break-ups.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
          <button
            onClick={() => setActiveTab('payslips')}
            className={activeTab === 'payslips' ? 'btn-primary' : 'back-btn'}
            style={{ margin: 0, padding: '6px 14px', fontSize: '12px' }}
          >
            Payslips Dispatcher
          </button>
          <button
            onClick={() => setActiveTab('ctcCalculator')}
            className={activeTab === 'ctcCalculator' ? 'btn-primary' : 'back-btn'}
            style={{ margin: 0, padding: '6px 14px', fontSize: '12px' }}
          >
            CTC Break-up Generator
          </button>
        </div>
      </div>

      {/* ── Payslips Tab ───────────────────────────────────────────── */}
      {activeTab === 'payslips' ? (
        <div className="grid-1-2">
          <div>
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
                style={{ display: 'none' }}
                accept=".csv, .xlsx, .xls, .ods"
                onChange={handleFileUpload}
                disabled={loading}
              />
              {uploadStatus && (
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #10b981' }}>
                  {uploadStatus}
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#fbbf24' }}>
                <AlertTriangle size={16} /> AES-256 PDF Security Info
              </h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                All payslips are compiled dynamically. Before delivery, they are encrypted with 256-bit AES.
                The default password key for employees is <strong>their employee email ID</strong> (e.g. <code>alice@acme.com</code>).
              </p>
            </div>
          </div>
          <div>
            <h3 style={{ marginBottom: '15px' }}>Generated Payslips & Dispatch Log</h3>
            {payrolls.length === 0 ? (
              <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-glass)', textAlign: 'center', color: '#64748b' }}>
                No payslip records generated yet. Upload a CSV file to begin.
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period</th><th>Employee</th><th>Net Salary</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map(pr => (
                      <tr key={pr.id}>
                        <td>{pr.pay_period}</td>
                        <td>
                          <div style={{ fontWeight: '500' }}>{pr.employee?.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{pr.employee?.email}</div>
                        </td>
                        <td>₹{pr.net_salary?.toFixed(2)}</td>
                        <td><span className={`status-pill ${pr.status.toLowerCase()}`}>{pr.status}</span></td>
                        <td>
                          {pr.status === 'SENT' ? (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <Check size={14} /> Sent
                            </span>
                          ) : (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleEmailPayslip(pr.id)}
                              disabled={emailStatus[pr.id] === 'sending'}
                            >
                              <Mail size={12} /> {emailStatus[pr.id] === 'sending' ? 'Sending...' : 'Email Encrypted PDF'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ── CTC Calculator Tab ─────────────────────────────────────── */
        <div>
          {/* Employee Lookup Panel */}
          <div style={{ ...cardStyle, borderColor: 'rgba(16,185,129,0.2)' }}>
            <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} style={{ color: '#10b981' }} /> Employee Lookup
            </h3>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '18px' }}>
              Select department and employee to auto-fill the details card.
            </p>

            <div className="grid-cols-2">
              {/* Department dropdown */}
              <div>
                <label style={labelStyle}>Department</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedDept}
                    onChange={e => handleDeptChange(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">— Select Department —</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Employee dropdown */}
              <div>
                <label style={labelStyle}>Employee Name</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedEmpId}
                    onChange={e => handleEmpChange(e.target.value)}
                    style={{ ...selectStyle, opacity: selectedDept ? 1 : 0.45, cursor: selectedDept ? 'pointer' : 'not-allowed' }}
                    disabled={!selectedDept}
                  >
                    <option value="">— Select Employee —</option>
                    {filteredEmployees.map(e => {
                      const id = String(e._id || e.id || e.employee_code || '');
                      return <option key={id} value={id}>{e.name || e.full_name}</option>;
                    })}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            {/* Employee Info Card */}
            {selectedEmployee && (
              <div className="payroll-emp-card">
                <div style={empFieldStyle}>
                  <span style={{ ...labelStyle, marginBottom: 0, color: '#64748b' }}>Name</span>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{selectedEmployee.name || selectedEmployee.full_name || '—'}</span>
                </div>
                <div style={empFieldStyle}>
                  <span style={{ ...labelStyle, marginBottom: 0, color: '#64748b' }}>Employee ID</span>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#10b981', fontFamily: 'monospace' }}>{selectedEmployee.employee_code || selectedEmployee.emp_id || '—'}</span>
                </div>
                <div style={empFieldStyle}>
                  <span style={{ ...labelStyle, marginBottom: 0, color: '#64748b' }}>Department</span>
                  <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={12} style={{ color: '#6366f1' }} />
                    {selectedEmployee.department || selectedDept || '—'}
                  </span>
                </div>
                <div style={empFieldStyle}>
                  <span style={{ ...labelStyle, marginBottom: 0, color: '#64748b' }}>Designation</span>
                  <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BadgeCheck size={12} style={{ color: '#f59e0b' }} />
                    {selectedEmployee.designation || selectedEmployee.job_title || selectedEmployee.position || '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CTC Input Panel */}
          <div style={cardStyle}>
            <h3 style={{ marginBottom: '6px' }}>Statutory Salary CTC Calculator</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
              Input target monthly numbers to output a mathematically flawless CTC break-up sheet.
            </p>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Input Target Component</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={calcInputType}
                    onChange={e => setCalcInputType(e.target.value)}
                    style={{ ...selectStyle, minWidth: '200px', width: 'auto' }}
                  >
                    <option value="gross">Target Monthly Gross Salary</option>
                    <option value="net">Target Monthly Net Take Home</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Target Monthly Value (INR)</label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={e => setCalcAmount(e.target.value)}
                  placeholder="e.g. 32000"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    width: '180px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Professional Tax Option</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={ptType}
                    onChange={e => setPtType(e.target.value)}
                    style={{ ...selectStyle, minWidth: '200px', width: 'auto' }}
                  >
                    <option value="standard">Standard (₹200 / Month)</option>
                    <option value="yearly2500_feb">₹2500 Yearly (Feb/March ₹300, others ₹200)</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Calculation Month</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={calcMonth}
                    onChange={e => setCalcMonth(e.target.value)}
                    style={{ ...selectStyle, minWidth: '150px', width: 'auto' }}
                  >
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleCalculateCTC}
                style={{ margin: 0, padding: '10px 22px', height: '40px', alignSelf: 'flex-end' }}
              >
                Compute Breakdown
              </button>
            </div>
          </div>

          {/* Results */}
          {calcResult && (
            <div style={cardStyle}>
              {/* Header row: title + export buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Calculation Breakdown Results</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    style={exportBtnStyle('#ef4444')}
                    onClick={() => handleExport('pdf')}
                    disabled={exportLoading.pdf}
                  >
                    <FileText size={13} />
                    {exportLoading.pdf ? 'Generating…' : 'Export PDF'}
                  </button>
                  <button
                    style={exportBtnStyle('#10b981')}
                    onClick={() => handleExport('excel')}
                    disabled={exportLoading.excel}
                  >
                    <Table2 size={13} />
                    {exportLoading.excel ? 'Generating…' : 'Export Excel'}
                  </button>
                  <button
                    style={exportBtnStyle('#3b82f6')}
                    onClick={() => handleExport('word')}
                    disabled={exportLoading.word}
                  >
                    <Download size={13} />
                    {exportLoading.word ? 'Generating…' : 'Export Word'}
                  </button>
                  <button
                    className="back-btn"
                    onClick={handleCopyMarkdown}
                    style={{ margin: 0, padding: '9px 14px', fontSize: '12px' }}
                  >
                    Copy Markdown
                  </button>
                </div>
              </div>

              <div className="data-table-wrapper" style={{ maxHeight: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th style={{ textAlign: 'right' }}>Monthly (INR)</th>
                      <th style={{ textAlign: 'right' }}>Yearly (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const f = (val) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <>
                          {/* Component heading */}
                          <tr style={{ background: 'rgba(16,185,129,0.13)' }}>
                            <td colSpan="3" style={{ fontWeight: 'bold', color: '#064e3b' }}>Component</td>
                          </tr>
                          <tr>
                            <td><strong>Basic Salary</strong> (50% of Gross)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.basic)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.basic * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>HRA</strong> (40% of Basic)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.hra)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.hra * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>Conveyance Allowance</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.conveyance)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.conveyance * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>Education Allowance</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.education)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.education * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>Medical Allowance</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.medical)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.medical * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>Special Allowance</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.special)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.special * 12)}</td>
                          </tr>
                          <tr style={{ background: 'rgba(16,185,129,0.09)' }}>
                            <td><strong>Gross Salary</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.gross)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.gross * 12)}</td>
                          </tr>
                          <tr>
                            <td><strong>Statutory Bonus</strong> (8.33% of Basic)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.bonus)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.bonus * 12)}</td>
                          </tr>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <td><strong>Final Gross Salary</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.finalGross)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.finalGross * 12)}</td>
                          </tr>

                          {/* Employee Deductions heading */}
                          <tr style={{ background: 'rgba(249,115,22,0.15)', color: '#c2410c' }}>
                            <td colSpan="3" style={{ fontWeight: 'bold' }}>Employee Deductions</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- PF (Employee 12%, Max base ₹15,000)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employeePF)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employeePF * 12)}</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- ESIC (Employee 0.75% if Final Gross ≤ ₹21,000)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employeeESIC)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employeeESIC * 12)}</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- Professional Tax (PT)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.pt)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.pt_yearly)}</td>
                          </tr>
                          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <td><strong>Total Deductions</strong></td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.totalDeductions)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + calcResult.pt_yearly)}</td>
                          </tr>
                          <tr>
                            <td><strong>Net Take Home Salary</strong></td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#cca43b' }}>₹{f(calcResult.netTakeHome)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#cca43b' }}>₹{f((calcResult.finalGross * 12) - ((calcResult.employeePF * 12) + (calcResult.employeeESIC * 12) + calcResult.pt_yearly))}</td>
                          </tr>

                          {/* Employer Contributions heading */}
                          <tr style={{ background: 'rgba(59,130,246,0.15)', color: '#1d4ed8' }}>
                            <td colSpan="3" style={{ fontWeight: 'bold' }}>Employer Contributions and Cost</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- PF (Employer Contribution)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employerPF)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employerPF * 12)}</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- ESIC (Employer 3.25% if Final Gross ≤ ₹21,000)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employerESIC)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.employerESIC * 12)}</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- Gratuity (4.81% of Basic)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.gratuity)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.gratuity * 12)}</td>
                          </tr>
                          <tr>
                            <td style={{ paddingLeft: '20px' }}>- Others (Insurance, Admin Overhead)</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.others)}</td>
                            <td style={{ textAlign: 'right' }}>₹{f(calcResult.others * 12)}</td>
                          </tr>

                          {/* Total CTC */}
                          <tr style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))', border: '1px solid rgba(168,85,247,0.3)' }}>
                            <td><strong style={{ fontWeight: 'bold', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total CTC of Employee</strong></td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>₹{f(calcResult.totalCTC)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>₹{f(calcResult.totalCTC * 12)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
