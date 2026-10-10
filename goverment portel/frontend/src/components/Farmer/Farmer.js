import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FarmerContext from '../../context/Farmer/FarmerContext';
import StateContext from '../../context/state/StateContext';
import DistrictContext from '../../context/District/DistrictContext';
import TehsilContext from '../../context/Tehsil/TehsilContext';

import './Farmer.css';

const initialFarmersData = [];

export default function Farmers() {
  const navigate = useNavigate();

  // Contexts
  const { getFarmers, removeFarmer, getFarmerByAddhar, updateFarmer } = useContext(FarmerContext) || {};
  const { getState } = useContext(StateContext) || {};
  const { getDistrict } = useContext(DistrictContext) || {};
  const { getTehsil } = useContext(TehsilContext) || {};

  // Dropdown Options Lists (Filter bar)
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [tehsilsList, setTehsilsList] = useState([]);

  // Data & Filter states
  const [farmers, setFarmers] = useState(initialFarmersData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAadhaarSearchActive, setIsAadhaarSearchActive] = useState(false);
  const [selectedState, setSelectedState] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTehsil, setSelectedTehsil] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination states
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic Statistics provided directly by getFarmers API
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    not_verified: 0,
    suspended: 0,
  });

  // Alert State
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => {
      setAlert({ show: false, type: '', message: '' });
    }, 4000);
  };

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, farmer: null });

  // View Details Modal State
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
  });

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    farmerId: null,
    loading: false,
  });

  // Edit Form Fields
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    address: '',
    state_id: '',
    district_id: '',
    tehsil_id: '',
    aadhaar_number: '',
    status: 'active',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    aadhaar_verified: 0,
    verification_status: 0,
    mobile_verified: 0,
    bank_verification_status: 0,
  });

  // Chained dropdown lists for the Edit Form
  const [editDistrictsList, setEditDistrictsList] = useState([]);
  const [editTehsilsList, setEditTehsilsList] = useState([]);

  // Confirmation Modal for Edits
  const [editConfirmModal, setEditConfirmModal] = useState({
    isOpen: false,
    farmerName: '',
  });

  // 1. Initial State Dropdown Fetch
  useEffect(() => {
    const fetchStates = async () => {
      if (getState) {
        try {
          const result = await getState();
          if (result && result.success) {
            setStatesList(result.states || result.data || []);
          }
        } catch (err) {
          showAlert('error', 'Error fetching states');
        }
      }
    };

    fetchStates();
  }, [navigate, getState]);

  // 2. Chained State Change (Filter bar)
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
        const result = await getDistrict(stateId);
        if (result && result.success) {
          setDistrictsList(result.districts || result.data || []);
        } else {
          showAlert('error', result?.message || 'Failed to load districts');
        }
      } catch (err) {
        showAlert('error', 'Error fetching districts');
      }
    }
  };

  // 3. Chained District Change (Filter bar)
  const handleDistrictChange = async (districtId) => {
    setSelectedDistrict(districtId);
    setSelectedTehsil('All');
    setTehsilsList([]);
    setCurrentPage(1);

    if (districtId === 'All' || !districtId) return;

    if (getTehsil) {
      try {
        const result = await getTehsil(districtId);
        if (result && result.success) {
          setTehsilsList(result.tehsils || result.data || []);
        } else {
          showAlert('error', result?.message || 'Failed to load tehsils');
        }
      } catch (err) {
        showAlert('error', 'Error fetching tehsils');
      }
    }
  };

  // 4. Fetch Farmers & Dynamic Server Stats
  const fetchFarmer = useCallback(async () => {
    if (isAadhaarSearchActive) return;

    try {
      const payload = {
        page: currentPage,
        limit: rowsPerPage,
      };

      const payload2 = {};
      if (selectedState !== 'All' && selectedState) payload2.state_id = Number(selectedState);
      if (selectedDistrict !== 'All' && selectedDistrict) payload2.district_id = Number(selectedDistrict);
      if (selectedTehsil !== 'All' && selectedTehsil) payload2.tehsil_id = Number(selectedTehsil);
      if (selectedStatus !== 'All' && selectedStatus) payload2.status = selectedStatus.toLowerCase();

      if (getFarmers) {
        const result = await getFarmers(payload, payload2);

        if (result && result.success) {
          const rawList = result.farmers || [];
          const formattedData = rawList.map((item, idx) => ({
            id: item.farmer_id || idx + 1,
            farmerId: item.farmer_id || idx + 1,
            name: item.name,
            mobile: item.mobile_number,
            location: item.address,
            state_name: item.state_name || '',
            district_name: item.district_name || '',
            tehsil_name: item.tehsil_name || '',
            status: item.status || 'active',
            aadhaar_verified: item.aadhaar_verified,
            account_number: item.account_number,
          }));

          setFarmers(formattedData);

          setStats({
            total: Number(result.total) || 0,
            verified: Number(result.verified) || 0,
            not_verified: Number(result.not_verified) || 0,
            suspended: Number(result.suspended) || 0,
          });
        } else {
          setFarmers([]);
          setStats({ total: 0, verified: 0, not_verified: 0, suspended: 0 });
          showAlert('error', result?.message || 'Failed to load farmers');
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server');
    }
  }, [
    currentPage,
    rowsPerPage,
    getFarmers,
    isAadhaarSearchActive,
    selectedState,
    selectedDistrict,
    selectedTehsil,
    selectedStatus,
  ]);

  useEffect(() => {
    fetchFarmer();
  }, [fetchFarmer, navigate]);

  // 5. Search Trigger Handler
  const handleSearchTrigger = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = searchQuery.trim();

    if (!cleanQuery) {
      setIsAadhaarSearchActive(false);
      fetchFarmer();
      return;
    }

    const is12Digit = /^\d{12}$/.test(cleanQuery);

    if (is12Digit && getFarmerByAddhar) {
      try {
        const result = await getFarmerByAddhar(cleanQuery);
        if (result && result.success && result.farmer) {
          const single = result.farmer;
          const formattedSingle = [
            {
              id: single.farmer_id || 1,
              farmerId: single.farmer_id || 1,
              name: single.name,
              mobile: single.mobile_number,
              location: single.address,
              state_name: single.state_name || '',
              district_name: single.district_name || '',
              tehsil_name: single.tehsil_name || '',
              status: single.status || 'active',
              aadhaar_verified: single.aadhaar_verified,
              account_number: single.account_number,
            },
          ];

          setFarmers(formattedSingle);
          setIsAadhaarSearchActive(true);
          setCurrentPage(1);

          const isVerified = single.aadhaar_verified === 1 || single.verification_status === 1;
          const isSuspended = single.status?.toLowerCase() === 'suspended';

          setStats({
            total: 1,
            verified: isVerified ? 1 : 0,
            not_verified: !isVerified ? 1 : 0,
            suspended: isSuspended ? 1 : 0,
          });

          showAlert('success', 'Farmer located successfully');
        } else {
          setFarmers([]);
          setStats({ total: 0, verified: 0, not_verified: 0, suspended: 0 });
          showAlert('error', result?.message || 'No farmer found with this number');
        }
      } catch (err) {
        showAlert('error', 'Error looking up farmer');
      }
    } else {
      setIsAadhaarSearchActive(false);
      fetchFarmer();
    }
  };


  const handleNavigateToLand = (farmerItem) => {
    const targetFarmerId = Number(farmerItem.id || farmerItem.farmerId);
    navigate(`/farmers/land/${targetFarmerId}`, {
      state: {
        farmer_id: targetFarmerId,
        name: farmerItem.name,
        mobile_number: farmerItem.mobile,
        location: farmerItem.location,
        status: farmerItem.status
      },
    });
  };

  // View Details Modal Trigger
  const handleViewDetails = async (farmerItem) => {
    setDetailsModal({ isOpen: true, loading: true, data: null });

    const lookupQuery = farmerItem.id || farmerItem.farmerId;
    if (getFarmerByAddhar && lookupQuery) {
      try {
        const res = await getFarmerByAddhar(lookupQuery);
        if (res && res.success && res.farmer) {
          setDetailsModal({ isOpen: true, loading: false, data: res.farmer });
          return;
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      }
    }

    setDetailsModal({
      isOpen: true,
      loading: false,
      data: {
        farmer_id: farmerItem.farmerId,
        name: farmerItem.name,
        mobile_number: farmerItem.mobile,
        address: farmerItem.location,
        status: farmerItem.status,
        aadhaar_verified: farmerItem.aadhaar_verified,
        account_number: farmerItem.account_number,
      },
    });
  };

  // Open Edit Modal & Populate Existing Information
  const handleOpenEditModal = async (farmerItem) => {
    const farmerId = farmerItem.id || farmerItem.farmerId;
    setEditModal({ isOpen: true, farmerId, loading: true });

    let fullData = null;
    const lookupQuery = farmerId;

    if (getFarmerByAddhar && lookupQuery) {
      try {
        const res = await getFarmerByAddhar(lookupQuery);
        if (res && res.success && res.farmer) {
          fullData = res.farmer;
        }
      } catch (err) {
        console.error('Error fetching farmer profile for editing:', err);
      }
    }

    const stateVal = fullData?.state_id || '';
    const districtVal = fullData?.district_id || '';

    setEditFormData({
      name: fullData?.name || farmerItem.name || '',
      mobile_number: fullData?.mobile_number || farmerItem.mobile || '',
      email: fullData?.email || '',
      address: fullData?.address || farmerItem.location || '',
      state_id: stateVal ? String(stateVal) : '',
      district_id: districtVal ? String(districtVal) : '',
      tehsil_id: fullData?.tehsil_id ? String(fullData.tehsil_id) : '',
      aadhaar_number: '',
      status: (fullData?.status || farmerItem.status || 'active').toLowerCase(),
      bank_name: fullData?.bank_name || '',
      account_number: fullData?.account_number || farmerItem.account_number || '',
      ifsc_code: fullData?.ifsc_code || '',
      aadhaar_verified: fullData?.aadhaar_verified ? 1 : 0,
      verification_status: fullData?.verification_status ? 1 : 0,
      mobile_verified: fullData?.mobile_verified ? 1 : 0,
      bank_verification_status: fullData?.bank_verification_status ? 1 : 0,
    });

    if (stateVal && getDistrict) {
      try {
        const dRes = await getDistrict(stateVal);
        if (dRes && dRes.success) setEditDistrictsList(dRes.districts || dRes.data || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setEditDistrictsList([]);
    }

    if (districtVal && getTehsil) {
      try {
        const tRes = await getTehsil(districtVal);
        if (tRes && tRes.success) setEditTehsilsList(tRes.tehsils || tRes.data || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setEditTehsilsList([]);
    }

    setEditModal({ isOpen: true, farmerId, loading: false });
  };

  const handleEditStateChange = async (stateId) => {
    setEditFormData((prev) => ({
      ...prev,
      state_id: stateId,
      district_id: '',
      tehsil_id: '',
    }));
    setEditDistrictsList([]);
    setEditTehsilsList([]);

    if (!stateId || !getDistrict) return;
    try {
      const res = await getDistrict(stateId);
      if (res && res.success) setEditDistrictsList(res.districts || res.data || []);
    } catch (err) {
      showAlert('error', 'Failed to load districts');
    }
  };

  const handleEditDistrictChange = async (districtId) => {
    setEditFormData((prev) => ({
      ...prev,
      district_id: districtId,
      tehsil_id: '',
    }));
    setEditTehsilsList([]);

    if (!districtId || !getTehsil) return;
    try {
      const res = await getTehsil(districtId);
      if (res && res.success) setEditTehsilsList(res.tehsils || res.data || []);
    } catch (err) {
      showAlert('error', 'Failed to load tehsils');
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const promptConfirmUpdate = (e) => {
    e.preventDefault();
    setEditConfirmModal({
      isOpen: true,
      farmerName: editFormData.name || 'this farmer',
    });
  };

  // Submit Farmer Updates
  const executeUpdateFarmer = async () => {
    setEditConfirmModal({ isOpen: false, farmerName: '' });

    const payload = {};
    if (editFormData.name.trim()) payload.name = editFormData.name.trim();
    if (editFormData.mobile_number.trim()) payload.mobile_number = editFormData.mobile_number.trim();
    if (editFormData.email !== undefined) payload.email = editFormData.email.trim();
    if (editFormData.address !== undefined) payload.address = editFormData.address.trim();
    if (editFormData.state_id) payload.state_id = Number(editFormData.state_id);
    if (editFormData.district_id) payload.district_id = Number(editFormData.district_id);
    if (editFormData.tehsil_id) payload.tehsil_id = Number(editFormData.tehsil_id);
    if (editFormData.aadhaar_number.trim()) payload.aadhaar_number = editFormData.aadhaar_number.trim();

    if (editFormData.status) payload.status = editFormData.status.toLowerCase();

    payload.aadhaar_verified = Number(editFormData.aadhaar_verified);
    payload.verification_status = Number(editFormData.verification_status);
    payload.mobile_verified = Number(editFormData.mobile_verified);
    payload.bank_verification_status = Number(editFormData.bank_verification_status);

    if (editFormData.bank_name.trim()) payload.bank_name = editFormData.bank_name.trim();
    if (editFormData.account_number.trim()) payload.account_number = editFormData.account_number.trim();
    if (editFormData.ifsc_code.trim()) payload.ifsc_code = editFormData.ifsc_code.trim().toUpperCase();

    if (Object.keys(payload).length === 0) {
      showAlert('error', 'No fields provided for update');
      return;
    }

    try {
      if (updateFarmer) {
        const result = await updateFarmer(editModal.farmerId, payload);
        if (result && result.success) {
          showAlert('success', result.message || 'Farmer details updated successfully');
          setEditModal({ isOpen: false, farmerId: null, loading: false });
          fetchFarmer();
        } else {
          showAlert('error', result?.message || 'Failed to update farmer');
        }
      }
    } catch (err) {
      showAlert('error', 'Error connecting to server while updating');
    }
  };

  // Safe client-side text filter
  const filteredFarmers = farmers.filter((farmer) => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    return (
      isAadhaarSearchActive ||
      !cleanQuery ||
      farmer.name?.toLowerCase().includes(cleanQuery) ||
      String(farmer.farmerId)?.toLowerCase().includes(cleanQuery) ||
      String(farmer.mobile)?.includes(cleanQuery)
    );
  });

  const totalPages = Math.max(1, Math.ceil(stats.total / rowsPerPage));

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setIsAadhaarSearchActive(false);
    setSelectedState('All');
    setSelectedDistrict('All');
    setSelectedTehsil('All');
    setSelectedStatus('All');
    setDistrictsList([]);
    setTehsilsList([]);
    setCurrentPage(1);
    fetchFarmer();
  };

  const promptDelete = (farmer) => {
    setDeleteModal({ isOpen: true, farmer });
  };

  const confirmDelete = async () => {
    if (!deleteModal.farmer) return;

    try {
      if (removeFarmer) {
        const result = await removeFarmer(deleteModal.farmer.id || deleteModal.farmer.farmerId);
        if (result && !result.success) {
          showAlert('error', result?.message || 'Failed to delete farmer');
          setDeleteModal({ isOpen: false, farmer: null });
          return;
        }
      }
      setFarmers((prev) => prev.filter((f) => f.id !== deleteModal.farmer.id));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      showAlert('success', 'Farmer record removed successfully');
    } catch (err) {
      showAlert('error', 'Error deleting farmer');
    } finally {
      setDeleteModal({ isOpen: false, farmer: null });
    }
  };

  const startRow = stats.total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, stats.total);

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

  return (
    <div className="farmers-page">
      {/* Top Alert Banner */}
      {alert.show && (
        <div className={`top-global-alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="alert-text">{alert.message}</span>
        </div>
      )}

      {/* Confirmation Modal: Update Confirmation */}
      {editConfirmModal.isOpen && (
        <div className="confirm-modal-overlay confirmation-top-layer">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">📝</div>
            <h3 className="modal-title">Confirm Update</h3>
            <p className="modal-message">
              Are you sure you want to save the modified information, account status, and verification flags for <strong>{editConfirmModal.farmerName}</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-confirm-btn btn-success"
                onClick={executeUpdateFarmer}
              >
                Yes, Save Changes
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setEditConfirmModal({ isOpen: false, farmerName: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Farmer Popup Modal */}
      {editModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="details-modal-box edit-modal-container">
            <div className="details-modal-header">
              <div className="details-header-title">
                <span className="modal-header-icon">✏️</span>
                <h3>Edit Farmer Profile (ID: {editModal.farmerId})</h3>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setEditModal({ isOpen: false, farmerId: null, loading: false })}
              >
                ✕
              </button>
            </div>

            {editModal.loading ? (
              <div className="modal-loading-state">Loading farmer profile...</div>
            ) : (
              <form onSubmit={promptConfirmUpdate} className="edit-farmer-form">
                <div className="details-section">
                  <h4 className="section-subtitle">Personal & Operational Details</h4>
                  <div className="form-fields-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleEditInputChange}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Mobile Number</label>
                      <input
                        type="tel"
                        name="mobile_number"
                        maxLength="10"
                        value={editFormData.mobile_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEditFormData((prev) => ({ ...prev, mobile_number: val }));
                        }}
                        placeholder="10-digit mobile number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        placeholder="Enter email"
                      />
                    </div>

                    <div className="form-group">
                      <label>Aadhaar Number (Leave blank to keep unchanged)</label>
                      <input
                        type="text"
                        name="aadhaar_number"
                        maxLength="12"
                        value={editFormData.aadhaar_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEditFormData((prev) => ({ ...prev, aadhaar_number: val }));
                        }}
                        placeholder="Enter 12-digit number to update"
                      />
                    </div>

                    <div className="form-group address-span">
                      <label>Farmer Account Status</label>
                      <div className="select-wrapper">
                        <select
                          name="status"
                          value={editFormData.status}
                          onChange={handleEditInputChange}
                          className="status-edit-select"
                        >
                          <option value="active">Active (Permitted for transactions)</option>
                          <option value="inactive">Inactive (Dormant profile)</option>
                          <option value="suspended">Suspended (Blocked from mandi/procurement)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Statuses */}
                <div className="details-section verification-section-highlight">
                  <h4 className="section-subtitle">Verification Statuses</h4>
                  <div className="form-fields-grid">
                    <div className="form-group">
                      <label>Aadhaar Verification</label>
                      <div className="select-wrapper">
                        <select
                          name="aadhaar_verified"
                          value={editFormData.aadhaar_verified}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              aadhaar_verified: Number(e.target.value),
                            }))
                          }
                          className="status-edit-select"
                        >
                          <option value={1}>Verified ✅</option>
                          <option value={0}>Pending / Unverified ⏳</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>General Profile Approval</label>
                      <div className="select-wrapper">
                        <select
                          name="verification_status"
                          value={editFormData.verification_status}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              verification_status: Number(e.target.value),
                            }))
                          }
                          className="status-edit-select"
                        >
                          <option value={1}>Approved ✅</option>
                          <option value={0}>Pending Approval ⏳</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Mobile Number Verification</label>
                      <div className="select-wrapper">
                        <select
                          name="mobile_verified"
                          value={editFormData.mobile_verified}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              mobile_verified: Number(e.target.value),
                            }))
                          }
                          className="status-edit-select"
                        >
                          <option value={1}>Verified ✅</option>
                          <option value={0}>Unverified ⏳</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Bank Account Verification</label>
                      <div className="select-wrapper">
                        <select
                          name="bank_verification_status"
                          value={editFormData.bank_verification_status}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              bank_verification_status: Number(e.target.value),
                            }))
                          }
                          className="status-edit-select"
                        >
                          <option value={1}>Verified ✅</option>
                          <option value={0}>Pending Verification ⏳</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="details-section">
                  <h4 className="section-subtitle">Location Details</h4>
                  <div className="form-fields-grid">
                    <div className="form-group">
                      <label>State</label>
                      <div className="select-wrapper">
                        <select
                          value={editFormData.state_id}
                          onChange={(e) => handleEditStateChange(e.target.value)}
                        >
                          <option value="">Select State</option>
                          {statesList.map((st) => (
                            <option key={st.state_id} value={st.state_id}>
                              {st.state_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>District</label>
                      <div className="select-wrapper">
                        <select
                          value={editFormData.district_id}
                          onChange={(e) => handleEditDistrictChange(e.target.value)}
                          disabled={!editFormData.state_id}
                        >
                          <option value="">Select District</option>
                          {editDistrictsList.map((dt) => (
                            <option key={dt.district_id} value={dt.district_id}>
                              {dt.district_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Tehsil</label>
                      <div className="select-wrapper">
                        <select
                          value={editFormData.tehsil_id}
                          onChange={(e) =>
                            setEditFormData((prev) => ({ ...prev, tehsil_id: e.target.value }))
                          }
                          disabled={!editFormData.district_id}
                        >
                          <option value="">Select Tehsil</option>
                          {editTehsilsList.map((th) => (
                            <option key={th.tehsil_id} value={th.tehsil_id}>
                              {th.tehsil_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group address-span">
                      <label>Address</label>
                      <input
                        type="text"
                        name="address"
                        value={editFormData.address}
                        onChange={handleEditInputChange}
                        placeholder="Enter complete address"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="details-section">
                  <h4 className="section-subtitle">Bank Details</h4>
                  <div className="form-fields-grid">
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        name="bank_name"
                        value={editFormData.bank_name}
                        onChange={handleEditInputChange}
                        placeholder="Enter bank name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Account Number</label>
                      <input
                        type="text"
                        name="account_number"
                        value={editFormData.account_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEditFormData((prev) => ({ ...prev, account_number: val }));
                        }}
                        placeholder="Enter account number"
                      />
                    </div>

                    <div className="form-group">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        name="ifsc_code"
                        maxLength="11"
                        value={editFormData.ifsc_code}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            ifsc_code: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="IFSC Code"
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
                    onClick={() => setEditModal({ isOpen: false, farmerId: null, loading: false })}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Farmer Full Profile Details Modal */}
      {detailsModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="details-modal-box">
            <div className="details-modal-header">
              <div className="details-header-title">
                <span className="modal-header-icon">🧑‍🌾</span>
                <h3>Farmer Full Profile</h3>
              </div>
              <button
                type="button"
                className="close-modal-x"
                onClick={() => setDetailsModal({ isOpen: false, loading: false, data: null })}
              >
                ✕
              </button>
            </div>

            {detailsModal.loading ? (
              <div className="modal-loading-state">Loading farmer details...</div>
            ) : detailsModal.data ? (
              <div className="details-modal-content">
                <div className="details-section">
                  <h4 className="section-subtitle">Personal Details</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Farmer ID:</span>
                      <span className="detail-value highlight">{detailsModal.data.farmer_id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Full Name:</span>
                      <span className="detail-value">{detailsModal.data.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Mobile Number:</span>
                      <span className="detail-value">{detailsModal.data.mobile_number || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{detailsModal.data.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`status-pill pill-${(detailsModal.data.status || '').toLowerCase()}`}>
                        {detailsModal.data.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4 className="section-subtitle">Location & Geography</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{detailsModal.data.address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">State ID:</span>
                      <span className="detail-value">{detailsModal.data.state_id ?? 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">District ID:</span>
                      <span className="detail-value">{detailsModal.data.district_id ?? 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tehsil ID:</span>
                      <span className="detail-value">{detailsModal.data.tehsil_id ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4 className="section-subtitle">Verification Status</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Aadhaar Verified:</span>
                      <span className={`verify-badge ${detailsModal.data.aadhaar_verified ? 'verified' : 'unverified'}`}>
                        {detailsModal.data.aadhaar_verified ? 'Verified ✅' : 'Pending ⏳'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Mobile Verified:</span>
                      <span className={`verify-badge ${detailsModal.data.mobile_verified ? 'verified' : 'unverified'}`}>
                        {detailsModal.data.mobile_verified ? 'Verified ✅' : 'Pending ⏳'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">General Verification:</span>
                      <span className={`verify-badge ${detailsModal.data.verification_status ? 'verified' : 'unverified'}`}>
                        {detailsModal.data.verification_status ? 'Approved ✅' : 'Pending ⏳'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Registration Date:</span>
                      <span className="detail-value">
                        {detailsModal.data.registration_date
                          ? new Date(detailsModal.data.registration_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4 className="section-subtitle">Bank Details</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Bank Name:</span>
                      <span className="detail-value">{detailsModal.data.bank_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Account Number:</span>
                      <span className="detail-value">{detailsModal.data.account_number || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">IFSC Code:</span>
                      <span className="detail-value">{detailsModal.data.ifsc_code || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Bank Verification:</span>
                      <span className={`verify-badge ${detailsModal.data.bank_verification_status ? 'verified' : 'unverified'}`}>
                        {detailsModal.data.bank_verification_status ? 'Verified ✅' : 'Pending ⏳'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-records-cell">No details available for this farmer.</p>
            )}

            <div className="details-modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDetailsModal({ isOpen: false, loading: false, data: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-box">
            <div className="modal-icon-wrapper">🗑️</div>
            <h3 className="modal-title">Delete Farmer</h3>
            <p className="modal-message">
              Are you sure you want to delete farmer <strong>{deleteModal.farmer?.name}</strong> (ID: {deleteModal.farmer?.farmerId})? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="modal-confirm-btn btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDeleteModal({ isOpen: false, farmer: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header-row">
        <div>
          <nav className="breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <span className="current">Farmers</span>
          </nav>
          <h1 className="page-title">Farmers</h1>
          <p className="page-desc">Manage farmer records, view details, edit or delete information.</p>
        </div>
        <Link to="/farmers/register" className="add-farmer-link-btn">
          + Add Farmer
        </Link>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="farmers-filter-card">
        <form className="search-input-wrapper" onSubmit={handleSearchTrigger}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by 12-digit Aadhaar, name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="primary-search-btn">Search</button>
        </form>

        <div className="filter-dropdown-group">
          {/* State */}
          <div className="filter-item">
            <label>State</label>
            <select value={selectedState} onChange={(e) => handleStateChange(e.target.value)}>
              <option value="All">All States</option>
              {statesList.map((st) => (
                <option key={st.state_id} value={st.state_id}>{st.state_name}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="filter-item">
            <label>District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={selectedState === 'All'}
            >
              <option value="All">All Districts</option>
              {districtsList.map((dt) => (
                <option key={dt.district_id} value={dt.district_id}>{dt.district_name}</option>
              ))}
            </select>
          </div>

          {/* Tehsil */}
          <div className="filter-item">
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
                <option key={th.tehsil_id} value={th.tehsil_id}>{th.tehsil_name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="filter-item">
            <label>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <button type="button" className="reset-filter-btn" onClick={handleResetFilters}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Top 4 Summary Counters */}
      <div className="farmers-stats-row">
        <div className="stat-summary-card">
          <div className="stat-icon-box stat-green">👥</div>
          <div className="stat-details">
            <span className="stat-label">Total Farmers</span>
            <span className="stat-figure">{stats.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-summary-card">
          <div className="stat-icon-box stat-blue">✓</div>
          <div className="stat-details">
            <span className="stat-label">Verified Farmers</span>
            <span className="stat-figure">{stats.verified.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-summary-card">
          <div className="stat-icon-box stat-amber">⏱️</div>
          <div className="stat-details">
            <span className="stat-label">Pending Verification</span>
            <span className="stat-figure">{stats.not_verified.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-summary-card">
          <div className="stat-icon-box stat-red">⚠️</div>
          <div className="stat-details">
            <span className="stat-label">Suspended</span>
            <span className="stat-figure">{stats.suspended.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-container-card">
        <div className="table-controls-bar">
          <span className="record-count-text">
            Showing {startRow} to {endRow} of {stats.total.toLocaleString()} farmers[cite: 6]
          </span>

          <div className="pagination-wrapper">
            <div className="rows-selector">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="pager-buttons">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                title="Previous Page"
              >
                ‹
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="page-btn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Farmers Table */}
        <div className="table-responsive-box">
          <table className="farmers-data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Farmer ID</th>
                <th>Name</th>
                <th>Mobile Number</th>
                <th>Location ▾</th>
                <th>Status ▾</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFarmers.map((item, idx) => (
                <tr key={item.id}>

                  <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                  <td className="farmer-id-cell">{Number(item.farmerId)}</td>
                  <td className="farmer-name-cell">{item.name}</td>
                  <td>{item.mobile}</td>
                  <td className="location-cell">{item.location}</td>
                  <td>
                    <span className={`status-pill pill-${(item.status || '').toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="actions-cell text-right">
                    {/* Add/Manage Land Button */}
                    <button
                      className="action-btn land-btn"
                      title="Manage Farmer Land"
                      onClick={() => handleNavigateToLand(item)}
                    >
                      🌱
                    </button>
                    <button
                      className="action-btn view-btn"
                      title="View details"
                      onClick={() => handleViewDetails(item)}
                    >
                      👁️
                    </button>
                    <button
                      className="action-btn edit-btn"
                      title="Edit details"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Delete"
                      onClick={() => promptDelete(item)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filteredFarmers.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-records-cell">
                    No matching farmer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}