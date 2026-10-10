import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Tehsil.css';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';

export default function AddTehsil() {
  const navigate = useNavigate();

  // Contexts
  const { getState } = useContext(StateContext);
  const { getDistrict } = useContext(DistrictContext);
  const { getTehsil, addTehsil, removeTehsil } = useContext(TehsilContext);

  // Dropdown lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  // Selected IDs
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  // Tehsil inputs & current list
  const [tehsils, setTehsils] = useState([]);
  const [tehsilName, setTehsilName] = useState('');
  const [tehsilCode, setTehsilCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline alert
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null, // 'ADD' or 'DELETE'
    payload: null,
  });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // 1. Fetch States on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const result = await getState();
        if (result && result.success) {
          const extracted = result.states.map((item) => ({
            state_id: item.state_id,
            state_name: item.state_name,
          }));
          setStatesList(extracted || []);
        } else {
          showAlert('error', result?.message || 'Failed to load states');
        }
      } catch (err) {
        showAlert('error', 'Error connecting to server');
      }
    };
    fetchStates();
  }, [navigate]);

  // 2. When State changes, fetch Districts and reset lower fields
  const handleStateChange = async (stateId) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId('');
    setDistrictsList([]);
    setTehsils([]);
    setSearchQuery('');

    if (!stateId) return;

    try {
      const result = await getDistrict(stateId);
      if (result && result.success) {
        const extracted = (result.districts || result.data || []).map((item) => ({
          district_id: item.district_id,
          district_name: item.district_name,
        }));
        setDistrictsList(extracted);
      } else {
        showAlert('error', result?.message || 'No districts found for this state');
      }
    } catch (err) {
      showAlert('error', 'Error fetching districts');
    }
  };

  // 3. When District changes, fetch Tehsils for this specific district
  const handleDistrictChange = async (districtId) => {
    setSelectedDistrictId(districtId);
    setSearchQuery('');

    if (!districtId) {
      setTehsils([]);
      return;
    }

    try {
      if (getTehsil) {
        const result = await getTehsil(districtId);
        if (result && result.success) {
          setTehsils(result.tehsils || result.data || []);
        } else {
          setTehsils([]);
        }
      } else {
        setTehsils([]);
      }
    } catch (err) {
      setTehsils([]);
      showAlert('error', 'Error loading tehsils for this district');
    }
  };

  // 4. Prompt Confirmation Modal before Adding
  const promptAddTehsil = (e) => {
    e.preventDefault();

    if (!selectedStateId) {
      showAlert('error', 'Please select a state');
      return;
    }
    if (!selectedDistrictId) {
      showAlert('error', 'Please select a district');
      return;
    }
    if (!tehsilName.trim() || !tehsilCode.trim()) {
      showAlert('error', 'Please fill in Tehsil name and code');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Add Tehsil',
      message: `Are you sure you want to add "${tehsilName.trim()}" (${tehsilCode.trim().toUpperCase()})?`,
      actionType: 'ADD',
      payload: {
        district_id: Number(selectedDistrictId),
        tehsil_name: tehsilName.trim(),
        tehsil_code: tehsilCode.trim().toUpperCase(),
      },
    });
  };

  // 5. Prompt Confirmation Modal before Deleting
  const promptDeleteTehsil = (tehsil) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to remove "${tehsil.tehsil_name}"? This action cannot be undone.`,
      actionType: 'DELETE',
      payload: tehsil.tehsil_id,
    });
  };

  // 6. Confirmed Action Handler
  const handleExecuteConfirmedAction = async () => {
    const { actionType, payload } = confirmModal;
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });

    if (actionType === 'ADD') {
      try {
        let newTehsil;
        if (addTehsil) {
          const result = await addTehsil(payload);
          if (result && result.success) {
            newTehsil = result.data || result.tehsil;
          } else {
            showAlert('error', result?.message || 'Failed to add tehsil');
            return;
          }
        } else {
          newTehsil = {
            tehsil_id: Date.now(),
            ...payload,
          };
        }

        setTehsils((prev) => [...prev, newTehsil]);
        setTehsilName('');
        setTehsilCode('');
        showAlert('success', 'Tehsil added successfully!');
      } catch (err) {
        showAlert('error', 'Error adding tehsil. Please try again.');
      }
    } else if (actionType === 'DELETE') {
      try {
        const result = await removeTehsil(payload);
        if (result && result.success) {
          setTehsils((prev) => prev.filter((t) => t.tehsil_id !== payload));
          showAlert('success', 'Tehsil deleted successfully!');
        } else {
          showAlert('error', result?.message || 'Failed to delete tehsil');
        }
      } catch (err) {
        showAlert('error', 'Error deleting tehsil. Please try again.');
      }
    }
  };

  const handleCancelModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });
  };

  const handleCancel = () => {
    setTehsilName('');
    setTehsilCode('');
    setSelectedStateId('');
    setSelectedDistrictId('');
    setDistrictsList([]);
    setTehsils([]);
    setAlert({ show: false, type: '', message: '' });
  };

  // Filter tehsils by live search
  const displayedTehsils = searchQuery.trim()
    ? tehsils.filter(
        (item) =>
          item.tehsil_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tehsil_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tehsils;

  const currentDistrictName =
    districtsList.find((d) => String(d.district_id) === String(selectedDistrictId))
      ?.district_name || '';

  return (
    <div className="add-tehsil-page">
      {/* Confirmation Modal Popup */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">
              {confirmModal.actionType === 'DELETE' ? '🗑️' : '❓'}
            </div>
            <h3 className="modal-title">{confirmModal.title}</h3>
            <p className="modal-message">{confirmModal.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className={`modal-confirm-btn ${
                  confirmModal.actionType === 'DELETE' ? 'btn-danger' : 'btn-success'
                }`}
                onClick={handleExecuteConfirmedAction}
              >
                Yes, Confirm
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={handleCancelModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Action Row */}
      <div className="page-header-row">
        <div>
          <nav className="breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/tehsils">Tehsils</Link>
            <span className="sep">›</span>
            <span className="current">Add Tehsil</span>
          </nav>
          <h1 className="page-title">Add New Tehsil</h1>
          <p className="page-desc">Register tehsils under districts to establish local mandi administrative hubs.</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      {/* Two Column Grid */}
      <div className="tehsil-layout-grid">
        {/* Left Column: Form */}
        <div className="tehsil-card form-card">
          <div className="card-title-row">
            <div className="icon-badge">🏛️</div>
            <h2>Tehsil Details</h2>
          </div>

          <form onSubmit={promptAddTehsil} className="tehsil-form">
            {/* Step 1: Select State */}
            <div className="form-group">
              <label>
                Select State <span className="req">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  value={selectedStateId}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">-- Choose State --</option>
                  {statesList.map((st) => (
                    <option key={st.state_id} value={st.state_id}>
                      {st.state_name}
                    </option>
                  ))}
                </select>
                <span className="dropdown-arrow">▾</span>
              </div>
            </div>

            {/* Step 2: Select District (Dependent on State) */}
            <div className="form-group">
              <label>
                Select District <span className="req">*</span>
              </label>
              <div className="select-wrapper">
                <select
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="form-select"
                  disabled={!selectedStateId}
                  required
                >
                  <option value="">
                    {!selectedStateId ? '-- Select State First --' : '-- Choose District --'}
                  </option>
                  {districtsList.map((dt) => (
                    <option key={dt.district_id} value={dt.district_id}>
                      {dt.district_name}
                    </option>
                  ))}
                </select>
                <span className="dropdown-arrow">▾</span>
              </div>
            </div>

            {/* Tehsil Name */}
            <div className="form-group">
              <label>
                Tehsil Name <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter tehsil name (e.g. Samrala)"
                value={tehsilName}
                onChange={(e) => setTehsilName(e.target.value)}
                required
              />
            </div>

            {/* Tehsil Code */}
            <div className="form-group">
              <label>
                Tehsil Code <span className="req">*</span>
              </label>
              <input
                type="text"
                maxLength="6"
                placeholder="Enter tehsil code (e.g. SMR)"
                value={tehsilCode}
                onChange={(e) => setTehsilCode(e.target.value)}
                required
              />
              <span className="form-hint">Standard regional tehsil code identifier</span>
            </div>

            {/* Action Buttons & Inline Alert */}
            <div className="form-actions-wrapper">
              <div className="form-buttons">
                <button type="submit" className="submit-btn">
                  + Add Tehsil
                </button>
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>

              {alert.show && (
                <div className={`form-inline-alert alert-${alert.type}`}>
                  <span className="alert-icon">
                    {alert.type === 'error' ? '⚠️' : '✅'}
                  </span>
                  <span className="alert-text">{alert.message}</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Banner & Existing Tehsils Table */}
        <div className="right-column-stack">
          {/* Info Card Banner */}
          <div className="tehsil-card banner-info-card">
            <div className="banner-icon-side">
              <div className="map-badge">📍</div>
            </div>
            <div className="banner-text-content">
              <h3>Expanding Tehsil Clusters</h3>
              <div className="highlight-pill"></div>
              <p>
                Map sub-districts and tehsils to coordinate collection centers, farmer registration drives, and procurement logistics.
              </p>
            </div>
          </div>

          {/* Existing Tehsils Table */}
          <div className="tehsil-card table-card">
            <div className="table-header-row">
              <div className="card-title-row">
                <div className="icon-badge list-badge">📋</div>
                <h2>
                  {currentDistrictName ? `${currentDistrictName} Tehsils` : 'Existing Tehsils'}
                </h2>
              </div>

              {selectedDistrictId && (
                <div className="table-search-box">
                  <span className="search-symbol">🔍</span>
                  <input
                    type="text"
                    placeholder="Search tehsils..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="table-wrapper">
              <table className="tehsils-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tehsil Name</th>
                    <th>District</th>
                    <th>Code</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedStateId ? (
                    <tr>
                      <td colSpan="5" className="no-data select-state-hint">
                        👉 Select a state and district on the left to view tehsils
                      </td>
                    </tr>
                  ) : !selectedDistrictId ? (
                    <tr>
                      <td colSpan="5" className="no-data select-state-hint">
                        👉 Select a district to display its tehsils
                      </td>
                    </tr>
                  ) : displayedTehsils.length > 0 ? (
                    displayedTehsils.map((item, idx) => (
                      <tr key={item.tehsil_id}>
                        <td>{idx + 1}</td>
                        <td className="tehsil-name-cell">{item.tehsil_name}</td>
                        <td>
                          <span className="district-tag">{currentDistrictName}</span>
                        </td>
                        <td>
                          <span className="code-badge">{item.tehsil_code}</span>
                        </td>
                        <td className="actions-cell text-right">
                          <button
                            type="button"
                            className="action-icon-btn delete-btn"
                            title="Delete"
                            onClick={() => promptDeleteTehsil(item)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        No tehsils found for {currentDistrictName}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}