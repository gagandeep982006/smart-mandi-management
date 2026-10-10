import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AddFarmer.css';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';
import FarmerContext from '../../context/Farmer/FarmerContext';

export default function AddFarmer() {
  const navigate = useNavigate();

  // Contexts
  const { getState } = useContext(StateContext);
  const { getDistrict } = useContext(DistrictContext);
  const { getTehsil } = useContext(TehsilContext);
  const { addFarmer } = useContext(FarmerContext);

  // Chained dropdown lists
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Form Fields matched to API schema
  const [formData, setFormData] = useState({
    name: '',
    aadhaar_number: '',
    mobile_number: '',
    state_id: '',
    district_id: '',
    tehsil_id: '',
    email: '',
    address: '',
    bank_name: '',
    ifsc_code: '',
    account_number: '',
  });

  // Alert and Confirmation Modal States
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 5000);
  };

  // 1. Initial State Fetch
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

  // 2. Chained State Change -> Load Districts
  const handleStateChange = async (stateId) => {
    setFormData((prev) => ({
      ...prev,
      state_id: stateId,
      district_id: '',
      tehsil_id: '',
    }));
    setDistrictsList([]);
    setTehsilsList([]);

    if (!stateId) return;

    try {
      const result = await getDistrict(stateId);
      if (result && result.success) {
        const extracted = (result.districts || result.data || []).map((d) => ({
          district_id: d.district_id,
          district_name: d.district_name,
        }));
        setDistrictsList(extracted);
      } else {
        showAlert('error', 'No districts found for this state');
      }
    } catch (err) {
      showAlert('error', 'Error fetching districts');
    }
  };

  // 3. Chained District Change -> Load Tehsils
  const handleDistrictChange = async (districtId) => {
    setFormData((prev) => ({
      ...prev,
      district_id: districtId,
      tehsil_id: '',
    }));
    setTehsilsList([]);

    if (!districtId) return;

    try {
      if (getTehsil) {
        const result = await getTehsil(districtId);
        if (result && result.success) {
          const extracted = (result.tehsils || result.data || []).map((t) => ({
            tehsil_id: t.tehsil_id,
            tehsil_name: t.tehsil_name,
          }));
          setTehsilsList(extracted);
        }
      }
    } catch (err) {
      showAlert('error', 'Error loading tehsils');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Prompt Confirmation Modal
  const promptAddFarmer = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.mobile_number.trim() || !formData.aadhaar_number.trim()) {
      showAlert('error', 'Please fill all basic personal details');
      return;
    }
    if (!formData.state_id || !formData.district_id || !formData.tehsil_id) {
      showAlert('error', 'Please select state, district, and tehsil');
      return;
    }
    if (!formData.bank_name.trim() || !formData.ifsc_code.trim() || !formData.account_number.trim()) {
      showAlert('error', 'Please complete mandatory bank details');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Farmer Registration',
      message: `Are you sure you want to register farmer "${formData.name.trim()}"?`,
    });
  };

  // Resets the inputs without wiping an active alert
  const resetFormFields = () => {
    setFormData({
      name: '',
      aadhaar_number: '',
      mobile_number: '',
      state_id: '',
      district_id: '',
      tehsil_id: '',
      email: '',
      address: '',
      bank_name: '',
      ifsc_code: '',
      account_number: '',
    });
    setDistrictsList([]);
    setTehsilsList([]);
  };

  // Execute Confirmed Submission with the specified API payload
  const handleExecuteAddFarmer = async () => {
    setConfirmModal({ isOpen: false, title: '', message: '' });

    try {
      const payload = {
        name: formData.name.trim(),
        mobile_number: formData.mobile_number.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        state_id: Number(formData.state_id),
        district_id: Number(formData.district_id),
        tehsil_id: Number(formData.tehsil_id),
        aadhaar_number: formData.aadhaar_number.trim(),
        bank_name: formData.bank_name.trim(),
        account_number: formData.account_number.trim(),
        ifsc_code: formData.ifsc_code.trim().toUpperCase(),
      };

      const result = await addFarmer(payload);

      if (result && result.success) {
        resetFormFields();
        showAlert('success', 'Farmer registered successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showAlert('error', result?.message || 'Failed to register farmer');
      }
    } catch (err) {
      showAlert('error', 'Error registering farmer. Please try again.');
    }
  };

  const handleCancel = () => {
    resetFormFields();
    setAlert({ show: false, type: '', message: '' });
  };

  return (
    <div className="add-farmer-page">
      {/* Top Banner Success/Error Notification */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">
            {alert.type === 'error' ? '⚠️' : '✅'}
          </span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Confirmation Modal Popup */}
      {confirmModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">🧑‍🌾</div>
            <h3 className="modal-title">{confirmModal.title}</h3>
            <p className="modal-message">{confirmModal.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-confirm-btn btn-success"
                onClick={handleExecuteAddFarmer}
              >
                Yes, Register
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs & Header */}
      <div className="page-header-row">
        <div>
          <nav className="breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <Link to="/farmers">Farmers</Link>
            <span className="sep">›</span>
            <span className="current">Add Farmer</span>
          </nav>
          <h1 className="page-title">Add New Farmer</h1>
          <p className="page-desc">Register a new farmer with personal and bank details.</p>
        </div>
        <button className="back-btn" onClick={() => navigate('/farmers')}>
          ← Back to Farmers
        </button>
      </div>

      {/* Two Column Page Grid */}
      <div className="farmer-layout-grid">
        {/* Left Column: Form */}
        <form onSubmit={promptAddFarmer} className="farmer-form-stack">
          {/* Section 1: Personal Information */}
          <div className="farmer-card">
            <div className="card-title-row">
              <div className="icon-badge personal-badge">👤+</div>
              <div>
                <h2>Personal Information</h2>
                <p className="card-sub-desc">Enter farmer's basic details</p>
              </div>
            </div>

            <div className="form-fields-grid">
              {/* Full Name */}
              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter farmer's full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Aadhaar Number */}
              <div className="form-group">
                <label>Aadhaar Number <span className="req">*</span></label>
                <input
                  type="text"
                  name="aadhaar_number"
                  maxLength="12"
                  placeholder="Enter 12-digit Aadhaar number"
                  value={formData.aadhaar_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData((prev) => ({ ...prev, aadhaar_number: val }));
                  }}
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="form-group">
                <label>Mobile Number <span className="req">*</span></label>
                <input
                  type="tel"
                  name="mobile_number"
                  maxLength="10"
                  placeholder="Enter 10-digit mobile number"
                  value={formData.mobile_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData((prev) => ({ ...prev, mobile_number: val }));
                  }}
                  required
                />
              </div>

              {/* State Dropdown */}
              <div className="form-group">
                <label>State <span className="req">*</span></label>
                <div className="select-wrapper">
                  <select
                    value={formData.state_id}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select state</option>
                    {statesList.map((st) => (
                      <option key={st.state_id} value={st.state_id}>
                        {st.state_name}
                      </option>
                    ))}
                  </select>
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              {/* District Dropdown */}
              <div className="form-group">
                <label>District <span className="req">*</span></label>
                <div className="select-wrapper">
                  <select
                    value={formData.district_id}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="form-select"
                    disabled={!formData.state_id}
                    required
                  >
                    <option value="">Select district</option>
                    {districtsList.map((d) => (
                      <option key={d.district_id} value={d.district_id}>
                        {d.district_name}
                      </option>
                    ))}
                  </select>
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>

              {/* Address */}
              <div className="form-group address-group">
                <label>Address (Optional)</label>
                <textarea
                  name="address"
                  rows="3"
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              {/* Tehsil Dropdown */}
              <div className="form-group">
                <label>Tehsil <span className="req">*</span></label>
                <div className="select-wrapper">
                  <select
                    value={formData.tehsil_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tehsil_id: e.target.value }))}
                    className="form-select"
                    disabled={!formData.district_id}
                    required
                  >
                    <option value="">Select tehsil</option>
                    {tehsilsList.map((t) => (
                      <option key={t.tehsil_id} value={t.tehsil_id}>
                        {t.tehsil_name}
                      </option>
                    ))}
                  </select>
                  <span className="dropdown-arrow">▾</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bank Details */}
          <div className="farmer-card">
            <div className="card-title-row">
              <div className="icon-badge bank-badge">🏦</div>
              <div>
                <h2>Bank Details</h2>
                <p className="card-sub-desc">Enter farmer's bank account details</p>
              </div>
            </div>

            <div className="form-fields-grid">
              {/* Bank Name */}
              <div className="form-group">
                <label>Bank Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="bank_name"
                  placeholder="Enter bank name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* IFSC Code */}
              <div className="form-group">
                <label>IFSC Code <span className="req">*</span></label>
                <input
                  type="text"
                  name="ifsc_code"
                  maxLength="11"
                  placeholder="Enter 11-character IFSC code"
                  value={formData.ifsc_code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ifsc_code: e.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </div>

              {/* Account Number */}
              <div className="form-group full-width-field">
                <label>Account Number <span className="req">*</span></label>
                <input
                  type="text"
                  name="account_number"
                  placeholder="Enter bank account number"
                  value={formData.account_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData((prev) => ({ ...prev, account_number: val }));
                  }}
                  required
                />
              </div>
            </div>

            {/* Bottom Actions Row with Inline Alert */}
            <div className="form-actions-wrapper">
              <div className="form-buttons">
                <button type="submit" className="submit-btn">
                  + Add Farmer
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
          </div>
        </form>

        {/* Right Column: Informational Sidebar Cards */}
        <div className="farmer-info-sidebar">
          {/* Banner Card */}
          <div className="farmer-card banner-illustration-card">
            <div className="banner-left-copy">
              <h2>
                “Supporting Our Farmers for a <span className="highlight-text">Brighter Tomorrow</span>”
              </h2>
              <p>
                Accurate farmer registration helps in better procurement, faster payments and a stronger agricultural ecosystem.
              </p>
            </div>
            <div className="illustration-wrapper">
              <div className="farmer-avatar-art">
                <span className="sun-element">☀️</span>
                <span className="art-emoji">👨‍🌾</span>
              </div>
            </div>
          </div>

          {/* Required Information Checklist */}
          <div className="farmer-card checklist-card">
            <div className="checklist-heading-row">
              <span className="checklist-badge">📄</span>
              <h3>Required Information</h3>
            </div>
            <ul className="checklist-items">
              <li>
                <span className="check-icon">✓</span>
                <span>Full name and mobile number are mandatory</span>
              </li>
              <li>
                <span className="check-icon">✓</span>
                <span>Aadhaar number helps in unique identification</span>
              </li>
              <li>
                <span className="check-icon">✓</span>
                <span>Select the correct state, district and tehsil</span>
              </li>
              <li>
                <span className="check-icon">✓</span>
                <span>Bank details are required for payment processing</span>
              </li>
              <li>
                <span className="check-icon">✓</span>
                <span>You can update any information later if needed</span>
              </li>
            </ul>
          </div>

          {/* Note Card */}
          <div className="farmer-card note-card">
            <div className="note-icon-side">
              <span className="info-circle-icon">ℹ️</span>
            </div>
            <div className="note-text-side">
              <h4>Note</h4>
              <p>
                Please ensure all the details are correct before submitting. This information will be used for verification and payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}