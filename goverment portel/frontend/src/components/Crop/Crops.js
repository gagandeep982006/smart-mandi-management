import { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CropContext from '../../context/Crop/CropContext';
import './Crops.css';

export default function Crops() {
  const navigate = useNavigate();

  // Context APIs
  const { getCrops, addCrops, deleteCrop, updateCrop } = useContext(CropContext) || {};

  // Component states
  const [crops, setCrops] = useState([]);
  const [cropName, setCropName] = useState('');
  const [cropType, setCropType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Edit Modal States
  const [editModal, setEditModal] = useState({ isOpen: false, crop: null });
  const [editForm, setEditForm] = useState({ name: '', type: '' });

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, crop: null });

  // Alert Banner State
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 3500);
  };

  // Helper function to pick an emoji based on crop category
  const getCropEmoji = (type = '') => {
    const t = type.toLowerCase();
    if (t === 'rabi') return '🌾';
    if (t === 'kharif') return '🌱';
    if (t === 'zaid') return '🎋';
    return '🌿';
  };

  // 1. Fetch All Crops
  const fetchCropsData = useCallback(async () => {
    if (!getCrops) return;

    try {
      const res = await getCrops();
      if (res && res.success) {
        const rawList = res.crops || [];
        const formatted = rawList.map((item) => ({
          id: item.crop_id,
          name: item.crop_name,
          type: item.crop_type
            ? item.crop_type.charAt(0).toUpperCase() + item.crop_type.slice(1).toLowerCase()
            : 'Rabi',
          createdAt: item.created_at
            ? new Date(item.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'N/A',
          icon: getCropEmoji(item.crop_type),
        }));

        setCrops(formatted);
      } else {
        setCrops([]);
      }
    } catch (err) {
      console.error('Error fetching crops:', err);
      showAlert('error', 'Error connecting to crops service');
    }
  }, [getCrops]);

  useEffect(() => {
    fetchCropsData();
  }, [fetchCropsData, navigate]);

  // 2. Add Crop Handler
  const handleAddCrop = async (e) => {
    e.preventDefault();

    if (!cropName.trim()) {
      showAlert('error', 'Please enter a valid crop name');
      return;
    }
    if (!cropType) {
      showAlert('error', 'Please select a crop type');
      return;
    }

    setSubmitting(true);

    const payload = {
      crop_name: cropName.trim(),
      crop_type: cropType.toLowerCase(),
    };

    try {
      if (addCrops) {
        const res = await addCrops(payload);

        if (res && res.success) {
          showAlert('success', res.message || 'Crop added successfully');
          setCropName('');
          setCropType('');
          fetchCropsData();
        } else {
          showAlert('error', res?.message || 'Failed to add crop');
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Edit Crop Handlers
  const handleOpenEdit = (crop) => {
    setEditModal({ isOpen: true, crop });
    setEditForm({ name: crop.name, type: crop.type });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      showAlert('error', 'Crop name cannot be empty');
      return;
    }

    const payload = {
      crop_name: editForm.name.trim(),
      crop_type: editForm.type.toLowerCase(),
    };

    try {
      if (updateCrop) {
        const res = await updateCrop(editModal.crop.id, payload);

        if (res && res.success) {
          showAlert('success', res.message || 'Crop updated successfully');
          setEditModal({ isOpen: false, crop: null });
          fetchCropsData();
        } else {
          showAlert('error', res?.message || 'Failed to update crop');
        }
      }
    } catch (err) {
      showAlert('error', 'Error updating crop');
    }
  };

  // 4. Delete Crop Handlers
  const handleOpenDelete = (crop) => {
    setDeleteModal({ isOpen: true, crop });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.crop) return;

    try {
      if (deleteCrop) {
        const res = await deleteCrop(deleteModal.crop.id);

        if (res && res.success) {
          showAlert('success', res.message || 'Crop removed successfully');
          fetchCropsData();
        } else {
          showAlert('error', res?.message || 'Failed to delete crop');
        }
      }
    } catch (err) {
      showAlert('error', 'Error deleting crop');
    } finally {
      setDeleteModal({ isOpen: false, crop: null });
    }
  };

  // Filtered List (All records rendered without pagination)
  const filteredCrops = crops.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesType = filterType === 'All' || item.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Dynamic Metrics
  const totalCount = crops.length;
  const rabiCount = crops.filter((c) => c.type.toLowerCase() === 'rabi').length;
  const kharifCount = crops.filter((c) => c.type.toLowerCase() === 'kharif').length;
  const zaidCount = crops.filter((c) => c.type.toLowerCase() === 'zaid').length;

  return (
    <div className="crops-page-container">
      {/* Alert Banner */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="crops-modal-overlay">
          <div className="crops-modal-box">
            <div className="crops-modal-icon">🗑️</div>
            <h3 className="crops-modal-title">Delete Crop</h3>
            <p className="crops-modal-text">
              Are you sure you want to delete <strong>{deleteModal.crop?.name}</strong>? This action cannot be undone.
            </p>
            <div className="crops-modal-actions">
              <button
                type="button"
                className="crops-modal-btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="crops-modal-btn btn-cancel"
                onClick={() => setDeleteModal({ isOpen: false, crop: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="crops-modal-overlay">
          <div className="crops-modal-box form-modal">
            <div className="crops-modal-header">
              <h3>Edit Crop</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setEditModal({ isOpen: false, crop: null })}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="crops-edit-form">
              <div className="form-group">
                <label>Crop Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Crop Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  required
                >
                  <option value="Rabi">Rabi</option>
                  <option value="Kharif">Kharif</option>
                  <option value="Zaid">Zaid</option>
                </select>
              </div>
              <div className="crops-modal-actions">
                <button type="submit" className="crops-btn-submit">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="crops-btn-cancel"
                  onClick={() => setEditModal({ isOpen: false, crop: null })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="crops-header-row">
        <div>
          <nav className="crops-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            {/* <Link to="/crops">Crops</Link>
            <span className="sep">›</span> */}
            <span className="current">Manage Crops</span>
          </nav>
          <h1 className="crops-title">Crops</h1>
          <p className="crops-subtitle">
            Add and manage crops for procurement. These crops are used in procurement sessions and mandi counters.
          </p>
        </div>
        <Link to="/" className="back-home-btn">
          ← Back to Home
        </Link>
      </div>

      {/* Main Two-Column Layout */}
      <div className="crops-main-grid">
        {/* Left Column: Add New Crop Card */}
        <div className="crops-card add-crop-card">
          <div className="card-top-title">
            <div className="card-icon-bubble green">🌱</div>
            <div>
              <h2 className="card-heading">Add New Crop</h2>
              <p className="card-subtext">Add a new crop to the system.</p>
            </div>
          </div>

          <form onSubmit={handleAddCrop} className="crops-form">
            <div className="form-group">
              <label>
                Crop Name <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter crop name (e.g. Wheat, Paddy)"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>
                Crop Type <span className="req">*</span>
              </label>
              <div className="select-input-container">
                <span className="select-leaf-glyph">🍃</span>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  required
                >
                  <option value="">Select crop type</option>
                  <option value="Rabi">Rabi</option>
                  <option value="Kharif">Kharif</option>
                  <option value="Zaid">Zaid</option>
                </select>
              </div>
              <span className="type-caption-text">
                Rabi: Winter season crops | Kharif: Monsoon season crops | Zaid: Summer season crops
              </span>
            </div>

            <div className="form-buttons-row">
              <button type="submit" className="crops-btn-submit" disabled={submitting}>
                {submitting ? 'Adding...' : '+ Add Crop'}
              </button>
              <button
                type="button"
                className="crops-btn-cancel"
                onClick={() => {
                  setCropName('');
                  setCropType('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info Banner + Existing Crops Table */}
        <div className="crops-right-panel">
          {/* Green Top Highlight Card */}
          <div className="crops-banner-card">
            <div className="banner-sprout-icon">🌱</div>
            <div>
              <h3 className="banner-heading">Healthy Crops, Prosperous Farmers</h3>
              <p className="banner-body">
                Manage crop information to streamline procurement and support farmers.
              </p>
            </div>
          </div>

          {/* Existing Crops Card */}
          <div className="crops-card table-panel-card">
            <div className="table-card-top-bar">
              <div className="table-title-group">
                <div className="card-icon-bubble amber">🌾</div>
                <div>
                  <h2 className="card-heading">Existing Crops</h2>
                  <p className="card-subtext">View, search, and manage all crops.</p>
                </div>
              </div>

              <div className="table-filters-group">
                <div className="search-input-box">
                  <span className="search-glyph">🔍</span>
                  <input
                    type="text"
                    placeholder="Search crops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="type-dropdown-box">
                  <span className="select-leaf-glyph">🍃</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="All">All Crop Types</option>
                    <option value="Rabi">Rabi</option>
                    <option value="Kharif">Kharif</option>
                    <option value="Zaid">Zaid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table displaying all crops without pagination */}
            <div className="crops-table-wrap">
              <table className="crops-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Crop Name</th>
                    <th>Crop Type</th>
                    <th>Created At</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrops.map((crop, index) => (
                    <tr key={crop.id}>
                      <td>{index + 1}</td>
                      <td className="crop-name-cell">
                        <span className="crop-row-icon">{crop.icon}</span> {crop.name}
                      </td>
                      <td>
                        <span className={`crop-badge ${crop.type.toLowerCase()}`}>
                          {crop.type}
                        </span>
                      </td>
                      <td className="date-cell">{crop.createdAt}</td>
                      <td className="crop-actions-cell">
                        <button
                          type="button"
                          className="crop-action-icon edit-btn"
                          title="Edit Crop"
                          onClick={() => handleOpenEdit(crop)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="crop-action-icon delete-btn"
                          title="Delete Crop"
                          onClick={() => handleOpenDelete(crop)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCrops.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state-cell">
                        No matching crops found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer-summary">
              Showing {filteredCrops.length} of {crops.length} crops
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4 Summary Metrics Cards */}
      <div className="crops-metrics-row">
        <div className="metric-box">
          <div className="metric-icon-bubble blue">🛢️</div>
          <div>
            <span className="metric-label">Total Crops</span>
            <span className="metric-number">{totalCount}</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-bubble green">🍃</div>
          <div>
            <span className="metric-label">Rabi Crops</span>
            <span className="metric-number">{rabiCount}</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-bubble green">🌱</div>
          <div>
            <span className="metric-label">Kharif Crops</span>
            <span className="metric-number">{kharifCount}</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-bubble amber">☀️</div>
          <div>
            <span className="metric-label">Zaid Crops</span>
            <span className="metric-number">{zaidCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}