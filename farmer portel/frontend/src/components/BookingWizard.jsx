import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';
import { 
  Sprout, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw,
  Scale,
  ShieldCheck,
  Check,
  Ticket,
  Printer,
  CalendarDays,
  Building2
} from 'lucide-react';

export default function BookingWizard({ onBookingComplete, onCancelWizard }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Sessions
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // 2. Crops (Filtered strictly by selected session)
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);

  // 3. Allocation & Quantity
  const [allocation, setAllocation] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState('');

  // 4. Mandis (Restricted to farmer's tehsil)
  const [mandis, setMandis] = useState([]);
  const [selectedMandi, setSelectedMandi] = useState(null);

  // 5. Counters
  const [counters, setCounters] = useState([]);
  const [countersLoading, setCountersLoading] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);

  // 6. Booking Date
  const [serviceDate, setServiceDate] = useState('');

  // 7. Time Slots
  const [slots, setSlots] = useState([]);
  const [slotMeta, setSlotMeta] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // 9. Created Booking Result
  const [createdBooking, setCreatedBooking] = useState(null);

  // 9 Guided Steps
  const stepsList = [
    { num: 1, title: 'Session', desc: 'Select Active Session' },
    { num: 2, title: 'Crop', desc: 'Assigned Crops' },
    { num: 3, title: 'Quantity', desc: 'Allocation & Quota' },
    { num: 4, title: 'Mandi', desc: 'Local Tehsil Mandi' },
    { num: 5, title: 'Date', desc: 'Appointment Date' },
    { num: 6, title: 'Counter', desc: 'Intake Counter' },
    { num: 7, title: 'Time Slot', desc: 'Select Available Slot' },
    { num: 8, title: 'Summary', desc: 'Review Booking Details' },
    { num: 9, title: 'Confirmation', desc: 'Issued Token Gate Pass' }
  ];

  // 1. Initial Load: Fetch active procurement sessions
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      setError('');
      try {
        const sessRes = await farmerApi.getProcurementSessions();
        if (sessRes.success && sessRes.data.length > 0) {
          setSessions(sessRes.data);
          setSelectedSession(sessRes.data[0]);
        } else {
          setError('No active procurement sessions found at this time.');
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize booking session data.');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  // 1b. When selectedCrop changes, fetch mandis that handle this crop
  useEffect(() => {
    if (!selectedCrop) {
      setMandis([]);
      setSelectedMandi(null);
      return;
    }

    async function fetchCropMandis() {
      try {
        const res = await farmerApi.getAvailableMandis(selectedCrop.crop_id);
        if (res.success && res.data.length > 0) {
          setMandis(res.data);
          setSelectedMandi(res.data[0]);
        } else {
          setMandis([]);
          setSelectedMandi(null);
        }
      } catch (err) {
        console.error('Error fetching mandis for crop:', err);
        setMandis([]);
        setSelectedMandi(null);
      }
    }
    fetchCropMandis();
  }, [selectedCrop]);

  // 2. When selectedSession changes, fetch crops strictly assigned to that session
  useEffect(() => {
    if (!selectedSession) return;

    async function fetchSessionCrops() {
      try {
        const res = await farmerApi.getAvailableCrops(selectedSession.session_id);
        if (res.success && res.data.length > 0) {
          setCrops(res.data);
          setSelectedCrop(res.data[0]);
        } else {
          setCrops([]);
          setSelectedCrop(null);
        }
      } catch (err) {
        console.error('Error fetching crops for session:', err);
        setCrops([]);
      }
    }
    fetchSessionCrops();
  }, [selectedSession]);

  // 3. When Crop or Session changes, fetch dynamic quota allocation
  useEffect(() => {
    if (!selectedSession || !selectedCrop) {
      setAllocation(null);
      return;
    }

    async function fetchQuota() {
      setAllocationLoading(true);
      try {
        const res = await farmerApi.getAllocation(selectedCrop.crop_id, selectedSession.session_id);
        if (res.success) {
          setAllocation(res.data);
          const remaining = Number(res.data.remaining_quantity || 0);
          if (remaining > 0) {
            setRequestedQuantity(Math.min(50, remaining).toString());
          } else {
            setRequestedQuantity('0');
          }
        }
      } catch (err) {
        console.error('Error fetching allocation:', err);
      } finally {
        setAllocationLoading(false);
      }
    }
    fetchQuota();
  }, [selectedSession, selectedCrop]);

  // 5. When Mandi & Crop changes, fetch counters
  useEffect(() => {
    if (!selectedMandi || !selectedCrop) {
      setCounters([]);
      return;
    }

    async function fetchCounters() {
      setCountersLoading(true);
      try {
        const res = await farmerApi.getAvailableCounters(selectedMandi.mandi_id, selectedCrop.crop_id, serviceDate || null);
        if (res.success && Array.isArray(res.data)) {
          // Strictly show ONLY active counters to the farmer
          const activeOnly = res.data.filter(c => String(c.status || '').trim().toLowerCase() === 'active');
          setCounters(activeOnly);
          // Auto-select first available non-full counter
          const firstAvailable = activeOnly.find(c => !c.is_full);
          setSelectedCounter(firstAvailable || null);
        } else {
          setCounters([]);
          setSelectedCounter(null);
        }
      } catch (err) {
        console.error('Error fetching counters:', err);
      } finally {
        setCountersLoading(false);
      }
    }
    fetchCounters();
  }, [selectedMandi, selectedCrop, serviceDate]);

  // 7. When Mandi, Counter, and Date are set, fetch available time slots
  useEffect(() => {
    if (!selectedMandi || !selectedCounter || !serviceDate) {
      setSlots([]);
      return;
    }

    async function fetchSlots() {
      setSlotsLoading(true);
      setError('');
      try {
        const res = await farmerApi.getAvailableSlots(selectedMandi.mandi_id, selectedCounter.counter_id, serviceDate);
        if (res.success) {
          setSlots(res.data.slots || []);
          setSlotMeta(res.data);
          if (res.data.is_full) {
            setError(res.data.message || 'Mandi is full for today for this crop.');
          }
        } else {
          setError(res.message || 'No slots available for this date');
          setSlotMeta(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch slots for selected date');
        setSlots([]);
        setSlotMeta(null);
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchSlots();
  }, [selectedMandi, selectedCounter, serviceDate]);

  // Initialize today's date by default (allowing same-day booking if slots exist)
  useEffect(() => {
    if (!serviceDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setServiceDate(`${yyyy}-${mm}-${dd}`);
    }
  }, []);

  // Wizard Step Navigation Validation
  const handleNext = () => {
    setError('');

    // Step 1: Session
    if (step === 1) {
      if (!selectedSession) return setError('Please select a procurement session.');
      setStep(2);
    }
    // Step 2: Crop
    else if (step === 2) {
      if (!selectedCrop) return setError('Please select an eligible crop for this session.');
      setStep(3);
    }
    // Step 3: Quantity
    else if (step === 3) {
      const qty = parseFloat(requestedQuantity);
      if (isNaN(qty) || qty <= 0) {
        return setError('Please enter a valid procurement quantity greater than 0 Quintals.');
      }
      if (!allocation || qty > Number(allocation.remaining_quantity)) {
        return setError(`Requested quantity cannot exceed your remaining quota of ${allocation?.remaining_quantity || 0} Quintals.`);
      }
      setStep(4);
    }
    // Step 4: Mandi
    else if (step === 4) {
      if (!selectedMandi) return setError('Please choose a Mandi in your tehsil.');
      setStep(5);
    }
    // Step 5: Booking Date
    else if (step === 5) {
      if (!serviceDate) return setError('Please pick an appointment date.');
      const chosen = new Date(serviceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) {
        return setError('Appointment date cannot be in the past.');
      }
      setStep(6);
    }
    // Step 6: Counter
    else if (step === 6) {
      if (!selectedCounter) return setError('Please select an active intake counter.');
      if (selectedCounter.is_full) return setError(`This mandi counter is full for ${serviceDate}. Please select another counter or click Back to choose a different date.`);
      setStep(7);
    }
    // Step 7: Time Slot
    else if (step === 7) {
      if (slotMeta?.is_full) return setError(`Mandi counter is full for ${serviceDate} for this crop. Please click Back to select another counter or date.`);
      if (!selectedSlot) return setError('Please select an available time slot.');
      if (selectedSlot.status !== 'AVAILABLE') return setError('This slot is not available. Please choose an available slot.');
      setStep(8);
    }
    // Step 8: Summary -> Advance to Submit
    else if (step === 8) {
      handleSubmitBooking();
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 1 && step < 9) {
      setStep(step - 1);
    }
  };

  // Submit to Primary DB
  const handleSubmitBooking = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        session_id: selectedSession.session_id,
        crop_id: selectedCrop.crop_id,
        mandi_id: selectedMandi.mandi_id,
        counter_id: selectedCounter.counter_id,
        service_date: serviceDate,
        booking_time: selectedSlot.start_time,
        quantity_req: parseFloat(requestedQuantity)
      };

      const res = await farmerApi.createBooking(payload);
      if (res.success && res.data) {
        setCreatedBooking({
          ...res.data,
          crop_name: selectedCrop.crop_name,
          mandi_name: selectedMandi.mandi_name,
          counter_name: selectedCounter.counter_name
        });
        setStep(9);
      } else {
        setError(res.message || 'Failed to complete booking.');
      }
    } catch (err) {
      setError(err.message || 'Transaction failed. Please try a different slot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0 }}>
            Procurement Slot Booking Wizard
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: '4px 0 0' }}>
            Step {step} of 9: <strong>{stepsList[step - 1].title}</strong> — {stepsList[step - 1].desc}
          </p>
        </div>
        {step < 9 && (
          <button className="btn btn-secondary" onClick={onCancelWizard} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            Cancel Wizard
          </button>
        )}
      </div>

      {/* 9-Step Stepper Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        overflowX: 'auto',
        padding: '0.5rem 0.25rem',
        gap: '0.25rem'
      }}>
        {stepsList.map((s) => {
          const isDone = s.num < step;
          const isCurrent = s.num === step;
          return (
            <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isDone ? 'var(--primary-600)' : isCurrent ? 'var(--primary-500)' : 'var(--gray-200)',
                color: isDone || isCurrent ? '#ffffff' : 'var(--gray-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                border: isCurrent ? '3px solid #bbf7d0' : 'none',
                boxShadow: isCurrent ? '0 0 0 2px var(--primary-600)' : 'none'
              }}>
                {isDone ? <Check size={16} /> : s.num}
              </div>
              <span style={{
                fontSize: '0.7rem',
                marginTop: '0.35rem',
                color: isCurrent ? 'var(--primary-700)' : 'var(--gray-500)',
                fontWeight: isCurrent ? 700 : 500,
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Procurement Session Selection */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Calendar size={20} color="var(--primary-600)" />
              <span>Step 1: Choose Active Procurement Session</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.map((s) => {
              const isSelected = selectedSession?.session_id === s.session_id;
              return (
                <div
                  key={s.session_id}
                  onClick={() => setSelectedSession(s)}
                  style={{
                    border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--gray-300)',
                    background: isSelected ? 'var(--primary-50)' : '#ffffff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>{s.session_name}</strong>
                    <div style={{ fontSize: '0.825rem', color: 'var(--gray-600)', marginTop: '4px' }}>
                      Season: <strong>{s.season}</strong> • Operational: {formatIndianDate(s.start_date)} to {formatIndianDate(s.end_date)}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="badge badge-primary">SELECTED</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleNext} disabled={!selectedSession}>
              Proceed to Crop Selection <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Crop Selection (Strictly filtered by session) */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sprout size={20} color="var(--primary-600)" />
              <span>Step 2: Select Crop for {selectedSession?.session_name}</span>
            </div>
            <span className="badge badge-info">SESSION-FILTERED</span>
          </div>

          {crops.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {crops.map((c) => {
                const isSelected = selectedCrop?.crop_id === c.crop_id;
                return (
                  <div
                    key={c.crop_id}
                    onClick={() => setSelectedCrop(c)}
                    style={{
                      border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--gray-300)',
                      background: isSelected ? 'var(--primary-50)' : '#ffffff',
                      borderRadius: '12px',
                      padding: '1.5rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Sprout size={36} color={isSelected ? 'var(--primary-600)' : 'var(--gray-400)'} style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>{c.crop_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', marginTop: '4px', fontWeight: 600 }}>
                      Govt MSP: ₹{c.msp_price || '2275'}/Qtl
                    </div>
                    {isSelected && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className="badge badge-primary">SELECTED</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              No crops are configured for this procurement session.
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!selectedCrop}>
              Proceed to Quantity <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Quantity Allocation & Input */}
      {step === 3 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Scale size={20} color="var(--primary-600)" />
              <span>Step 3: Quantity Allocation & Quota Balance</span>
            </div>
          </div>

          {allocationLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <span>Calculating eligible quota from verified land records...</span>
            </div>
          ) : allocation ? (
            <>
              {/* Allocation Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Verified Land Area</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                    {allocation.eligible_land} Acres
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Rate: {allocation.quota_per_acre} Qtl/Ac</div>
                </div>

                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Quota Approved</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--blue-600)' }}>
                    {allocation.allocated_quantity} Qtl
                  </div>
                </div>

                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Sold (All Crops)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--purple-600)' }}>
                    {allocation.total_sold_quantity} Qtl
                  </div>
                </div>

                <div style={{ background: 'var(--primary-50)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--primary-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-800)' }}>Remaining Shared Quota</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                    {allocation.remaining_quantity} Qtl
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="form-group" style={{ maxWidth: '380px' }}>
                <label className="form-label">
                  Enter Requested Procurement Quantity (Quintals)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max={allocation.remaining_quantity}
                    className="form-control"
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(e.target.value)}
                    placeholder="e.g. 50"
                  />
                  <span style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Quintals</span>
                </div>
                <span className="form-hint">
                  Maximum allowed this booking: <strong>{allocation.remaining_quantity} Quintals</strong>.
                </span>
              </div>

              {/* Multi-sale Notice */}
              <div className="alert-banner info" style={{ marginTop: '1rem' }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.825rem' }}>
                  <strong>Global Session Quota:</strong> Your allocated quota is shared across all crops in this procurement session. Any quantity booked will be deducted from your total session balance.
                </span>
              </div>
            </>
          ) : null}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleNext} 
              disabled={!allocation || allocation.remaining_quantity <= 0 || !requestedQuantity || parseFloat(requestedQuantity) <= 0}
            >
              Proceed to Mandi Selection <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Mandi Selection (Within Tehsil) */}
      {step === 4 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Building2 size={20} color="var(--primary-600)" />
              <span>Step 4: Select Local Mandi (Tehsil Jurisdiction)</span>
            </div>
            <span className="badge badge-success">REGISTERED TEHSIL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mandis.map((m) => {
              const isSelected = selectedMandi?.mandi_id === m.mandi_id;
              return (
                <div
                  key={m.mandi_id}
                  onClick={() => setSelectedMandi(m)}
                  style={{
                    border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--gray-300)',
                    background: isSelected ? 'var(--primary-50)' : '#ffffff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>{m.mandi_name}</strong>
                    <div style={{ fontSize: '0.825rem', color: 'var(--gray-600)', marginTop: '4px' }}>
                      Tehsil: <strong>{m.tehsil_name || 'Assigned Tehsil'}</strong> • Mandi Daily Capacity: <strong>{m.capacity || 500} MT/Day ({Number(m.capacity || 500) * 10} Quintals/Day)</strong> <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>(1 MT = 10 QTL)</span>
                    </div>
                    {m.schedule && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.76rem', backgroundColor: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          🕒 Hours: {m.schedule.opening_time?.slice(0, 5) || '09:00'} — {m.schedule.closing_time?.slice(0, 5) || '17:00'}
                        </span>
                        {m.schedule.has_pending_timing && (
                          <span style={{ fontSize: '0.74rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            ⏳ New Hours: {m.schedule.pending_opening_time?.slice(0, 5)} — {m.schedule.pending_closing_time?.slice(0, 5)} (This change will take effect from {formatIndianDate(m.schedule.effective_date)}.)
                          </span>
                        )}
                        {m.schedule.has_pending_working_days && (
                          <span style={{ fontSize: '0.74rem', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            ⏳ Working calendar update pending (This change will take effect from {formatIndianDate(m.schedule.working_days.find(d => d.has_pending_change)?.effective_date)}.)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="badge badge-primary">SELECTED</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!selectedMandi}>
              Proceed to Date Selection <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Booking Date */}
      {step === 5 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CalendarDays size={20} color="var(--primary-600)" />
              <span>Step 5: Choose Appointment Service Date</span>
            </div>
            <span className="badge badge-primary">STEP 5 OF 9</span>
          </div>

          <div className="form-group" style={{ maxWidth: '340px' }}>
            <label className="form-label">Appointment Date</label>
            <input
              type="date"
              className="form-control"
              value={serviceDate}
              min={(() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })()}
              max={(() => {
                const max7 = new Date();
                max7.setDate(max7.getDate() + 7);
                const max7Str = `${max7.getFullYear()}-${String(max7.getMonth() + 1).padStart(2, '0')}-${String(max7.getDate()).padStart(2, '0')}`;
                if (selectedSession?.end_date) {
                  const sEnd = new Date(selectedSession.end_date);
                  const sEndStr = `${sEnd.getFullYear()}-${String(sEnd.getMonth() + 1).padStart(2, '0')}-${String(sEnd.getDate()).padStart(2, '0')}`;
                  return sEndStr < max7Str ? sEndStr : max7Str;
                }
                return max7Str;
              })()}
              onChange={(e) => {
                setServiceDate(e.target.value);
                setSelectedCounter(null);
                setSelectedSlot(null);
              }}
            />
            <span className="form-hint">
              Session window: {formatIndianDate(selectedSession?.start_date)} to {formatIndianDate(selectedSession?.end_date)}
            </span>
          </div>

          <div className="alert-banner info" style={{ marginTop: '1.25rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.825rem' }}>
              Choosing your appointment date first enables real-time capacity and intake checking for counters on <strong>{serviceDate || 'your selected date'}</strong>.
            </span>
          </div>

          {selectedMandi?.schedule?.has_pending_timing && serviceDate && (
            <div 
              style={{ 
                marginTop: '0.85rem', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                backgroundColor: '#eff6ff', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.825rem',
                color: '#1e40af'
              }}
            >
              <Clock size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {serviceDate >= selectedMandi.schedule.effective_date ? (
                  <div>
                    <strong>Updated Operating Schedule Applied:</strong> Appointments on <strong>{formatIndianDate(serviceDate)}</strong> follow the new operating hours: <strong>{selectedMandi.schedule.pending_opening_time?.slice(0, 5)} — {selectedMandi.schedule.pending_closing_time?.slice(0, 5)}</strong>. <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>This change will take effect from {formatIndianDate(selectedMandi.schedule.effective_date)}.</span>
                  </div>
                ) : (
                  <div>
                    <strong>Active Schedule in Effect:</strong> Appointments on <strong>{formatIndianDate(serviceDate)}</strong> use current active facility hours: <strong>{selectedMandi.schedule.opening_time?.slice(0, 5)} — {selectedMandi.schedule.closing_time?.slice(0, 5)}</strong>. <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>Facility hours will change to <strong>{selectedMandi.schedule.pending_opening_time?.slice(0, 5)} — {selectedMandi.schedule.pending_closing_time?.slice(0, 5)}</strong>. This change will take effect from {formatIndianDate(selectedMandi.schedule.effective_date)}.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!serviceDate}>
              Proceed to Counter Selection <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Counter Selection */}
      {step === 6 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MapPin size={20} color="var(--primary-600)" />
              <span>Step 6: Select Designated Intake Counter for {serviceDate}</span>
            </div>
            <span className="badge badge-info">DATE: {serviceDate}</span>
          </div>

          {countersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <span>Checking counter intake capacity for {serviceDate}...</span>
            </div>
          ) : counters.filter(c => String(c.status || '').trim().toLowerCase() === 'active').length > 0 ? (
            <>
              {counters.filter(c => String(c.status || '').trim().toLowerCase() === 'active').every(c => c.is_full) && (
                <div className="alert-banner danger" style={{ marginBottom: '1.25rem' }}>
                  <AlertCircle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>All Counters Full for {serviceDate}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                      All intake counters for {selectedCrop?.crop_name} have reached daily capacity on {serviceDate}. Please click <strong>Back</strong> below to choose another appointment date.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {counters.filter(c => String(c.status || '').trim().toLowerCase() === 'active').map((c) => {
                  const isSelected = selectedCounter?.counter_id === c.counter_id;
                  const capacityMt = Number(c.daily_capacity_mt || c.daily_capacity || 10);
                  const capacityQtl = Number(c.daily_capacity_qtl || capacityMt * 10);

                  return (
                    <div
                      key={c.counter_id}
                      onClick={() => !c.is_full && setSelectedCounter(c)}
                      style={{
                        border: c.is_full
                          ? '1px solid var(--red-300)'
                          : isSelected
                            ? '2px solid var(--primary-600)'
                            : '1px solid var(--gray-300)',
                        background: c.is_full
                          ? '#fff5f5'
                          : isSelected
                            ? 'var(--primary-50)'
                            : '#ffffff',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        cursor: c.is_full ? 'not-allowed' : 'pointer',
                        opacity: c.is_full ? 0.75 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: c.is_full ? 'var(--red-700)' : 'var(--gray-900)' }}>{c.counter_name}</strong>
                        {c.is_full ? (
                          <span className="badge badge-danger">FULL FOR {serviceDate}</span>
                        ) : (
                          isSelected && <span className="badge badge-primary">SELECTED</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                        Counter Number: <strong>#{c.counter_number}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                        Counter Daily Capacity: <strong>{capacityMt} MT/Day ({capacityQtl} Quintals/Day)</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                        Average Service Time: <strong>{c.average_time_minutes || 10} Mins / Farmer</strong>
                      </div>
                      {c.is_full ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--red-600)', fontWeight: 600, marginTop: '4px' }}>
                          Capacity reached for {serviceDate} ({c.booked_quantity_qtl || 0} / {capacityQtl} QTL reached)
                        </div>
                      ) : (
                        c.remaining_capacity_qtl !== undefined && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', marginTop: '4px', fontWeight: 600 }}>
                            Remaining Intake for {serviceDate}: <strong>{c.remaining_capacity_mt} MT ({c.remaining_capacity_qtl} QTL)</strong>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              No active counters handling {selectedCrop?.crop_name} found at this Mandi.
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!selectedCounter || selectedCounter.is_full}>
              Proceed to Time Slot <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Time Slot (AVAILABLE vs BOOKED strictly enforced) */}
      {step === 7 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--primary-600)" />
              <span>Step 7: Choose Time Slot for {selectedCounter?.counter_name || 'Counter'} on {serviceDate}</span>
            </div>
          </div>

          {slotMeta?.is_full && (
            <div className="alert-banner danger" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={22} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '1rem' }}>Mandi Counter is Full for {serviceDate}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>
                  The daily intake capacity for {selectedCrop?.crop_name} ({slotMeta.daily_capacity_mt || selectedCounter?.daily_capacity} MT/Day = {slotMeta.daily_capacity_qtl || Number(selectedCounter?.daily_capacity) * 10} Quintals/Day) has been completely reached on {serviceDate}. Please click <strong>Back</strong> to choose another counter or appointment date.
                </p>
              </div>
            </div>
          )}

          {slotMeta?.has_pending_timing_change && (
            <div 
              style={{ 
                marginBottom: '1.25rem', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                backgroundColor: '#eff6ff', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.825rem',
                color: '#1e40af'
              }}
            >
              <Clock size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {slotMeta.is_timing_pending_applied ? (
                  <div>
                    <strong>Updated Operating Schedule Active:</strong> Available appointment slots on <strong>{formatIndianDate(serviceDate)}</strong> follow the new operating hours ({formatIndianTime(slotMeta.pending_opening_time)} — {formatIndianTime(slotMeta.pending_closing_time)}). <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>This change will take effect from {formatIndianDate(slotMeta.timing_effective_date)}.</span>
                  </div>
                ) : (
                  <div>
                    <strong>Active Schedule in Effect:</strong> Slots on <strong>{formatIndianDate(serviceDate)}</strong> follow active facility hours ({formatIndianTime(slotMeta.active_opening_time)} — {formatIndianTime(slotMeta.active_closing_time)}). Facility operating hours will change to <strong>{formatIndianTime(slotMeta.pending_opening_time)} — {formatIndianTime(slotMeta.pending_closing_time)}</strong>. <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>This change will take effect from {formatIndianDate(slotMeta.timing_effective_date)}.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {slotsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <span>Checking counter slot occupancy on Primary DB...</span>
            </div>
          ) : slots.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', margin: 0 }}>
                  Strict One-Farmer-Per-Slot rule enforced. Green slots are available.
                </p>
                {slotMeta?.opening_time && (
                  <span style={{ fontSize: '0.76rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Facility Hours: {slotMeta.opening_time.slice(0, 5)} — {slotMeta.closing_time.slice(0, 5)}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                {slots.filter(s => s.status !== 'PAST' && !s.is_past).map((slot, idx) => {
                  const isAvailable = slot.status === 'AVAILABLE' && !slotMeta?.is_full;
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  const isFull = slot.status === 'FULL' || slotMeta?.is_full;

                  return (
                    <div
                      key={idx}
                      onClick={() => isAvailable && setSelectedSlot(slot)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        border: isSelected 
                          ? '2px solid var(--primary-600)' 
                          : isAvailable 
                            ? '1px solid var(--primary-300)' 
                            : '1px solid var(--gray-200)',
                        background: isSelected 
                          ? 'var(--primary-100)' 
                          : isAvailable 
                            ? '#ffffff' 
                            : 'var(--gray-100)',
                        color: isAvailable ? 'var(--gray-900)' : 'var(--gray-400)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatIndianTime(slot.start_time)}</div>
                      <div style={{ 
                        fontSize: '0.68rem', 
                        marginTop: '3px', 
                        fontWeight: 600,
                        color: slot.status === 'PAST' ? 'var(--gray-400)' : isFull ? 'var(--red-600)' : isAvailable ? 'var(--primary-700)' : 'var(--gray-500)'
                      }}>
                        {slot.status === 'PAST' ? 'PASSED' : isFull ? 'FULL' : isAvailable ? 'AVAILABLE' : 'BOOKED'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              No available slots on this date. The counter may be full or the Mandi is closed.
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={!selectedSlot || slotMeta?.is_full}>
              Review Booking Summary <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: Booking Summary Review */}
      {step === 8 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={20} color="var(--primary-600)" />
              <span>Step 8: Review & Confirm Appointment Details</span>
            </div>
            <span className="badge badge-warning">REVIEW BEFORE CONFIRMATION</span>
          </div>

          <div style={{
            background: 'var(--gray-50)',
            borderRadius: '12px',
            border: '1px solid var(--gray-200)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Procurement Session</span>
              <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>{selectedSession?.session_name}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Season: {selectedSession?.season}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Crop & MSP</span>
              <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>{selectedCrop?.crop_name}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 600 }}>Rate: ₹{selectedCrop?.msp_price || '2275'}/Qtl</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Booked Quantity</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary-700)' }}>{requestedQuantity} Quintals</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Remaining After: {(Number(allocation?.remaining_quantity || 0) - parseFloat(requestedQuantity)).toFixed(2)} Qtl</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Estimated MSP Value</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
                ₹{(parseFloat(requestedQuantity) * (selectedCrop?.msp_price || 2275)).toLocaleString('en-IN')}
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Direct Bank Transfer (DBT)</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Mandi Center</span>
              <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>{selectedMandi?.mandi_name}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Tehsil: {selectedMandi?.tehsil_name || 'Assigned Tehsil'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase' }}>Counter & Scheduled Slot</span>
              <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>{selectedCounter?.counter_name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                {formatIndianDate(serviceDate)} at {formatIndianTime(selectedSlot?.start_time)}
              </div>
            </div>
          </div>

          <div className="alert-banner info" style={{ marginBottom: '1.5rem' }}>
            <Ticket size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.825rem' }}>
              Upon confirmation, an official unique Queue Token (e.g. <code>T_XXXXXX</code>) will be issued on the Primary Mandi Server with row locking.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={handleBack} disabled={submitting}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleSubmitBooking} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Processing Transaction...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Confirm & Issue Queue Token
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 9: Confirmation Digital Pass */}
      {step === 9 && createdBooking && (
        <div className="card" style={{ maxWidth: '640px', margin: '1rem auto', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.6rem', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Procurement Slot Confirmed!
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Your appointment slot and gate queue token have been successfully issued on the Primary Mandi Server.
          </p>

          {/* Digital Pass Box */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '2px dashed var(--primary-500)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #dcfce7', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Queue Token Number</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-600)', letterSpacing: '0.05em' }}>
                  {createdBooking.token_number}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Booking Reference</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                  #BK-{createdBooking.booking_id}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Mandi Center:</span>
                <strong>{createdBooking.mandi_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Intake Counter:</span>
                <strong>{createdBooking.counter_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Service Date:</span>
                <strong>{formatIndianDate(createdBooking.service_date || createdBooking.booking_time)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Scheduled Time:</span>
                <strong>{formatIndianTime(createdBooking.booking_time)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Crop:</span>
                <strong>{createdBooking.crop_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Approved Quantity:</span>
                <strong>{createdBooking.quantity_approved} Quintals</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => onBookingComplete('token')}>
              <Ticket size={18} /> View Gate Pass / Token
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={18} /> Print Pass
            </button>
            <button className="btn btn-secondary" onClick={() => onBookingComplete('dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
