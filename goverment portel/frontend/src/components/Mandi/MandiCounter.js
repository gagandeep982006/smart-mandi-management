import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MandiContext from '../../context/Mandi/MandiContext';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import CropContext from '../../context/Crop/CropContext';
import './MandiCounter.css';

export default function MandiCounters() {
  // Contexts
  const {
    addMandiCounter,
    deleteMandiCounter,
    updateMandiCounter,
    getMandiCounter,
    getMandiByTehsil,
  } = useContext(MandiContext) || {};

  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};
  const { getCrops } = useContext(CropContext) || {};

  // Geographic cascading lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Mandis and Crops within active selection
  const [tehsilMandisList, setTehsilMandisList] = useState([]);
  const [cropsList, setCropsList] = useState([]);

  // Geographic Selection states
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTehsil, setSelectedTehsil] = useState('');
  const [selectedMandiId, setSelectedMandiId] = useState('');

  // Counters data store
  const [counters, setCounters] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    counterNo: '', // Parsed to integer on submit
    name: '',
    cropId: '',
    capacity: '',
    status: 'active',
  });

  // Alert State
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (type, message) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals State
  const [viewModal, setViewModal] = useState({ isOpen: false, counter: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, counter: null });
  const [editModal, setEditModal] = useState({ isOpen: false, counter: null });
  const [editForm, setEditForm] = useState({ name: '', capacity: '', status: 'active' });

  // 1. Initial State and Crops Fetch
  useEffect(() => {
    const fetchInitials = async () => {
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

      if (getCrops) {
        try {
          const cRes = await getCrops();
          if (cRes && cRes.success) {
            const raw = cRes.crops || [];
            setCropsList(
              raw.map((c) => ({
                id: c.crop_id,
                name: c.crop_name,
                icon: c.crop_type?.toLowerCase() === 'rabi' ? '🌾' : '🌱',
              }))
            );
          }
        } catch (err) {
          console.error('Error fetching crops:', err);
        }
      }
    };

    fetchInitials();
  }, [getState, getCrops]);

  // 2. Chained State Change -> Fetch Districts
  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setSelectedState(stateId);
    setSelectedDistrict('');
    setSelectedTehsil('');
    setSelectedMandiId('');
    setDistrictsList([]);
    setTehsilsList([]);
    setTehsilMandisList([]);
    setCounters([]);

    if (!stateId || !getDistrict) return;

    try {
      const res = await getDistrict(stateId);
      if (res && res.success) {
        setDistrictsList(res.districts || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
      showAlert('error', 'Failed to load districts for selected state');
    }
  };

  // 3. Chained District Change -> Fetch Tehsils
  const handleDistrictChange = async (e) => {
    const districtId = e.target.value;
    setSelectedDistrict(districtId);
    setSelectedTehsil('');
    setSelectedMandiId('');
    setTehsilsList([]);
    setTehsilMandisList([]);
    setCounters([]);

    if (!districtId || !getTehsil) return;

    try {
      const res = await getTehsil(districtId);
      if (res && res.success) {
        setTehsilsList(res.tehsils || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching tehsils:', err);
      showAlert('error', 'Failed to load tehsils for selected district');
    }
  };

  // 4. Chained Tehsil Change -> Call getMandiByTehsil(tehsil_id)
  const handleTehsilChange = useCallback(
    async (e) => {
      const tehsilId = e.target.value;
      setSelectedTehsil(tehsilId);
      setSelectedMandiId('');
      setTehsilMandisList([]);
      setCounters([]);

      if (!tehsilId || !getMandiByTehsil) return;

      try {
        const res = await getMandiByTehsil(tehsilId);
        if (res && res.success) {
          const list = res.data || res.mandis || [];
          const formatted = list.map((m) => ({
            id: m.mandi_id,
            name: m.mandi_name,
            capacity: Number(m.capacity) || 0,
          }));
          setTehsilMandisList(formatted);
          if (formatted.length > 0) {
            setSelectedMandiId(String(formatted[0].id));
          }
        } else {
          setTehsilMandisList([]);
        }
      } catch (err) {
        console.error('Error fetching mandis for tehsil:', err);
        showAlert('error', 'Failed to retrieve mandis in this tehsil');
      }
    },
    [getMandiByTehsil]
  );

  // 5. Fetch Counters via getMandiCounter(mandi_id)
  const fetchCounters = useCallback(
    async (mandiId) => {
      if (!mandiId || !getMandiCounter) return;

      try {
        const res = await getMandiCounter(mandiId);
        if (res && res.success) {
          const raw = res.counters || [];
          const mapped = raw.map((item) => {
            const cropMatch = cropsList.find((c) => c.id === item.crop_id);
            return {
              id: item.counter_id,
              mandiId: item.mandi_id,
              counterNo: Number(item.counter_number), // Integer
              name: item.counter_name || `Counter ${item.counter_number}`,
              cropId: item.crop_id,
              cropName: cropMatch ? cropMatch.name : `Crop #${item.crop_id}`,
              cropIcon: cropMatch ? cropMatch.icon : '🌾',
              capacity: Number(item.capacity_per_day) || 0,
              status: item.status || 'active',
              createdAt: item.created_at
                ? new Date(item.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A',
            };
          });
          setCounters(mapped);
        } else {
          setCounters([]);
        }
      } catch (err) {
        console.error('Error fetching counters:', err);
        setCounters([]);
        showAlert('error', 'Could not load counters for this mandi');
      }
    },
    [getMandiCounter, cropsList]
  );

  useEffect(() => {
    if (selectedMandiId) {
      fetchCounters(selectedMandiId);
    } else {
      setCounters([]);
    }
  }, [selectedMandiId, fetchCounters]);

  // Selected Mandi Object
  const currentMandiObj = useMemo(() => {
    return tehsilMandisList.find((m) => String(m.id) === String(selectedMandiId));
  }, [tehsilMandisList, selectedMandiId]);

  const currentMandiName = currentMandiObj ? currentMandiObj.name : 'Selected Mandi';
  const currentMandiCapacity = currentMandiObj ? currentMandiObj.capacity : 0;

  // Form Field Updates
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 6. Add Counter
  const handleAddCounter = async (e) => {
    e.preventDefault();
    if (!selectedMandiId) {
      showAlert('error', 'Please select a Mandi first');
      return;
    }

    const parsedCounterNumber = parseInt(formData.counterNo, 10);
    if (isNaN(parsedCounterNumber) || parsedCounterNumber <= 0) {
      showAlert('error', 'Please enter a valid numeric counter number (e.g. 1, 2, 3)');
      return;
    }

    if (!formData.cropId) {
      showAlert('error', 'Please select a crop');
      return;
    }
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      showAlert('error', 'Please enter a valid daily capacity');
      return;
    }

    setSubmitting(true);

    const payload = {
      mandi_id: Number(selectedMandiId),
      counter_number: parsedCounterNumber, // Integer
      counter_name: formData.name.trim() || undefined,
      crop_id: Number(formData.cropId),
      capacity_per_day: Number(formData.capacity),
      status: formData.status.toLowerCase(),
    };

    try {
      if (addMandiCounter) {
        const res = await addMandiCounter(payload);
        if (res && res.success) {
          showAlert('success', res.message || 'Mandi counter added successfully');
          setFormData({
            counterNo: '',
            name: '',
            cropId: '',
            capacity: '',
            status: 'active',
          });
          fetchCounters(selectedMandiId);
        } else {
          showAlert('error', res?.message || 'Failed to add counter');
        }
      }
    } catch (err) {
      showAlert('error', 'Server error while adding counter');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Handlers
  const handleOpenEdit = (counter) => {
    setEditModal({ isOpen: true, counter });
    setEditForm({
      name: counter.name,
      capacity: counter.capacity,
      status: counter.status.toLowerCase(),
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!updateMandiCounter || !editModal.counter) return;

    try {
      const res = await updateMandiCounter(editModal.counter.id, {
        counter_name: editForm.name.trim(),
        capacity_per_day: Number(editForm.capacity),
        status: editForm.status.toLowerCase(),
      });

      if (res && res.success) {
        showAlert('success', res.message || 'Counter updated successfully');
        setEditModal({ isOpen: false, counter: null });
        fetchCounters(selectedMandiId);
      } else {
        showAlert('error', res?.message || 'Failed to update counter');
      }
    } catch (err) {
      showAlert('error', 'Error updating counter');
    }
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deleteModal.counter || !deleteMandiCounter) return;

    try {
      const res = await deleteMandiCounter(deleteModal.counter.id);
      if (res && res.success) {
        showAlert('success', res.message || 'Counter deleted successfully');
        fetchCounters(selectedMandiId);
      } else {
        showAlert('error', res?.message || 'Failed to delete counter');
      }
    } catch (err) {
      showAlert('error', 'Error deleting counter');
    } finally {
      setDeleteModal({ isOpen: false, counter: null });
    }
  };

  // Safe Search and Filters
  const filteredCounters = useMemo(() => {
    return counters.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const counterNoStr = String(c.counterNo ?? '').toLowerCase();
      const counterNameStr = String(c.name ?? '').toLowerCase();

      const matchesSearch =
        !q ||
        counterNoStr.includes(q) ||
        counterNameStr.includes(q);

      const matchesCrop = cropFilter === 'All' || String(c.cropId) === String(cropFilter);
      const matchesStatus =
        statusFilter === 'All' || String(c.status ?? '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCrop && matchesStatus;
    });
  }, [counters, searchQuery, cropFilter, statusFilter]);

  // Metrics for Current Mandi
  const totalCount = counters.length;
  const activeCount = counters.filter((c) => c.status?.toLowerCase() === 'active').length;
  const inactiveCount = counters.filter((c) => c.status?.toLowerCase() === 'inactive').length;

  // Capacity calculations
  const totalAllocatedCapacity = counters.reduce(
    (sum, item) => sum + (Number(item.capacity) || 0),
    0
  );
  const remainingMandiCapacity = Math.max(0, currentMandiCapacity - totalAllocatedCapacity);

  return (
    <div className="mandi-counters-page">
      {/* Top Banner Alert Message */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.counter && (
        <div className="mc-modal-overlay">
          <div className="mc-modal-box">
            <div className="mc-modal-header">
              <h3>Counter Details</h3>
              <button
                type="button"
                className="mc-close-btn"
                onClick={() => setViewModal({ isOpen: false, counter: null })}
              >
                ✕
              </button>
            </div>
            <div className="mc-modal-body">
              <div className="mc-detail-row">
                <span>Counter No:</span>
                <strong>#{viewModal.counter.counterNo}</strong>
              </div>
              <div className="mc-detail-row">
                <span>Counter Name:</span>
                <strong>{viewModal.counter.name}</strong>
              </div>
              <div className="mc-detail-row">
                <span>Crop:</span>
                <strong>
                  {viewModal.counter.cropIcon} {viewModal.counter.cropName}
                </strong>
              </div>
              <div className="mc-detail-row">
                <span>Daily Quota:</span>
                <strong>{Number(viewModal.counter.capacity).toFixed(2)} MT/Day</strong>
              </div>
              <div className="mc-detail-row">
                <span>Operating Status:</span>
                <span className={`status-pill pill-${viewModal.counter.status.toLowerCase()}`}>
                  {viewModal.counter.status}
                </span>
              </div>
              <div className="mc-detail-row">
                <span>Created At:</span>
                <span>{viewModal.counter.createdAt}</span>
              </div>
            </div>
            <div className="mc-modal-footer">
              <button
                type="button"
                className="mc-btn-secondary"
                onClick={() => setViewModal({ isOpen: false, counter: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="mc-modal-overlay">
          <div className="mc-modal-box">
            <div className="mc-modal-header">
              <h3>Edit Counter #{editModal.counter?.counterNo}</h3>
              <button
                type="button"
                className="mc-close-btn"
                onClick={() => setEditModal({ isOpen: false, counter: null })}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mc-modal-form">
              <div className="mc-field">
                <label>Counter Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="mc-field">
                <label>Capacity Per Day (MT)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                  required
                />
              </div>
              <div className="mc-field">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="mc-modal-footer">
                <button type="submit" className="mc-btn-primary">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="mc-btn-secondary"
                  onClick={() => setEditModal({ isOpen: false, counter: null })}
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
        <div className="mc-modal-overlay">
          <div className="mc-modal-box confirm-box">
            <div className="mc-delete-icon">🗑️</div>
            <h3>Delete Counter</h3>
            <p>
              Are you sure you want to delete counter <strong>#{deleteModal.counter?.counterNo}</strong>? This action cannot be undone.
            </p>
            <div className="mc-modal-footer center">
              <button
                type="button"
                className="mc-btn-danger"
                onClick={handleConfirmDelete}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="mc-btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, counter: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Breadcrumb Row */}
      <div className="mc-header-row">
        <div>
          <nav className="mc-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <span className="current">Manage Counters</span>
          </nav>
          <h1 className="mc-page-title">Mandi Counters</h1>
          <p className="mc-page-subtitle">
            Add and manage counters for each mandi. Update status, view details, or delete counters.
          </p>
        </div>
        <Link to="/" className="mc-back-btn">
          ← Back to Home
        </Link>
      </div>

      {/* Main Two-Column Content Grid */}
      <div className="mc-main-grid">
        {/* Left Column: Form Card */}
        <div className="mc-card mc-form-card">
          <div className="mc-card-header">
            <div className="mc-icon-bubble green">🏪</div>
            <div>
              <h2 className="mc-card-title">Add New Counter</h2>
              <p className="mc-card-desc">Select mandi terminal and assign crop counter.</p>
            </div>
          </div>

          <form onSubmit={handleAddCounter} className="mc-counter-form">
            {/* Select State */}
            <div className="mc-field">
              <label>Select State <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">🗺️</span>
                <select value={selectedState} onChange={handleStateChange} required>
                  <option value="">-- Choose State --</option>
                  {statesList.map((st) => (
                    <option key={st.state_id} value={st.state_id}>
                      {st.state_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select District */}
            <div className="mc-field">
              <label>Select District <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">📍</span>
                <select
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  disabled={!selectedState}
                  required
                >
                  <option value="">
                    {selectedState ? '-- Choose District --' : '-- Select State First --'}
                  </option>
                  {districtsList.map((dt) => (
                    <option key={dt.district_id} value={dt.district_id}>
                      {dt.district_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Tehsil */}
            <div className="mc-field">
              <label>Select Tehsil <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">📌</span>
                <select
                  value={selectedTehsil}
                  onChange={handleTehsilChange}
                  disabled={!selectedDistrict}
                  required
                >
                  <option value="">
                    {selectedDistrict ? '-- Choose Tehsil --' : '-- Select District First --'}
                  </option>
                  {tehsilsList.map((th) => (
                    <option key={th.tehsil_id} value={th.tehsil_id}>
                      {th.tehsil_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Mandi */}
            <div className="mc-field">
              <label>Select Mandi <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">🏛️</span>
                <select
                  value={selectedMandiId}
                  onChange={(e) => setSelectedMandiId(e.target.value)}
                  disabled={!selectedTehsil || tehsilMandisList.length === 0}
                  required
                >
                  <option value="">
                    {!selectedTehsil
                      ? '-- Select Tehsil First --'
                      : tehsilMandisList.length === 0
                      ? 'No Mandis in this Tehsil'
                      : '-- Choose Mandi --'}
                  </option>
                  {tehsilMandisList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Counter Number (Integer Input) */}
            <div className="mc-field">
              <label>Counter Number <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">#</span>
                <input
                  type="number"
                  name="counterNo"
                  min="1"
                  step="1"
                  placeholder="e.g. 1"
                  value={formData.counterNo}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Counter Name */}
            <div className="mc-field">
              <label>Counter Name</label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">📄</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter counter name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Select Crop */}
            <div className="mc-field">
              <label>Select Crop <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">🍃</span>
                <select
                  name="cropId"
                  value={formData.cropId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Crop</option>
                  {cropsList.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capacity */}
            <div className="mc-field">
              <label>Capacity Per Day (MT) <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span className="input-prefix-icon">🛢️</span>
                <input
                  type="number"
                  step="0.01"
                  name="capacity"
                  placeholder="Daily intake quota (MT)"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="mc-field">
              <label>Status <span className="req">*</span></label>
              <div className="mc-input-icon-wrapper">
                <span
                  className={`status-dot ${
                    formData.status.toLowerCase() === 'active' ? 'dot-active' : 'dot-inactive'
                  }`}
                />
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mc-form-actions">
              <button
                type="submit"
                className="mc-btn-primary"
                disabled={submitting || !selectedMandiId}
              >
                {submitting ? 'Adding...' : '+ Add Counter'}
              </button>
              <button
                type="button"
                className="mc-btn-secondary"
                onClick={() =>
                  setFormData({
                    counterNo: '',
                    name: '',
                    cropId: '',
                    capacity: '',
                    status: 'active',
                  })
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info Banner + Counters Table */}
        <div className="mc-right-col">
          {/* Top Banner Card */}
          <div className="mc-banner-card">
            <div className="mc-banner-icon">✔️</div>
            <div>
              <h3 className="mc-banner-title">Efficient Procurement Starts Here</h3>
              <p className="mc-banner-desc">
                Manage mandi counters to ensure smooth and transparent procurement.
              </p>
            </div>
          </div>

          {/* Table Card */}
          <div className="mc-card mc-table-card">
            <div className="mc-table-header-row">
              <div className="mc-card-header no-margin">
                <div className="mc-icon-bubble blue">📋</div>
                <div>
                  <h2 className="mc-card-title">Counters at {currentMandiName}</h2>
                  <p className="mc-card-desc">
                    {selectedTehsil
                      ? `Viewing counters under ${currentMandiName}`
                      : `Select a tehsil on the left to load operational mandis`}
                  </p>
                </div>
              </div>

              {/* Mandi Switcher for current Tehsil */}
              {tehsilMandisList.length > 0 && (
                <div className="mc-mandi-switch-dropdown">
                  <span className="switch-icon">🏪</span>
                  <select
                    value={selectedMandiId}
                    onChange={(e) => setSelectedMandiId(e.target.value)}
                  >
                    {tehsilMandisList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Filter Bar */}
            <div className="mc-table-filters-row">
              <div className="mc-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search counters by number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="mc-filter-select-wrapper">
                <span className="select-icon">🍃</span>
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

              <div className="mc-filter-select-wrapper">
                <span className="select-icon">⚙️</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Table (All items rendered without pagination) */}
            <div className="mc-table-responsive">
              <table className="mc-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Counter No.</th>
                    <th>Counter Name</th>
                    <th>Crop</th>
                    <th>Capacity (MT/Day)</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCounters.map((c, idx) => (
                    <tr key={c.id}>
                      <td>{idx + 1}</td>
                      <td className="cell-counter-no">#{c.counterNo}</td>
                      <td className="cell-name">{c.name}</td>
                      <td className="cell-crop">
                        <span className="crop-emoji">{c.cropIcon}</span> {c.cropName}
                      </td>
                      <td className="cell-capacity">{Number(c.capacity).toFixed(2)}</td>
                      <td>
                        <span className={`status-pill pill-${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="cell-date">{c.createdAt}</td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="action-circle-btn blue"
                          title="View Details"
                          onClick={() => setViewModal({ isOpen: true, counter: c })}
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          className="action-circle-btn orange"
                          title="Edit Counter"
                          onClick={() => handleOpenEdit(c)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="action-circle-btn red"
                          title="Delete Counter"
                          onClick={() => setDeleteModal({ isOpen: true, counter: c })}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCounters.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-cell">
                        {!selectedTehsil
                          ? 'Please select a state, district, and tehsil on the left.'
                          : !selectedMandiId
                          ? 'No active mandi found for this tehsil.'
                          : 'No counters registered under this mandi.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mc-table-footer">
              <span className="mc-range-text">
                Showing all {filteredCounters.length} counter(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Metric Cards */}
      <div className="mc-metrics-grid">
        <div className="mc-metric-card">
          <div className="mc-icon-bubble blue">🛢️</div>
          <div>
            <span className="metric-label">Total Counters</span>
            <span className="metric-figure">{totalCount}</span>
          </div>
        </div>

        <div className="mc-metric-card">
          <div className="mc-icon-bubble green">✔️</div>
          <div>
            <span className="metric-label">Active Counters</span>
            <span className="metric-figure">{activeCount}</span>
          </div>
        </div>

        <div className="mc-metric-card">
          <div className="mc-icon-bubble red">❌</div>
          <div>
            <span className="metric-label">Inactive Counters</span>
            <span className="metric-figure">{inactiveCount}</span>
          </div>
        </div>

        <div className="mc-metric-card">
          <div className="mc-icon-bubble amber">🏪</div>
          <div>
            <span className="metric-label">Mandi Total Capacity Per Day</span>
            <span className="metric-figure">
              {currentMandiCapacity.toLocaleString('en-IN')} MT
            </span>
          </div>
        </div>

        <div className="mc-metric-card">
          <div className="mc-icon-bubble green">⚖️</div>
          <div>
            <span className="metric-label">Available Holding Capacity Per Day</span>
            <span className="metric-figure">
              {remainingMandiCapacity.toLocaleString('en-IN', { minimumFractionDigits: 2 })} MT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}