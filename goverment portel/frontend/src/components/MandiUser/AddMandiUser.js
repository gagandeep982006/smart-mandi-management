import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import MandiContext from '../../context/Mandi/MandiContext';
import './AddMandiUser.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

const BASE_PERMISSIONS = [
  { key: 'read', label: 'Read (View Records)', icon: '👁️', desc: 'Allows viewing mandi data, counters, and transactions' },
  { key: 'create', label: 'Write (Create Records)', icon: '➕', desc: 'Allows issuing tokens, registering farmers, and recording entries' },
  { key: 'update', label: 'Update (Modify Records)', icon: '✏️', desc: 'Allows modifying active tokens, weighments, and desk statuses' },
  { key: 'delete', label: 'Delete (Remove Records)', icon: '🗑️', desc: 'Allows removing records and counter allocations' },
];

export default function AddMandiUser() {

  // Context APIs
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};
  const { getMandis, getMandiCounter } = useContext(MandiContext) || {};

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    role: '',
    state_id: '',
    district_id: '',
    tehsil_id: '',
    mandi_id: '',
    full_name: '',
    phone_number: '',
    email: '',
    address: '',
    aadhaar: '',
  });

  // Selected Mandi Counters & Permissions
  const [selectedCounters, setSelectedCounters] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(['read']);

  // Dropdown datasets
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);
  const [mandisList, setMandisList] = useState([]);
  const [countersList, setCountersList] = useState([]);

  const [loadingMandis, setLoadingMandis] = useState(false);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4500);
  };

  // 1. Initial State Fetch
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

  // 2. Fetch Districts on State Change
  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state_id: stateId,
      district_id: '',
      tehsil_id: '',
      mandi_id: '',
    }));
    setDistrictsList([]);
    setTehsilsList([]);
    setMandisList([]);
    setCountersList([]);
    setSelectedCounters([]);

    if (stateId && getDistrict) {
      try {
        const res = await getDistrict(stateId);
        if (res && res.success) {
          setDistrictsList(res.districts || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
      }
    }
  };

  // 3. Fetch Tehsils on District Change
  const handleDistrictChange = async (e) => {
    const districtId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      district_id: districtId,
      tehsil_id: '',
      mandi_id: '',
    }));
    setTehsilsList([]);
    setMandisList([]);
    setCountersList([]);
    setSelectedCounters([]);

    if (districtId && getTehsil) {
      try {
        const res = await getTehsil(districtId);
        if (res && res.success) {
          setTehsilsList(res.tehsils || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching tehsils:', err);
      }
    }
  };

  // 4. Fetch Mandis using getMandis(page, limit, payload) with cookie support
  const handleTehsilChange = async (e) => {
    const tehsilId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      tehsil_id: tehsilId,
      mandi_id: '',
    }));
    setMandisList([]);
    setCountersList([]);
    setSelectedCounters([]);

    if (!tehsilId) return;

    setLoadingMandis(true);
    try {
      const payload = {
        state_id: formData.state_id ? Number(formData.state_id) : null,
        district_id: formData.district_id ? Number(formData.district_id) : null,
        tehsil_id: Number(tehsilId),
      };

      if (getMandis) {
        const res = await getMandis(1, 100, payload);
        if (res && res.success) {
          setMandisList(res.mandis || res.data || []);
        } else {
          setMandisList([]);
        }
      } else {
        // Fallback with credentials: 'include'
        const res = await fetch(`${host}/api/mandis/getmandis?page=1&limit=100`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data && data.success) {
          setMandisList(data.mandis || data.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading mandis:', err);
      setMandisList([]);
    } finally {
      setLoadingMandis(false);
    }
  };

  // 5. Fetch Counters using getMandiCounter(mandi_id) with cookie support
  const handleMandiChange = async (e) => {
    const mandiId = e.target.value;
    setFormData((prev) => ({ ...prev, mandi_id: mandiId }));
    setCountersList([]);
    setSelectedCounters([]);

    if (!mandiId) return;

    setLoadingCounters(true);
    try {
      if (getMandiCounter) {
        const res = await getMandiCounter(mandiId);
        if (res && res.success) {
          setCountersList(res.counters || res.data || []);
        } else {
          setCountersList([]);
        }
      } else {
        // Fallback with credentials: 'include'
        const res = await fetch(`${host}/api/mandicounters/mandicounter/${mandiId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        if (data && data.success) {
          setCountersList(data.counters || data.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading counters:', err);
      setCountersList([]);
    } finally {
      setLoadingCounters(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Counter selection
  const toggleCounterSelection = (counterId) => {
    const cId = Number(counterId);
    setSelectedCounters((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const toggleAllCounters = () => {
    if (selectedCounters.length === countersList.length) {
      setSelectedCounters([]);
    } else {
      setSelectedCounters(countersList.map((c) => Number(c.counter_id)));
    }
  };

  // Permission selection
  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleAllPermissions = () => {
    if (selectedPermissions.length === BASE_PERMISSIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(BASE_PERMISSIONS.map((p) => p.key));
    }
  };

  // Two-Factor Password Modal state
  const [twoFactorModal, setTwoFactorModal] = useState({
    isOpen: false,
    verificationPassword: '',
    submitting: false,
  });

  // Prompt 2FA Verification before creating
  const promptSubmit = (e) => {
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
      showAlert('error', 'Please select a role');
      return;
    }
    if (!formData.mandi_id) {
      showAlert('error', 'Please select a Mandi');
      return;
    }
    if (selectedCounters.length === 0) {
      showAlert('error', 'At least one counter must be assigned');
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
      mandi_id: Number(formData.mandi_id),
      counter_ids: selectedCounters,
      verification_password: twoFactorModal.verificationPassword,
    };

    try {
      const response = await fetch(`${host}/api/mandi-app-user/add`, {
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
        showAlert('success', res.message || 'Mandi user created successfully');
        setFormData({
          username: '',
          role: '',
          state_id: '',
          district_id: '',
          tehsil_id: '',
          mandi_id: '',
          full_name: '',
          phone_number: '',
          email: '',
          address: '',
          aadhaar: '',
        });
        setSelectedCounters([]);
        setSelectedPermissions(['read']);
        setTwoFactorModal({ isOpen: false, verificationPassword: '', submitting: false });
      } else {
        showAlert('error', res.message || 'Two-Factor Verification failed or failed to create Mandi user');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error('Error adding Mandi user:', err);
      showAlert('error', 'Server error while creating Mandi user');
      setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-mandi-user-page">
      {/* Two-Factor Verification Modal */}
      {twoFactorModal.isOpen && (
        <div className="amu-modal-overlay">
          <div className="amu-modal-box">
            <div className="amu-modal-icon">🔐</div>
            <h3 className="amu-modal-title">Administrative 2FA Verification</h3>
            <p className="amu-modal-desc">
              Authorizing registration for Mandi User <strong>"{formData.username}"</strong>.
              Enter your administrative verification password to authorize this action:
            </p>
            <form onSubmit={handleExecuteVerifiedSubmit}>
              <input
                type="password"
                value={twoFactorModal.verificationPassword}
                onChange={(e) =>
                  setTwoFactorModal((prev) => ({
                    ...prev,
                    verificationPassword: e.target.value,
                  }))
                }
                placeholder="Enter 2FA verification password"
                className="amu-modal-input"
                autoFocus
                required
              />
              <div className="amu-modal-actions">
                <button
                  type="submit"
                  className="amu-modal-btn-confirm"
                  disabled={twoFactorModal.submitting}
                >
                  {twoFactorModal.submitting ? 'Verifying & Creating...' : 'Authorize & Create'}
                </button>
                <button
                  type="button"
                  className="amu-modal-btn-cancel"
                  onClick={() =>
                    setTwoFactorModal({
                      isOpen: false,
                      verificationPassword: '',
                      submitting: false,
                    })
                  }
                  disabled={twoFactorModal.submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Notification */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span>{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="amu-header">
        <div className="amu-header-left">
          <nav className="amu-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/mandiuser">Mandi User Management</Link>
            <span className="sep">›</span>
            <span className="current">Add Mandi User</span>
          </nav>
          <div className="amu-title-row">
            <div className="amu-title-icon-badge">🏪+</div>
            <div>
              <h1 className="amu-page-title">Add Mandi User</h1>
              <p className="amu-page-subtitle">
                Register a new operator or officer for Mandi counter desks and assign basic privileges.
              </p>
            </div>
          </div>
        </div>

        <div className="amu-header-right">
          <Link to="/mandiuser" className="amu-btn-view-users">
            <span className="btn-icon">👥</span>
            <span>View Mandi Users</span>
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <form onSubmit={promptSubmit} className="amu-layout-grid">
        {/* Left Column: Credentials & Mandi Desk Setup */}
        <div className="amu-left-col">
          {/* Card 1: Credentials */}
          <div className="amu-card">
            <div className="amu-card-title">
              <span className="card-title-icon">👤</span>
              <h2>User Details & Role</h2>
            </div>

            <div className="amu-field">
              <label>
                Username <span className="req">*</span>
              </label>
              <div className="amu-input-wrapper">
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

            <div className="amu-field">
              <label>
                Full Name <span className="req">*</span>
              </label>
              <div className="amu-input-wrapper">
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

            <div className="amu-field">
              <label>
                Registered Mobile Number <span className="req">*</span>
              </label>
              <div className="amu-input-wrapper">
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

            <div className="amu-field">
              <label>Email Address</label>
              <div className="amu-input-wrapper">
                <span className="input-glyph">✉️</span>
                <input
                  type="email"
                  name="email"
                  placeholder="officer@mandi.gov.in"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="amu-field">
              <label>Mandi / Residential Address</label>
              <div className="amu-input-wrapper">
                <span className="input-glyph">🏢</span>
                <input
                  type="text"
                  name="address"
                  placeholder="Mandi gate / administrative address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="amu-field">
              <label>Aadhaar Number</label>
              <div className="amu-input-wrapper">
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

            <div className="amu-field">
              <label>
                Role <span className="req">*</span>
              </label>
              <div className="amu-input-wrapper">
                <span className="input-glyph">👑</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select role</option>
                  <option value="mandi_operator">Mandi Operator</option>
                  <option value="mandi_officer">Mandi Officer</option>
                  <option value="counter_staff">Counter Staff</option>
                  <option value="supervisor">Mandi Supervisor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Location, Mandi & Counter Assignment */}
          <div className="amu-card">
            <div className="amu-card-title">
              <span className="card-title-icon">🏪</span>
              <h2>Location, Mandi & Counter Assignment</h2>
            </div>

            {/* Triplet: State -> District -> Tehsil */}
            <div className="amu-location-triplet">
              <div className="amu-field">
                <label>State</label>
                <select
                  name="state_id"
                  value={formData.state_id}
                  onChange={handleStateChange}
                >
                  <option value="">Select State</option>
                  {statesList.map((st) => (
                    <option key={st.state_id} value={st.state_id}>
                      {st.state_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="amu-field">
                <label>District</label>
                <select
                  name="district_id"
                  value={formData.district_id}
                  onChange={handleDistrictChange}
                  disabled={!formData.state_id}
                >
                  <option value="">Select District</option>
                  {districtsList.map((dt) => (
                    <option key={dt.district_id} value={dt.district_id}>
                      {dt.district_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="amu-field">
                <label>Tehsil</label>
                <select
                  name="tehsil_id"
                  value={formData.tehsil_id}
                  onChange={handleTehsilChange}
                  disabled={!formData.district_id}
                >
                  <option value="">Select Tehsil</option>
                  {tehsilsList.map((th) => (
                    <option key={th.tehsil_id} value={th.tehsil_id}>
                      {th.tehsil_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mandi Selection: Filtered by Tehsil */}
            <div className="amu-field">
              <label>
                Assigned Mandi <span className="req">*</span>
              </label>
              <select
                name="mandi_id"
                value={formData.mandi_id}
                onChange={handleMandiChange}
                disabled={!formData.tehsil_id || loadingMandis}
                required
              >
                <option value="">
                  {loadingMandis
                    ? 'Loading Mandis...'
                    : !formData.tehsil_id
                    ? 'Select Tehsil First'
                    : 'Select Mandi'}
                </option>
                {mandisList.map((m) => (
                  <option key={m.mandi_id} value={m.mandi_id}>
                    {m.mandi_name} (ID: #{m.mandi_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Counter Selection Grid */}
            <div className="amu-field">
              <div className="counters-title-row">
                <label>
                  Assign Counters <span className="req">*</span>
                </label>
                {countersList.length > 0 && (
                  <button
                    type="button"
                    className="amu-select-all-btn"
                    onClick={toggleAllCounters}
                  >
                    {selectedCounters.length === countersList.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
              </div>

              {loadingCounters ? (
                <div className="amu-empty-counters-box">Loading counters for selected Mandi...</div>
              ) : !formData.mandi_id ? (
                <div className="amu-empty-counters-box">
                  Select Tehsil and Mandi above to view and assign operational counters.
                </div>
              ) : countersList.length === 0 ? (
                <div className="amu-empty-counters-box">
                  No counters configured for this Mandi yet.
                </div>
              ) : (
                <div className="amu-counters-grid">
                  {countersList.map((c) => {
                    const isChecked = selectedCounters.includes(c.counter_id);
                    return (
                      <label
                        key={c.counter_id}
                        className={`amu-counter-pill ${isChecked ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCounterSelection(c.counter_id)}
                        />
                        <div className="counter-pill-info">
                          <span className="counter-num">
                            Counter #{c.counter_number || c.counter_id}
                          </span>
                          <span className="counter-name">
                            {c.counter_name || 'Counter'}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="amu-actions-bottom">
            <button
              type="button"
              className="amu-btn-cancel"
            >
              ✕ Cancel
            </button>
            <button
              type="submit"
              className="amu-btn-submit"
              disabled={submitting}
            >
              💾 {submitting ? 'Creating Mandi User...' : 'Create Mandi User'}
            </button>
          </div>
        </div>

        {/* Right Column: 4 Permissions Cards */}
        <div className="amu-right-col">
          <div className="amu-card permissions-card">
            <div className="amu-card-title-row">
              <div className="amu-card-title">
                <span className="card-title-icon">🛡️</span>
                <h2>User Permissions</h2>
              </div>
              <button
                type="button"
                className="amu-select-all-btn"
                onClick={toggleAllPermissions}
              >
                {selectedPermissions.length === BASE_PERMISSIONS.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="permissions-notice-banner">
              <span className="notice-bulb">💡</span>
              <p>
                Configure authorization for this user. Mandi operators usually require <strong>Read</strong> and <strong>Write</strong> permissions.
              </p>
            </div>

            <div className="amu-permissions-stack">
              {BASE_PERMISSIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.key);
                return (
                  <div
                    key={perm.key}
                    className={`amu-permission-card ${isSelected ? 'active' : ''}`}
                    onClick={() => togglePermission(perm.key)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                    />
                    <div className="perm-icon">{perm.icon}</div>
                    <div className="perm-details">
                      <div className="perm-title-row">
                        <span className="perm-label">{perm.label}</span>
                        <span className="perm-tag">"{perm.key}"</span>
                      </div>
                      <p className="perm-desc">{perm.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}