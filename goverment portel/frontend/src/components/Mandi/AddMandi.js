import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MandiContext from '../../context/Mandi/MandiContext';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import './AddMandi.css';

export default function AddMandi() {
  const navigate = useNavigate();

  // Contexts
  const { addMandi, getMandis } = useContext(MandiContext) || {};
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};

  // Chained dropdown lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Form Fields
  const [formData, setFormData] = useState({
    state_id: '',
    district_id: '',
    tehsil_id: '',
    mandi_name: '',
    capacity: '',
  });

  // Side Table State
  const [sideMandis, setSideMandis] = useState([]);
  const [loadingSideMandis, setLoadingSideMandis] = useState(false);

  // Status & Feedback Alerts
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (type, message) => {
    // Smoothly scroll to the top of the viewport to display the alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // 1. Initial State Fetch
  useEffect(() => {
    const fetchStates = async () => {
      if (getState) {
        try {
          const res = await getState();
          if (res && res.success) {
            setStatesList(res.states || res.data || []);
          }
        } catch (err) {
          showAlert('error', 'Failed to load states list');
        }
      }
    };

    fetchStates();
  }, [navigate, getState]);

  // 2. Chained State Change -> Fetch Districts
  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      state_id: stateId,
      district_id: '',
      tehsil_id: '',
    }));
    setDistrictsList([]);
    setTehsilsList([]);
    setSideMandis([]);

    if (!stateId || !getDistrict) return;

    try {
      const res = await getDistrict(stateId);
      if (res && res.success) {
        setDistrictsList(res.districts || res.data || []);
      }
    } catch (err) {
      showAlert('error', 'Failed to load districts');
    }
  };

  // 3. Chained District Change -> Fetch Tehsils
  const handleDistrictChange = async (e) => {
    const districtId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      district_id: districtId,
      tehsil_id: '',
    }));
    setTehsilsList([]);
    setSideMandis([]);

    if (!districtId || !getTehsil) return;

    try {
      const res = await getTehsil(districtId);
      if (res && res.success) {
        setTehsilsList(res.tehsils || res.data || []);
      }
    } catch (err) {
      showAlert('error', 'Failed to load tehsils');
    }
  };

  // 4. Fetch Side Mandis via getMandis using tehsil_id payload
  const fetchTehsilMandis = async (tehsilId, stateId, districtId) => {
    if (!getMandis || !tehsilId) return;

    setLoadingSideMandis(true);
    try {
      const payload = {
        state_id: stateId ? Number(stateId) : null,
        district_id: districtId ? Number(districtId) : null,
        tehsil_id: Number(tehsilId),
      };

      const res = await getMandis(1, 100, payload);
      if (res && res.success) {
        setSideMandis(res.data || []);
      } else {
        setSideMandis([]);
      }
    } catch (err) {
      console.error('Error fetching mandis for tehsil:', err);
      setSideMandis([]);
    } finally {
      setLoadingSideMandis(false);
    }
  };

  // 5. Chained Tehsil Change
  const handleTehsilChange = async (e) => {
    const tehsilId = e.target.value;
    setFormData((prev) => ({ ...prev, tehsil_id: tehsilId }));

    if (!tehsilId) {
      setSideMandis([]);
      return;
    }

    fetchTehsilMandis(tehsilId, formData.state_id, formData.district_id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 6. Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.tehsil_id) {
      showAlert('error', 'Please select State, District, and Tehsil');
      return;
    }

    if (!formData.mandi_name.trim()) {
      showAlert('error', 'Please enter a valid Mandi name');
      return;
    }

    if (!formData.capacity || Number(formData.capacity) <= 0) {
      showAlert('error', 'Please enter a valid capacity per day (in Metric Tonnes)');
      return;
    }

    setSubmitting(true);

    const payload = {
      mandi_name: formData.mandi_name.trim(),
      tehsil_id: Number(formData.tehsil_id),
      capacity: Number(formData.capacity),
    };

    try {
      if (addMandi) {
        const res = await addMandi(payload);
        if (res && res.success) {
          showAlert('success', res.message || 'Mandi registered successfully');
          setFormData((prev) => ({ ...prev, mandi_name: '', capacity: '' }));
          fetchTehsilMandis(formData.tehsil_id, formData.state_id, formData.district_id);
        } else {
          showAlert('error', res?.message || 'Failed to add mandi');
        }
      }
    } catch (err) {
      showAlert('error', 'Server error while registering mandi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-mandi-container">
      {/* Top Banner Alert Message */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Header & Breadcrumb Row */}
      <div className="add-mandi-header">
        <div>
          <nav className="breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/mandis">Mandis</Link>
            <span className="sep">›</span>
            <span className="current">Add Mandi</span>
          </nav>
          <h1 className="page-heading">Add New Mandi</h1>
          <p className="page-subheading">
            Register new APMC mandi trading premises and collection terminals under administrative tehsils.
          </p>
        </div>
        <Link to="/mandis" className="back-btn">
          ← Back to Mandis
        </Link>
      </div>

      {/* Two-Column Grid */}
      <div className="add-mandi-grid">
        {/* Left Column: Form Card */}
        <div className="mandi-card form-card">
          <div className="card-header">
            <div className="card-icon">🏛️</div>
            <h2 className="card-title">Mandi Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="mandi-entry-form">
            {/* Select State */}
            <div className="field-group">
              <label>SELECT STATE <span className="req">*</span></label>
              <select value={formData.state_id} onChange={handleStateChange} required>
                <option value="">-- Choose State --</option>
                {statesList.map((st) => (
                  <option key={st.state_id} value={st.state_id}>
                    {st.state_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select District */}
            <div className="field-group">
              <label>SELECT DISTRICT <span className="req">*</span></label>
              <select
                value={formData.district_id}
                onChange={handleDistrictChange}
                disabled={!formData.state_id}
                required
              >
                <option value="">
                  {formData.state_id ? '-- Choose District --' : '-- Select State First --'}
                </option>
                {districtsList.map((dt) => (
                  <option key={dt.district_id} value={dt.district_id}>
                    {dt.district_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Tehsil */}
            <div className="field-group">
              <label>SELECT TEHSIL <span className="req">*</span></label>
              <select
                value={formData.tehsil_id}
                onChange={handleTehsilChange}
                disabled={!formData.district_id}
                required
              >
                <option value="">
                  {formData.district_id ? '-- Choose Tehsil --' : '-- Select District First --'}
                </option>
                {tehsilsList.map((th) => (
                  <option key={th.tehsil_id} value={th.tehsil_id}>
                    {th.tehsil_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mandi Name */}
            <div className="field-group">
              <label>MANDI NAME <span className="req">*</span></label>
              <input
                type="text"
                name="mandi_name"
                value={formData.mandi_name}
                onChange={handleInputChange}
                placeholder="Enter mandi name (e.g. Samrala Main Grain Mandi)"
                required
              />
            </div>

            {/* Mandi Capacity Per Day */}
            <div className="field-group">
              <label>CAPACITY PER DAY (IN METRIC TONNES) <span className="req">*</span></label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="Enter daily capacity (e.g. 5000)"
                min="1"
                required
              />
              <span className="field-hint">Maximum daily holding and crop lot intake capacity</span>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Registering...' : '+ Add Mandi'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/mandis')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info Banner + Existing Mandis Side Table */}
        <div className="right-panel">
          <div className="info-banner-card">
            <div className="banner-icon">📍</div>
            <div className="banner-text">
              <h3>Expanding Procurement Capacity</h3>
              <p>
                Map APMC market yards and grain terminals under administrative tehsils to coordinate token dispatch, weighing queues, and farmer arrivals.
              </p>
            </div>
          </div>

          <div className="mandi-card table-side-card">
            <div className="card-header">
              <div className="card-icon">📋</div>
              <h2 className="card-title">Existing Mandis in Tehsil</h2>
            </div>

            <div className="side-table-content">
              {!formData.tehsil_id ? (
                <div className="empty-prompt">
                  👉 Select a state, district, and tehsil on the left to view registered mandis
                </div>
              ) : loadingSideMandis ? (
                <div className="empty-prompt">Loading mandis...</div>
              ) : sideMandis.length === 0 ? (
                <div className="empty-prompt">No mandis found registered in this tehsil.</div>
              ) : (
                <div className="table-responsive">
                  <table className="side-data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Mandi Name</th>
                        <th>Capacity Per Day (MT)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sideMandis.map((item, idx) => (
                        <tr key={item.mandi_id || idx}>
                          <td>{idx + 1}</td>
                          <td className="mandi-name-cell">{item.mandi_name}</td>
                          <td>{Number(item.capacity).toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`status-pill ${item.status?.toLowerCase() || 'active'}`}>
                              {item.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}