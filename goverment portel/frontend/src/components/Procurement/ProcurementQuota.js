import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';
import CropContext from '../../context/Crop/CropContext';
import ProcurementContext from '../../context/Procurement/ProcurementContext';
import './ProcurementQuota.css';

export default function ProcurementQuota() {
  const { getState } = useContext(StateContext) || {};
  const { getCrops } = useContext(CropContext) || {};
  const {
    getProcurementQuota,
    addProcurementQuota,
    removeProcurementQuota,
    updateProcurementQuota,
  } = useContext(ProcurementContext) || {};

  // Master lists from API
  const [statesList, setStatesList] = useState([]);
  const [cropsList, setCropsList] = useState([]);

  // Active state's quota dataset
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State (Single driving state selector, now with LSP and MSP)
  const [formData, setFormData] = useState({
    state_id: '',
    crop_id: '',
    amount: '',
    lsp: '',
    msp: '',
  });

  const [editingQuota, setEditingQuota] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Table Search & Filter (Crop only)
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('All');

  // Modals & Notifications
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, quota: null });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // 1. Fetch States & Crops from DB on mount
  useEffect(() => {
    const fetchInitials = async () => {
      if (getState) {
        try {
          const res = await getState();
          if (res && res.success) {
            setStatesList(res.states || res.data || []);
          }
        } catch (err) {
          console.error('Error loading states:', err);
        }
      }

      if (getCrops) {
        try {
          const cRes = await getCrops();
          if (cRes && cRes.success && cRes.crops?.length > 0) {
            setCropsList(
              cRes.crops.map((c) => ({
                id: c.crop_id,
                name: c.crop_name,
              }))
            );
          }
        } catch (err) {
          console.error('Error loading crops:', err);
        }
      }
    };

    fetchInitials();
  }, [getState, getCrops]);

  // Current Selected State Name for Display
  const currentSelectedStateName = useMemo(() => {
    if (!formData.state_id) return '';
    const match = statesList.find((s) => String(s.state_id) === String(formData.state_id));
    return match ? match.state_name : `State #${formData.state_id}`;
  }, [formData.state_id, statesList]);

  // 2. Fetch Quotas when state_id changes (now handles lsp and msp)
  const fetchStateQuotas = useCallback(async (stateId) => {
    if (!stateId || !getProcurementQuota) {
      setQuotas([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getProcurementQuota(Number(stateId));
      if (res && res.success) {
        const raw = res.data || [];
        const formatted = raw.map((item) => ({
          id: item.quota_id,
          quota_id: item.quota_id,
          state_id: Number(item.state_id),
          state_name: item.state_name,
          crop_id: Number(item.crop_id),
          crop_name: item.crop_name,
          amount: Number(item.amount) || 0,
          lsp: item.lsp !== null && item.lsp !== undefined ? Number(item.lsp) : 0,
          msp: item.msp !== null && item.msp !== undefined ? Number(item.msp) : 0,
          created_at: item.created_at
            ? new Date(item.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }) +
              ' ' +
              new Date(item.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : 'N/A',
        }));
        setQuotas(formatted);
      } else {
        setQuotas([]);
      }
    } catch (err) {
      console.error('Error loading state procurement quotas:', err);
      showAlert('error', 'Error fetching state quotas');
    } finally {
      setLoading(false);
    }
  }, [getProcurementQuota]);

  const handleStateSelectChange = (e) => {
    const selectedId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state_id: selectedId,
      crop_id: '',
      amount: '',
      lsp: '',
      msp: '',
    }));
    setEditingQuota(null);
    setSearchQuery('');
    setCropFilter('All');
    fetchStateQuotas(selectedId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 3. Save or Update Quota
  const handleSaveQuota = async (e) => {
    e.preventDefault();

    if (!formData.state_id) {
      showAlert('error', 'Please select a State');
      return;
    }
    if (!formData.crop_id) {
      showAlert('error', 'Please select a Crop');
      return;
    }
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert('error', 'Amount must be greater than 0');
      return;
    }

    const parsedLsp = parseFloat(formData.lsp);
    const parsedMsp = parseFloat(formData.msp);

    if (isNaN(parsedLsp) || parsedLsp <= 0) {
      showAlert('error', 'Please enter a valid Least Selling Price (LSP)');
      return;
    }
    if (isNaN(parsedMsp) || parsedMsp <= 0) {
      showAlert('error', 'Please enter a valid Maximum Selling Price (MSP)');
      return;
    }
    if (parsedLsp > parsedMsp) {
      showAlert('error', 'Least Selling Price (LSP) cannot be greater than Maximum Selling Price (MSP)');
      return;
    }

    setSubmitting(true);

    const payload = {
      state_id: Number(formData.state_id),
      crop_id: Number(formData.crop_id),
      amount: parsedAmount,
      lsp: parsedLsp,
      msp: parsedMsp,
    };

    try {
      if (editingQuota) {
        if (updateProcurementQuota) {
          const res = await updateProcurementQuota(editingQuota.id, payload);
          if (res && res.success) {
            showAlert('success', res.message || 'Procurement quota updated successfully');
            setEditingQuota(null);
            setFormData((prev) => ({ ...prev, crop_id: '', amount: '', lsp: '', msp: '' }));
            fetchStateQuotas(formData.state_id);
          } else {
            showAlert('error', res?.message || 'Failed to update quota');
          }
        }
      } else {
        if (addProcurementQuota) {
          const res = await addProcurementQuota(payload);
          if (res && res.success) {
            showAlert('success', res.message || 'Procurement quota added successfully');
            setFormData((prev) => ({ ...prev, crop_id: '', amount: '', lsp: '', msp: '' }));
            fetchStateQuotas(formData.state_id);
          } else {
            showAlert('error', res?.message || 'Failed to add quota');
          }
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server');
    } finally {
      setSubmitting(false);
    }
  };

  // Populate form for editing
  const handleEditClick = (quota) => {
    setEditingQuota(quota);
    setFormData({
      state_id: String(quota.state_id),
      crop_id: String(quota.crop_id),
      amount: String(quota.amount),
      lsp: quota.lsp ? String(quota.lsp) : '',
      msp: quota.msp ? String(quota.msp) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear Form
  const handleClearForm = () => {
    setEditingQuota(null);
    setFormData((prev) => ({ ...prev, crop_id: '', amount: '', lsp: '', msp: '' }));
  };

  // 4. Remove Quota
  const handleConfirmDelete = async () => {
    if (!deleteModal.quota || !removeProcurementQuota) return;

    try {
      const res = await removeProcurementQuota(deleteModal.quota.id);
      if (res && res.success) {
        showAlert('success', res.message || 'Procurement quota removed successfully');
        if (editingQuota && editingQuota.id === deleteModal.quota.id) {
          handleClearForm();
        }
        fetchStateQuotas(formData.state_id);
      } else {
        showAlert('error', res?.message || 'Failed to remove quota');
      }
    } catch (err) {
      showAlert('error', 'Error deleting procurement quota');
    } finally {
      setDeleteModal({ isOpen: false, quota: null });
    }
  };

  // Quotas for the Selected State (Filtered by Search & Crop only)
  const filteredStateQuotas = useMemo(() => {
    if (!formData.state_id) return [];

    return quotas.filter((q) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        q.crop_name?.toLowerCase().includes(query) ||
        String(q.quota_id).includes(query);
      const matchesCrop = cropFilter === 'All' || String(q.crop_id) === String(cropFilter);

      return matchesSearch && matchesCrop;
    });
  }, [quotas, formData.state_id, searchQuery, cropFilter]);

  return (
    <div className="procurement-quota-page">
      {/* Alert Banner */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="pq-modal-overlay">
          <div className="pq-modal-box confirm-box">
            <div className="pq-modal-icon-bubble">🗑️</div>
            <h3>Delete Procurement Quota</h3>
            <p>
              Are you sure you want to remove the quota for{' '}
              <strong>{deleteModal.quota?.crop_name}</strong> in{' '}
              <strong>{currentSelectedStateName}</strong>? This action cannot be undone.
            </p>
            <div className="pq-modal-actions">
              <button
                type="button"
                className="pq-btn-danger"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="pq-btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, quota: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="pq-header-row">
        <div>
          <nav className="pq-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/procurement">Procurement Sessions</Link>
            <span className="sep">›</span>
            <span className="current">Procurement Quota</span>
          </nav>
          <div className="pq-title-wrapper">
            <div className="pq-title-icon-badge">🛢️</div>
            <div>
              <h1 className="pq-page-title">Procurement Quota</h1>
              <p className="pq-page-subtitle">
                Manage crop-wise procurement quotas, LSP, and MSP for each state
              </p>
            </div>
          </div>
        </div>

        <div className="pq-tagline-box">
          <span className="tag-line green">Fair Procurement</span>
          <span className="tag-line blue">Stronger Farmers</span>
          <span className="tag-line dark">A Prosperous Nation</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="pq-main-grid">
        {/* LEFT CARD: Add / Edit Quota Form */}
        <div className="pq-card pq-form-card">
          <div className="pq-card-title-row">
            <span className="pq-icon-bubble blue">➕</span>
            <h2>{editingQuota ? 'Edit Procurement Quota' : 'Add / Edit Procurement Quota'}</h2>
          </div>

          <form onSubmit={handleSaveQuota} className="pq-entry-form">
            {/* Master State Selector */}
            <div className="pq-field">
              <label>
                State <span className="req">*</span>
              </label>
              <select
                name="state_id"
                value={formData.state_id}
                onChange={handleStateSelectChange}
                required
              >
                <option value="">Select State</option>
                {statesList.map((st) => (
                  <option key={st.state_id} value={st.state_id}>
                    {st.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Selector */}
            <div className="pq-field">
              <label>
                Crop <span className="req">*</span>
              </label>
              <select
                name="crop_id"
                value={formData.crop_id}
                onChange={handleInputChange}
                required
              >
                <option value="">
                  {cropsList.length === 0 ? 'Loading crops...' : 'Select Crop'}
                </option>
                {cropsList.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quota Amount */}
            <div className="pq-field">
              <label>
                Quota Amount (Quintals) <span className="req">*</span>
              </label>
              <div className="pq-input-icon-wrapper">
                <span className="input-prefix">🌾</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  placeholder="Enter quota amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* LSP and MSP Two-Column Row */}
            <div className="pq-price-two-col">
              <div className="pq-field">
                <label>
                  LSP (Least Price ₹/Q) <span className="req">*</span>
                </label>
                <div className="pq-input-icon-wrapper">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="lsp"
                    placeholder="Min rate"
                    value={formData.lsp}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="pq-field">
                <label>
                  MSP (Max Price ₹/Q) <span className="req">*</span>
                </label>
                <div className="pq-input-icon-wrapper">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="msp"
                    placeholder="Max rate"
                    value={formData.msp}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pq-form-actions">
              <button
                type="submit"
                className="pq-btn-primary"
                disabled={submitting}
              >
                💾 {editingQuota ? 'Update Quota' : 'Save Quota'}
              </button>
              <button
                type="button"
                className="pq-btn-secondary"
                onClick={handleClearForm}
              >
                ✕ Clear Form
              </button>
            </div>
          </form>

          {/* About Procurement Quota Info Box */}
          <div className="pq-about-card">
            <div className="about-header">
              <span className="about-icon">ℹ️</span>
              <h4>About Quota & Price Limits</h4>
            </div>
            <p>
              Procurement Quota defines the total volume of crop that a farmer can sold in the mandi per acre. <strong>LSP (Least Selling Price)</strong> sets the minimum acceptable rate for auction/purchase, while <strong>MSP (Maximum Selling Price)</strong> guarantees farmers fair government-backed procurement pricing per quintal.
            </p>
          </div>
        </div>

        {/* RIGHT CARD: Quota List Table */}
        <div className="pq-card pq-table-card">
          <div className="pq-table-header-bar">
            <div className="pq-card-title-row no-margin">
              <span className="pq-icon-bubble green">📋</span>
              <div>
                <h2>
                  Quota List {formData.state_id ? `— ${currentSelectedStateName}` : ''}
                </h2>
              </div>
            </div>

            {formData.state_id && (
              <span className="pq-records-pill">
                Total Records: {filteredStateQuotas.length}
              </span>
            )}
          </div>

          {/* Filter Toolbar (Rendered only when a state is chosen) */}
          {formData.state_id && (
            <div className="pq-table-filters-row">
              <div className="pq-filter-group">
                <label>Crop</label>
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                >
                  <option value="All">All Crops</option>
                  {cropsList.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pq-search-box">
                <label>Search</label>
                <div className="pq-search-wrapper">
                  <span className="search-glyph">🔍</span>
                  <input
                    type="text"
                    placeholder="Search crop or quota ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="pq-btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setCropFilter('All');
                }}
              >
                🔄 Reset
              </button>
            </div>
          )}

          {/* Table / Empty State conditional */}
          {!formData.state_id ? (
            <div className="pq-empty-state-prompt">
              <div className="empty-prompt-icon">🗺️</div>
              <h3>No State Selected</h3>
              <p>
                Please choose a <strong>State</strong> from the form on the left to view all registered crop procurement quotas, LSP, and MSP for that state.
              </p>
            </div>
          ) : (
            <div className="pq-table-responsive">
              <table className="pq-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Quota ID</th>
                    <th>State</th>
                    <th>Crop</th>
                    <th>Amount (Quintals)</th>
                    <th>LSP (₹/Q)</th>
                    <th>MSP (₹/Q)</th>
                    <th>Created At</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="empty-cell">
                        Loading quotas for {currentSelectedStateName}...
                      </td>
                    </tr>
                  ) : filteredStateQuotas.map((q, idx) => (
                    <tr key={q.id}>
                      <td>{idx + 1}</td>
                      <td className="cell-id">{q.quota_id}</td>
                      <td className="cell-state">{q.state_name}</td>
                      <td className="cell-crop">{q.crop_name}</td>
                      <td className="cell-amount">
                        {Number(q.amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="cell-price lsp-text">
                        ₹{Number(q.lsp).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="cell-price msp-text">
                        ₹{Number(q.msp).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="cell-date">{q.created_at}</td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="action-icon-btn edit"
                          title="Edit Quota"
                          onClick={() => handleEditClick(q)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn delete"
                          title="Delete Quota"
                          onClick={() => setDeleteModal({ isOpen: true, quota: q })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredStateQuotas.length === 0 && (
                    <tr>
                      <td colSpan="9" className="empty-cell">
                        No procurement quotas configured for {currentSelectedStateName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {formData.state_id && (
            <div className="pq-table-footer">
              <span>Showing all {filteredStateQuotas.length} record(s) for {currentSelectedStateName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}