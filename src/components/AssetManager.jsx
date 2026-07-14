import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Cpu, Plus, Laptop, User, Calendar, Tag, ChevronDown, ChevronUp, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';

export default function AssetManager({ user }) {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Registration Form States
  const [hardwareName, setHardwareName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('1');
  const [category, setCategory] = useState('');
  
  // UI Interaction States
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState({});
  const [checkoutQuantities, setCheckoutQuantities] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'Admin (HR)';

  useEffect(() => {
    fetchAssets();
    if (isAdmin) {
      fetchEmployees();
    }
  }, []);

  const fetchAssets = async () => {
    try {
      const data = await api.assets.list();
      setAssets(data);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list(true);
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!hardwareName || !serialNumber) return;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      await api.assets.create({ 
        hardware_name: hardwareName, 
        serial_number: serialNumber,
        category: category || 'General',
        total_quantity: parseInt(totalQuantity) || 1
      });
      setHardwareName('');
      setSerialNumber('');
      setTotalQuantity('1');
      setCategory('');
      setStatus('Device successfully registered in inventory!');
      setTimeout(() => setStatus(''), 4000);
      fetchAssets();
    } catch (err) {
      setError(`Failed to register hardware: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (assetId) => {
    const empId = selectedEmployees[assetId];
    const qty = checkoutQuantities[assetId] || 1;
    
    if (!empId) {
      await alert("Please select an employee first.");
      return;
    }
    
    setLoading(true);
    setStatus('Processing checkout and dispatching receipt email...');
    setError('');
    try {
      await api.assets.checkout(assetId, empId, 14, parseInt(qty));
      setStatus('Hardware successfully checked out and assigned.');
      setTimeout(() => setStatus(''), 4000);
      
      // Reset state for this asset
      setSelectedEmployees(prev => ({ ...prev, [assetId]: '' }));
      setCheckoutQuantities(prev => ({ ...prev, [assetId]: 1 }));
      fetchAssets();
    } catch (err) {
      setError(`Checkout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (assetId, checkoutId) => {
    setLoading(true);
    setStatus('Returning device and releasing inventory...');
    setError('');
    try {
      await api.assets.checkin(assetId, checkoutId);
      setStatus('Hardware returned and inventory updated.');
      setTimeout(() => setStatus(''), 4000);
      fetchAssets();
    } catch (err) {
      setError(`Return failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandAsset = (assetId) => {
    setExpandedAssetId(prev => prev === assetId ? null : assetId);
  };

  // Filter assets assigned specifically to the logged in employee based on checkout logs
  const myAssignedAssets = [];
  assets.forEach(a => {
    const userCheckouts = (a.checkouts || []).filter(c => {
      const matchedById = c.employee_id === user?.id || c.employee_id === user?._id;
      const matchedByEmail = c.employee_email === user?.email;
      return matchedById || matchedByEmail;
    });
    
    userCheckouts.forEach(uc => {
      myAssignedAssets.push({
        id: a.id,
        checkoutId: uc.id,
        hardware_name: a.hardware_name,
        serial_number: a.serial_number,
        category: a.category,
        quantity: uc.quantity,
        checkout_date: uc.checkout_date,
        employee_name: uc.employee_name
      });
    });
  });

  return (
    <div className="module-container" style={{ width: '100%', padding: '20px 30px' }}>
      
      {/* Module Header */}
      <div className="module-header" style={{ marginBottom: '25px' }}>
        <div className="module-title-box">
          <div className="tile-icon-box" style={{ background: '#06b6d415', color: '#06b6d4', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-primary)' }}>Hardware Asset Management</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Track company-issued hardware, categories, quantities, and real-time checkout logs.</p>
          </div>
        </div>
      </div>

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

      {isAdmin ? (
        // ==================== ADMIN PORTAL VIEW (2-Pane Grid Layout) ====================
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '30px' }}>
          
          {/* Left Pane: Registration of Hardware */}
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
              <Plus size={18} style={{ color: '#06b6d4' }} />
              Register Hardware Asset
            </h3>
            
            <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Hardware Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. MacBook Pro 16-inch M3" 
                  value={hardwareName} 
                  onChange={(e) => setHardwareName(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Serial Number / ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. SN-MBP-99120" 
                  value={serialNumber} 
                  onChange={(e) => setSerialNumber(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Total Quantity Available</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="e.g. 5" 
                  value={totalQuantity} 
                  onChange={(e) => setTotalQuantity(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Custom Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Laptops, Monitors, Phones" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>
              
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', background: 'var(--brand-gradient)', padding: '12px', marginTop: '5px' }}
              >
                <Plus size={16} /> 
                {loading ? 'Registering...' : 'Register Hardware'}
              </button>
            </form>
          </div>

          {/* Right Pane: Inventory & Checkout Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '5px' }}>
              Device Inventory & Checkout Logs
            </h3>

            {assets.length === 0 ? (
              <div style={{ padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No hardware registered in inventory. Fill out the registration form to add assets.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {assets.map(a => {
                  const isExpanded = expandedAssetId === a.id;
                  const remainingQty = a.remaining_quantity !== undefined ? a.remaining_quantity : a.total_quantity;
                  const isCheckedOut = remainingQty <= 0;
                  
                  return (
                    <div 
                      key={a.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => toggleExpandAsset(a.id)}
                        style={{
                          padding: '18px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.01)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{
                            background: isCheckedOut ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                            color: isCheckedOut ? '#ef4444' : '#06b6d4',
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Laptop size={20} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--text-primary)', margin: 0 }}>
                              {a.hardware_name}
                            </h4>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <span>ID: <code>{a.serial_number}</code></span>
                              <span style={{ color: 'var(--text-muted)' }}>|</span>
                              <span>Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{a.total_quantity}</strong></span>
                              <span style={{ color: 'var(--text-muted)' }}>|</span>
                              <span>Available: <strong style={{ color: remainingQty > 0 ? '#10b981' : '#ef4444' }}>{remainingQty}</strong></span>
                              <span style={{ color: 'var(--text-muted)' }}>|</span>
                              <span style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 8px',
                                borderRadius: '20px',
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                                fontWeight: '700'
                              }}>
                                {a.category || 'General'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: isCheckedOut ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isCheckedOut ? '#ef4444' : '#10b981'
                          }}>
                            {isCheckedOut ? 'Fully Assigned' : `${remainingQty} Available`}
                          </span>
                          {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />}
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div style={{
                          padding: '20px 24px',
                          borderTop: '1px solid var(--border-glass)',
                          background: 'rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px'
                        }}>
                          {/* Active Checkouts Listing */}
                          {a.checkouts && a.checkouts.length > 0 && (
                            <div>
                              <h5 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                Active Checkouts ({a.checkouts.length})
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {a.checkouts.map(checkout => (
                                  <div 
                                    key={checkout.id} 
                                    style={{
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      background: 'rgba(255,255,255,0.02)', 
                                      border: '1px solid var(--border-glass)', 
                                      padding: '12px 18px', 
                                      borderRadius: '10px',
                                      flexWrap: 'wrap',
                                      gap: '15px'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <User size={14} style={{ color: '#06b6d4' }} /> {checkout.employee_name}
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{checkout.employee_email}</div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty Checked Out</div>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#06b6d4', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <ShoppingBag size={12} /> {checkout.quantity}
                                        </div>
                                      </div>

                                      <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Checkout Date</div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                                          {checkout.checkout_date ? new Date(checkout.checkout_date).toLocaleDateString() : 'N/A'}
                                        </div>
                                      </div>
                                    </div>

                                    <button 
                                      onClick={() => handleCheckin(a.id, checkout.id)}
                                      className="btn-secondary"
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        color: '#ef4444',
                                        border: '1.5px solid rgba(239, 68, 68, 0.15)',
                                        padding: '8px 14px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Return Qty
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Checkout Dispatch Panel */}
                          {remainingQty > 0 ? (
                            <div style={{ paddingTop: a.checkouts && a.checkouts.length > 0 ? '15px' : '0', borderTop: a.checkouts && a.checkouts.length > 0 ? '1px solid var(--border-glass)' : 'none' }}>
                              <h5 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                Dispatch Units Checkout
                              </h5>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Select Recipient Employee</label>
                                  <select
                                    value={selectedEmployees[a.id] || ''}
                                    onChange={(e) => setSelectedEmployees(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      fontSize: '13px',
                                      background: 'var(--bg-input)',
                                      border: '1px solid var(--border-glass)',
                                      borderRadius: '8px',
                                      color: 'var(--text-primary)',
                                      outline: 'none'
                                    }}
                                  >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(e => (
                                      <option key={e.id} value={e.id}>{e.name} ({e.department || 'General'})</option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ width: '120px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Quantity</label>
                                  <select
                                    value={checkoutQuantities[a.id] || 1}
                                    onChange={(e) => setCheckoutQuantities(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      fontSize: '13px',
                                      background: 'var(--bg-input)',
                                      border: '1px solid var(--border-glass)',
                                      borderRadius: '8px',
                                      color: 'var(--text-primary)',
                                      outline: 'none'
                                    }}
                                  >
                                    {Array.from({ length: remainingQty }, (_, i) => i + 1).map(val => (
                                      <option key={val} value={val}>{val}</option>
                                    ))}
                                  </select>
                                </div>

                                <button
                                  onClick={() => handleCheckout(a.id)}
                                  disabled={!selectedEmployees[a.id]}
                                  className="btn-primary"
                                  style={{
                                    background: 'var(--brand-gradient)',
                                    padding: '10px 20px',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    opacity: !selectedEmployees[a.id] ? 0.5 : 1
                                  }}
                                >
                                  Dispatch Checkout
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                              ⚠️ All inventory units checked out. No stock remaining.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==================== EMPLOYEE PORTAL VIEW (My Assigned Assets list) ====================
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '15px' }}>
            My Checked Out Hardware Assets
          </h3>
          {myAssignedAssets.length === 0 ? (
            <div style={{ padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px dashed var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No company hardware currently assigned or checked out to you.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {myAssignedAssets.map((a, idx) => (
                <div 
                  key={`${a.id}-${idx}`}
                  className="pane-card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    gap: '15px',
                    alignItems: 'flex-start',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: '#06b6d4',
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Laptop size={22} />
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      {a.hardware_name}
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Serial No: <code style={{ color: 'var(--brand-blue)', fontWeight: 'bold' }}>{a.serial_number}</code>
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      background: 'rgba(255,255,255,0.04)', 
                      padding: '2px 8px', 
                      borderRadius: '20px', 
                      width: 'fit-content',
                      marginTop: '4px',
                      color: 'var(--text-secondary)',
                      fontWeight: '700'
                    }}>
                      🏷️ Category: {a.category || 'General'}
                    </div>
                    
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>👤 Assigned To:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{a.employee_name || user?.name}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '30px', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty Checked Out</div>
                        <div style={{ fontWeight: '800', color: '#06b6d4', marginTop: '2px' }}>
                          {a.quantity} unit{a.quantity > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Checked Out Date</div>
                        <div style={{ fontWeight: '700', marginTop: '2px' }}>
                          {a.checkout_date ? new Date(a.checkout_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
