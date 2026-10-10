import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CropContext from '../../context/Crop/CropContext';
import ProcurementContext from '../../context/Procurement/ProcurementContext';
import './ProcurementSession.css';

const fallbackCrops = [
  { id: 1, name: 'Wheat', icon: '🌾' },
  { id: 2, name: 'Paddy', icon: '🌱' },
  { id: 3, name: 'Mustard', icon: '🌼' },
  { id: 4, name: 'Maize', icon: '🌽' },
];

export default function ProcurementSessions() {
  const { getCrops } = useContext(CropContext) || {};
  const {
    getProcurementSession,
    addProcurementSession,
    removeProcurementSession,
    updateProcurementSession,
  } = useContext(ProcurementContext) || {};

  // Crops & Sessions Data
  const [cropsList, setCropsList] = useState(fallbackCrops);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    session_name: '',
    crop_id: '',
    start_date: '',
    end_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modals
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, session: null });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    session: null,
    form: { session_name: '', crop_name: '', start_date: '', end_date: '', sessionStatus: '' },
    updating: false,
  });

  // Global Alerts
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  const getCropIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('wheat')) return '🌾';
    if (n.includes('paddy') || n.includes('rice')) return '🌱';
    if (n.includes('mustard') || n.includes('sarson')) return '🌼';
    if (n.includes('maize') || n.includes('corn')) return '🌽';
    if (n.includes('barley')) return '🌾';
    if (n.includes('gram')) return '🌿';
    return '🍃';
  };

  // Status calculation matching backend logic
  const computeStatus = (startDate, endDate) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(0, 0, 0, 0);

    if (end < today) return 'Ended';
    if (start <= today && end >= today) return 'Active';
    return 'Upcoming';
  };

  // 1. Fetch Crops via CropContext
  useEffect(() => {
    const fetchCropsList = async () => {
      if (!getCrops) return;
      try {
        const res = await getCrops();
        if (res && res.success && res.crops?.length > 0) {
          setCropsList(
            res.crops.map((c) => ({
              id: c.crop_id,
              name: c.crop_name,
              icon: getCropIcon(c.crop_name),
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching crops:', err);
      }
    };
    fetchCropsList();
  }, [getCrops]);

  // 2. Fetch Sessions via getProcurementSession
  const fetchSessionsData = useCallback(async () => {
    if (!getProcurementSession) return;
    setLoading(true);
    try {
      const res = await getProcurementSession();
      if (res && res.success) {
        const raw = res.data || [];
        const formatted = raw.map((item) => {
          const calculatedStatus = computeStatus(item.start_date, item.end_date);
          return {
            id: item.session_id,
            session_name: item.session_name,
            crop_name: item.crop_name,
            crop_icon: getCropIcon(item.crop_name),
            start_date: item.start_date ? item.start_date.split('T')[0] : '',
            end_date: item.end_date ? item.end_date.split('T')[0] : '',
            status: calculatedStatus,
            created_at: item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A',
          };
        });
        setSessions(formatted);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Error fetching procurement sessions:', err);
      showAlert('error', 'Failed to retrieve procurement sessions');
    } finally {
      setLoading(false);
    }
  }, [getProcurementSession]);

  useEffect(() => {
    fetchSessionsData();
  }, [fetchSessionsData]);

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 3. Add Session via addProcurementSession
  const handleAddSession = async (e) => {
    e.preventDefault();

    if (!formData.session_name.trim()) {
      showAlert('error', 'Session name is required');
      return;
    }
    if (!formData.crop_id) {
      showAlert('error', 'Please select a crop');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      showAlert('error', 'Please select start and end dates');
      return;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      showAlert('error', 'Start date cannot be after end date');
      return;
    }

    setSubmitting(true);

    const payload = {
      session_name: formData.session_name.trim(),
      crop_id: Number(formData.crop_id),
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    try {
      if (addProcurementSession) {
        const res = await addProcurementSession(payload);
        if (res && res.success) {
          showAlert('success', res.message || 'Procurement session added successfully');
          setFormData({ session_name: '', crop_id: '', start_date: '', end_date: '' });
          fetchSessionsData();
        } else {
          showAlert('error', res?.message || 'Failed to add procurement session');
        }
      }
    } catch (err) {
      showAlert('error', 'Server error while adding procurement session');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Edit Modal Handlers (Tailored to backend controller constraints)
  const handleOpenEdit = (session) => {
    if (session.status.toLowerCase() === 'ended') {
      showAlert('error', 'Ended procurement sessions cannot be modified');
      return;
    }

    setEditModal({
      isOpen: true,
      session,
      form: {
        session_name: session.session_name,
        crop_name: session.crop_name,
        start_date: session.start_date,
        end_date: session.end_date,
        sessionStatus: session.status.toLowerCase(),
      },
      updating: false,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!updateProcurementSession || !editModal.session) return;

    const { sessionStatus, start_date, end_date } = editModal.form;

    // Build payload according to backend restrictions
    const payload = {};

    if (sessionStatus === 'active') {
      // Backend: "Start date cannot be modified for an active session"
      if (!end_date) {
        showAlert('error', 'End date is required for an active session');
        return;
      }
      payload.end_date = end_date;
    } else if (sessionStatus === 'upcoming') {
      // Backend: "Start date and end date are required for an upcoming session"
      if (!start_date || !end_date) {
        showAlert('error', 'Start date and end date are required');
        return;
      }
      payload.start_date = start_date;
      payload.end_date = end_date;
    }

    setEditModal((prev) => ({ ...prev, updating: true }));

    try {
      const res = await updateProcurementSession(editModal.session.id, payload);
      if (res && res.success) {
        showAlert('success', res.message || 'Procurement session dates updated successfully');
        setEditModal({ isOpen: false, session: null, form: {}, updating: false });
        fetchSessionsData();
      } else {
        showAlert('error', res?.message || 'Failed to update procurement session');
        setEditModal((prev) => ({ ...prev, updating: false }));
      }
    } catch (err) {
      showAlert('error', 'Error updating procurement session');
      setEditModal((prev) => ({ ...prev, updating: false }));
    }
  };

  // 5. Delete Handlers via removeProcurementSession
  const handleConfirmDelete = async () => {
    if (!deleteModal.session || !removeProcurementSession) return;

    try {
      const res = await removeProcurementSession(deleteModal.session.id);
      if (res && res.success) {
        showAlert('success', res.message || 'Procurement session removed successfully');
        fetchSessionsData();
      } else {
        showAlert('error', res?.message || 'Failed to remove procurement session');
      }
    } catch (err) {
      showAlert('error', 'Error deleting procurement session');
    } finally {
      setDeleteModal({ isOpen: false, session: null });
    }
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.session_name?.toLowerCase().includes(q) ||
        s.crop_name?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'All' ||
        s.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Dynamic Status Overview Metrics
  const statusOverview = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let ended = 0;

    sessions.forEach((s) => {
      const st = (s.status || '').toLowerCase();
      if (st === 'active') active++;
      else if (st === 'upcoming') upcoming++;
      else if (st === 'ended') ended++;
    });

    return {
      total: sessions.length,
      active,
      upcoming,
      ended,
    };
  }, [sessions]);

  // Crop-wise Sessions Count
  const cropWiseMetrics = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => {
      const crop = s.crop_name || 'Other';
      counts[crop] = (counts[crop] || 0) + 1;
    });

    return Object.keys(counts).map((cropName) => ({
      crop: cropName,
      icon: getCropIcon(cropName),
      count: counts[cropName],
    }));
  }, [sessions]);

  return (
    <div className="procurement-sessions-page">
      {/* Global Alert Notification */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="ps-modal-overlay">
          <div className="ps-modal-box confirm-box">
            <div className="ps-modal-icon-bubble delete">🗑️</div>
            <h3>Delete Procurement Session</h3>
            <p>
              Are you sure you want to delete session{' '}
              <strong>{deleteModal.session?.session_name}</strong>? This action
              cannot be undone.
            </p>
            <div className="ps-modal-actions">
              <button
                type="button"
                className="ps-btn-danger"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="ps-btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, session: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editModal.isOpen && (
        <div className="ps-modal-overlay">
          <div className="ps-modal-box">
            <div className="ps-modal-header">
              <h3>Edit Procurement Session Dates</h3>
              <button
                type="button"
                className="ps-close-x"
                onClick={() =>
                  setEditModal({ isOpen: false, session: null, form: {}, updating: false })
                }
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="ps-modal-form">
              <div className="ps-field">
                <label>Session Name</label>
                <input
                  type="text"
                  value={editModal.form.session_name}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="ps-field">
                <label>Crop</label>
                <input
                  type="text"
                  value={editModal.form.crop_name}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="ps-form-two-col">
                <div className="ps-field">
                  <label>
                    Start Date{' '}
                    {editModal.form.sessionStatus === 'active' && (
                      <span className="field-subnote">(Active - Locked)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={editModal.form.start_date}
                    disabled={editModal.form.sessionStatus === 'active'}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, start_date: e.target.value },
                      }))
                    }
                    required={editModal.form.sessionStatus === 'upcoming'}
                  />
                </div>

                <div className="ps-field">
                  <label>End Date <span className="req">*</span></label>
                  <input
                    type="date"
                    value={editModal.form.end_date}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, end_date: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
              </div>

              {editModal.form.sessionStatus === 'upcoming' && (
                <p className="ps-modal-hint-note">
                  ℹ️ Note: Upcoming session start dates cannot be earlier than 7 days from today.
                </p>
              )}

              <div className="ps-modal-actions">
                <button
                  type="submit"
                  className="ps-btn-primary"
                  disabled={editModal.updating}
                >
                  {editModal.updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="ps-btn-secondary"
                  onClick={() =>
                    setEditModal({ isOpen: false, session: null, form: {}, updating: false })
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header & Top Banner */}
      <div className="ps-header-wrapper">
        <div>
          <nav className="ps-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <span className="current">Procurement Sessions</span>
            <span className="sep">›</span>
            <Link to="/procurementquota">Procurement Quota</Link>
          </nav>
          <h1 className="ps-page-title">Procurement Sessions</h1>
          <p className="ps-page-subtitle">
            Create and manage procurement sessions for different crops.
          </p>
        </div>

        <div className="ps-banner-info-badge">
          <span className="banner-badge-icon">📅</span>
          <p>
            Procurement sessions define the time period during which a specific
            crop can be procured in mandis.
          </p>
        </div>
      </div>

      {/* Main Two-Column Content Grid */}
      <div className="ps-main-grid">
        {/* Left Column: Add New Procurement Session Card */}
        <div className="ps-card ps-form-card">
          <div className="ps-card-title-row">
            <span className="ps-title-icon green">➕</span>
            <h2>Add New Procurement Session</h2>
          </div>

          <form onSubmit={handleAddSession} className="ps-session-form">
            <div className="ps-field">
              <label>
                Session Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="session_name"
                placeholder="e.g. Rabi 2026-27"
                value={formData.session_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="ps-field">
              <label>
                Crop <span className="req">*</span>
              </label>
              <div className="ps-select-wrapper">
                <select
                  name="crop_id"
                  value={formData.crop_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select crop</option>
                  {cropsList.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ps-form-two-col">
              <div className="ps-field">
                <label>
                  Start Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="ps-field">
                <label>
                  End Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="ps-form-actions-row">
              <button
                type="button"
                className="ps-btn-reset"
                onClick={() =>
                  setFormData({
                    session_name: '',
                    crop_id: '',
                    start_date: '',
                    end_date: '',
                  })
                }
              >
                🔄 Reset
              </button>
              <button
                type="submit"
                className="ps-btn-submit"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : '💾 Add Session'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Existing Procurement Sessions Table */}
        <div className="ps-card ps-table-card">
          <div className="ps-table-header-bar">
            <div className="ps-card-title-row no-margin">
              <span className="ps-title-icon blue">📋</span>
              <h2>Existing Procurement Sessions</h2>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="ps-table-actions-toolbar">
              <div className="ps-search-input-box">
                <span className="search-glyph">🔍</span>
                <input
                  type="text"
                  placeholder="Search session name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="ps-filter-dropdown-container">
                <button
                  type="button"
                  className="ps-btn-filter-trigger"
                  onClick={() => setShowFilterDropdown((prev) => !prev)}
                >
                  🌪️ Filter
                </button>

                {showFilterDropdown && (
                  <div className="ps-filter-popover">
                    <span className="filter-label">Filter Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setShowFilterDropdown(false);
                      }}
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ended">Ended</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="ps-table-responsive">
            <table className="ps-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Session Name</th>
                  <th>Crop</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty-cell">
                      Loading procurement sessions...
                    </td>
                  </tr>
                ) : filteredSessions.map((session, idx) => (
                  <tr key={session.id}>
                    <td>{idx + 1}</td>
                    <td className="cell-session-name">{session.session_name}</td>
                    <td className="cell-crop">
                      <span className="crop-icon">{session.crop_icon}</span>{' '}
                      {session.crop_name}
                    </td>
                    <td className="cell-date">
                      {new Date(session.start_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="cell-date">
                      {new Date(session.end_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span
                        className={`ps-status-pill ${session.status.toLowerCase()}`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="cell-date">{session.created_at}</td>
                    <td className="cell-action">
                      {session.status.toLowerCase() !== 'ended' && (
                        <button
                          type="button"
                          className="ps-action-btn edit"
                          title="Edit Dates"
                          onClick={() => handleOpenEdit(session)}
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        type="button"
                        className="ps-action-btn delete"
                        title="Delete Session"
                        onClick={() =>
                          setDeleteModal({ isOpen: true, session })
                        }
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan="8" className="empty-cell">
                      No procurement sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Metrics Grids */}
      <div className="ps-bottom-metrics-grid">
        {/* Crop-wise Sessions Card */}
        <div className="ps-card ps-metrics-panel">
          <div className="ps-card-title-row">
            <span className="ps-title-icon green">🕒</span>
            <h3>Crop-wise Sessions</h3>
          </div>

          <div className="ps-crop-chips-grid">
            {cropWiseMetrics.map((item) => (
              <div key={item.crop} className="ps-crop-chip">
                <span className="chip-icon">{item.icon}</span>
                <div className="chip-text">
                  <span className="chip-crop-name">{item.crop}</span>
                  <span className="chip-session-count">
                    {item.count} {item.count === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>
              </div>
            ))}
            {cropWiseMetrics.length === 0 && (
              <p className="no-metrics-text">No active crop sessions logged.</p>
            )}
          </div>
        </div>

        {/* Session Status Overview Card */}
        <div className="ps-card ps-metrics-panel">
          <div className="ps-card-title-row">
            <span className="ps-title-icon blue">📊</span>
            <h3>Session Status Overview</h3>
          </div>

          <div className="ps-status-cards-grid">
            <div className="status-overview-box blue">
              <span className="box-label">Total Sessions</span>
              <span className="box-value">{statusOverview.total}</span>
            </div>

            <div className="status-overview-box green">
              <span className="box-label">Active</span>
              <span className="box-value">{statusOverview.active}</span>
            </div>

            <div className="status-overview-box amber">
              <span className="box-label">Upcoming</span>
              <span className="box-value">{statusOverview.upcoming}</span>
            </div>

            <div className="status-overview-box gray">
              <span className="box-label">Ended</span>
              <span className="box-value">{statusOverview.ended}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}