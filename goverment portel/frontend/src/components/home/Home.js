import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InfoContext from '../../context/Info/InfoContext';
import './Home.css';

const initialStatsData = [
  { id: 1, title: 'States', count: 0, route: '/states', color: 'blue', icon: '📍' },
  { id: 2, title: 'Districts', count: 0, route: '/districts', color: 'teal', icon: '🏢' },
  { id: 3, title: 'Tehsils', count: 0, route: '/tehsils', color: 'purple', icon: '🏛️' },
  { id: 4, title: 'Mandis', count: 0, route: '/mandis', color: 'orange', icon: '🏪' },
  { id: 5, title: 'Mandi Counters', count: 0, route: '/mandi-counters', color: 'pink', icon: '🪟' },
  { id: 6, title: 'Crops', count: 0, route: '/crops', color: 'green', icon: '🌱' },
  { id: 7, title: 'Registered Farmers', count: '0', route: '/farmers', color: 'sky', icon: '👥' },
  { id: 8, title: 'Procurement Session', count: '0', subtitle: 'This Season', route: '/procurement', color: 'indigo', icon: '📊' },
  { id: 9, title: 'Add User', route: '/adduser', color: 'blue', icon: '👤+' },
  { id: 10, title: 'Chatbot', route: '/chatbot', color: 'mint', icon: '🤖' }
];

const quickActions = [
  { label: 'Add Mandi', path: '/mandis/addmandi', icon: '🏪', bg: '#eefdf5', color: '#16a34a' },
  { label: 'Add Counter', path: '/mandi-counters', icon: '▦', bg: '#eff6ff', color: '#2563eb' },
  { label: 'Register Farmer', path: '/farmers/register', icon: '👤+', bg: '#fff7ed', color: '#ea580c' },
  { label: 'Payment Users', path: '/payment-users', icon: '💳', bg: '#eff6ff', color: '#2563eb' },
  { label: 'Add User', path: '/adduser', icon: '👤+', bg: '#eff6ff', color: '#2563eb' },
  { label: 'Add Mandi User', path: '/addmandiuser', icon: '🌾+', bg: '#f0fdf4', color: '#16a34a' },
  { label: 'Add Crop', path: '/crops', icon: '🌿', bg: '#faf5ff', color: '#9333ea' },
  { label: 'Chatbot', path: '/chatbot', icon: '🤖', bg: '#f0fdfa', color: '#0d9488' },
];

const getDotColor = (text = '') => {
  const t = text.toLowerCase();
  if (t.includes('delete') || t.includes('remove')) return '#ef4444';
  if (t.includes('add') || t.includes('register') || t.includes('create')) return '#10b981';
  if (t.includes('update') || t.includes('edit') || t.includes('change')) return '#8b5cf6';
  if (t.includes('mandi') || t.includes('counter')) return '#3b82f6';
  return '#f59e0b';
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

  const {
    totalDistrict,
    totalState,
    totalTehsil,
    totalFarmer,
    totalMandis,
    totalCrops,
    totalCounter,
    totalProcurementSession,
  } = useContext(InfoContext);

  const [stats, setStats] = useState(initialStatsData);
  const [chartStats, setChartStats] = useState([]);
  const [chartGroupBy, setChartGroupBy] = useState('month');
  const [chartMaxVal, setChartMaxVal] = useState(40000);
  const [loadingChart, setLoadingChart] = useState(false);
  const [recentAct, setRecentAct] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    // 1. Fetch System Metrics
    const fetchMetrics = async () => {
      try {
        const [
          ttehsil,
          tdis,
          tstate,
          tfarmer,
          tmandis,
          tcrops,
          tcounter,
          tprocurementsession,
        ] = await Promise.all([
          totalTehsil ? totalTehsil() : {},
          totalDistrict ? totalDistrict() : {},
          totalState ? totalState() : {},
          totalFarmer ? totalFarmer() : {},
          totalMandis ? totalMandis() : {},
          totalCrops ? totalCrops() : {},
          totalCounter ? totalCounter() : {},
          totalProcurementSession ? totalProcurementSession() : {},
        ]);

        const idx0 = { id: 1, title: 'States', count: tstate.total_states || 0, route: '/states', color: 'blue', icon: '📍' };
        const idx1 = { id: 2, title: 'Districts', count: tdis.total_districts || 0, route: '/districts', color: 'teal', icon: '🏢' };
        const idx2 = { id: 3, title: 'Tehsils', count: ttehsil.total_tehsils || 0, route: '/tehsils', color: 'purple', icon: '🏛️' };
        const idx3 = { id: 4, title: 'Mandis', count: tmandis.totalMandis || 0, route: '/mandis', color: 'orange', icon: '🏪' };
        const idx4 = { id: 5, title: 'Mandi Counters', count: tcounter.totalCounters || 0, route: '/mandi-counters', color: 'pink', icon: '🪟' };
        const idx5 = { id: 6, title: 'Crops', count: tcrops.total_crops || 0, route: '/crops', color: 'green', icon: '🌱' };
        const idx6 = { id: 7, title: 'Registered Farmers', count: tfarmer.total_farmers || 0, route: '/farmers', color: 'sky', icon: '👥' };
        const idx7 = { id: 8, title: 'Procurement Session', count: tprocurementsession.totalSessions || 0, subtitle: 'This Season', route: '/procurement', color: 'indigo', icon: '📊' };

        setStats((prev) =>
          prev
            .with(0, idx0)
            .with(1, idx1)
            .with(2, idx2)
            .with(3, idx3)
            .with(4, idx4)
            .with(5, idx5)
            .with(6, idx6)
            .with(7, idx7)
        );
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };

    // 2. Fetch Recent Activities with query params: page=1 and count=5
    const fetchRecentActivities = async () => {
      setLoadingActivities(true);
      try {
        const response = await fetch(`${host}/api/recent-log/?page=1&count=5`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const res = await response.json();
        if (res && res.success && Array.isArray(res.data)) {
          const formatted = res.data.map((item, idx) => ({
            id: idx + 1,
            action: item.recent_activity || 'Activity recorded',
            created_at: item.navigate_at
              ? new Date(item.navigate_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : '',
            TriggerBy: item.username || 'Admin / System',
            dotColor: getDotColor(item.recent_activity || ''),
          }));
          setRecentAct(formatted);
        } else {
          setRecentAct([]);
        }
      } catch (err) {
        console.error('Error fetching recent activity logs:', err);
        setRecentAct([]);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchMetrics();
    fetchRecentActivities();
  }, [
    navigate,
    host,
    totalTehsil,
    totalDistrict,
    totalState,
    totalFarmer,
    totalMandis,
    totalCrops,
    totalCounter,
    totalProcurementSession,
  ]);

  // 3. Fetch Real Procurement Chart Stats from Database
  useEffect(() => {
    let isMounted = true;
    const fetchChartData = async () => {
      setLoadingChart(true);
      try {
        const response = await fetch(`${host}/api/procurement/chart-stats?groupBy=${chartGroupBy}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const res = await response.json();
        if (isMounted && res && res.success && Array.isArray(res.data)) {
          setChartStats(res.data);
          if (res.maxVal && res.maxVal > 0) {
            setChartMaxVal(res.maxVal);
          } else {
            const calculatedMax = Math.max(...res.data.map((d) => d.val || 0), 100);
            setChartMaxVal(Math.ceil(calculatedMax * 1.15));
          }
        }
      } catch (err) {
        console.error('Error fetching procurement chart stats:', err);
      } finally {
        if (isMounted) setLoadingChart(false);
      }
    };

    fetchChartData();
    return () => {
      isMounted = false;
    };
  }, [host, chartGroupBy]);

  // Navigate to full activities page without passing state
  const handleViewAllActivities = () => {
    navigate('/activities');
  };

  return (
    <div className="dashboard-home-content">
      {/* Welcome Banner */}
      <section className="welcome-banner">
        <div className="banner-left">
          <h1 className="banner-heading">Welcome Back, Admin!</h1>
          <p className="banner-subtext">
            Manage your mandis, procurement and agricultural supply chain efficiently.
          </p>
        </div>
        <div className="banner-right">
          <span className="quote-text">"Stronger Farmers, Brighter Tomorrow"</span>
          <div className="quote-highlight-bar"></div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="stats-grid">
        {stats.map((item) => (
          <div key={item.id} className={`stat-card stat-${item.color}`}>
            <div className="stat-icon-wrapper">{item.icon}</div>
            <div className="stat-content">
              <div className="stat-count">{item.count}</div>
              <div className="stat-title">{item.title}</div>
              {item.subtitle && <div className="stat-subtitle">{item.subtitle}</div>}
              <Link to={item.route} className="stat-link">
                View →
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <h3 className="section-title">⚡ Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className="quick-action-button"
              style={{ backgroundColor: action.bg }}
            >
              <span className="qa-icon" style={{ color: action.color }}>
                {action.icon}
              </span>
              <span className="qa-label">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Procurement Trend Chart & Recent Activities */}
      <div className="bottom-grid">
        {/* Trend Chart */}
        <div className="dash-card procurement-trend-card">
          <div className="card-top-bar">
            <div className="card-top-title">
              <span>📊</span> Procurement Trend
            </div>
            <select
              className="period-select"
              value={chartGroupBy}
              onChange={(e) => setChartGroupBy(e.target.value)}
              aria-label="Filter procurement chart"
            >
              <option value="month">Monthly Trend (MT)</option>
              <option value="crop">By Crop (MT)</option>
              <option value="state">By State (MT)</option>
            </select>
          </div>

          <div className="trend-chart-container">
            <div className="y-axis-labels">
              <span>{Math.round(chartMaxVal).toLocaleString()}</span>
              <span>{Math.round(chartMaxVal * 0.8).toLocaleString()}</span>
              <span>{Math.round(chartMaxVal * 0.6).toLocaleString()}</span>
              <span>{Math.round(chartMaxVal * 0.4).toLocaleString()}</span>
              <span>{Math.round(chartMaxVal * 0.2).toLocaleString()}</span>
              <span>0</span>
            </div>

            <div className="chart-plot-area">
              <div className="horizontal-grid-lines">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
              {loadingChart ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                  Loading procurement data...
                </div>
              ) : chartStats.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                  No procurement records available.
                </div>
              ) : (
                <div className="chart-columns">
                  {chartStats.map((item, idx) => {
                    const barHeight = chartMaxVal > 0 ? Math.min(100, Math.max(0, (item.val / chartMaxVal) * 100)) : 0;
                    return (
                      <div key={idx} className="column-holder">
                        <div
                          className="bar-shape"
                          style={{ height: `${barHeight}%` }}
                          title={`${item.label}: ${Number(item.val).toLocaleString()} MT`}
                        ></div>
                        <span className="month-tag" title={item.label}>
                          {item.label && item.label.length > 7 ? item.label.substring(0, 6) + '…' : item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities (Dashboard Shows Top 5) */}
        <div className="dash-card recent-activities-card">
          <div className="card-top-bar">
            <div className="card-top-title">
              <span>🕒</span> Recent Activities
            </div>
            <button
              type="button"
              onClick={handleViewAllActivities}
              className="see-all-link-btn"
            >
              View All →
            </button>
          </div>

          <ul className="activities-list">
            {loadingActivities ? (
              <li className="activity-empty-text">Loading recent logs...</li>
            ) : recentAct.map((act) => (
              <li key={act.id} className="activity-row">
                <div className="action-col">
                  <span
                    className="status-dot"
                    style={{ backgroundColor: act.dotColor }}
                  ></span>
                  <div className="action-text-wrapper">
                    <span className="action-name">{act.action}</span>
                    {act.created_at && (
                      <span className="action-timestamp">{act.created_at}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}

            {!loadingActivities && recentAct.length === 0 && (
              <li className="activity-empty-text">No recent activity recorded.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}