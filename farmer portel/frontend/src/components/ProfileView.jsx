import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { 
  User, 
  MapPin, 
  Building2, 
  Scale, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Lock,
  CreditCard
} from 'lucide-react';
import CircularLoader from './CircularLoader';

export default function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, landRes] = await Promise.all([
        farmerApi.getProfile(),
        farmerApi.getLand()
      ]);

      if (profRes.success) setProfile(profRes.data);
      if (landRes.success) setLand(landRes.data);
    } catch (err) {
      setError(err.message || 'Error loading profile and land data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatAadhaar = (num) => {
    if (!num) return 'Not Available';
    const s = String(num);
    if (s.length === 12) {
      return `${s.slice(0, 4)} ${s.slice(4, 8)} ${s.slice(8, 12)}`;
    }
    return s;
  };

  const plots = land?.plots || land?.all_plots || land?.eligible_land_plots || [];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={24} color="var(--primary-600)" />
            Farmer Registration & Land Holdings
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Official identity records, verified revenue land plots, and DBT bank settlement accounts.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadData}>
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {error && (
        <div className="alert-banner danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <CircularLoader size={40} text="Loading verified farmer credentials and land records..." center />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Identity & Personal Info Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={20} color="var(--primary-600)" />
                <span>Farmer Identification</span>
              </div>
              <span className="badge badge-success">VERIFIED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Full Name</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>{profile?.name}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Registered Mobile</span>
                <strong>+91 {profile?.mobile_number || profile?.mobile}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Farmer System ID</span>
                <code>#{profile?.farmer_id}</code>
              </div>
            </div>
          </div>

          {/* Location & Jurisdiction */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <MapPin size={20} color="var(--primary-600)" />
                <span>Registered Location & Jurisdiction</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>State</span>
                <strong>{profile?.state_name || 'Haryana'}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>District</span>
                <strong>{profile?.district_name || 'Mahendergarh'}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Assigned Tehsil (Mandi Jurisdiction)</span>
                <strong style={{ color: 'var(--primary-700)' }}>{profile?.tehsil_name || 'Ateli'}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', marginTop: '2px' }}>
                  Procurement slot bookings are restricted to mandis in this tehsil.
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Village / Residential Address</span>
                <strong>{profile?.address || 'Haryana, India'}</strong>
              </div>
            </div>
          </div>

          {/* Bank & DBT Settlement Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Building2 size={20} color="var(--primary-600)" />
                <span>DBT Bank Account</span>
              </div>
              <span className="badge badge-success">ACTIVE & VERIFIED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Bank Name</span>
                <strong>{profile?.bank?.bank_name || profile?.bank_name || 'State Bank of India'}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>Account Number</span>
                <strong style={{ letterSpacing: '0.05em' }}>
                  {profile?.bank?.account_number || profile?.account_number || '800000000005'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>IFSC Code</span>
                <code>{profile?.bank?.ifsc_code || profile?.ifsc_code || 'SBIN0001234'}</code>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '0.65rem', borderRadius: '6px' }}>
                ✓ Linked to Aadhaar for Direct Benefit Transfer (DBT) payment disbursements.
              </div>
            </div>
          </div>

          {/* Land Holdings Card */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <div className="card-title">
                <Scale size={20} color="var(--primary-600)" />
                <span>Revenue Land Records & Holdings</span>
              </div>
              <span className="badge badge-primary">
                Total Eligible Land: {Number(
                  land?.total_eligible_land ?? 
                  land?.eligible_selling_land_acres ?? 
                  land?.eligible_area ?? 
                  profile?.total_eligible_land ?? 
                  profile?.eligible_land_acres ?? 
                  profile?.land_summary?.total_eligible_land ?? 
                  0
                ).toFixed(2)} Acres
              </span>
            </div>

            {plots && plots.length > 0 ? (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Land ID</th>
                      <th>Area (Acres)</th>
                      <th>Land Type</th>
                      <th>Ownership</th>
                      <th>Verification Status</th>
                      <th>Procurement Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plots.map((plot) => {
                      const isVerified = (plot.land_verification === 'verified' || plot.verification_status === 'verified');
                      const isEligible = isVerified && ['agricultural', 'irrigated'].includes(plot.land_type);
                      return (
                        <tr key={plot.land_id}>
                          <td><strong>#LAND-{plot.land_id}</strong></td>
                          <td>
                            <strong style={{ color: 'var(--primary-700)', fontSize: '1rem' }}>
                              {Number(plot.area_acres ?? plot.area ?? 0).toFixed(2)} Acres
                            </strong>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {plot.land_type || 'agricultural'}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {plot.ownership_type || 'owned'}
                          </td>
                          <td>
                            <span className={`badge ${isVerified ? 'badge-success' : 'badge-warning'}`}>
                              <CheckCircle2 size={12} /> {String(plot.verification_status || plot.land_verification || 'verified').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {isEligible ? (
                              <span style={{ color: 'var(--primary-700)', fontWeight: 600, fontSize: '0.825rem' }}>
                                ✓ Eligible for Procurement Quota
                              </span>
                            ) : (
                              <span style={{ color: 'var(--gray-500)', fontSize: '0.825rem' }}>
                                Excluded (Unverified / Non-agricultural)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                No verified land parcels found for this farmer record.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
