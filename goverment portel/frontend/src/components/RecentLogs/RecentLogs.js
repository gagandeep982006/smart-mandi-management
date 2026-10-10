import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './RecentLogs.css';

const host = process.env.REACT_APP_HOST || 'http://localhost:5000';

const getActionType = (text = '') => {
  const t = (text || '').toLowerCase();
  if (t.includes('delete') || t.includes('remove')) return { label: 'Deleted', color: 'red' };
  if (t.includes('add') || t.includes('register') || t.includes('create')) return { label: 'Created', color: 'green' };
  if (t.includes('update') || t.includes('edit') || t.includes('change')) return { label: 'Updated', color: 'purple' };
  if (t.includes('mandi') || t.includes('counter')) return { label: 'Mandi Ops', color: 'blue' };
  return { label: 'System Log', color: 'amber' };
};

export default function RecentActivities() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  // Backend query parameters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Fetch paginated logs from backend using page and count query parameters
  const fetchLogs = useCallback(async (page, count) => {
    setLoading(true);
    try {
      const response = await fetch(`${host}/api/recent-log/?page=${page}&count=${count}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const res = await response.json();
      if (res && res.success && Array.isArray(res.data)) {
        const rawDateFormatter = (rawDate) => {
          if (!rawDate) return 'N/A';
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) return rawDate;

          return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        };

        const formatted = res.data.map((item, idx) => {
          const actionText = item.recent_activity || item.action || 'System activity logged';
          return {
            id: item.log_id || item.id || (page - 1) * count + idx + 1,
            action: actionText,
            user: item.username || item.TriggerBy || item.user || 'Admin / System',
            created_at: rawDateFormatter(item.navigate_at || item.created_at),
            typeInfo: getActionType(actionText),
          };
        });

        setLogs(formatted);
        // Use totalCount from backend if returned; otherwise estimate or calculate from page size
        setTotalCount(res.totalCount || res.total || (res.data.length < count ? (page - 1) * count + res.data.length : page * count + 1));
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(currentPage, itemsPerPage);
  }, [currentPage, fetchLogs]);

  // Client-side search and category filtering on current batch
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.trim().toLowerCase();
      const label = log.typeInfo?.label || 'System Log';

      const matchesSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        String(log.id).includes(q) ||
        log.user?.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q);

      const matchesType =
        actionFilter === 'All' || label.toLowerCase() === actionFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [logs, searchQuery, actionFilter]);

  const handleFilterChange = (val) => {
    setActionFilter(val);
  };

  return (
    <div className="recent-activities-page">
      {/* Breadcrumbs & Header */}
      <div className="ra-header-wrapper">
        <div>
          <nav className="ra-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">›</span>
            <span className="current">Audit & Recent Logs</span>
          </nav>
          <div className="ra-title-row">
            <div className="ra-title-icon">🕒</div>
            <div>
              <h1 className="ra-page-title">Recent Activity Logs</h1>
              <p className="ra-page-subtitle">
                Read-only chronological audit trail of all transactions and administrative changes.
              </p>
            </div>
          </div>
        </div>

        <div className="ra-badge-info">
          <span>🔒 Immutable Audit Log</span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="ra-card">
        {/* Controls Toolbar */}
        <div className="ra-toolbar">
          <div className="ra-search-wrapper">
            <span className="ra-search-glyph">🔍</span>
            <input
              type="text"
              placeholder="Search activity, operation, user, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ra-filter-wrapper">
            <label>Filter Type:</label>
            <select
              value={actionFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="All">All Operations</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>

          <button
            type="button"
            className="ra-btn-refresh"
            onClick={() => fetchLogs(currentPage, itemsPerPage)}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Read-Only Table */}
        <div className="ra-table-responsive">
          <table className="ra-data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Log ID</th>
                <th style={{ width: '130px' }}>Operation</th>
                <th>Activity Description</th>
                <th style={{ width: '180px' }}>Triggered By</th>
                <th style={{ width: '210px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="ra-empty-cell">
                    Loading activity records...
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="cell-id">#{log.id}</td>
                  <td>
                    <span className={`ra-status-pill ${log.typeInfo?.color || 'amber'}`}>
                      {log.typeInfo?.label || 'System Log'}
                    </span>
                  </td>
                  <td className="cell-action-text">{log.action}</td>
                  <td className="cell-user">{log.user}</td>
                  <td className="cell-date">{log.created_at}</td>
                </tr>
              ))}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="ra-empty-cell">
                    No activity logs match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Counter Footer */}
        <div className="ra-pagination-bar">
          <span className="ra-record-count">
            Showing{' '}
            <strong>
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            </strong>{' '}
            to{' '}
            <strong>
              {(currentPage - 1) * itemsPerPage + filteredLogs.length}
            </strong>{' '}
            records
          </span>

          <div className="ra-page-controls">
            <button
              type="button"
              className="ra-page-btn"
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ← Previous
            </button>
            <span className="ra-current-page-tag">Page {currentPage}</span>
            <button
              type="button"
              className="ra-page-btn"
              disabled={logs.length < itemsPerPage || loading}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}