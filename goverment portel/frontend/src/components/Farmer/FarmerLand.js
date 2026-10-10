import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import FarmerContext from '../../context/Farmer/FarmerContext';
import './FarmerLand.css';

export default function FarmerLand() {
  const { 
    addFarmerLand, 
    removeFarmerLand, 
    getFarmerLand, 
    changeLandVerificationStatus 
  } = useContext(FarmerContext) || {};

  const { farmerId } = useParams();
  const location = useLocation();

  // Extract updated state props sent from Farmers.jsx
  const passedState = location.state || {};

  const farmer = useMemo(() => ({
    farmer_id: Number(passedState.farmer_id || farmerId || 0),
    name: passedState.name || 'N/A',
    mobile_number: passedState.mobile_number || 'N/A',
    location: passedState.location || 'N/A',
    status: passedState.status || 'active',
  }), [passedState, farmerId]);

  // Land records state
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [area, setArea] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [landType, setLandType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });

  // Edit Verification Status Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    record: null,
    status: 'pending',
    updating: false,
  });

  // Feedback alerts
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // 1. Fetch Land Records for this Farmer
  const fetchLands = useCallback(async () => {
    if (!farmer.farmer_id || !getFarmerLand) return;

    setLoading(true);
    try {
      const res = await getFarmerLand(farmer.farmer_id);
      if (res && res.success) {
        const rawLands = res.data || [];
        const formatted = rawLands.map((item) => ({
          id: item.land_id,
          farmer_id: Number(item.farmer_id),
          area: Number(item.area) || 0,
          ownership_type: item.ownership_type,
          land_type: item.land_type,
          verification_status: item.land_verification || 'pending',
          verified_at: item.land_verified_at
            ? new Date(item.land_verified_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }) + ' ' + new Date(item.land_verified_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : null,
          created_at: item.created_at
            ? new Date(item.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }) + ' ' + new Date(item.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : 'N/A',
        }));
        setRecords(formatted);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('Error fetching farmer land:', err);
      showAlert('error', 'Error loading land records');
    } finally {
      setLoading(false);
    }
  }, [farmer.farmer_id, getFarmerLand]);

  useEffect(() => {
    fetchLands();
  }, [fetchLands]);

  // 2. Add Land Handler
  const handleAddLand = async (e) => {
    e.preventDefault();

    const parsedArea = parseFloat(area);
    if (isNaN(parsedArea) || parsedArea <= 0) {
      showAlert('error', 'Please enter a valid area in acres');
      return;
    }
    if (!ownershipType) {
      showAlert('error', 'Please select an ownership type');
      return;
    }
    if (!landType) {
      showAlert('error', 'Please select a land type');
      return;
    }

    setSubmitting(true);

    const payload = {
      farmer_id: Number(farmer.farmer_id),
      area: parsedArea,
      ownership_type: ownershipType,
      land_type: landType,
    };

    try {
      if (addFarmerLand) {
        const res = await addFarmerLand(payload);
        if (res && res.success) {
          showAlert('success', res.message || 'Farmer land added successfully');
          setArea('');
          setOwnershipType('');
          setLandType('');
          fetchLands();
        } else {
          showAlert('error', res?.message || 'Failed to add land record');
        }
      }
    } catch (err) {
      showAlert('error', 'Server error while adding land record');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setArea('');
    setOwnershipType('');
    setLandType('');
  };

  // 3. Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteModal.record || !removeFarmerLand) return;

    try {
      const res = await removeFarmerLand(deleteModal.record.id);
      if (res && res.success) {
        showAlert('success', res.message || 'Land record removed successfully');
        fetchLands();
      } else {
        showAlert('error', res?.message || 'Failed to remove land record');
      }
    } catch (err) {
      showAlert('error', 'Error deleting land record');
    } finally {
      setDeleteModal({ isOpen: false, record: null });
    }
  };

  // 4. Open Edit Status Modal
  const handleOpenStatusModal = (record) => {
    setStatusModal({
      isOpen: true,
      record,
      status: (record.verification_status || 'pending').toLowerCase(),
      updating: false,
    });
  };

  // 5. Submit Status Update
  const handleSaveStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusModal.record || !changeLandVerificationStatus) return;

    setStatusModal((prev) => ({ ...prev, updating: true }));

    try {
      // Passes farmer_id, land_id, and new verification status
      const res = await changeLandVerificationStatus(
        statusModal.record.id,
        statusModal.status
      );

      if (res && res.success) {
        showAlert('success', res.message || 'Land verification status updated successfully');
        setStatusModal({ isOpen: false, record: null, status: 'pending', updating: false });
        fetchLands();
      } else {
        showAlert('error', res?.message || 'Failed to update verification status');
        setStatusModal((prev) => ({ ...prev, updating: false }));
      }
    } catch (err) {
      showAlert('error', 'Error updating verification status');
      setStatusModal((prev) => ({ ...prev, updating: false }));
    }
  };

  // Computed Land Summary Statistics
  const stats = useMemo(() => {
    let total = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;

    records.forEach((r) => {
      const val = Number(r.area) || 0;
      total += val;
      const status = (r.verification_status || '').toLowerCase();
      if (status === 'verified') verified += val;
      else if (status === 'pending') pending += val;
      else if (status === 'rejected') rejected += val;
    });

    return {
      totalArea: total.toFixed(2),
      verifiedArea: verified.toFixed(2),
      pendingArea: pending.toFixed(2),
      rejectedArea: rejected.toFixed(2),
      totalRecords: records.length,
    };
  }, [records]);

  // Formatter helper
  const formatLabel = (str = '') => {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="farmer-land-container">
      {/* Alert Banner */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Edit Land Verification Status Modal */}
      {statusModal.isOpen && (
        <div className="fl-modal-overlay">
          <div className="fl-modal-box edit-status-box">
            <div className="fl-modal-header">
              <h3>Update Verification Status</h3>
              <button
                type="button"
                className="close-x-btn"
                onClick={() => setStatusModal({ isOpen: false, record: null, status: 'pending', updating: false })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatusUpdate} className="edit-status-form">
              <div className="status-modal-meta">
                <div className="meta-row">
                  <span>Land Area:</span>
                  <strong>{Number(statusModal.record?.area).toFixed(2)} acres</strong>
                </div>
                <div className="meta-row">
                  <span>Ownership:</span>
                  <strong>{formatLabel(statusModal.record?.ownership_type)}</strong>
                </div>
                <div className="meta-row">
                  <span>Land Type:</span>
                  <strong>{formatLabel(statusModal.record?.land_type)}</strong>
                </div>
              </div>

              <div className="fl-field">
                <label>
                  Verification Status <span className="req">*</span>
                </label>
                <select
                  value={statusModal.status}
                  onChange={(e) => setStatusModal((prev) => ({ ...prev, status: e.target.value }))}
                  required
                >
                  <option value="pending">Pending ⏳</option>
                  <option value="verified">Verified ✅</option>
                  <option value="rejected">Rejected ❌</option>
                </select>
              </div>

              <div className="fl-modal-actions">
                <button
                  type="submit"
                  className="fl-btn-submit"
                  disabled={statusModal.updating}
                >
                  {statusModal.updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="fl-btn-cancel"
                  onClick={() => setStatusModal({ isOpen: false, record: null, status: 'pending', updating: false })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fl-modal-overlay">
          <div className="fl-modal-box">
            <div className="fl-modal-icon">🗑️</div>
            <h3>Delete Land Record</h3>
            <p>
              Are you sure you want to remove this <strong>{deleteModal.record?.area} acres</strong> ({formatLabel(deleteModal.record?.ownership_type)}) record? This action cannot be undone.
            </p>
            <div className="fl-modal-actions">
              <button
                type="button"
                className="fl-btn-danger"
                onClick={confirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="fl-btn-cancel"
                onClick={() => setDeleteModal({ isOpen: false, record: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="farmer-land-header">
        <div>
          <nav className="fl-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/farmers">Farmers</Link>
            <span className="sep">›</span>
            <span className="current">Farmer Land</span>
          </nav>
          <h1 className="fl-title">Farmer Land Management</h1>
          <p className="fl-subtitle">
            View and manage land details for the selected farmer.
          </p>
        </div>
      </div>

      {/* Top Cards: Farmer Profile & Holding Metrics */}
      <div className="fl-top-grid">
        <div className="fl-card farmer-details-card">
          <div className="farmer-avatar-bubble">👤</div>
          <div className="farmer-info-content">
            <div className="farmer-info-row">
              <div className="farmer-info-item">
                <span className="info-label">Farmer ID</span>
                <span className="info-val highlight">{farmer.farmer_id}</span>
              </div>
              <div className="farmer-info-item">
                <span className="info-label">Name</span>
                <span className="info-val">{farmer.name}</span>
              </div>
              <div className="farmer-info-item">
                <span className="info-label">Mobile Number</span>
                <span className="info-val">{farmer.mobile_number}</span>
              </div>
            </div>

            <div className="farmer-info-row secondary-two-col">
              <div className="farmer-info-item location-item">
                <span className="info-label">Location / Address</span>
                <span className="info-val-sub">{farmer.location}</span>
              </div>
              <div className="farmer-info-item">
                <span className="info-label">Account Status</span>
                <div>
                  <span className={`status-pill pill-${farmer.status.toLowerCase()}`}>
                    {formatLabel(farmer.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fl-card holding-summary-card">
          <div className="holding-main-row">
            <div className="holding-icon-bubble">🌱</div>
            <div>
              <span className="holding-label">Total Land Holding</span>
              <span className="holding-number">{stats.totalArea} acres</span>
            </div>
          </div>

          <div className="holding-sub-metrics">
            <div className="holding-sub-box verified">
              <span className="sub-icon">🛡️</span>
              <div>
                <span className="sub-label">Verified</span>
                <span className="sub-val">{stats.verifiedArea} acres</span>
              </div>
            </div>

            <div className="holding-sub-box pending">
              <span className="sub-icon">🕒</span>
              <div>
                <span className="sub-label">Pending</span>
                <span className="sub-val">{stats.pendingArea} acres</span>
              </div>
            </div>

            <div className="holding-sub-box rejected">
              <span className="sub-icon">✕</span>
              <div>
                <span className="sub-label">Rejected</span>
                <span className="sub-val">{stats.rejectedArea} acres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="fl-main-grid">
        {/* Left Column: Form Card */}
        <div className="fl-card add-land-card">
          <div className="card-top-heading">
            <span className="heading-icon">🌱</span>
            <h2>Add New Land Record</h2>
          </div>

          <form onSubmit={handleAddLand} className="fl-form">
            <div className="form-fields-two-col">
              <div className="fl-field">
                <label>
                  Area (in acres) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5.50"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                />
              </div>

              <div className="fl-field">
                <label>
                  Ownership Type <span className="req">*</span>
                </label>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value)}
                  required
                >
                  <option value="">Select ownership type</option>
                  <option value="owned">Owned</option>
                  <option value="leased">Leased</option>
                  <option value="shared">Shared</option>
                </select>
              </div>
            </div>

            <div className="fl-field">
              <label>
                Land Type <span className="req">*</span>
              </label>
              <select
                value={landType}
                onChange={(e) => setLandType(e.target.value)}
                required
              >
                <option value="">Select land type</option>
                <option value="agricultural">Agricultural</option>
                <option value="irrigated">Irrigated</option>
                <option value="non_irrigated">Non Irrigated</option>
              </select>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="fl-btn-reset"
                onClick={handleResetForm}
              >
                🔄 Reset
              </button>
              <button type="submit" className="fl-btn-submit" disabled={submitting}>
                {submitting ? 'Saving...' : '💾 Add Land'}
              </button>
            </div>
          </form>

          <div className="fl-info-callout">
            <span className="callout-icon">ℹ️</span>
            <p>
              <strong>Note:</strong> Newly added land records will be marked as &quot;Pending&quot; verification. Verification will be done by the authorized government officials.
            </p>
          </div>
        </div>

        {/* Right Column: Existing Land Records Table */}
        <div className="fl-right-col">
          <div className="fl-card table-panel-card">
            <div className="card-top-heading">
              <span className="heading-icon">📋</span>
              <h2>Existing Land Records</h2>
            </div>

            <div className="fl-table-responsive">
              <table className="fl-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Area (acres)</th>
                    <th>Ownership Type</th>
                    <th>Land Type</th>
                    <th>Verification Status</th>
                    <th>Verified At</th>
                    <th>Created At</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="empty-cell">Loading land records...</td>
                    </tr>
                  ) : records.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td className="cell-area">{Number(r.area).toFixed(2)}</td>
                      <td>{formatLabel(r.ownership_type)}</td>
                      <td>{formatLabel(r.land_type)}</td>
                      <td>
                        <span className={`status-pill ${r.verification_status.toLowerCase()}`}>
                          {formatLabel(r.verification_status)}
                        </span>
                      </td>
                      <td className="cell-date">{r.verified_at || '-'}</td>
                      <td className="cell-date">{r.created_at}</td>
                      <td className="cell-actions">
                        {/* Edit Verification Status Button */}
                        <button
                          type="button"
                          className="fl-action-btn edit"
                          title="Change Verification Status"
                          onClick={() => handleOpenStatusModal(r)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="fl-action-btn delete"
                          title="Delete Record"
                          onClick={() => setDeleteModal({ isOpen: true, record: r })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && records.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-cell">
                        No land records found for this farmer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Land Summary */}
            <div className="land-summary-section">
              <div className="summary-title-row">
                <span className="summary-icon">📊</span>
                <h3>Land Summary</h3>
              </div>
              <div className="summary-cards-grid">
                <div className="summary-metric-box blue">
                  <span className="sum-label">Total Records</span>
                  <span className="sum-val">{stats.totalRecords}</span>
                </div>
                <div className="summary-metric-box green">
                  <span className="sum-label">Total Area</span>
                  <span className="sum-val">{stats.totalArea} acres</span>
                </div>
                <div className="summary-metric-box light-green">
                  <span className="sum-label">Verified Area</span>
                  <span className="sum-val">{stats.verifiedArea} acres</span>
                </div>
                <div className="summary-metric-box amber">
                  <span className="sum-label">Pending Area</span>
                  <span className="sum-val">{stats.pendingArea} acres</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}