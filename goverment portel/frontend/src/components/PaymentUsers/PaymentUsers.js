import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';
import './PaymentUsers.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

const AVAILABLE_PERMISSIONS = [
  { key: 'payment.read', label: 'payment.read (View Farmer Payments)' },
  { key: 'payment.process', label: 'payment.process (Process & Disburse MSP Payments)' },
  { key: 'payment.update', label: 'payment.update (Verify & Update Transactions)' },
];

export default function StatePaymentUsers() {
  const navigate = useNavigate();
  const { getState } = useContext(StateContext) || {};

  // States dropdown
  const [statesList, setStatesList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    state_id: '',
    username: '',
    full_name: '',
    phone_number: '',
    email: '',
    address: '',
    aadhaar: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState([
    'payment.read',
    'payment.process',
    'payment.update',
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Table & Filter State
  const [paymentUsers, setPaymentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Feedback
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4500);
  };

  // 1. Fetch States for dropdown
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

  // 2. Fetch State Payment Users
  const fetchPaymentUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let url = `${host}/api/payment-users?page=${page}&limit=${rowsPerPage}`;
      if (filterState) {
        url += `&state_id=${filterState}`;
      }

      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      const data = await res.json();
      if (res.status === 403 && data && data.message && data.message.includes('Two-Factor Verification')) {
        setTwoFactorModal({
          isOpen: true,
          verificationPassword: '',
          submitting: false,
          actionType: 'read',
        });
        setPaymentUsers([]);
        setTotalCount(0);
        return;
      }

      if (data && data.success && Array.isArray(data.data)) {
        setPaymentUsers(data.data);
        setTotalCount(data.total || data.data.length);
      } else {
        setPaymentUsers([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching payment users:', err);
      showAlert('error', 'Failed to load payment users');
      setPaymentUsers([]);
    } finally {
      setLoading(false);
    }
  }, [rowsPerPage, filterState]);

  useEffect(() => {
    fetchPaymentUsers(currentPage);
  }, [fetchPaymentUsers, currentPage]);

  // 3. Form input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // State for 2FA Verification Modal
  const [twoFactorModal, setTwoFactorModal] = useState({
    isOpen: false,
    verificationPassword: '',
    submitting: false,
  });

  // Prompt 2FA Verification before creating
  const promptCreatePaymentUser = (e) => {
    e.preventDefault();

    if (!formData.state_id) {
      showAlert('error', 'Please select a state. Exactly one state is required per payment user.');
      return;
    }

    if (!formData.username.trim()) {
      showAlert('error', 'Officer username is required');
      return;
    }

    if (!formData.full_name.trim()) {
      showAlert('error', 'Officer full name is required');
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

    setTwoFactorModal({
      isOpen: true,
      verificationPassword: '',
      submitting: false,
    });
  };

  // Execute 2FA verified creation
  const handleExecuteVerifiedCreation = async (e) => {
    e.preventDefault();

    if (!twoFactorModal.verificationPassword) {
      showAlert('error', 'Verification password is required');
      return;
    }

    setTwoFactorModal((prev) => ({ ...prev, submitting: true }));
    setSubmitting(true);

    // If actionType is 'read', verify and fetch list
    if (twoFactorModal.actionType === 'read') {
      try {
        const verifyRes = await fetch(`${host}/api/payment-users/verify-2fa`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: twoFactorModal.verificationPassword }),
        });
        const vResult = await verifyRes.json();
        if (verifyRes.ok && vResult.success) {
          sessionStorage.setItem('gov_2fa_password', twoFactorModal.verificationPassword);
          setTwoFactorModal({ isOpen: false, verificationPassword: '', submitting: false, actionType: null });
          fetchPaymentUsers(currentPage);
        } else {
          showAlert('error', vResult.message || 'Invalid 2FA verification password');
          setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
        }
      } catch (err) {
        showAlert('error', 'Network error during verification');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const payload = {
      state_id: Number(formData.state_id),
      username: formData.username.trim(),
      full_name: formData.full_name.trim(),
      phone_number: formData.phone_number.trim().replace(/\D/g, ''),
      email: formData.email.trim(),
      address: formData.address.trim(),
      aadhaar: formData.aadhaar.trim(),
      permissions: selectedPermissions,
      verification_password: twoFactorModal.verificationPassword,
    };

    try {
      const res = await fetch(`${host}/api/payment-users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-verification-password': twoFactorModal.verificationPassword,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        sessionStorage.setItem('gov_2fa_password', twoFactorModal.verificationPassword);
        showAlert('success', result.message || 'State Payment User created successfully!');
        setFormData({
          state_id: '',
          username: '',
          full_name: '',
          phone_number: '',
          email: '',
          address: '',
          aadhaar: '',
        });
        setSelectedPermissions(['payment.read', 'payment.process', 'payment.update']);
        setTwoFactorModal({ isOpen: false, verificationPassword: '', submitting: false, actionType: null });
        setCurrentPage(1);
        fetchPaymentUsers(1);
      } else {
        showAlert('error', result.message || 'Two-Factor Verification failed or user creation rejected');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error('Error creating payment user:', err);
      showAlert('error', 'Network error creating payment user');
      setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Toggle Status (active/inactive)
  const handleToggleStatus = async (user) => {
    const userId = user.payment_user_id || user.user_id;
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const res = await fetch(`${host}/api/payment-users/${userId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ status: nextStatus, verification_password: stored2fa }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showAlert('success', `User status updated to ${nextStatus}`);
        setPaymentUsers((prev) =>
          prev.map((u) => ((u.payment_user_id || u.user_id) === userId ? { ...u, status: nextStatus } : u))
        );
      } else if (res.status === 403 && result.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({
          isOpen: true,
          actionType: 'read',
          verificationPassword: '',
          submitting: false,
        });
      } else {
        showAlert('error', result.message || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showAlert('error', 'Network error updating user status');
    }
  };

  // 6. Delete Payment User
  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    const userId = deleteModal.user.payment_user_id || deleteModal.user.user_id;
    const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
    setDeleting(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const res = await fetch(`${host}/api/payment-users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: JSON.stringify({ verification_password: stored2fa }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showAlert('success', `Payment user ${deleteModal.user.username} deleted successfully`);
        setDeleteModal({ isOpen: false, user: null });
        fetchPaymentUsers(currentPage);
      } else if (res.status === 403 && result.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({
          isOpen: true,
          actionType: 'read',
          verificationPassword: '',
          submitting: false,
        });
      } else {
        showAlert('error', result.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      showAlert('error', 'Network error deleting user');
    } finally {
      setDeleting(false);
    }
  };

  // 7. Filtered view in table
  const displayedUsers = useMemo(() => {
    if (!searchQuery.trim()) return paymentUsers;
    const q = searchQuery.toLowerCase();
    return paymentUsers.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.state && u.state.toLowerCase().includes(q))
    );
  }, [paymentUsers, searchQuery]);

  // 8. Pagination Windowing (max 5 page buttons)
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

  const getPageNumbers = () => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="payment-users-page">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="pu-modal-overlay">
          <div className="pu-modal-box">
            <div className="pu-modal-icon">🗑️</div>
            <h3 className="pu-modal-title">Delete Payment User?</h3>
            <p className="pu-modal-desc">
              Are you sure you want to remove officer <strong>"{deleteModal.user?.username}"</strong> ({deleteModal.user?.state})? This action cannot be undone.
            </p>
            <div className="pu-modal-actions">
              <button
                type="button"
                className="pu-modal-btn-confirm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                className="pu-modal-btn-cancel"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Verification Modal */}
      {twoFactorModal.isOpen && (
        <div className="pu-modal-overlay">
          <div className="pu-modal-box">
            <div className="pu-modal-icon">🔐</div>
            <h3 className="pu-modal-title">Administrative 2FA Verification</h3>
            <p className="pu-modal-desc">
              {twoFactorModal.actionType === 'read'
                ? 'Administrative 2-step verification is required to access and manage State Payment Users. Enter your security password:'
                : `Authorizing creation of State Payment User "${formData.username}" for ${statesList.find((s) => String(s.state_id) === String(formData.state_id))?.state_name || 'selected state'}. Enter your administrative verification password:`}
            </p>
            <form onSubmit={handleExecuteVerifiedCreation}>
              <div style={{ marginBottom: '16px' }}>
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
                  className="pu-input"
                  autoFocus
                  required
                />
              </div>
              <div className="pu-modal-actions">
                <button
                  type="submit"
                  className="pu-modal-btn-confirm"
                  style={{ backgroundColor: '#10b981' }}
                  disabled={twoFactorModal.submitting}
                >
                  {twoFactorModal.submitting
                    ? 'Verifying...'
                    : twoFactorModal.actionType === 'read'
                    ? 'Authorize & Unlock'
                    : 'Authorize & Create'}
                </button>
                <button
                  type="button"
                  className="pu-modal-btn-cancel"
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

      {/* Header & Breadcrumbs */}
      <div className="pu-header-row">
        <div>
          <nav className="pu-breadcrumbs">
            <Link to="/">Home</Link>
            <span>›</span>
            <span className="current">State Payment Users</span>
          </nav>
          <div className="pu-title-row">
            <div className="pu-icon-badge">💳</div>
            <div>
              <h1 className="pu-page-title">State Payment Users</h1>
              <p className="pu-page-desc">
                Create and manage State Payment Officers dedicated to farmer payment processing.
              </p>
            </div>
          </div>
        </div>
        <button className="pu-back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      {/* Alert Banner */}
      {alert.show && (
        <div className={`pu-alert pu-alert-${alert.type}`}>
          <span>{alert.type === 'success' ? '✓' : '⚠'}</span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="pu-layout-grid">
        {/* Left Column: Create Form */}
        <div className="pu-card pu-form-card">
          <h2 className="pu-card-title">
            <span>➕</span> Add State Payment User
          </h2>
          <p className="pu-card-subtitle">
            Assign exactly one state per payment officer for farmer MSP disbursements.
          </p>

          <form onSubmit={promptCreatePaymentUser} className="pu-form">
            {/* State Selection */}
            <div className="pu-form-group">
              <label className="pu-label">
                Assigned State <span className="required">*</span>
              </label>
              <select
                name="state_id"
                value={formData.state_id}
                onChange={handleInputChange}
                className="pu-select"
                required
              >
                <option value="">-- Select State --</option>
                {statesList.map((s) => (
                  <option key={s.state_id} value={s.state_id}>
                    {s.state_name} ({s.state_code || `ID: ${s.state_id}`})
                  </option>
                ))}
              </select>
              <span className="pu-field-hint">Officer will handle payments solely for this state</span>
            </div>

            {/* Username */}
            <div className="pu-form-group">
              <label className="pu-label">
                Officer Username <span className="required">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="e.g. haryana_payment_officer"
                className="pu-input"
                required
              />
            </div>

            {/* Full Name */}
            <div className="pu-form-group">
              <label className="pu-label">
                Officer Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="e.g. Ramesh Kumar"
                className="pu-input"
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="pu-form-group">
              <label className="pu-label">
                Registered Mobile Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone_number: e.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                placeholder="10-digit mobile number"
                className="pu-input"
                required
              />
              <span className="pu-field-hint">Used for official OTP login verification</span>
            </div>

            {/* Email */}
            <div className="pu-form-group">
              <label className="pu-label">Official Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="officer@payment.gov.in"
                className="pu-input"
              />
            </div>

            {/* Address */}
            <div className="pu-form-group">
              <label className="pu-label">Treasury / Office Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="State Treasury / Directorate of Accounts"
                className="pu-input"
              />
            </div>

            {/* Aadhaar Number */}
            <div className="pu-form-group">
              <label className="pu-label">Aadhaar Number</label>
              <input
                type="text"
                name="aadhaar"
                value={formData.aadhaar}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12),
                  }))
                }
                placeholder="12-digit Aadhaar number"
                className="pu-input"
              />
              <span className="pu-field-hint">Securely indexed via HMAC-SHA256 lookup</span>
            </div>

            {/* Permissions */}
            <div className="pu-form-group">
              <label className="pu-label">Assigned Permissions</label>
              <div className="pu-permissions-container">
                {AVAILABLE_PERMISSIONS.map((p) => (
                  <label key={p.key} className="pu-perm-option">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(p.key)}
                      onChange={() => togglePermission(p.key)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="pu-submit-btn" disabled={submitting}>
              {submitting ? 'Creating...' : '✓ Create State Payment User'}
            </button>
          </form>
        </div>

        {/* Right Column: Manage Users Table */}
        <div className="pu-card pu-table-card">
          <div className="pu-table-toolbar">
            <h2 className="pu-card-title">
              <span>👥</span> State Payment Officers ({totalCount})
            </h2>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filter by State */}
              <select
                className="pu-filter-select"
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by state"
              >
                <option value="">All States</option>
                {statesList.map((s) => (
                  <option key={s.state_id} value={s.state_id}>
                    {s.state_name}
                  </option>
                ))}
              </select>

              {/* Search Box */}
              <div className="pu-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search username or state..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="pu-table-wrapper">
            <table className="pu-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Assigned State</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Loading State Payment Users...
                    </td>
                  </tr>
                ) : displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No payment officers found. Create one using the form on the left.
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((user) => {
                    let perms = [];
                    try {
                      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || [];
                    } catch {
                      perms = [String(user.permissions)];
                    }

                    return (
                      <tr key={user.user_id}>
                        <td>#{user.user_id}</td>
                        <td>
                          <span className="pu-state-badge">
                            <span>🏛️</span> {user.state || `State #${user.state_id}`}
                          </span>
                        </td>
                        <td>
                          <div className="pu-user-cell">
                            <div className="pu-user-avatar">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ maxWidth: '200px' }}>
                            {Array.isArray(perms) &&
                              perms.map((p, idx) => (
                                <span key={idx} className="pu-perm-badge">
                                  {p}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pu-status-badge ${user.status}`}
                            onClick={() => handleToggleStatus(user)}
                            title="Click to toggle status"
                          >
                            {user.status === 'active' ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pu-action-btn-del"
                            onClick={() => setDeleteModal({ isOpen: true, user })}
                            title="Delete officer"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pu-pagination-bar">
            <div className="pu-page-info">
              Showing {displayedUsers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * rowsPerPage, totalCount)} of {totalCount} officers
            </div>

            <div className="pu-page-nav">
              <label style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>
                Rows:
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ marginLeft: '4px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </label>

              <button
                type="button"
                className="pu-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹ Prev
              </button>

              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`pu-page-btn ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                className="pu-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
