import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { formatIndianTime, formatIndianDate } from "../utils/dateUtils";
import { 
    Layers, 
    ArrowLeft, 
    Clock, 
    PhoneCall, 
    Check, 
    Play, 
    AlertTriangle, 
    Calendar,
    UserCheck,
    RefreshCw,
    XCircle,
    CalendarDays,
    Search,
    CheckCircle2,
    IndianRupee,
    Filter,
    Sparkles,
    X
} from "lucide-react";



export default function CounterDetail() {
    const { counter_id } = useParams();
    const toast = useToast();

    const [counter, setCounter] = useState(null);
    const [summary, setSummary] = useState(null);
    const [queue, setQueue] = useState([]);
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });

    // Loading & action states
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // Search & Filter state
    const [searchToken, setSearchToken] = useState("");
    const [filterTab, setFilterTab] = useState("active"); // "active" | "completed" | "no_show" | "all"

    // Pagination / Infinite scroll state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    // Quality Grade for complete action: "A", "B", "C"
    const [qualityGrade, setQualityGrade] = useState("A");
    const qualityGradeRef = useRef("A");
    const [activeCompleteItem, setActiveCompleteItem] = useState(null);

    // Payout Celebration / Success Modal state
    const [payoutModalData, setPayoutModalData] = useState(null);

    // Confirm modal state
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: "",
        message: "",
        details: null,
        confirmText: "Confirm",
        confirmVariant: "primary",
        action: null,
        isCompleteAction: false
    });

    const loadMoreRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // 7-day date window (today + 6 days strictly)
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        dates.push({
            dateStr,
            dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
            label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            isToday: i === 0
        });
    }

    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const isFutureDate = selectedDate > todayStr;

    // Load Counter Profile and Summary
    const loadCounterInfo = async () => {
        try {
            const [counterRes, summaryRes] = await Promise.all([
                apiFetch(`/api/counters/${counter_id}`),
                apiFetch(`/api/counters/${counter_id}/summary?date=${selectedDate}`)
            ]);

            if (counterRes.success) setCounter(counterRes.data);
            if (summaryRes.success) setSummary(summaryRes.data);
        } catch (err) {
            console.error("loadCounterInfo error:", err);
            setError(err.message || "Failed to load counter info");
        }
    };

    // Load Queue with pagination and filters
    const loadQueue = useCallback(async (pageNum = 1, append = false, currentSearch = searchToken) => {
        if (pageNum === 1 && !append) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({
                date: selectedDate,
                page: pageNum,
                limit: 20,
                filter: filterTab
            });

            if (currentSearch.trim()) {
                params.set("search", currentSearch.trim());
            }

            const res = await apiFetch(`/api/counters/${counter_id}/queue?${params.toString()}`);
            if (res.success) {
                const items = res.data || [];
                if (append) {
                    setQueue(prev => [...prev, ...items]);
                } else {
                    setQueue(items);
                }
                setPage(pageNum);
                setHasMore(res.has_more ?? false);
                setTotalCount(res.total ?? items.length);
            }
        } catch (err) {
            console.error("loadQueue error:", err);
            toast.error(err.message || "Failed to load queue");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [counter_id, selectedDate, filterTab, searchToken, toast]);

    // Initial and dependency-driven fetch
    useEffect(() => {
        loadCounterInfo();
        loadQueue(1, false, searchToken);
    }, [counter_id, selectedDate, filterTab]);

    // Infinite scroll observer: trigger next page when reaching the end
    useEffect(() => {
        if (!loadMoreRef.current || !hasMore || loadingMore || loading) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                loadQueue(page + 1, true, searchToken);
            }
        }, { threshold: 0.1 });

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, page, loadQueue, searchToken]);

    // Debounced search handling
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchToken(val);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            loadQueue(1, false, val);
        }, 350);
    };

    const handleClearSearch = () => {
        setSearchToken("");
        loadQueue(1, false, "");
    };

    const isCounterActive = counter?.status === "active";

    // Action handlers with feedback
    const handleCallNext = async () => {
        if (!isCounterActive || actionLoading || isFutureDate) return;
        setActionLoading(true);

        try {
            const res = await apiFetch(`/api/counters/${counter_id}/call-next`, { method: "POST" });
            toast.success(res.message || "Next waiting farmer called successfully according to slot time");
            await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
        } catch (err) {
            if (err.data?.code === "BEFORE_SLOT_TIME" && err.data?.token_id) {
                setConfirmState({
                    isOpen: true,
                    title: `Early Arrival Request — ${err.data.farmer_name}`,
                    message: `${err.data.farmer_name} is scheduled at ${err.data.scheduled_time}. Current time is before their slot. Would you like to send an Early Arrival Request to this farmer? Once they accept in the Farmer Portal, their procurement can begin immediately.`,
                    details: {
                        "Farmer Name": err.data.farmer_name,
                        "Scheduled Time": err.data.scheduled_time,
                        "Token ID": err.data.token_id
                    },
                    confirmText: "Send Early Arrival Request",
                    confirmVariant: "primary",
                    isCompleteAction: false,
                    action: async () => {
                        await handleRequestEarly(err.data.token_id, "Token", err.data.farmer_name, err.data.scheduled_time);
                    }
                });
                return;
            }
            toast.error(err.message || "Failed to call next farmer");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCallFarmer = async (tokenId, tokenNumber, farmerName) => {
        if (!isCounterActive || actionLoading || isFutureDate) return;
        setActionLoading(true);

        try {
            const res = await apiFetch(`/api/tokens/${tokenId}/call`, { method: "POST" });
            toast.success(res.message || `Token ${tokenNumber} (${farmerName}) called successfully`);
            await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
        } catch (err) {
            if (err.data?.code === "BEFORE_SLOT_TIME" && err.data?.token_id) {
                setConfirmState({
                    isOpen: true,
                    title: `Early Arrival Request — ${err.data.farmer_name}`,
                    message: `${err.data.farmer_name} is scheduled at ${err.data.scheduled_time}. Current time is before their slot. Would you like to send an Early Arrival Request to this farmer? Once they accept in Farmer Portal, you can call them immediately.`,
                    details: {
                        "Farmer Name": err.data.farmer_name,
                        "Scheduled Time": err.data.scheduled_time,
                        "Token Number": tokenNumber
                    },
                    confirmText: "Send Early Arrival Request",
                    confirmVariant: "primary",
                    isCompleteAction: false,
                    action: async () => {
                        await handleRequestEarly(tokenId, tokenNumber, farmerName, err.data.scheduled_time);
                    }
                });
                return;
            }
            toast.error(err.message || `Failed to call token ${tokenNumber}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestEarly = async (tokenId, tokenNumber, farmerName, scheduledTime) => {
        if (!isCounterActive || actionLoading || isFutureDate) return;
        setActionLoading(true);

        try {
            const res = await apiFetch(`/api/tokens/${tokenId}/request-early`, {
                method: "POST",
                body: { message: `Counter ${counter?.counter_number || ""} is ready early. Can you arrive now for procurement?` }
            });
            toast.info(res.message || `Early arrival request sent to ${farmerName}. Awaiting farmer acceptance in Farmer Portal.`);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
        } catch (err) {
            toast.error(err.message || "Failed to send early arrival request");
        } finally {
            setActionLoading(false);
        }
    };

    const handleArrive = async (tokenId, tokenNumber) => {
        if (!isCounterActive || actionLoading || isFutureDate) return;
        setActionLoading(true);

        try {
            const res = await apiFetch(`/api/tokens/${tokenId}/arrive`, { method: "PATCH" });
            toast.success(res.message || `Token ${tokenNumber} marked as arrived`);
            await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
        } catch (err) {
            toast.error(err.message || "Failed to mark arrival");
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartProcessing = async (tokenId, tokenNumber) => {
        if (!isCounterActive || actionLoading || isFutureDate) return;
        setActionLoading(true);

        try {
            const res = await apiFetch(`/api/tokens/${tokenId}/start-processing`, { method: "PATCH" });
            toast.success(res.message || `Token ${tokenNumber} started processing`);
            await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
        } catch (err) {
            toast.error(err.message || "Failed to start processing");
        } finally {
            setActionLoading(false);
        }
    };

    // Calculate dynamic estimated rate and payout amount for preview strictly using DB procurement_quota
    const calculateRateAndTotal = (cropId, quantity, grade) => {
        const quota = counter?.crop_quota || summary?.crop_quota;
        const lsp = quota?.lsp ? parseFloat(quota.lsp) : 0;
        const msp = quota?.msp ? parseFloat(quota.msp) : lsp;

        let qualityFactor = 1.0;
        if (grade === "B") qualityFactor = 0.5;
        else if (grade === "C") qualityFactor = 0.0;

        const rate = parseFloat((lsp + qualityFactor * (msp - lsp)).toFixed(2));
        const total = parseFloat((Number(quantity || 0) * rate).toFixed(2));
        return { 
            rate, 
            total, 
            lsp, 
            msp,
            stateName: quota?.state_name || "State Quota",
            cropName: quota?.crop_name || counter?.crop?.crop_name || "Crop"
        };
    };

    // Modal Confirmation for Completing Farmer Sale
    const confirmComplete = (item) => {
        qualityGradeRef.current = "A";
        setQualityGrade("A");
        setActiveCompleteItem(item);

        setConfirmState({
            isOpen: true,
            title: `Complete Sale for Token ${item.token_number}`,
            message: `Finalize crop weighing and quality inspection for ${item.farmer_name}. Review the payable procurement amount below before generating the official government payment voucher.`,
            details: {
                "Farmer Name": item.farmer_name,
                "Crop": item.crop_name,
                "Approved Quantity": `${Number(item.quantity_approved).toFixed(2)} quintals`,
                "Token Number": item.token_number
            },
            confirmText: "Complete & Generate Payment",
            confirmVariant: "success",
            isCompleteAction: true,
            action: async () => {
                setActionLoading(true);
                try {
                    const res = await apiFetch(`/api/tokens/${item.token_id}/complete`, { 
                        method: "PATCH",
                        body: {
                            quality_grade: qualityGradeRef.current,
                            quantity_sold: parseFloat(item.quantity_approved)
                        }
                    });

                    setConfirmState(prev => ({ ...prev, isOpen: false }));

                    // Display dedicated payment receipt modal with exact amount farmer gets
                    if (res.data) {
                        setPayoutModalData(res.data);
                    }

                    toast.success(`Farmer completed! Amount: ₹${Number(res.data?.total_payable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
                    await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
                } catch (err) {
                    toast.error(err.message || "Failed to complete farmer");
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    // Modal Confirmation for No-Show (Not Arrived)
    const confirmNotArrived = (item) => {
        if (!item.can_mark_not_arrived && item.slot_timing && (item.slot_timing.isBeforeSlot || item.slot_timing.isSlotActive)) {
            toast.warning(`Cannot mark ${item.farmer_name} as Not Arrived before their scheduled appointment slot has passed (${item.slot_timing.timeStr}).`);
            return;
        }

        setConfirmState({
            isOpen: true,
            title: `Mark Farmer as Not Arrived (${item.token_number})`,
            message: `Are you sure you want to mark ${item.farmer_name} as a no-show? This marks the token as NOT_ARRIVED. Future rescheduling must be requested by the farmer through the Farmer Portal.`,
            details: {
                "Farmer Name": item.farmer_name,
                "Token Number": item.token_number,
                "Scheduled Slot": item.slot_timing?.timeStr || formatIndianTime(item.booking_time)
            },
            confirmText: "Confirm No-Show",
            confirmVariant: "danger",
            isCompleteAction: false,
            action: async () => {
                setActionLoading(true);
                try {
                    const res = await apiFetch(`/api/tokens/${item.token_id}/not-arrived`, { method: "PATCH" });
                    toast.warning(res.message || `Token ${item.token_number} marked as not arrived`);
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    await Promise.all([loadCounterInfo(), loadQueue(1, false, searchToken)]);
                } catch (err) {
                    toast.error(err.message || "Failed to mark farmer not arrived");
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    // Procurement and capacity metric calculations
    const totalDayQty = Number(summary?.total_day_quantity || 0);
    const completedQty = Number(summary?.completed_quantity || 0);
    const remainingQty = Number(summary?.remaining_quantity || 0);
    const totalFarmersCount = Number(summary?.total_farmers_count || 0);
    const completedFarmersCount = Number(summary?.completed_farmers_count || 0);
    const remainingFarmersCount = Number(summary?.remaining_farmers_count || 0);
    const completionPercent = totalDayQty > 0 ? Math.min(100, Math.round((completedQty / totalDayQty) * 100)) : 0;

    // Detect ongoing token (PROCESSING > ARRIVED > CALLED)
    const ongoingToken = queue.find(t => ["PROCESSING", "ARRIVED", "CALLED"].includes(t.token_status)) || null;

    // Dynamic rate preview in modal
    const completePreview = activeCompleteItem 
        ? calculateRateAndTotal(activeCompleteItem.crop_id || counter?.crop_id, activeCompleteItem.quantity_approved, qualityGrade)
        : null;

    return (
        <div className="main-content">
            {/* Top Back Navigation & Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <Link to="/" className="btn btn-outline btn-sm">
                    <ArrowLeft size={15} /> 
                    <span>Back to Dashboard</span>
                </Link>

                <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                        loadCounterInfo();
                        loadQueue(1, false, searchToken);
                    }}
                    disabled={loading || actionLoading}
                    title="Refresh counter data"
                >
                    <RefreshCw size={14} className={actionLoading || loading ? "spin" : ""} />
                    <span>Refresh Queue</span>
                </button>
            </div>

            {/* Inactive Counter Warning Banner */}
            {!isCounterActive && counter && (
                <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                        <strong>Notice: Counter is currently INACTIVE.</strong> Operational queue actions (calling, arriving, processing, completing) are disabled in accordance with Government Portal administrative settings.
                    </div>
                </div>
            )}

            {/* Counter Header Card */}
            <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span className="badge badge-primary">
                                Counter {counter?.counter_number || ""}
                            </span>
                            <span className={isCounterActive ? "badge badge-active" : "badge badge-inactive"}>
                                {isCounterActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)" }}>
                            {counter?.counter_name || "Counter Desk"}
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                            🌾 Crop: <strong>{counter?.crop?.crop_name || "All Crops"}</strong> ({counter?.crop?.crop_type || "Standard"}) • 
                            🏢 Mandi: <strong>{counter?.mandi?.mandi_name || "Mandi Station"}</strong> •
                            ⏱️ Avg Service Time: <strong>{counter?.average_time_minutes || 15} mins/farmer</strong> •
                            ⚖️ Counter Daily Limit: <strong style={{ color: "var(--primary)" }}>{parseFloat(counter?.capacity_per_day || 0).toFixed(2)} MT/day</strong> <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>({(parseFloat(counter?.capacity_per_day || 0) * 10).toFixed(1)} Qtl)</span>
                        </p>
                        {counter?.crop_quota && (
                            <div style={{ marginTop: "8px", display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "5px 12px", borderRadius: "6px", fontSize: "0.8rem", color: "#166534" }}>
                                <strong>🏛️ {counter.crop_quota.state_name} Procurement Quota:</strong>
                                <span>MSP: <strong>₹{counter.crop_quota.msp.toFixed(2)}/q</strong></span>
                                <span>•</span>
                                <span>LSP: <strong>₹{counter.crop_quota.lsp.toFixed(2)}/q</strong></span>
                                <span>•</span>
                                <span>Allocated(Max amount of crop(in Qtl) farmer sells per acer): <strong>{counter.crop_quota.amount} Qtl</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Operational Call Next Action Button (Calls earliest slot time) */}
                    <div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "10px 18px", fontSize: "0.95rem" }}
                            onClick={handleCallNext}
                            disabled={!isCounterActive || actionLoading || loading || isFutureDate}
                            title={isFutureDate ? "Calling is only permitted for today's active service date" : "Calls the next waiting farmer by earliest slot time"}
                        >
                            <PhoneCall size={16} />
                            <span>{isFutureDate ? "Call Next (Today Only)" : "Call Next Farmer"}</span>
                        </button>
                    </div>
                </div>

                {isFutureDate && (
                    <div className="alert alert-info" style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <CalendarDays size={18} style={{ flexShrink: 0, color: "var(--secondary)" }} />
                        <div>
                            <strong>Future Scheduled Date ({selectedDate}):</strong> Operational queue actions (calling, arrive, processing, completion) are disabled for future dates. All scheduled farmer records are <em>Show Only</em>.
                        </div>
                    </div>
                )}

                {/* Day-Wise Realistic Procurement Calculation Meter */}
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                        {/* Total Daily Capacity */}
                        <div style={{ background: "#eff6ff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                            <span style={{ fontSize: "0.75rem", color: "#1d4ed8", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Total Daily Capacity
                            </span>
                            <strong style={{ fontSize: "1.15rem", color: "#1e40af" }}>
                                {parseFloat(counter?.capacity_per_day || 0).toFixed(2)} <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 500 }}>MT/day</span>
                            </strong>
                            <div style={{ fontSize: "0.72rem", color: "#2563eb", marginTop: "2px" }}>
                                ({(parseFloat(counter?.capacity_per_day || 0) * 10).toFixed(1)} Qtl/day) • 🏢 Mandi Total: {parseFloat(counter?.mandi?.capacity || summary?.mandi_capacity || 0).toFixed(2)} MT/day
                            </div>
                        </div>

                        <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Total Scheduled Today
                            </span>
                            <strong style={{ fontSize: "1.15rem", color: "var(--text-main)" }}>
                                {totalDayQty.toFixed(2)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>quintals</span>
                            </strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                👥 {totalFarmersCount} farmers arriving
                            </div>
                        </div>

                        <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--success)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Procured (Completed)
                            </span>
                            <strong style={{ fontSize: "1.15rem", color: "var(--success)" }}>
                                {completedQty.toFixed(2)} <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 500 }}>quintals</span>
                            </strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "2px" }}>
                                ✓ {completedFarmersCount} farmers completed
                            </div>
                        </div>

                        <div style={{ background: "#fffbeb", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--warning)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Remaining to Procure
                            </span>
                            <strong style={{ fontSize: "1.15rem", color: "var(--warning)" }}>
                                {remainingQty.toFixed(2)} <span style={{ fontSize: "0.8rem", color: "var(--warning)", fontWeight: 500 }}>quintals</span>
                            </strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--warning)", marginTop: "2px" }}>
                                ⏳ {remainingFarmersCount} farmers remaining today
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>
                            Procurement Progress ({selectedDate}):
                        </span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                            {completedQty.toFixed(2)} / {totalDayQty.toFixed(2)} quintals ({completionPercent}%) • Counter Capacity: {parseFloat(counter?.capacity_per_day || 0).toFixed(2)} MT ({(parseFloat(counter?.capacity_per_day || 0) * 10).toFixed(1)} Qtl)
                        </span>
                    </div>

                    <div className="progress-bar" style={{ height: "8px" }}>
                        <div 
                            className="progress-fill" 
                            style={{ 
                                width: `${completionPercent}%`,
                                backgroundColor: "var(--primary)"
                            }} 
                        />
                    </div>
                </div>
            </div>

            {/* 7-Day Window Date Selector Bar */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <CalendarDays size={16} color="var(--primary)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        Select Service Date (7-Day Permitted Window):
                    </span>
                </div>

                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                    {dates.map((d) => {
                        const isSelected = selectedDate === d.dateStr;
                        return (
                            <button
                                key={d.dateStr}
                                type="button"
                                onClick={() => setSelectedDate(d.dateStr)}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "8px",
                                    border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                    backgroundColor: isSelected ? "var(--primary-light)" : "#ffffff",
                                    color: isSelected ? "var(--primary)" : "var(--text-main)",
                                    fontWeight: isSelected ? 700 : 500,
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    minWidth: "75px",
                                    flexShrink: 0
                                }}
                            >
                                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", opacity: 0.8 }}>
                                    {d.isToday ? "Today" : d.dayName}
                                </span>
                                <span style={{ fontSize: "0.95rem" }}>
                                    {d.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ========================================================
                HERO BANNER: ONGOING FARMER AT DESK (PROCESSING, ARRIVED, CALLED)
               ======================================================== */}
            {ongoingToken && !isFutureDate && (
                <div className="card" style={{ 
                    marginBottom: "20px", 
                    backgroundColor: ongoingToken.token_status === "PROCESSING" ? "#f0f9ff" : (ongoingToken.token_status === "ARRIVED" ? "#f0fdf4" : "#fffbeb"),
                    borderColor: ongoingToken.token_status === "PROCESSING" ? "#bae6fd" : (ongoingToken.token_status === "ARRIVED" ? "#bbf7d0" : "#fde68a"),
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    {ongoingToken.token_status === "PROCESSING" ? "⚡ WEIGHING & INSPECTION IN PROGRESS" : (ongoingToken.token_status === "ARRIVED" ? "🟢 FARMER REPORTED AT DESK" : "🔔 FARMER CALLED — WAITING FOR REPORT")}
                                </span>
                                <span className={`badge badge-${ongoingToken.token_status.toLowerCase()}`}>
                                    {ongoingToken.token_status}
                                </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                                    {ongoingToken.token_number}
                                </h3>
                                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)" }}>
                                    {ongoingToken.farmer_name}
                                </span>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                    (ID: #{ongoingToken.farmer_id} • 📱 {ongoingToken.farmer_mobile})
                                </span>
                            </div>

                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                🌾 Crop: <strong>{ongoingToken.crop_name}</strong> • 
                                Approved: <strong>{Number(ongoingToken.quantity_approved).toFixed(2)} quintals</strong> •
                                Slot Time: <strong>{formatIndianTime(ongoingToken.booking_time)}</strong>
                            </div>
                        </div>

                        {/* Direct action triggers for the ongoing farmer */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {ongoingToken.token_status === "CALLED" && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleArrive(ongoingToken.token_id, ongoingToken.token_number)}
                                        disabled={!isCounterActive || actionLoading}
                                    >
                                        <UserCheck size={16} /> 
                                        <span>Mark Arrived</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                                        onClick={() => confirmNotArrived(ongoingToken)}
                                        disabled={!isCounterActive || actionLoading}
                                    >
                                        <XCircle size={16} /> 
                                        <span>No Show</span>
                                    </button>
                                </>
                            )}

                            {ongoingToken.token_status === "ARRIVED" && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handleStartProcessing(ongoingToken.token_id, ongoingToken.token_number)}
                                    disabled={!isCounterActive || actionLoading}
                                    style={{ padding: "10px 18px" }}
                                >
                                    <Play size={16} /> 
                                    <span>Start Weighing / Processing</span>
                                </button>
                            )}

                            {ongoingToken.token_status === "PROCESSING" && (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => confirmComplete(ongoingToken)}
                                    disabled={!isCounterActive || actionLoading}
                                    style={{ padding: "10px 18px" }}
                                >
                                    <Check size={16} /> 
                                    <span>Complete Sale & Generate Payment</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Queue Table Card */}
            <div className="card">
                {/* Card Controls Header: Title, Search Bar, and Filter Tabs */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Layers size={18} color="var(--primary)" />
                        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                            Queue for {selectedDate} ({totalCount} Farmers)
                        </span>
                    </div>

                    {/* Search Bar: Search by token number or farmer name */}
                    <div style={{ position: "relative", minWidth: "280px", flex: "1 1 300px", maxWidth: "400px" }}>
                        <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            placeholder="Search by token (e.g. TK-1012-005)..."
                            value={searchToken}
                            onChange={handleSearchChange}
                            style={{
                                width: "100%",
                                padding: "8px 30px 8px 32px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                fontSize: "0.85rem",
                                outline: "none",
                                background: "#f8fafc"
                            }}
                        />
                        {searchToken && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                style={{
                                    position: "absolute",
                                    right: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--text-muted)",
                                    display: "flex"
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs: Active Queue (Default - hides completed/no-show), Completed, No-Show, All */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "14px", overflowX: "auto" }}>
                    <button
                        type="button"
                        onClick={() => setFilterTab("active")}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: filterTab === "active" ? "1px solid var(--primary)" : "1px solid var(--border)",
                            backgroundColor: filterTab === "active" ? "var(--primary-light)" : "#ffffff",
                            color: filterTab === "active" ? "var(--primary-dark)" : "var(--text-muted)",
                            fontWeight: filterTab === "active" ? 700 : 500,
                            fontSize: "0.825rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                        }}
                    >
                        🟢 Active Queue (Ongoing & Waiting)
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilterTab("completed")}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: filterTab === "completed" ? "1px solid var(--success)" : "1px solid var(--border)",
                            backgroundColor: filterTab === "completed" ? "var(--success-light)" : "#ffffff",
                            color: filterTab === "completed" ? "var(--success)" : "var(--text-muted)",
                            fontWeight: filterTab === "completed" ? 700 : 500,
                            fontSize: "0.825rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                        }}
                    >
                        ✓ Completed ({summary?.counts?.completed || 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilterTab("no_show")}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: filterTab === "no_show" ? "1px solid var(--danger)" : "1px solid var(--border)",
                            backgroundColor: filterTab === "no_show" ? "var(--danger-light)" : "#ffffff",
                            color: filterTab === "no_show" ? "var(--danger)" : "var(--text-muted)",
                            fontWeight: filterTab === "no_show" ? 700 : 500,
                            fontSize: "0.825rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                        }}
                    >
                        ✕ No-Show ({summary?.counts?.not_arrived || 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => setFilterTab("all")}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "20px",
                            border: filterTab === "all" ? "1px solid var(--text-main)" : "1px solid var(--border)",
                            backgroundColor: filterTab === "all" ? "#f1f5f9" : "#ffffff",
                            color: filterTab === "all" ? "var(--text-main)" : "var(--text-muted)",
                            fontWeight: filterTab === "all" ? 700 : 500,
                            fontSize: "0.825rem",
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                        }}
                    >
                        📋 All Records ({totalFarmersCount})
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px auto" }} />
                        <p style={{ fontSize: "0.9rem" }}>Loading queue bookings for {selectedDate}...</p>
                    </div>
                ) : queue.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        <Calendar size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                        <h4 style={{ fontSize: "1rem", color: "var(--text-main)" }}>No Farmers Found</h4>
                        <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                            {searchToken 
                                ? `No tokens matching "${searchToken}" in this view.` 
                                : `There are no ${filterTab === "active" ? "active waiting/ongoing" : filterTab} farmers for ${selectedDate}.`}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "60px" }}>Pos</th>
                                    <th>Token</th>
                                    <th>Farmer</th>
                                    <th>Crop</th>
                                    <th>Quantity</th>
                                    <th>Slot Time</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.map((item, index) => {
                                    const isCalled = item.token_status === "CALLED";
                                    const isProcessing = item.token_status === "PROCESSING";
                                    const isArrived = item.token_status === "ARRIVED";
                                    const isOngoing = isProcessing || isArrived || isCalled;
                                    const statusLower = item.token_status.toLowerCase().replace(/_/g, "");

                                    return (
                                        <tr 
                                            key={item.token_id}
                                            style={{
                                                backgroundColor: isProcessing ? "#f0f9ff" : (isArrived ? "#f0fdf4" : (isCalled ? "#fffbeb" : "inherit")),
                                                fontWeight: isOngoing ? 600 : "normal"
                                            }}
                                        >
                                            <td style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                                                #{item.queue_position}
                                            </td>

                                            <td>
                                                <div style={{ 
                                                    fontWeight: 700, 
                                                    fontSize: "0.95rem",
                                                    color: isProcessing ? "#0284c7" : (isArrived ? "var(--success)" : (isCalled ? "#d97706" : "var(--primary)")),
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}>
                                                    {item.token_number}
                                                    {isOngoing && <span style={{ fontSize: "0.7rem", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#e0f2fe", color: "#0369a1" }}>Ongoing</span>}
                                                </div>
                                            </td>

                                            <td>
                                                <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                                                    {item.farmer_name}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                    ID: #{item.farmer_id} • 📱 {item.farmer_mobile}
                                                </div>
                                            </td>

                                            <td>
                                                <span style={{ fontWeight: 500 }}>{item.crop_name}</span>
                                            </td>

                                            <td>
                                                <strong style={{ fontSize: "0.925rem" }}>{Number(item.quantity_approved).toFixed(2)} q</strong>
                                            </td>

                                            <td style={{ fontSize: "0.825rem" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--text-main)", fontWeight: 600 }}>
                                                        <Clock size={12} />
                                                        {item.slot_timing?.timeStr || formatIndianTime(item.booking_time)}
                                                    </span>
                                                    {item.slot_timing && (
                                                        (isFutureDate || item.is_today === false || item.slot_timing.isUpcoming) ? (
                                                            <span style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 600 }}>
                                                                🗓️ Upcoming ({item.slot_timing.remainingLabel || (item.slot_timing.daysUntilSlot ? `${item.slot_timing.daysUntilSlot}d` : 'Future')})
                                                            </span>
                                                        ) : item.slot_timing.isSlotActive ? (
                                                            <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 700 }}>
                                                                ● In Slot (Active)
                                                            </span>
                                                        ) : item.slot_timing.isBeforeSlot ? (
                                                            <span style={{ fontSize: "0.7rem", color: "#d97706", fontWeight: 500 }}>
                                                                ⏰ In {item.slot_timing.minutesUntilSlot}m
                                                            </span>
                                                        ) : item.slot_timing.isPastSlot ? (
                                                            <span style={{ fontSize: "0.7rem", color: "#dc2626", fontWeight: 500 }}>
                                                                ⚠️ Passed (+{item.slot_timing.minutesPastSlot}m)
                                                            </span>
                                                        ) : null
                                                    )}
                                                    {item.early_request_status === "ACCEPTED" && (
                                                        <span style={{ fontSize: "0.68rem", color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 5px", borderRadius: "3px", fontWeight: 600, display: "inline-block", width: "fit-content" }}>
                                                            ✓ Early Accepted
                                                        </span>
                                                    )}
                                                    {item.early_request_status === "PENDING" && (
                                                        <span style={{ fontSize: "0.68rem", color: "#b45309", backgroundColor: "#fef3c7", padding: "1px 5px", borderRadius: "3px", fontWeight: 500, display: "inline-block", width: "fit-content" }}>
                                                            ⏳ Early Pending
                                                        </span>
                                                    )}
                                                    {item.early_request_status === "DECLINED" && (
                                                        <span style={{ fontSize: "0.68rem", color: "#b91c1c", backgroundColor: "#fee2e2", padding: "1px 5px", borderRadius: "3px", fontWeight: 500, display: "inline-block", width: "fit-content" }}>
                                                            ✕ Early Declined
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <span className={`badge badge-${statusLower}`}>
                                                    {item.token_status}
                                                </span>
                                            </td>

                                            <td style={{ textAlign: "right" }}>
                                                {isFutureDate ? (
                                                    <span style={{ 
                                                        fontSize: "0.8rem", 
                                                        color: "var(--text-muted)", 
                                                        fontStyle: "italic", 
                                                        display: "inline-flex", 
                                                        alignItems: "center", 
                                                        gap: "5px",
                                                        backgroundColor: "#f1f5f9",
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        border: "1px solid #e2e8f0"
                                                    }}>
                                                        📅 Scheduled (View Only)
                                                    </span>
                                                ) : (
                                                    <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                                        {/* Current Farmer Action: CALLED -> Mark Arrived & No-Show */}
                                                        {item.token_status === "CALLED" && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => handleArrive(item.token_id, item.token_number)}
                                                                    disabled={!isCounterActive || actionLoading}
                                                                    title="Mark farmer arrived at counter"
                                                                >
                                                                    <UserCheck size={14} /> 
                                                                    <span>Arrive</span>
                                                                </button>

                                                                {item.can_mark_not_arrived && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline btn-sm"
                                                                        style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                                                                        onClick={() => confirmNotArrived(item)}
                                                                        disabled={!isCounterActive || actionLoading}
                                                                        title="Mark farmer not arrived"
                                                                    >
                                                                        <XCircle size={14} /> 
                                                                        <span>No Show</span>
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Current Farmer Action: ARRIVED -> Start Processing */}
                                                        {item.token_status === "ARRIVED" && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleStartProcessing(item.token_id, item.token_number)}
                                                                disabled={!isCounterActive || actionLoading}
                                                                title="Start weighing and quality check"
                                                            >
                                                                <Play size={14} /> 
                                                                <span>Start Process</span>
                                                            </button>
                                                        )}

                                                        {/* Current Farmer Action: PROCESSING -> Complete Sale */}
                                                        {item.token_status === "PROCESSING" && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-success btn-sm"
                                                                onClick={() => confirmComplete(item)}
                                                                disabled={!isCounterActive || actionLoading}
                                                                title="Finalize sale and generate payment record"
                                                            >
                                                                <Check size={14} /> 
                                                                <span>Complete Sale</span>
                                                            </button>
                                                        )}

                                                        {/* Waiting Farmers Actions: Call, Request Early, or No Show */}
                                                        {item.token_status === "WAITING" && (
                                                            <>
                                                                {item.can_call && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary btn-sm"
                                                                        style={{ 
                                                                            backgroundColor: item.early_request_status === "ACCEPTED" ? "#16a34a" : undefined,
                                                                            borderColor: item.early_request_status === "ACCEPTED" ? "#15803d" : undefined
                                                                        }}
                                                                        onClick={() => handleCallFarmer(item.token_id, item.token_number, item.farmer_name)}
                                                                        disabled={!isCounterActive || actionLoading}
                                                                        title={item.early_request_status === "ACCEPTED" ? "Farmer accepted early arrival — proceed to call" : "Call farmer for procurement"}
                                                                    >
                                                                        <PhoneCall size={13} />
                                                                        <span>{item.early_request_status === "ACCEPTED" ? "Call (Early Accepted)" : "Call Farmer"}</span>
                                                                    </button>
                                                                )}

                                                                {item.can_request_early && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline btn-sm"
                                                                        style={{ color: "#b45309", borderColor: "#fde68a", backgroundColor: "#fffbeb" }}
                                                                        onClick={() => handleRequestEarly(item.token_id, item.token_number, item.farmer_name, item.slot_timing?.timeStr)}
                                                                        disabled={!isCounterActive || actionLoading}
                                                                        title="Ask farmer if they can arrive before scheduled slot"
                                                                    >
                                                                        <Clock size={13} />
                                                                        <span>Request Early</span>
                                                                    </button>
                                                                )}

                                                                {item.early_request_status === "PENDING" && (
                                                                    <span style={{ 
                                                                        fontSize: "0.75rem", 
                                                                        color: "#b45309", 
                                                                        backgroundColor: "#fef3c7", 
                                                                        padding: "4px 8px", 
                                                                        borderRadius: "6px", 
                                                                        border: "1px solid #fde68a",
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "4px"
                                                                    }}>
                                                                        ⏳ Awaiting Farmer
                                                                    </span>
                                                                )}

                                                                {item.can_mark_not_arrived && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline btn-sm"
                                                                        style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                                                                        onClick={() => confirmNotArrived(item)}
                                                                        disabled={!isCounterActive || actionLoading}
                                                                        title="Mark as no-show (slot time has passed)"
                                                                    >
                                                                        <XCircle size={13} />
                                                                        <span>No Show</span>
                                                                    </button>
                                                                )}

                                                                {!item.can_call && !item.can_request_early && item.early_request_status !== "PENDING" && !item.can_mark_not_arrived && (
                                                                    <span style={{ 
                                                                        fontSize: "0.78rem", 
                                                                        color: "var(--text-muted)", 
                                                                        backgroundColor: "#f8fafc", 
                                                                        padding: "4px 8px", 
                                                                        borderRadius: "6px", 
                                                                        border: "1px solid var(--border)",
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "4px"
                                                                    }}>
                                                                        ⏳ Scheduled ({item.slot_timing?.timeStr || "Upcoming"})
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* NOT_ARRIVED: No-show tag */}
                                                        {item.token_status === "NOT_ARRIVED" && (
                                                            <span style={{ fontSize: "0.8rem", color: "var(--danger)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                                                ✕ No-Show
                                                            </span>
                                                        )}

                                                        {/* COMPLETED: Processed Badge */}
                                                        {item.token_status === "COMPLETED" && (
                                                            <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                                ✓ Completed
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Progressive Infinite Scroll Sentinel / Load More Indicator */}
                {!loading && (
                    <div ref={loadMoreRef} style={{ textAlign: "center", padding: "18px 10px" }}>
                        {loadingMore ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--primary)" }}>
                                <RefreshCw size={18} className="spin" />
                                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Loading more farmers for {selectedDate}...</span>
                            </div>
                        ) : hasMore ? (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => loadQueue(page + 1, true, searchToken)}
                                disabled={loadingMore}
                            >
                                Load More Farmers ({queue.length} of {totalCount})
                            </button>
                        ) : queue.length > 0 ? (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                ✓ All {queue.length} farmers loaded for {selectedDate}
                            </span>
                        ) : null}
                    </div>
                )}
            </div>

            {/* ========================================================
                CONFIRMATION DIALOG MODAL (WITH LIVE PAYABLE PREVIEW)
               ======================================================== */}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                details={confirmState.details}
                confirmText={confirmState.confirmText}
                confirmVariant={confirmState.confirmVariant}
                loading={actionLoading}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            >
                {/* Optional Quality Grade selection with Real-Time Amount Preview */}
                {confirmState.isCompleteAction && activeCompleteItem && completePreview && (
                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                        <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", marginBottom: "10px", fontSize: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "var(--text-muted)" }}>🏛️ {completePreview.stateName} Quota:</span>
                            <strong style={{ color: "var(--primary)" }}>MSP: ₹{completePreview.msp.toFixed(2)}/q • LSP: ₹{completePreview.lsp.toFixed(2)}/q</strong>
                        </div>

                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                            Crop Quality Grade (Calculates Procurement Rate):
                        </label>
                        <select 
                            value={qualityGrade}
                            onChange={(e) => {
                                setQualityGrade(e.target.value);
                                qualityGradeRef.current = e.target.value;
                            }}
                            style={{ 
                                width: "100%", 
                                padding: "8px 10px", 
                                borderRadius: "6px", 
                                border: "1px solid var(--border)",
                                fontSize: "0.85rem",
                                background: "#ffffff"
                            }}
                        >
                            <option value="A">Grade A — Premium Quality (100% MSP Rate: ₹{completePreview.msp}/q)</option>
                            <option value="B">Grade B — Standard Quality (Midpoint Rate: ₹{((completePreview.lsp + completePreview.msp) / 2).toFixed(2)}/q)</option>
                            <option value="C">Grade C — Base Quality (LSP Floor Rate: ₹{completePreview.lsp}/q)</option>
                        </select>

                        {/* Live Payout Amount Preview Box */}
                        <div style={{ 
                            marginTop: "12px", 
                            background: "#ecfdf5", 
                            border: "1px solid #a7f3d0", 
                            borderRadius: "8px", 
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "#065f46", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                                    Total Payout to Farmer
                                </span>
                                <div style={{ fontSize: "0.8rem", color: "#047857" }}>
                                    Rate: ₹{completePreview.rate}/q × {activeCompleteItem.quantity_approved} quintals
                                </div>
                            </div>
                            <strong style={{ fontSize: "1.25rem", color: "#047857" }}>
                                ₹{completePreview.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                        </div>
                    </div>
                )}
            </ConfirmModal>

            {/* ========================================================
                PAYOUT COMPLETION RECEIPT MODAL (EXPLICIT AMOUNT TO FARMER)
               ======================================================== */}
            {payoutModalData && (
                <div className="modal-overlay" onClick={() => setPayoutModalData(null)}>
                    <div 
                        className="modal-content" 
                        style={{ maxWidth: "480px", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ margin: "10px auto 14px auto", width: "56px", height: "56px", borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                            <CheckCircle2 size={36} />
                        </div>

                        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                            Procurement Completed!
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                            Sale finalized and payment voucher successfully generated for government treasury disbursement.
                        </p>

                        {/* Highlighted Amount Box */}
                        <div style={{ 
                            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", 
                            border: "1px solid #a7f3d0", 
                            borderRadius: "12px", 
                            padding: "16px",
                            marginBottom: "16px"
                        }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                                Total Amount Payable to Farmer
                            </span>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#047857", marginTop: "4px" }}>
                                ₹{Number(payoutModalData.total_payable_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Payout Details Breakdown */}
                        <div style={{ 
                            background: "#f8fafc", 
                            border: "1px solid var(--border)", 
                            borderRadius: "8px", 
                            padding: "12px", 
                            fontSize: "0.85rem", 
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            marginBottom: "20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Farmer:</span>
                                <strong>{payoutModalData.farmer_name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Token Number:</span>
                                <strong>{payoutModalData.token_number}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Crop:</span>
                                <strong>{payoutModalData.crop_name}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Quantity Procured:</span>
                                <strong>{Number(payoutModalData.quantity_sold).toFixed(2)} quintals</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Applied Rate:</span>
                                <strong>₹{payoutModalData.rate_per_unit} / quintal (Grade {payoutModalData.quality_grade})</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Voucher Status:</span>
                                <span className="badge badge-warning">PENDING DISBURSEMENT</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary"
                            style={{ width: "100%", padding: "10px" }}
                            onClick={() => setPayoutModalData(null)}
                        >
                            Acknowledge & Continue Queue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
