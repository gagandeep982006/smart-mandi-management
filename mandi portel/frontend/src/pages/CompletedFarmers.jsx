import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatIndianDateTime } from "../utils/dateUtils";
import { 
    CheckCircle, 
    Filter, 
    Search, 
    Info, 
    RefreshCw, 
    Calendar,
    CreditCard,
    Layers,
    User,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

export default function CompletedFarmers() {
    const { user } = useAuth();
    const [counters, setCounters] = useState([]);
    const [selectedCounterId, setSelectedCounterId] = useState("");
    const [completedList, setCompletedList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
    const [retentionDays, setRetentionDays] = useState(7);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch assigned counters
    useEffect(() => {
        const fetchCounters = async () => {
            try {
                const res = await apiFetch("/api/counters/my");
                if (res.success && res.data.length > 0) {
                    setCounters(res.data);
                    setSelectedCounterId(res.data[0].counter_id);
                }
            } catch (err) {
                console.error("Fetch counters error:", err);
            }
        };
        fetchCounters();
    }, []);

    // Fetch completed farmers for the selected counter with pagination
    const fetchCompleted = async (isManual = false) => {
        if (!selectedCounterId) return;
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await apiFetch(`/api/counters/${selectedCounterId}/completed?page=${page}&count=${pageSize}`);
            if (res.success) {
                setCompletedList(res.data || []);
                if (res.retention_days) {
                    setRetentionDays(res.retention_days);
                }
                setTotalRecords(res.total ?? (res.data ? res.data.length : 0));
                setTotalPages(res.total_pages ?? Math.ceil((res.total || 1) / pageSize));
            }
        } catch (err) {
            console.error("Fetch completed farmers error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (selectedCounterId) {
            fetchCompleted();
        }
    }, [selectedCounterId, page, pageSize]);

    // Client-side search & payment status filtering
    const filteredList = completedList.filter((item) => {
        const matchesSearch = 
            (item.farmer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.token_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.farmer_mobile || "").includes(searchTerm) ||
            String(item.booking_id || "").includes(searchTerm);

        const matchesStatus = paymentStatusFilter === "ALL" || item.payment_status === paymentStatusFilter;
        return matchesSearch && matchesStatus;
    });

    const selectedCounter = counters.find(c => String(c.counter_id) === String(selectedCounterId));

    return (
        <div className="main-content">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
                        <CheckCircle size={22} color="var(--primary)" />
                        Completed Farmers Log
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                        Official record of completed procurement sessions, weighing results, and payable amounts.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="badge badge-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                        Retention Policy: Past {retentionDays} Days
                    </div>

                    <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => fetchCompleted(true)}
                        disabled={loading || refreshing}
                    >
                        <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                        <span>Refresh Log</span>
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Counter Selection */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 240px", minWidth: "min(240px, 100%)" }}>
                        <Layers size={18} color="var(--primary)" />
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                                Select Counter:
                            </label>
                            <select
                                className="form-control"
                                value={selectedCounterId}
                                onChange={(e) => {
                                    setSelectedCounterId(e.target.value);
                                    setPage(1);
                                }}
                                style={{ padding: "6px 10px", fontSize: "0.9rem", marginTop: "2px", width: "100%" }}
                            >
                                {counters.map(c => (
                                    <option key={c.counter_id} value={c.counter_id}>
                                        Counter {c.counter_number} - {c.counter_name} ({c.crop_name || "All Crops"})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search Field */}
                    <div style={{ position: "relative", flex: "1 1 220px", minWidth: "min(200px, 100%)" }}>
                        <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search farmer name, token, mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: "32px", fontSize: "0.85rem", width: "100%" }}
                        />
                    </div>

                    {/* Payment Status Filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "0 1 auto" }}>
                        <Filter size={15} color="var(--text-muted)" />
                        <select
                            className="form-control"
                            value={paymentStatusFilter}
                            onChange={(e) => setSearchTerm("") || setPaymentStatusFilter(e.target.value)}
                            style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                        >
                            <option value="ALL">All Payment Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Completed Table Card */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">
                        {selectedCounter ? `Counter ${selectedCounter.counter_number} Completed Sessions` : "Completed Procurement Records"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Total: <strong>{totalRecords}</strong> records
                    </span>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px auto" }} />
                        <p style={{ fontSize: "0.9rem" }}>Loading completed farmers log...</p>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        <Info size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                        <h4 style={{ fontSize: "1rem", color: "var(--text-main)" }}>No Completed Farmers Found</h4>
                        <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                            {searchTerm || paymentStatusFilter !== "ALL"
                                ? "No matching records found for the applied search/filter."
                                : `No farmers completed at this counter within the past ${retentionDays} days.`}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Farmer</th>
                                        <th>Crop</th>
                                        <th>Quantity Sold</th>
                                        <th>Counter</th>
                                        <th>Completed At</th>
                                        <th>Payable Amount</th>
                                        <th>Payment Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredList.map((item) => {
                                        const paymentStatusLower = (item.payment_status || "pending").toLowerCase();
                                        const amountFormatted = parseFloat(item.total_payable_amount || 0).toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        });

                                        return (
                                            <tr key={item.token_id}>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
                                                        {item.token_number}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                                                        {item.farmer_name}
                                                    </div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                        Ph: {item.farmer_mobile || "N/A"} • ID: #{item.farmer_id}
                                                    </div>
                                                </td>

                                                <td>
                                                    <span style={{ fontWeight: 500 }}>{item.crop_name}</span>
                                                </td>

                                                <td>
                                                    <strong style={{ fontSize: "0.9rem" }}>
                                                        {Number(item.quantity_approved).toFixed(2)} quintals
                                                    </strong>
                                                </td>

                                                <td>
                                                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                                        Counter {selectedCounter?.counter_number || ""}
                                                    </span>
                                                </td>

                                                <td style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                                                    {item.completion_time 
                                                        ? formatIndianDateTime(item.completion_time)
                                                        : "Completed"}
                                                </td>

                                                <td>
                                                    <strong style={{ color: "var(--primary-dark)", fontSize: "0.95rem" }}>
                                                        ₹{amountFormatted}
                                                    </strong>
                                                </td>

                                                <td>
                                                    <span className={`badge badge-${paymentStatusLower === "paid" ? "completed" : "pending"}`}>
                                                        {item.payment_status || "PENDING"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "14px 18px", 
                            borderTop: "1px solid var(--border)",
                            flexWrap: "wrap",
                            gap: "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                <span>Rows per page:</span>
                                <select 
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span>• Page {page} of {totalPages || 1}</span>
                            </div>

                            <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1 || loading}
                                >
                                    <ChevronLeft size={14} />
                                    <span>Previous</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages || loading}
                                >
                                    <span>Next</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
