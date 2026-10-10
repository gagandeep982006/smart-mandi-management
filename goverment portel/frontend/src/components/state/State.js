import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StateContext from '../../context/state/StateContext';

import './State.css';

export default function AddState() {
  const { getState, addState, removeState } = useContext(StateContext);
  const navigate = useNavigate();

  const [states, setStates] = useState([]);
  const [stateName, setStateName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Alert state: type ('error' | 'success' | '') and text message
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

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const result = await getState();
        if (result && result.success) {
          setStates(result.states || []);
        } else {
          showAlert('error', result?.message || 'Failed to load states');
        }
      } catch (err) {
        showAlert('error', 'Error connecting to server');
      }
    };
    fetchStates();
  }, [navigate]);

  // Prompt Confirmation before Adding State
  const promptAddState = (e) => {
    e.preventDefault();
    if (!stateName.trim() || !stateCode.trim()) {
      showAlert('error', 'Please provide state name and code');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Add State',
      message: `Are you sure you want to add "${stateName.trim()}" (${stateCode.trim().toUpperCase()})?`,
      actionType: 'ADD',
      payload: {
        name: stateName.trim(),
        code: stateCode.trim().toUpperCase(),
      },
    });
  };

  // Prompt Confirmation before Deleting State
  const promptDeleteState = (item) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to remove "${item.state_name}"? This action cannot be undone.`,
      actionType: 'DELETE',
      payload: item.state_id,
    });
  };

  // Execute Confirmed Action
  const handleExecuteConfirmedAction = async () => {
    const { actionType, payload } = confirmModal;
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });

    if (actionType === 'ADD') {
      try {
        const result = await addState(payload.name, payload.code);
        if (result && result.success) {
          const newState = result.data;
          setStates([...states, newState]);
          setStateName('');
          setStateCode('');
          showAlert('success', 'State added successfully!');
        } else {
          showAlert('error', result?.message || 'Failed to add state');
        }
      } catch (err) {
        showAlert('error', 'Error adding state. Please try again.');
      }
    } else if (actionType === 'DELETE') {
      try {
        const result = await removeState(payload);
        if (result && result.success) {
          setStates((prev) => prev.filter((item) => item.state_id !== payload));
          showAlert('success', 'State removed successfully!');
        } else {
          showAlert('error', result?.message || 'Failed to delete state');
        }
      } catch (err) {
        showAlert('error', 'Error deleting state. Please try again.');
      }
    }
  };

  const handleCancelModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', actionType: null, payload: null });
  };

  const filteredStates = states.filter(
    (item) =>
      item.state_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.state_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="add-state-page">
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
            <Link to="/states">States</Link>
            <span className="sep">›</span>
            <span className="current">Add State</span>
          </nav>
          <h1 className="page-title">Add New State</h1>
          <p className="page-desc">Add a new state to expand the mandi network.</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      {/* Two Column Content Grid */}
      <div className="state-layout-grid">
        {/* Left Column: Form */}
        <div className="state-card form-card">
          <div className="card-title-row">
            <div className="icon-badge">🏢</div>
            <h2>State Details</h2>
          </div>

          <form onSubmit={promptAddState} className="state-form">
            <div className="form-group">
              <label>
                State Name <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter state name"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>
                State Code <span className="req">*</span>
              </label>
              <input
                type="text"
                maxLength="4"
                placeholder="Enter state code (e.g. PB, HR)"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                required
              />
              <span className="form-hint">Use standard 2-letter state code</span>
            </div>

            {/* Action Buttons Row with Inline Alert */}
            <div className="form-actions-wrapper">
              <div className="form-buttons">
                <button type="submit" className="submit-btn">
                  + Add State
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setStateName('');
                    setStateCode('');
                    setAlert({ show: false, type: '', message: '' });
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Inline Alert displayed beside the buttons */}
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

        {/* Right Column: Banner & Simplified Table */}
        <div className="right-column-stack">
          {/* Info Card Banner */}
          <div className="state-card banner-info-card">
            <div className="banner-icon-side">
              <div className="map-badge">📍</div>
            </div>
            <div className="banner-text-content">
              <h3>Building a stronger agri network</h3>
              <div className="highlight-pill"></div>
              <p>
                Add states to manage mandis, track procurement, and connect farmers across India.
              </p>
            </div>
          </div>

          {/* Existing States Table */}
          <div className="state-card table-card">
            <div className="table-header-row">
              <div className="card-title-row">
                <div className="icon-badge list-badge">📋</div>
                <h2>Existing States</h2>
              </div>
              <div className="table-search-box">
                <span className="search-symbol">🔍</span>
                <input
                  type="text"
                  placeholder="Search states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="states-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>State Name</th>
                    <th>State Code</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStates.map((item, idx) => (
                    <tr key={item.state_id}>
                      <td>{idx + 1}</td>
                      <td className="state-name-cell">{item.state_name}</td>
                      <td>
                        <span className="code-badge">{item.state_code}</span>
                      </td>
                      <td className="actions-cell text-right">
                        <button
                          type="button"
                          className="action-icon-btn delete-btn"
                          title="Delete"
                          onClick={() => promptDeleteState(item)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStates.length === 0 && (
                    <tr>
                      <td colSpan="4" className="no-data">
                        No states found
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