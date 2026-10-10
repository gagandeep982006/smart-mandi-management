import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/auth/AuthContext';
import './Profile.css';

export default function Profile() {
  const { getProfileAPI, checkAuth } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        let data = null;
        if (getProfileAPI) {
          data = await getProfileAPI();
        }
        if (!data && checkAuth) {
          const authUser = await checkAuth();
          if (authUser) {
            data = {
              user_id: authUser.user_id,
              username: authUser.username,
              full_name: authUser.username,
              phone_number: 'Registered Phone',
              email: 'N/A',
              address: 'Government Administrative Complex',
              masked_aadhaar: `XXXX-XXXX-${String(authUser.user_id).padStart(4, '0')}`,
              role: authUser.role,
              permissions: authUser.permissions || [],
              status: authUser.status || 'active',
              location: {
                state: authUser.state_id ? `State #${authUser.state_id}` : 'National / Central',
                district: authUser.district_id ? `District #${authUser.district_id}` : 'All Districts',
                tehsil: authUser.tehsil_id ? `Tehsil #${authUser.tehsil_id}` : 'All Tehsils'
              }
            };
          }
        }

        if (isMounted) {
          if (data) {
            setProfile(data);
          } else {
            setError('Unable to load official profile information.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch profile details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [getProfileAPI, checkAuth]);

  if (loading) {
    return (
      <div className="gov-profile-container">
        <div className="gov-profile-loading">
          <span className="gov-spinner">🌾</span>
          <p>Loading official profile information...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="gov-profile-container">
        <div className="gov-profile-card">
          <div className="gov-profile-alert">
            <span>⚠️</span> {error || 'Profile not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gov-profile-container">
      {/* Tricolor Identity Header */}
      <div className="gov-profile-tricolor">
        <span className="strip-saffron"></span>
        <span className="strip-white"></span>
        <span className="strip-green"></span>
      </div>

      <div className="gov-profile-card">
        {/* Profile Card Header */}
        <div className="gov-profile-header">
          <div className="gov-profile-avatar-wrap">
            <span className="gov-profile-avatar-icon">🏛️</span>
          </div>
          <div className="gov-profile-header-text">
            <div className="gov-profile-badge-row">
              <span className="gov-badge-official">Official Account</span>
              <span className={`gov-status-badge ${profile.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                ● {profile.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <span className="gov-readonly-pill">Read-Only View</span>
            </div>
            <h1 className="gov-profile-title">{profile.full_name || profile.username}</h1>
            <p className="gov-profile-subtitle">
              {profile.role?.toUpperCase()} • Department of Agriculture & Farmers Welfare, GoI
            </p>
          </div>
        </div>

        {/* Profile Details Sections */}
        <div className="gov-profile-body">
          {/* Section 1: Account & Authentication Identification */}
          <div className="gov-section">
            <h2 className="gov-section-title">
              <span>👤</span> Official Identity & Credentials
            </h2>
            <div className="gov-grid-2">
              <div className="gov-field">
                <label>Officer / User ID</label>
                <div className="gov-value-box">
                  <code>#{profile.user_id}</code>
                </div>
              </div>
              <div className="gov-field">
                <label>System Username</label>
                <div className="gov-value-box">{profile.username}</div>
              </div>
              <div className="gov-field">
                <label>Official Full Name</label>
                <div className="gov-value-box">{profile.full_name || profile.username}</div>
              </div>
              <div className="gov-field">
                <label>Registered Mobile Number (OTP Login Identifier)</label>
                <div className="gov-value-box highlight-phone">
                  📱 +91 {profile.phone_number}
                </div>
              </div>
              <div className="gov-field">
                <label>Official Email</label>
                <div className="gov-value-box">{profile.email || 'N/A'}</div>
              </div>
              <div className="gov-field">
                <label>Aadhaar Verification (Masked Blind Index)</label>
                <div className="gov-value-box aadhaar-box">
                  🔒 {profile.masked_aadhaar || 'Verified via Pepper Blind Index'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Administrative Jurisdiction & Location */}
          <div className="gov-section">
            <h2 className="gov-section-title">
              <span>📍</span> Administrative Jurisdiction & Post
            </h2>
            <div className="gov-grid-3">
              <div className="gov-field">
                <label>State Jurisdiction</label>
                <div className="gov-value-box">{profile.location?.state || 'National / Central Level'}</div>
              </div>
              <div className="gov-field">
                <label>District Jurisdiction</label>
                <div className="gov-value-box">{profile.location?.district || 'All Districts'}</div>
              </div>
              <div className="gov-field">
                <label>Tehsil Jurisdiction</label>
                <div className="gov-value-box">{profile.location?.tehsil || 'All Tehsils'}</div>
              </div>
            </div>
            <div className="gov-field" style={{ marginTop: '16px' }}>
              <label>Office Address</label>
              <div className="gov-value-box">{profile.address || 'Government Administrative Complex, New Delhi'}</div>
            </div>
          </div>

          {/* Section 3: Permissions & Role Rights */}
          <div className="gov-section">
            <h2 className="gov-section-title">
              <span>🛡️</span> Role Scope & Authorized Permissions
            </h2>
            <div className="gov-field">
              <label>Assigned System Role</label>
              <div className="gov-value-box role-box">
                <strong>{String(profile.role).toUpperCase()}</strong>
              </div>
            </div>
            <div className="gov-field" style={{ marginTop: '12px' }}>
              <label>Authorized Permissions</label>
              <div className="gov-perms-container">
                {Array.isArray(profile.permissions) && profile.permissions.length > 0 ? (
                  profile.permissions.map((perm, idx) => (
                    <span key={idx} className="gov-perm-chip">
                      ✓ {perm}
                    </span>
                  ))
                ) : (
                  <span className="gov-text-muted">Standard Government Portal User Privileges</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="gov-profile-footer">
          <p className="gov-footer-note">
            🛡️ <strong>Notice:</strong> This profile is maintained in compliance with official government identity records. Profile updates are restricted to Central Administration/DBA verification.
          </p>
        </div>
      </div>
    </div>
  );
}
