import { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MandiContext from '../../context/Mandi/MandiContext';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import './Mandi.css';

export default function Mandis() {
  const navigate = useNavigate();

  // Contexts
  const { getMandis, deleteMandi, updateMandi } = useContext(MandiContext) || {};
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};

  // Dropdown options lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Data & Filter states
  const [mandis, setMandis] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTehsil, setSelectedTehsil] = useState('All');

  // Pagination states
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Alert State
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // View Details Modal State
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    data: null,
  });

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    mandi: null,
  });

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    mandiId: null,
  });

  const [editFormData, setEditFormData] = useState({
    mandi_name: '',
    capacity: '',
  });

  // Confirmation Modal for Edits
  const [editConfirmModal, setEditConfirmModal] = useState({
    isOpen: false,
    mandiName: '',
  });

  // 1. Initial State Dropdown Fetch
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
  }, [navigate, getState]);

  // 2. Chained State Change -> Fetch Districts
  const handleStateChange = async (stateId) => {
    setSelectedState(stateId);
    setSelectedDistrict('All');
    setSelectedTehsil('All');
    setDistrictsList([]);
    setTehsilsList([]);
    setCurrentPage(1);

    if (stateId === 'All' || !stateId) return;

    if (getDistrict) {
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

  // 3. Chained District Change -> Fetch Tehsils
  const handleDistrictChange = async (districtId) => {
    setSelectedDistrict(districtId);
    setSelectedTehsil('All');
    setTehsilsList([]);
    setCurrentPage(1);

    if (districtId === 'All' || !districtId) return;

    if (getTehsil) {
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

  // 4. Fetch Mandis using getMandis(page, limit, payload)
  const fetchMandiData = useCallback(async () => {
    try {
      const payload = {
        state_id: selectedState !== 'All' && selectedState ? Number(selectedState) : null,
        district_id: selectedDistrict !== 'All' && selectedDistrict ? Number(selectedDistrict) : null,
        tehsil_id: selectedTehsil !== 'All' && selectedTehsil ? Number(selectedTehsil) : null,
      };

      if (getMandis) {
        const res = await getMandis(currentPage, rowsPerPage, payload);

        if (res && res.success) {
          const rawList = res.data || [];
          const formatted = rawList.map((item) => ({
            id: item.mandi_id,
            mandiId: item.mandi_id,
            name: item.mandi_name,
            state: item.state_name,
            district: item.district_name,
            tehsil: item.tehsil_name,
            state_id: item.state_id,
            district_id: item.district_id,
            tehsil_id: item.tehsil_id,
            capacity: Number(item.capacity) || 0,
            status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Active',
            created_at: item.created_at,
          }));

          setMandis(formatted);
          setTotalRecords(res.pagination?.totalMandis ?? formatted.length);
        } else {
          setMandis([]);
          setTotalRecords(0);
        }
      }
    } catch (err) {
      console.error('Error connecting to mandi endpoint:', err);
    }
  }, [currentPage, rowsPerPage, selectedState, selectedDistrict, selectedTehsil, getMandis]);

  useEffect(() => {
    fetchMandiData();
  }, [fetchMandiData, navigate]);

  // Client-side quick search filtering by name or Mandi ID
  const filteredMandis = mandis.filter((mandi) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      mandi.name?.toLowerCase().includes(q) ||
      String(mandi.mandiId).includes(q)
    );
  });

  // Dynamic statistics calculations
  const totalMandisCount = totalRecords;
  const totalCapacity = filteredMandis.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0);
  const activeMandisCount = filteredMandis.filter((m) => m.status?.toLowerCase() === 'active').length;
  const inactiveMandisCount = filteredMandis.filter((m) => m.status?.toLowerCase() === 'inactive').length;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalMandisCount / rowsPerPage));
  const startRow = totalMandisCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, totalMandisCount);

  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedState('All');
    setSelectedDistrict('All');
    setSelectedTehsil('All');
    setDistrictsList([]);
    setTehsilsList([]);
    setCurrentPage(1);
  };

  // Details Modal Handlers
  const handleViewDetails = (mandiItem) => {
    setDetailsModal({
      isOpen: true,
      data: mandiItem,
    });
  };

  // Delete Modal Handlers
  const promptDelete = (mandiItem) => {
    setDeleteModal({
      isOpen: true,
      mandi: mandiItem,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.mandi) return;

    try {
      if (deleteMandi) {
        const res = await deleteMandi(deleteModal.mandi.mandiId || deleteModal.mandi.id);
        if (res && res.success) {
          showAlert('success', res.message || 'Mandi removed successfully');
          fetchMandiData();
        } else {
          showAlert('error', res?.message || 'Failed to remove mandi');
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server while deleting mandi');
    } finally {
      setDeleteModal({ isOpen: false, mandi: null });
    }
  };

  // Edit Modal Handlers
  const handleOpenEditModal = (mandiItem) => {
    setEditModal({
      isOpen: true,
      mandiId: mandiItem.mandiId || mandiItem.id,
    });
    setEditFormData({
      mandi_name: mandiItem.name || '',
      capacity: mandiItem.capacity || '',
    });
  };

  const promptConfirmUpdate = (e) => {
    e.preventDefault();
    if (!editFormData.mandi_name.trim()) {
      showAlert('error', 'Mandi name cannot be empty');
      return;
    }
    if (!editFormData.capacity || Number(editFormData.capacity) <= 0) {
      showAlert('error', 'Please enter a valid capacity per day');
      return;
    }

    setEditConfirmModal({
      isOpen: true,
      mandiName: editFormData.mandi_name,
    });
  };

  const executeUpdateMandi = async () => {
    setEditConfirmModal({ isOpen: false, mandiName: '' });

    const payload = {
      mandi_name: editFormData.mandi_name.trim(),
      capacity: Number(editFormData.capacity),
    };

    try {
      if (updateMandi) {
        const res = await updateMandi(editModal.mandiId, payload);
        if (res && res.success) {
          showAlert('success', res.message || 'Mandi updated successfully');
          setEditModal({ isOpen: false, mandiId: null });
          fetchMandiData();
        } else {
          showAlert('error', res?.message || 'Failed to update mandi');
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server while updating mandi');
    }
  };

  return (
    <div className="mandis-page-container">
      {/* Top Banner Alert Message */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="confirm-modal-overlay confirmation-top-layer">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">🗑️</div>
            <h3 className="modal-title">Delete Mandi</h3>
            <p className="modal-message">
              Are you sure you want to delete <strong>{deleteModal.mandi?.name}</strong> (ID: {deleteModal.mandi?.mandiId})? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-confirm-btn btn-danger"
                onClick={confirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDeleteModal({ isOpen: false, mandi: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Edit Updates */}
      {editConfirmModal.isOpen && (
        <div className="confirm-modal-overlay confirmation-top-layer">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">📝</div>
            <h3 className="modal-title">Confirm Update</h3>
            <p className="modal-message">
              Are you sure you want to save the modified details for <strong>{editConfirmModal.mandiName}</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-confirm-btn btn-success"
                onClick={executeUpdateMandi}
              >
                Yes, Save Changes
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setEditConfirmModal({ isOpen: false, mandiName: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mandi Modal */}
      {editModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="details-modal-box edit-modal-container">
            <div className="details-modal-header">
              <div className="details-header-title">
                <span className="modal-header-icon">✏️</span>
                <h3>Edit Mandi (ID: {editModal.mandiId})</h3>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setEditModal({ isOpen: false, mandiId: null })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={promptConfirmUpdate} className="edit-farmer-form">
              <div className="details-section">
                <h4 className="section-subtitle">Mandi Details</h4>
                <div className="form-fields-grid">
                  <div className="form-group address-span">
                    <label>Mandi Name</label>
                    <input
                      type="text"
                      name="mandi_name"
                      value={editFormData.mandi_name}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, mandi_name: e.target.value }))
                      }
                      placeholder="Enter mandi name"
                      required
                    />
                  </div>

                  <div className="form-group address-span">
                    <label>Capacity Per Day (in Metric Tonnes)</label>
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      value={editFormData.capacity}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, capacity: e.target.value }))
                      }
                      placeholder="Enter capacity per day"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="details-modal-footer">
                <button type="submit" className="modal-confirm-btn btn-success">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setEditModal({ isOpen: false, mandiId: null })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandi Full Details Modal */}
      {detailsModal.isOpen && detailsModal.data && (
        <div className="confirm-modal-overlay">
          <div className="details-modal-box">
            <div className="details-modal-header">
              <div className="details-header-title">
                <span className="modal-header-icon">🏛️</span>
                <h3>Mandi Details</h3>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setDetailsModal({ isOpen: false, data: null })}
              >
                ✕
              </button>
            </div>

            <div className="details-modal-content">
              {/* Basic Details */}
              <div className="details-section">
                <h4 className="section-subtitle">Premise Overview</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Mandi ID:</span>
                    <span className="detail-value highlight">{detailsModal.data.mandiId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Mandi Name:</span>
                    <span className="detail-value">{detailsModal.data.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Holding Capacity Per Day:</span>
                    <span className="detail-value">
                      {detailsModal.data.capacity.toLocaleString('en-IN', { minimumFractionDigits: 2 })} MT
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Operating Status:</span>
                    <span className={`status-pill ${detailsModal.data.status.toLowerCase()}`}>
                      {detailsModal.data.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geographic Jurisdictions */}
              <div className="details-section">
                <h4 className="section-subtitle">Location & Jurisdiction</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">State:</span>
                    <span className="detail-value">{detailsModal.data.state || 'N/A'} (ID: {detailsModal.data.state_id})</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">District:</span>
                    <span className="detail-value">{detailsModal.data.district || 'N/A'} (ID: {detailsModal.data.district_id})</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tehsil:</span>
                    <span className="detail-value">{detailsModal.data.tehsil || 'N/A'} (ID: {detailsModal.data.tehsil_id})</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Registration Date:</span>
                    <span className="detail-value">
                      {detailsModal.data.created_at
                        ? new Date(detailsModal.data.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="details-modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDetailsModal({ isOpen: false, data: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Header Action */}
      <div className="mandis-header-section">
        <div>
          <nav className="mandi-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="breadcrumb-arrow">›</span>
            <span className="breadcrumb-current">Mandis</span>
          </nav>
          <h1 className="mandi-title">Mandis</h1>
          <p className="mandi-subtitle">Manage mandi records, view details, edit or delete mandi information.</p>
        </div>
        <Link to="/mandis/addmandi" className="add-mandi-btn">
          + Add Mandi
        </Link>
      </div>

      {/* Search & Filter Card */}
      <section className="mandi-filter-card">
        <div className="filter-search-row">
          <div className="mandi-search-input-wrapper">
            <span className="search-glyph-inner">🔍</span>
            <input
              type="text"
              placeholder="Search by Mandi Name, Mandi ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" className="mandi-search-submit-btn">Search</button>
        </div>

        <div className="filter-selects-row">
          {/* State */}
          <div className="mandi-select-group">
            <label>State</label>
            <select value={selectedState} onChange={(e) => handleStateChange(e.target.value)}>
              <option value="All">All States</option>
              {statesList.map((st) => (
                <option key={st.state_id} value={st.state_id}>
                  {st.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="mandi-select-group">
            <label>District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={selectedState === 'All'}
            >
              <option value="All">All Districts</option>
              {districtsList.map((dt) => (
                <option key={dt.district_id} value={dt.district_id}>
                  {dt.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tehsil */}
          <div className="mandi-select-group">
            <label>Tehsil</label>
            <select
              value={selectedTehsil}
              onChange={(e) => {
                setSelectedTehsil(e.target.value);
                setCurrentPage(1);
              }}
              disabled={selectedDistrict === 'All'}
            >
              <option value="All">All Tehsils</option>
              {tehsilsList.map((th) => (
                <option key={th.tehsil_id} value={th.tehsil_id}>
                  {th.tehsil_name}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="mandi-reset-btn" onClick={handleResetFilters}>
            <span className="reset-glyph">🔄</span> Reset
          </button>
        </div>
      </section>

      {/* Metric Cards Row */}
      <section className="mandi-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-bubble green">🏪</div>
          <div className="metric-text-group">
            <span className="metric-label">Total Mandis</span>
            <span className="metric-figure">{totalMandisCount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bubble blue">🛢️</div>
          <div className="metric-text-group">
            <span className="metric-label">Total Capacity Per Day (MT)/Page</span>
            <span className="metric-figure">{totalCapacity.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bubble green">🛡️</div>
          <div className="metric-text-group">
            <span className="metric-label">Active Mandis/Page</span>
            <span className="metric-figure">{activeMandisCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-bubble amber">⚠️</div>
          <div className="metric-text-group">
            <span className="metric-label">Inactive Mandis/Page</span>
            <span className="metric-figure">{inactiveMandisCount}</span>
          </div>
        </div>
      </section>

      {/* Main Table Card */}
      <section className="mandi-table-card">
        <div className="mandi-table-toolbar">
          <span className="table-range-text">
            Showing {startRow} to {endRow} of {totalMandisCount.toLocaleString('en-IN')} mandis
          </span>

          <div className="table-toolbar-right">
            <div className="rows-per-page-selector">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="table-page-nav">
              <button
                type="button"
                className="page-nav-arrow"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                ‹
              </button>
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`page-nav-number ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                className="page-nav-arrow"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="mandi-table-scroll-wrapper">
          <table className="mandi-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Mandi ID</th>
                <th>Mandi Name</th>
                <th>Location ▾</th>
                <th>Capacity Per Day (MT) ▾</th>
                <th>Status ▾</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMandis.map((item, index) => (
                <tr key={item.mandiId}>
                  <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="cell-id">{item.mandiId}</td>
                  <td className="cell-name">{item.name}</td>
                  <td className="cell-location">
                    {item.state} <span className="loc-arrow">›</span> {item.district} <span className="loc-arrow">›</span> {item.tehsil}
                  </td>
                  <td className="cell-capacity">
                    {item.capacity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`status-pill ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="cell-actions">
                    <button
                      type="button"
                      className="table-action-icon blue"
                      title="View details"
                      onClick={() => handleViewDetails(item)}
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      className="table-action-icon orange"
                      title="Edit mandi"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="table-action-icon red"
                      title="Delete mandi"
                      onClick={() => promptDelete(item)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMandis.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-table-cell">No matching mandis found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}