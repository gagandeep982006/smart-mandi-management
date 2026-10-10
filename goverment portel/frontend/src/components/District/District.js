import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './District.css';
import DistrictContext from '../../context/District/DistrictContext';
import StateContext from '../../context/state/StateContext';

export default function AddDistrict() {
  const { getState } = useContext(StateContext);
  const { getDistrict, removeDistrict, addDistrict } = useContext(DistrictContext);

  const navigate = useNavigate();

  // State holding the list of all available states
  const [statesList, setStatesList] = useState([]);

  // State containing the currently selected state_id
  const [selectedStateId, setSelectedStateId] = useState('');

  // State holding only the districts belonging to selectedStateId
  const [districts, setDistricts] = useState([]);

  // Form inputs
  const [districtName, setDistrictName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline alert notification state
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

  // Fetch all states for dropdown on component mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const result = await getState();
        if (result && result.success) {
          const extractedStates = result.states.map((item) => ({
            state_id: item.state_id,
            state_name: item.state_name,
          }));
          setStatesList(extractedStates || []);
        } else {
          showAlert('error', result?.message || 'Failed to load states');
        }
      } catch (err) {
        showAlert('error', 'Error connecting to server');
      }
    };
    fetchStates();
  }, [navigate]);

  // Updates selectedStateId and fetches its districts
  const handleStateChange = async (stateId) => {
    setSelectedStateId(stateId);
    setSearchQuery('');

    if (!stateId) {
      setDistricts([]);
      return;
    }

    try {
      const result = await getDistrict(stateId);
      if (result && result.success) {
        setDistricts(result.districts || result.data || []);
      } else {
        setDistricts([]);
        showAlert('error', result?.message || 'Failed to fetch districts');
      }
    } catch (err) {
      setDistricts([]);
      showAlert('error', 'Error loading districts for this state');
    }
  };

  // Intercept Form Submit -> Prompt Confirmation
  const promptAddDistrict = (e) => {
    e.preventDefault();

    if (!selectedStateId) {
      showAlert('error', 'Please select a state');
      return;
    }
    if (!districtName.trim() || !districtCode.trim()) {
      showAlert('error', 'Please fill in district name and code');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Add District',
      message: `Are you sure you want to add "${districtName.trim()}" (${districtCode.trim().toUpperCase()})?`,
      actionType: 'ADD',
      payload: {
        state_id: Number(selectedStateId),
        district_name: districtName.trim(),
        district_code: districtCode.trim().toUpperCase(),
      },
    });
  };

  // Intercept Delete -> Prompt Confirmation
  const promptDeleteDistrict = (item) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to remove "${item.district_name}"? This action cannot be undone.`,
      actionType: 'DELETE',
      payload: item.district_id,
    });
  };

  // Execute Confirmed Action
  const handleExecuteConfirmedAction = async () => {
    const { actionType, payload } = confirmModal;
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });

    if (actionType === 'ADD') {
      try {
        let newDistrict;
        if (addDistrict) {
          const result = await addDistrict(payload);
          if (result && result.success) {
            newDistrict = result.data || result.district;
          } else {
            showAlert('error', result?.message || 'Failed to add district');
            return;
          }
        } else {
          const matchedState = statesList.find(
            (s) => String(s.state_id) === String(selectedStateId)
          );
          newDistrict = {
            district_id: Date.now(),
            ...payload,
            state_name: matchedState ? matchedState.state_name : '',
          };
        }

        setDistricts((prev) => [...prev, newDistrict]);
        setDistrictName('');
        setDistrictCode('');
        showAlert('success', 'District added successfully!');
      } catch (err) {
        showAlert('error', 'Error adding district. Please try again.');
      }
    } else if (actionType === 'DELETE') {
      try {
        const result = await removeDistrict(payload);
        if (result && result.success) {
          setDistricts((prev) => prev.filter((d) => d.district_id !== payload));
          showAlert('success', 'District removed successfully!');
        } else {
          showAlert('error', result?.message || 'Failed to delete district');
        }
      } catch (err) {
        showAlert('error', 'Error deleting district. Please try again.');
      }
    }
  };

  const handleCancelModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });
  };

  const handleCancel = () => {
    setDistrictName('');
    setDistrictCode('');
    setSelectedStateId('');
    setDistricts([]);
    setAlert({ show: false, type: '', message: '' });
  };

  const displayedDistricts = searchQuery.trim()
    ? districts.filter(
        (item) =>
          item.district_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.district_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : districts;

  const currentStateName =
    statesList.find((s) => String(s.state_id) === String(selectedStateId))
      ?.state_name || '';

  return (
    <div className="add-district-page">
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
            <Link to="/districts">Districts</Link>
            <span className="sep">›</span>
            <span className="current">Add District</span>
          </nav>
          <h1 className="page-title">Add New District</h1>
          <p className="page-desc">Create and allocate new districts under registered states.</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      {/* Two Column Grid */}
      <div className="district-layout-grid">
        {/* Form Column */}
        <div className="district-card form-card">
          <div className="card-title-row">
            <div className="icon-badge">🏙️</div>
            <h2>District Details</h2>
          </div>

          <form onSubmit={promptAddDistrict} className="district-form">
            {/* Select State Dropdown */}
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

            {/* District Name */}
            <div className="form-group">
              <label>
                District Name <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter district name (e.g. Ludhiana)"
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                required
              />
            </div>

            {/* District Code */}
            <div className="form-group">
              <label>
                District Code <span className="req">*</span>
              </label>
              <input
                type="text"
                maxLength="5"
                placeholder="Enter district code (e.g. LU)"
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                required
              />
              <span className="form-hint">Standard regional district abbreviation</span>
            </div>

            {/* Action Buttons & Inline Alert */}
            <div className="form-actions-wrapper">
              <div className="form-buttons">
                <button type="submit" className="submit-btn">
                  + Add District
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

        {/* Existing Districts Table Column */}
        <div className="right-column-stack">
          <div className="district-card banner-info-card">
            <div className="banner-icon-side">
              <div className="map-badge">📍</div>
            </div>
            <div className="banner-text-content">
              <h3>Strengthening District Procurement</h3>
              <div className="highlight-pill"></div>
              <p>
                Organize sub-regions into districts to monitor local mandis, arrival quotas, and field operations seamlessly.
              </p>
            </div>
          </div>

          <div className="district-card table-card">
            <div className="table-header-row">
              <div className="card-title-row">
                <div className="icon-badge list-badge">📋</div>
                <h2>
                  {currentStateName ? `${currentStateName} Districts` : 'Existing Districts'}
                </h2>
              </div>

              {selectedStateId && (
                <div className="table-search-box">
                  <span className="search-symbol">🔍</span>
                  <input
                    type="text"
                    placeholder="Search in state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="table-wrapper">
              <table className="districts-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District Name</th>
                    <th>State</th>
                    <th>Code</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedStateId ? (
                    <tr>
                      <td colSpan="5" className="no-data select-state-hint">
                        👉 Select a state on the left to load its districts
                      </td>
                    </tr>
                  ) : displayedDistricts.length > 0 ? (
                    displayedDistricts.map((item, idx) => (
                      <tr key={item.district_id}>
                        <td>{idx + 1}</td>
                        <td className="district-name-cell">{item.district_name}</td>
                        <td>
                          <span className="state-tag">
                            {item.state_name || currentStateName}
                          </span>
                        </td>
                        <td>
                          <span className="code-badge">{item.district_code}</span>
                        </td>
                        <td className="actions-cell text-right">
                          <button
                            type="button"
                            className="action-icon-btn delete-btn"
                            title="Delete"
                            onClick={() => promptDeleteDistrict(item)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        No districts found for {currentStateName}
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