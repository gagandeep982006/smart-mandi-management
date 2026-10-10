import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './ViewMandiUsers.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

const getRoleBadgeStyle = (role = '') => {
  const r = (role || '').toLowerCase();
  if (r.includes('supervisor')) {
    return { bg: '#fee2e2', text: '#ef4444', label: 'Supervisor' };
  }
  if (r.includes('officer')) {
    return { bg: '#e0f2fe', text: '#0284c7', label: 'Mandi Officer' };
  }
  if (r.includes('counter')) {
    return { bg: '#fef3c7', text: '#d97706', label: 'Counter Staff' };
  }
  return { bg: '#dcfce7', text: '#16a34a', label: 'Mandi Operator' };
};

export default function ViewMandiUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [isSingleUserView, setIsSingleUserView] = useState(false);

  // Modals
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,
    selectedStatus: 'active',
  });
  const [countersModal, setCountersModal] = useState({
    isOpen: false,
    user: null,
    counters: [],
    loading: false,
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

  // 1. Fetch Paginated Mandi Users (Cookie-based + 2FA)
  const fetchMandiUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setIsSingleUserView(false);
      try {
        const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
        const headers = { 'Content-Type': 'application/json' };
        if (stored2fa) headers['x-verification-password'] = stored2fa;

        const response = await fetch(`${host}/api/mandi-app-user/mandi-users`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ page, limit, verification_password: stored2fa }),
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
        console.error('Error fetching Mandi users:', err);
        showAlert('error', 'Failed to fetch Mandi users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchMandiUsers(currentPage);
  }, [currentPage, fetchMandiUsers]);

  // 2. Fetch Single Mandi User by ID (Cookie-based + 2FA)
  const fetchMandiUserById = useCallback(async (userId) => {
    setLoading(true);
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(
        `${host}/api/mandi-app-user/mandi-users/${userId}`,
        {
          method: 'GET',
          credentials: 'include',
          headers,
        }
      );
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
        showAlert('error', res.message || `Mandi user #${userId} not found`);
      }
    } catch (err) {
      console.error('Error finding Mandi user by ID:', err);
      showAlert('error', 'Error looking up Mandi user');
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Inspect Counters for a User (Cookie-based + 2FA)
  const handleOpenCountersModal = async (user) => {
    setCountersModal({ isOpen: true, user, counters: [], loading: true });
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(
        `${host}/api/mandi-app-user/mandi-users/${user.user_id}`,
        {
          method: 'GET',
          credentials: 'include',
          headers,
        }
      );
      const res = await response.json();
      if (res && res.success && res.data) {
        setCountersModal({
          isOpen: true,
          user,
          counters: res.data.counters || [],
          loading: false,
        });
      }
    } catch (err) {
      setCountersModal({ isOpen: true, user, counters: [], loading: false });
    }
  };

  // 4. Update Status Handler (Cookie-based + 2FA)
  const handleSaveStatusUpdate = async () => {
    const { user, selectedStatus } = statusModal;
    if (!user) return;

    setUpdatingStatus(true);
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(
        `${host}/api/mandi-app-user/mandi-users/${user.user_id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers,
          body: JSON.stringify({ status: selectedStatus, verification_password: stored2fa }),
        }
      );

      const res = await response.json();
      if (res && res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === user.user_id ? { ...u, status: selectedStatus } : u
          )
        );
        showAlert('success', `Status updated to ${selectedStatus}`);
        setStatusModal({ isOpen: false, user: null, selectedStatus: 'active' });
      } else if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
      } else {
        showAlert('error', res.message || 'Failed to update status');
      }
    } catch (err) {
      showAlert('error', 'Server error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 5. Delete Mandi User (Cookie-based + 2FA)
  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    try {
      const stored2fa = sessionStorage.getItem('gov_2fa_password') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (stored2fa) headers['x-verification-password'] = stored2fa;

      const response = await fetch(
        `${host}/api/mandi-app-user/mandi-users/${deleteModal.user.user_id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers,
          body: JSON.stringify({ verification_password: stored2fa }),
        }
      );

      const res = await response.json();
      if (res && res.success) {
        showAlert('success', res.message || 'Mandi user deleted successfully');
        if (isSingleUserView) {
          handleResetFilters();
        } else {
          fetchMandiUsers(currentPage);
        }
      } else if (response.status === 403 && res.message?.includes('Two-Factor Verification')) {
        setTwoFactorModal({ isOpen: true, verificationPassword: '', submitting: false });
      } else {
        showAlert('error', res.message || 'Failed to delete Mandi user');
      }
    } catch (err) {
      showAlert('error', 'Error deleting Mandi user');
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
        fetchMandiUsers(currentPage);
      } else {
        showAlert('error', data.message || 'Invalid verification password');
        setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showAlert('error', 'Network error during verification');
      setTwoFactorModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleApplyFilter = () => {
    const trimmed = searchInput.trim();
    if (/^\d+$/.test(trimmed)) {
      fetchMandiUserById(trimmed);
    } else {
      setCurrentPage(1);
      fetchMandiUsers(1);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setCurrentPage(1);
    fetchMandiUsers(1);
  };

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
    <div className="view-mandi-users-page">
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span>{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* View Counters Modal */}
      {countersModal.isOpen && (
        <div className="vmu-modal-overlay">
          <div className="vmu-modal-box counters-box">
            <div className="vmu-modal-icon">▦</div>
            <h3>Assigned Mandi Counters</h3>
            <p className="modal-subtext">
              User: <strong>{countersModal.user?.username}</strong> (ID: #{countersModal.user?.user_id})
            </p>

            <div className="modal-counters-list">
              {countersModal.loading ? (
                <p className="loading-text">Loading counters...</p>
              ) : countersModal.counters.length === 0 ? (
                <p className="empty-text">No counters linked to this user.</p>
              ) : (
                countersModal.counters.map((c) => (
                  <div key={c.counter_id} className="counter-detail-item">
                    <span className="c-tag">#{c.counter_number || c.counter_id}</span>
                    <span className="c-name">{c.counter_name || 'Standard Counter'}</span>
                    <span className="c-capacity">{c.capacity_per_day} MT/day</span>
                  </div>
                ))
              )}
            </div>

            <div className="vmu-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setCountersModal({ isOpen: false, user: null, counters: [], loading: false })
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {statusModal.isOpen && (
        <div className="vmu-modal-overlay">
          <div className="vmu-modal-box status-box">
            <div className="vmu-modal-icon">⚙️</div>
            <h3>Change Mandi User Status</h3>
            <p className="modal-subtext">
              Update status for <strong>{statusModal.user?.username}</strong>
            </p>

            <div className="status-selector-group">
              <label
                className={`status-option-label ${
                  statusModal.selectedStatus === 'active' ? 'selected active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={statusModal.selectedStatus === 'active'}
                  onChange={(e) =>
                    setStatusModal((prev) => ({ ...prev, selectedStatus: e.target.value }))
                  }
                />
                <span className="dot active"></span>
                <span>Active</span>
              </label>

              <label
                className={`status-option-label ${
                  statusModal.selectedStatus === 'inactive' ? 'selected inactive' : ''
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={statusModal.selectedStatus === 'inactive'}
                  onChange={(e) =>
                    setStatusModal((prev) => ({ ...prev, selectedStatus: e.target.value }))
                  }
                />
                <span className="dot inactive"></span>
                <span>Inactive</span>
              </label>
            </div>

            <div className="vmu-modal-actions">
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
                onClick={() => setStatusModal({ isOpen: false, user: null, selectedStatus: 'active' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="vmu-modal-overlay">
          <div className="vmu-modal-box">
            <div className="vmu-modal-icon">🗑️</div>
            <h3>Delete Mandi User</h3>
            <p>
              Are you sure you want to delete{' '}
              <strong>{deleteModal.user?.username}</strong> (ID: #{deleteModal.user?.user_id})?
            </p>
            <div className="vmu-modal-actions">
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

      {/* Page Header */}
      <div className="vmu-header-row">
        <h1 className="vmu-title">Mandi User Management</h1>
        <Link to="/addmandiuser" className="vmu-btn-add-user">
          <span className="plus-sign">+</span> Add Mandi User
        </Link>
      </div>

      {/* Search Toolbar */}
      <div className="vmu-search-bar-row">
        <div className="vmu-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by username or user ID (e.g. 104)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
          />
        </div>
        <button type="button" className="vmu-btn-filter" onClick={handleApplyFilter}>
          Search
        </button>
        {(isSingleUserView || searchInput) && (
          <button type="button" className="vmu-btn-reset" onClick={handleResetFilters}>
            Reset
          </button>
        )}
      </div>

      {isSingleUserView && (
        <div className="vmu-single-banner">
          <span>Displaying single record for User ID: <strong>{searchInput}</strong></span>
          <button type="button" onClick={handleResetFilters}>View All Users →</button>
        </div>
      )}

      {/* Users Table */}
      <div className="vmu-table-card">
        <div className="vmu-table-responsive">
          <table className="vmu-data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Mandi ID</th>
                <th>Counters</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="vmu-empty-cell">
                    Loading Mandi users...
                  </td>
                </tr>
              ) : displayedUsers.map((user) => {
                const roleBadge = getRoleBadgeStyle(user.role);
                const isActive = user.status === 'active';

                return (
                  <tr key={user.user_id}>
                    <td className="cell-id">#{user.user_id}</td>
                    <td className="cell-username">{user.username}</td>
                    <td>
                      <span
                        className="vmu-role-badge"
                        style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                      >
                        {roleBadge.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`vmu-status-pill ${isActive ? 'active' : 'inactive'}`}
                        onClick={() =>
                          setStatusModal({
                            isOpen: true,
                            user,
                            selectedStatus: user.status || 'active',
                          })
                        }
                        title="Click to toggle status"
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="cell-mandi">Mandi #{user.mandi_id}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-inspect-counters"
                        onClick={() => handleOpenCountersModal(user)}
                      >
                        ▦ View Counters
                      </button>
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="vmu-action-btn edit"
                        title="Change Status"
                        onClick={() =>
                          setStatusModal({
                            isOpen: true,
                            user,
                            selectedStatus: user.status || 'active',
                          })
                        }
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="vmu-action-btn delete"
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
                  <td colSpan="7" className="vmu-empty-cell">
                    No Mandi users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {!isSingleUserView && (
        <div className="vmu-footer-bar">
          <span className="vmu-record-count">
            Showing {displayedUsers.length === 0 ? 0 : (currentPage - 1) * limit + 1} to{' '}
            {(currentPage - 1) * limit + displayedUsers.length} of {totalCount} users
          </span>

          <div className="vmu-pagination-controls">
            <button
              type="button"
              className="vmu-page-nav"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                className={`vmu-page-number ${currentPage === pg ? 'active' : ''}`}
                onClick={() => setCurrentPage(pg)}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              className="vmu-page-nav"
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
        <div className="vmu-modal-overlay">
          <div className="vmu-modal-box">
            <div className="vmu-modal-icon">🔐</div>
            <h3>Administrative 2FA Verification</h3>
            <p className="modal-subtext">
              Administrative 2-step verification is required to access and manage Mandi Users.
              Please enter your security verification password:
            </p>
            <form onSubmit={handleExecute2FAVerify}>
              <div style={{ margin: '16px 0' }}>
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
                    padding: '10px 12px',
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
              <div className="vmu-modal-actions">
                <button
                  type="submit"
                  className="vmu-btn-confirm"
                  style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  disabled={twoFactorModal.submitting}
                >
                  {twoFactorModal.submitting ? 'Verifying...' : 'Authorize & Continue'}
                </button>
                <button
                  type="button"
                  className="vmu-btn-cancel"
                  onClick={() =>
                    setTwoFactorModal({
                      isOpen: false,
                      verificationPassword: '',
                      submitting: false,
                    })
                  }
                  disabled={twoFactorModal.submitting}
                  style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
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