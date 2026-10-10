import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import './AddUser.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

// Structured Permission Schema matching your exact specification
const PERMISSION_GROUPS = [
  {
    id: 'farmer',
    title: 'Farmer',
    icon: '👨‍🌾',
    permissions: [
      { key: 'farmer.read', label: 'View Farmers' },
      { key: 'farmer.create', label: 'Create Farmer' },
      { key: 'farmer.update', label: 'Update Farmer' },
      { key: 'farmer.delete', label: 'Delete Farmer' },
    ],
  },
  {
    id: 'farmer_land',
    title: 'Farmer Land',
    icon: '🌱',
    permissions: [
      { key: 'farmer_land.read', label: 'View Farmer Land' },
      { key: 'farmer_land.create', label: 'Add Farmer Land' },
      { key: 'farmer_land.update', label: 'Update Farmer Land' },
      { key: 'farmer_land.delete', label: 'Delete Farmer Land' },
    ],
  },
  {
    id: 'bank_account',
    title: 'Bank Account',
    icon: '🏦',
    permissions: [
      { key: 'bank_account.read', label: 'View Bank Account' },
      { key: 'bank_account.create', label: 'Add Bank Account' },
      { key: 'bank_account.update', label: 'Update Bank Account' },
      { key: 'bank_account.delete', label: 'Delete Bank Account' },
    ],
  },
  {
    id: 'state',
    title: 'State',
    icon: '🏛️',
    permissions: [
      { key: 'state.read', label: 'View States' },
      { key: 'state.create', label: 'Add State' },
      { key: 'state.update', label: 'Update State' },
      { key: 'state.delete', label: 'Delete State' },
    ],
  },
  {
    id: 'district',
    title: 'District',
    icon: '🏢',
    permissions: [
      { key: 'district.read', label: 'View Districts' },
      { key: 'district.create', label: 'Add District' },
      { key: 'district.update', label: 'Update District' },
      { key: 'district.delete', label: 'Delete District' },
    ],
  },
  {
    id: 'tehsil',
    title: 'Tehsil',
    icon: '🏘️',
    permissions: [
      { key: 'tehsil.read', label: 'View Tehsils' },
      { key: 'tehsil.create', label: 'Add Tehsil' },
      { key: 'tehsil.update', label: 'Update Tehsil' },
      { key: 'tehsil.delete', label: 'Delete Tehsil' },
    ],
  },
  {
    id: 'mandi',
    title: 'Mandi',
    icon: '🏪',
    permissions: [
      { key: 'mandi.read', label: 'View Mandis' },
      { key: 'mandi.create', label: 'Add Mandi' },
      { key: 'mandi.update', label: 'Update Mandi' },
      { key: 'mandi.delete', label: 'Delete Mandi' },
    ],
  },
  {
    id: 'mandi_counter',
    title: 'Mandi Counter',
    icon: '▦',
    permissions: [
      { key: 'mandi_counter.read', label: 'View Mandi Counters' },
      { key: 'mandi_counter.create', label: 'Add Mandi Counter' },
      { key: 'mandi_counter.update', label: 'Update Mandi Counter' },
      { key: 'mandi_counter.delete', label: 'Delete Mandi Counter' },
    ],
  },
  {
    id: 'crop',
    title: 'Crop',
    icon: '🌾',
    permissions: [
      { key: 'crop.read', label: 'View Crops' },
      { key: 'crop.create', label: 'Add Crop' },
      { key: 'crop.update', label: 'Update Crop' },
      { key: 'crop.delete', label: 'Delete Crop' },
    ],
  },
  {
    id: 'procurement_session',
    title: 'Procurement Session',
    icon: '📅',
    permissions: [
      { key: 'procurement_session.read', label: 'View Procurement Sessions' },
      { key: 'procurement_session.create', label: 'Create Procurement Session' },
      { key: 'procurement_session.update', label: 'Update Procurement Session' },
      { key: 'procurement_session.delete', label: 'Delete Procurement Session' },
    ],
  },
  {
    id: 'procurement_quota',
    title: 'Procurement Quota',
    icon: '📦',
    permissions: [
      { key: 'procurement_quota.read', label: 'View Procurement Quotas' },
      { key: 'procurement_quota.create', label: 'Add Procurement Quota' },
      { key: 'procurement_quota.update', label: 'Update Procurement Quota' },
      { key: 'procurement_quota.delete', label: 'Delete Procurement Quota' },
    ],
  },
];

export default function AddUser() {
  const navigate = useNavigate();

  // Context APIs
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    role: '',
    state_id: '',
    district_id: '',
    tehsil_id: '',
    full_name: '',
    phone_number: '',
    email: '',
    address: '',
    aadhaar: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    farmer: true,
    farmer_land: false,
    mandi: false,
    procurement_session: false,
  });

  // Geographic dropdown datasets
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [twoFactorModal, setTwoFactorModal] = useState({
    isOpen: false,
    verificationPassword: '',
    submitting: false,
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4500);
  };

  // 1. Fetch States on Mount via StateContext
  useEffect(() => {
    const fetchStates = async () => {
      if (getState) {
        try {
          const res = await getState();
          if (res && res.success) {
            setStatesList(res.states || res.data || []);
          }
        } catch (err) {
          console.error('Error fetching states:', err);
        }
      }
    };
    fetchStates();
  }, [getState]);

  // 2. Fetch Districts when state changes via DistrictContext
  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state_id: stateId,
      district_id: '',
      tehsil_id: '',
    }));
    setDistrictsList([]);
    setTehsilsList([]);

    if (!stateId) return;

    if (getDistrict) {
      try {
        const res = await getDistrict(stateId);
        if (res && res.success) {
          setDistrictsList(res.districts || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching districts via context:', err);
      }
    }
  };

  // 3. Fetch Tehsils when district changes via TehsilContext
  const handleDistrictChange = async (e) => {
    const districtId = e.target.value;
    setFormData((prev) => ({ ...prev, district_id: districtId, tehsil_id: '' }));
    setTehsilsList([]);

    if (!districtId) return;

    if (getTehsil) {
      try {
        const res = await getTehsil(districtId);
        if (res && res.success) {
          setTehsilsList(res.tehsils || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching tehsils via context:', err);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle Accordion Group Expansion
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Toggle Single Permission
  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Group Select All / Deselect All
  const toggleGroupPermissions = (group, e) => {
    e.stopPropagation();
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Prompt 2FA verification before creating App User
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      showAlert('error', 'Username is required');
      return;
    }
    if (!formData.full_name.trim()) {
      showAlert('error', 'Full name is required');
      return;
    }
    const cleanPhone = formData.phone_number.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      showAlert('error', 'Valid 10-digit registered mobile number is required');
      return;
    }
    if (formData.aadhaar && formData.aadhaar.trim().length > 0 && formData.aadhaar.trim().length !== 12) {
      showAlert('error', 'Aadhaar number must be exactly 12 digits');
      return;
    }
    if (!formData.role) {
      showAlert('error', 'Please select a user role');
      return;
    }
    if (selectedPermissions.length === 0) {
      showAlert('error', 'Please assign at least one permission');
      return;
    }

    setTwoFactorModal({
      isOpen: true,
      verificationPassword: '',
      submitting: false,
    });
  };

  // Submit Handler with 2FA verification password
  const handleExecuteVerifiedSubmit = async (e) => {
    e.preventDefault();

    if (!twoFactorModal.verificationPassword) {
      showAlert('error', 'Administrative verification password is required');
      return;
    }

    setTwoFactorModal((prev) => ({ ...prev, submitting: true }));
    setSubmitting(true);

    const payload = {
      username: formData.username.trim(),
      full_name: formData.full_name.trim(),
      phone_number: formData.phone_number.trim().replace(/\D/g, ''),
      email: formData.email.trim(),
      address: formData.address.trim(),
      aadhaar: formData.aadhaar.trim(),
      role: formData.role,
      permissions: selectedPermissions,
      state_id: formData.state_id ? Number(formData.state_id) : null,
      district_id: formData.district_id ? Number(formData.district_id) : null,
      tehsil_id: formData.tehsil_id ? Number(formData.tehsil_id) : null,
      verification_password: twoFactorModal.verificationPassword,
    };

    try {
      const response = await fetch(`${host}/api/app-users/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-verification-password': twoFactorModal.verificationPassword,
        },
        body: JSON.stringify(payload),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        sessionStorage.setItem('gov_2fa_password', twoFactorModal.verificationPassword);
        showAlert('success', res.message || 'User added successfully');
        setTwoFactorModal({ isOpen: false, verificationPassword: '', submitting: false });
        setTimeout(() => navigate('/users'), 1200);
      } else {
        showAlert('error', res.message || 'Two-Factor Verification failed or failed to add user');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error('Error creating user:', err);
      showAlert('error', 'Server error while creating user');
      setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-user-page">
      {/* Alert Notification */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span>{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alert.message}</span>
        </div>
      )}

    {/* Breadcrumbs & Header */}
    <div className="au-header">
    <div className="au-header-left">
        <nav className="au-breadcrumbs">
        <Link to="/">Home</Link>
        <span className="sep">›</span>
        <span className="current">Add User</span>
        </nav>

        <div className="au-title-row">
        <div className="au-title-icon-badge">👤+</div>
        <div>
            <h1 className="au-page-title">Add User</h1>
            <p className="au-page-subtitle">
            Create a new user account with role, permissions and location access.
            </p>
        </div>
        </div>
    </div>

    {/* Top Right Action Button */}
    <div className="au-header-right">
        <Link to="/users" className="au-btn-view-users">
        <span className="btn-icon">👥</span>
        <span>View Users</span>
        <span className="btn-arrow">→</span>
        </Link>
    </div>
    </div>

      {/* Main Two-Column Layout */}
      <form onSubmit={handleSubmit} className="au-layout-grid">
        {/* LEFT COLUMN: User Metadata & Scopes */}
        <div className="au-left-col">
          {/* Card 1: Basic & Profile Information */}
          <div className="au-card">
            <div className="au-card-title">
              <span className="card-title-icon">👤</span>
              <h2>User Details & Profile</h2>
            </div>

            <div className="au-field">
              <label>
                Username <span className="req">*</span>
              </label>
              <div className="au-input-wrapper">
                <span className="input-glyph">👤</span>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="au-field">
              <label>
                Full Name <span className="req">*</span>
              </label>
              <div className="au-input-wrapper">
                <span className="input-glyph">📛</span>
                <input
                  type="text"
                  name="full_name"
                  placeholder="Enter full legal name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="au-field">
              <label>
                Registered Mobile Number <span className="req">*</span>
              </label>
              <div className="au-input-wrapper">
                <span className="input-glyph">📱</span>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="10-digit registered number"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone_number: e.target.value.replace(/\D/g, '').slice(0, 10),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="au-field">
              <label>Email Address</label>
              <div className="au-input-wrapper">
                <span className="input-glyph">✉️</span>
                <input
                  type="email"
                  name="email"
                  placeholder="officer@gov.nic.in"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="au-field">
              <label>Office / Residential Address</label>
              <div className="au-input-wrapper">
                <span className="input-glyph">🏢</span>
                <input
                  type="text"
                  name="address"
                  placeholder="Official address or administrative division"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="au-field">
              <label>Aadhaar Number</label>
              <div className="au-input-wrapper">
                <span className="input-glyph">🪪</span>
                <input
                  type="text"
                  name="aadhaar"
                  placeholder="12-digit Aadhaar number"
                  value={formData.aadhaar}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12),
                    }))
                  }
                />
              </div>
            </div>

            <div className="au-field">
              <label>
                Role <span className="req">*</span>
              </label>
              <div className="au-input-wrapper">
                <span className="input-glyph">👑</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select role</option>
                  <option value="dba">dba</option>
                  <option value="state officer">State Officer</option>
                  <option value="district officer">District Officer</option>
                  <option value="tehsil officer">Tehsil Officer</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Location Access Scope */}
          <div className="au-card">
            <div className="au-card-title">
              <span className="card-title-icon">📍</span>
              <h2>Location Access</h2>
            </div>

            <div className="au-location-triplet">
              <div className="au-field">
                <label>State</label>
                <div className="au-input-wrapper">
                  <span className="input-glyph">🏛️</span>
                  <select
                    name="state_id"
                    value={formData.state_id}
                    onChange={handleStateChange}
                  >
                    <option value="">Select state</option>
                    {statesList.map((st) => (
                      <option key={st.state_id} value={st.state_id}>
                        {st.state_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="au-field">
                <label>District</label>
                <div className="au-input-wrapper">
                  <span className="input-glyph">🏢</span>
                  <select
                    name="district_id"
                    value={formData.district_id}
                    onChange={handleDistrictChange}
                    disabled={!formData.state_id}
                  >
                    <option value="">Select district</option>
                    {districtsList.map((dt) => (
                      <option key={dt.district_id} value={dt.district_id}>
                        {dt.district_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="au-field">
                <label>Tehsil</label>
                <div className="au-input-wrapper">
                  <span className="input-glyph">🏘️</span>
                  <select
                    name="tehsil_id"
                    value={formData.tehsil_id}
                    onChange={handleInputChange}
                    disabled={!formData.district_id}
                  >
                    <option value="">Select tehsil</option>
                    {tehsilsList.map((th) => (
                      <option key={th.tehsil_id} value={th.tehsil_id}>
                        {th.tehsil_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="au-callout-info">
              <span className="callout-icon">ℹ️</span>
              <p>The user will have access only to the selected location and its lower levels.</p>
            </div>
          </div>

          {/* Card 3: Account Status */}
          <div className="au-card">
            <div className="au-card-title">
              <span className="card-title-icon">⚙️</span>
              <h2>Account Status</h2>
            </div>
            <div className="status-toggle-row">
              <span className="status-label">
                Status <span className="req">*</span>
              </span>
              <div className="toggle-switch-group">
                <div className="pill-switch active">
                  <div className="switch-dot"></div>
                </div>
                <div className="switch-text-group">
                  <span className="switch-state-name">Active</span>
                  <span className="switch-note">
                    Inactive users cannot login to the system.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="au-actions-bottom">
            <button
              type="button"
              className="au-btn-cancel"
            >
              ✕ Cancel
            </button>
            <button
              type="submit"
              className="au-btn-submit"
              disabled={submitting}
            >
              💾 {submitting ? 'Creating User...' : 'Create User'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Permissions Checklist */}
        <div className="au-right-col">
          <div className="au-card permissions-card">
            <div className="au-card-title">
              <span className="card-title-icon">🛡️</span>
              <h2>Permissions</h2>
            </div>

            <div className="permissions-notice-banner">
              <span className="notice-bulb">💡</span>
              <p>
                Select the modules and permissions for this user. The user will be able to access only the selected permissions.
              </p>
            </div>

            <div className="permissions-accordion-list">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.permissions.map((p) => p.key);
                const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));
                const someSelected =
                  !allSelected && groupKeys.some((k) => selectedPermissions.includes(k));
                const isExpanded = !!expandedSections[group.id];

                return (
                  <div key={group.id} className="accordion-module">
                    <div
                      className="accordion-header"
                      onClick={() => toggleSection(group.id)}
                    >
                      <label
                        className="group-checkbox-label"
                        onClick={(e) => toggleGroupPermissions(group, e)}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={() => {}}
                        />
                        <span className="module-icon">{group.icon}</span>
                        <span className="module-title">{group.title}</span>
                      </label>
                      <span className={`accordion-arrow ${isExpanded ? 'open' : ''}`}>
                        ›
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="accordion-body">
                        {group.permissions.map((p) => {
                          const checked = selectedPermissions.includes(p.key);
                          return (
                            <label key={p.key} className="permission-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.key)}
                              />
                              <span className="permission-name">{p.label}</span>
                              <span className="permission-key-code">({p.key})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      {/* Two-Factor Verification Modal */}
      {twoFactorModal.isOpen && (
        <div className="au-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Administrative 2FA Verification
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Authorizing creation of User <strong>"{formData.username}"</strong> ({formData.role}).
              Enter your administrative verification password:
            </p>
            <form onSubmit={handleExecuteVerifiedSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <input
                  type="password"
                  value={twoFactorModal.verificationPassword}
                  onChange={(e) =>
                    setTwoFactorModal((prev) => ({
                      ...prev,
                      verificationPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter 2FA security password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="submit"
                  disabled={twoFactorModal.submitting}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {twoFactorModal.submitting ? 'Verifying...' : 'Authorize & Create'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTwoFactorModal({
                      isOpen: false,
                      verificationPassword: '',
                      submitting: false,
                    })
                  }
                  disabled={twoFactorModal.submitting}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}