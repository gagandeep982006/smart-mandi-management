import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import './Users.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

const getRoleBadgeStyle = (role = '') => {
  const r = (role || '').toLowerCase();
  if (r.includes('dba') || r.includes('admin')) {
    return { bg: '#fee2e2', text: '#ef4444', label: role.toUpperCase() };
  }
  if (r.includes('state')) {
    return { bg: '#e0f2fe', text: '#0284c7', label: 'State Officer' };
  }
  if (r.includes('district')) {
    return { bg: '#fef3c7', text: '#d97706', label: 'District Officer' };
  }
  if (r.includes('tehsil')) {
    return { bg: '#ede9fe', text: '#7c3aed', label: 'Tehsil Officer' };
  }
  if (r.includes('mandi')) {
    return { bg: '#dcfce7', text: '#16a34a', label: 'Mandi Officer' };
  }
  return { bg: '#f1f5f9', text: '#64748b', label: role || 'User' };
};

const formatLocation = (user) => {
  const parts = [];
  if (user.state) parts.push(user.state);
  if (user.district) parts.push(user.district);
  if (user.tehsil) parts.push(user.tehsil);
  return parts.length > 0 ? parts.join(' > ') : '-';
};

export default function ViewUsers() {
  // Contexts
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};

  // Master Dropdown Data
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Filter & Search Inputs
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTehsil, setSelectedTehsil] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Table Data & Pagination State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isSingleUserView, setIsSingleUserView] = useState(false);

  // Modals & Notifications
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [editStatusModal, setEditStatusModal] = useState({
    isOpen: false,
    user: null,
    selectedStatus: 'active',
  });
  const [twoFactorModal, setTwoFactorModal] = useState({
    isOpen: false,
    verificationPassword: '',
    submitting: false,
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  // 1. Initial States Load
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
    const sId = e.target.value;
    setSelectedState(sId);
    setSelectedDistrict('');
    setSelectedTehsil('');
    setDistrictsList([]);
    setTehsilsList([]);

    if (sId && getDistrict) {
      try {
        const res = await getDistrict(sId);
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
    const dId = e.target.value;
    setSelectedDistrict(dId);
    setSelectedTehsil('');
    setTehsilsList([]);

    if (dId && getTehsil) {
      try {
        const res = await getTehsil(dId);
        if (res && res.success) {
          setTehsilsList(res.tehsils || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching tehsils:', err);
      }
    }
  };

  // 4. Fetch User by ID via GET /api/app-users/getusers/:user_id (2FA protected)
  const fetchUserById = useCallback(async (userId) => {
    setLoading(true);
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(`${host}/api/app-users/getusers/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      const res = await response.json();
      if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
        return;
      }

      if (res && res.success && res.data) {
        setUsers([res.data]);
        setTotalCount(1);
        setIsSingleUserView(true);
      } else {
        setUsers([]);
        setTotalCount(0);
        showAlert('error', res?.message || `User #${userId} not found`);
      }
    } catch (err) {
      console.error('Error fetching user by ID:', err);
      showAlert('error', 'Error looking up user by ID');
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. Fetch Paginated List of Users via POST /api/app-users/getusers (2FA protected)
  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setIsSingleUserView(false);
      try {
        const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
        const headers = { 'Content-Type': 'application/json' };
        if (stored2fa) headers['x-verification-password'] = stored2fa;

        const payload = {
          page,
          limit,
          state_id: selectedState ? Number(selectedState) : null,
          district_id: selectedDistrict ? Number(selectedDistrict) : null,
          tehsil_id: selectedTehsil ? Number(selectedTehsil) : null,
          verification_password: stored2fa,
        };

        const response = await fetch(`${host}/api/app-users/getusers`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(payload),
        });

        const res = await response.json();
        if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
          setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
          setUsers([]);
          setTotalCount(0);
          return;
        }

        if (res && res.success && Array.isArray(res.data)) {
          setUsers(res.data);
          setTotalCount(
            res.total ||
              (res.data.length < limit
                ? (page - 1) * limit + res.data.length
                : page * limit + 1)
          );
        } else {
          setUsers([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        showAlert('error', 'Failed to fetch users');
        setUsers([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedState, selectedDistrict, selectedTehsil]
  );

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, fetchUsers]);

  // Execute Search / Filter Action
  const handleApplyFilter = () => {
    const trimmed = searchInput.trim();
    // If input is purely digits, execute API search by user_id
    if (/^\d+$/.test(trimmed)) {
      fetchUserById(trimmed);
    } else {
      setCurrentPage(1);
      fetchUsers(1);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyFilter();
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedTehsil('');
    setDistrictsList([]);
    setTehsilsList([]);
    setCurrentPage(1);
    fetchUsers(1);
  };

  // 6. Open Status Edit Modal
  const handleOpenEditStatus = (user) => {
    setEditStatusModal({
      isOpen: true,
      user,
      selectedStatus: user.status || 'active',
    });
  };

  // 7. Save Status via PATCH /api/app-users/users/:user_id/status (2FA protected)
  const handleSaveStatusUpdate = async () => {
    const { user, selectedStatus } = editStatusModal;
    if (!user) return;

    setUpdatingStatus(true);
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(`${host}/api/app-users/users/${user.user_id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ status: selectedStatus, verification_password: stored2fa }),
      });

      const res = await response.json();
      if (res && res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.user_id === user.user_id ? { ...u, status: selectedStatus } : u))
        );
        showAlert('success', `User status updated to ${selectedStatus}`);
        setEditStatusModal({ isOpen: false, user: null, selectedStatus: 'active' });
      } else if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
      } else {
        showAlert('error', res.message || 'Unable to update status');
      }
    } catch (err) {
      showAlert('error', 'Error updating user status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 8. Delete User via DELETE /api/app-users/users/:user_id (2FA protected)
  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(`${host}/api/app-users/users/${deleteModal.user.user_id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: JSON.stringify({ verification_password: stored2fa }),
      });

      const res = await response.json();
      if (res && res.success) {
        showAlert('success', res.message || 'User deleted successfully');
        if (isSingleUserView) {
          handleResetFilters();
        } else {
          fetchUsers(currentPage);
        }
      } else if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
      } else {
        showAlert('error', res.message || 'Failed to delete user');
      }
    } catch (err) {
      showAlert('error', 'Error deleting user');
    } finally {
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleExecute2FAVerify = async (e) => {
    e.preventDefault();
    if (!twoFactorModal.verificationPassword) {
      showAlert('error', 'Verification password is required');
      return;
    }
    setTwoFactorModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`${host}/api/payment-users/verify-2fa`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: twoFactorModal.verificationPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('gov_2fa_password', twoFactorModal.verificationPassword);
        setTwoFactorModal({ isOpen: false, verificationPassword: '', submitting: false });
        fetchUsers(currentPage);
      } else {
        showAlert('error', data.message || 'Invalid verification password');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showAlert('error', 'Network error during verification');
      setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // If searchInput is text (not pure digits), perform client-side username filtering on the batch
  const displayedUsers = useMemo(() => {
    const trimmed = searchInput.trim();
    if (!trimmed || /^\d+$/.test(trimmed) || isSingleUserView) {
      return users;
    }
    return users.filter((u) =>
      u.username?.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [users, searchInput, isSingleUserView]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="view-users-page">
      {/* Alert Banner */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span>{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Edit Status Modal Popup */}
      {editStatusModal.isOpen && (
        <div className="vu-modal-overlay">
          <div className="vu-modal-box edit-status-box">
            <div className="vu-modal-icon">⚙️</div>
            <h3>Change User Status</h3>
            <p className="modal-subtext">
              Update status for <strong>{editStatusModal.user?.username}</strong> (ID: #{editStatusModal.user?.user_id})
            </p>

            <div className="status-selector-group">
              <label
                className={`status-option-label ${
                  editStatusModal.selectedStatus === 'active' ? 'selected active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="modalStatus"
                  value="active"
                  checked={editStatusModal.selectedStatus === 'active'}
                  onChange={(e) =>
                    setEditStatusModal((prev) => ({ ...prev, selectedStatus: e.target.value }))
                  }
                />
                <span className="dot active"></span>
                <span>Active</span>
              </label>

              <label
                className={`status-option-label ${
                  editStatusModal.selectedStatus === 'inactive' ? 'selected inactive' : ''
                }`}
              >
                <input
                  type="radio"
                  name="modalStatus"
                  value="inactive"
                  checked={editStatusModal.selectedStatus === 'inactive'}
                  onChange={(e) =>
                    setEditStatusModal((prev) => ({ ...prev, selectedStatus: e.target.value }))
                  }
                />
                <span className="dot inactive"></span>
                <span>Inactive</span>
              </label>
            </div>

            <div className="vu-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveStatusUpdate}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setEditStatusModal({ isOpen: false, user: null, selectedStatus: 'active' })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="vu-modal-overlay">
          <div className="vu-modal-box">
            <div className="vu-modal-icon">🗑️</div>
            <h3>Delete User Account</h3>
            <p>
              Are you sure you want to permanently delete user{' '}
              <strong>{deleteModal.user?.username}</strong> (ID: #{deleteModal.user?.user_id})?
              This action cannot be undone.
            </p>
            <div className="vu-modal-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="vu-header-row">
        <h1 className="vu-title">User Management</h1>
        <Link to="/adduser" className="vu-btn-add-user">
          <span className="plus-sign">+</span> Add User
        </Link>
      </div>

      {/* Search Bar (Accepts Username or Numeric User ID) */}
      <div className="vu-search-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by username or user ID (e.g., 1012)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {searchInput && (
          <button
            type="button"
            className="vu-search-clear"
            onClick={handleResetFilters}
            title="Clear Search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Row: State, District, Tehsil, and Show Button */}
      <div className="vu-filters-grid">
        <div className="filter-item">
          <label>State</label>
          <select value={selectedState} onChange={handleStateChange}>
            <option value="">Select State</option>
            {statesList.map((st) => (
              <option key={st.state_id} value={st.state_id}>
                {st.state_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>District</label>
          <select
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={!selectedState}
          >
            <option value="">Select District</option>
            {districtsList.map((dt) => (
              <option key={dt.district_id} value={dt.district_id}>
                {dt.district_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Tehsil</label>
          <select
            value={selectedTehsil}
            onChange={(e) => setSelectedTehsil(e.target.value)}
            disabled={!selectedDistrict}
          >
            <option value="">Select Tehsil</option>
            {tehsilsList.map((th) => (
              <option key={th.tehsil_id} value={th.tehsil_id}>
                {th.tehsil_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-action-group">
          <button type="button" className="vu-btn-show" onClick={handleApplyFilter}>
            Show
          </button>
          {(isSingleUserView || selectedState || selectedDistrict || selectedTehsil) && (
            <button
              type="button"
              className="vu-btn-reset"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Single Search Result Banner Indicator */}
      {isSingleUserView && (
        <div className="vu-single-user-banner">
          <span>
            Displaying direct record for User ID: <strong>{searchInput}</strong>
          </span>
          <button type="button" onClick={handleResetFilters}>
            View All Users →
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="vu-table-card">
        <div className="vu-table-responsive">
          <table className="vu-data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Location</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="vu-empty-cell">
                    Loading users...
                  </td>
                </tr>
              ) : displayedUsers.map((user) => {
                const roleBadge = getRoleBadgeStyle(user.role);
                const isActive = user.status === 'active';

                return (
                  <tr key={user.user_id}>
                    <td className="cell-id">{user.user_id}</td>
                    <td className="cell-username">{user.username}</td>
                    <td>
                      <span
                        className="vu-role-badge"
                        style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                      >
                        {roleBadge.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`vu-status-pill ${isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleOpenEditStatus(user)}
                        title="Click to change status"
                        style={{ cursor: 'pointer' }}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-location">{formatLocation(user)}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="vu-action-btn edit"
                        title="Change Status"
                        onClick={() => handleOpenEditStatus(user)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="vu-action-btn delete"
                        title="Delete User"
                        onClick={() => setDeleteModal({ isOpen: true, user })}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && displayedUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="vu-empty-cell">
                    No users found matching your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Pagination Bar (Hidden in single-user view) */}
      {!isSingleUserView && (
        <div className="vu-footer-bar">
          <span className="vu-record-count">
            Showing {displayedUsers.length === 0 ? 0 : (currentPage - 1) * limit + 1} to{' '}
            {(currentPage - 1) * limit + displayedUsers.length} of {totalCount} users
          </span>

          <div className="vu-pagination-controls">
            <button
              type="button"
              className="vu-page-nav"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                className={`vu-page-number ${currentPage === pg ? 'active' : ''}`}
                onClick={() => setCurrentPage(pg)}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              className="vu-page-nav"
              disabled={currentPage === totalPages || displayedUsers.length === 0}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Two-Factor Verification Modal */}
      {twoFactorModal.isOpen && (
        <div style={{
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔐</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Administrative 2FA Verification
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Administrative 2-step verification is required to access and manage App Users.
              Please enter your security verification password:
            </p>
            <form onSubmit={handleExecute2FAVerify}>
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
                  {twoFactorModal.submitting ? 'Verifying...' : 'Authorize & Continue'}
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