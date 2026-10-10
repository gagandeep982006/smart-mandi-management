import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import PaymentFilters from "./PaymentFilters";
import PaymentTable from "./PaymentTable";
import Pagination from "../common/Pagination";
import PaymentDetailsModal from "./PaymentDetailsModal";
import PaymentActionModal from "./PaymentActionModal";
import LoadingSpinner from "../common/LoadingSpinner";

export default function PaymentListPage({ status, title, subtitle }) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters state
    const [filters, setFilters] = useState({
        search: searchParams.get("search") || "",
        district_id: searchParams.get("district_id") || "",
        tehsil_id: searchParams.get("tehsil_id") || ""
    });

    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [limit, setLimit] = useState(Number(searchParams.get("limit")) || 10);

    const [payments, setPayments] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Modal states
    const [selectedPaymentId, setSelectedPaymentId] = useState(null);
    const [actionState, setActionState] = useState({
        isOpen: false,
        payment: null,
        actionType: null
    });

    // Fetch payments based on status and filters
    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (status) params.append("status", status);
            params.append("page", page);
            params.append("limit", limit);
            if (filters.search) params.append("search", filters.search);
            if (filters.district_id) params.append("district_id", filters.district_id);
            if (filters.tehsil_id) params.append("tehsil_id", filters.tehsil_id);

            const res = await apiRequest(`/payments?${params.toString()}`);
            if (res.success) {
                setPayments(res.data || []);
                setPagination(res.pagination || null);
            } else {
                setError(res.message || "Failed to load payments");
            }
        } catch (err) {
            setError(err.message || "Failed to retrieve payment records");
        } finally {
            setLoading(false);
        }
    }, [status, page, limit, filters]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // Handle filter update (resets page to 1)
    const handleFilterChange = (newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPage(1);
    };

    // Handle clear filters
    const handleClearFilters = () => {
        setFilters({ search: "", district_id: "", tehsil_id: "" });
        setPage(1);
    };

    // Open detail modal
    const handleViewDetails = (paymentId) => {
        setSelectedPaymentId(paymentId);
    };

    // Open action modal
    const handleAction = (payment, actionType) => {
        setActionState({
            isOpen: true,
            payment,
            actionType
        });
    };

    // Handle action success
    const handleActionSuccess = (msg) => {
        setSuccessMessage(msg);
        fetchPayments();
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">{title}</h1>
                <p className="page-subtitle">{subtitle}</p>
            </div>

            {/* Success Alert Banner */}
            {successMessage && (
                <div className="alert alert-success">
                    <span>✓ {successMessage}</span>
                </div>
            )}

            {/* Error Alert Banner */}
            {error && (
                <div className="alert alert-danger">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Filter Bar */}
            <PaymentFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />

            {/* Data Table */}
            {loading ? (
                <div className="table-container">
                    <LoadingSpinner text={`Loading ${title.toLowerCase()}...`} size={30} />
                </div>
            ) : (
                <>
                    <PaymentTable
                        payments={payments}
                        onViewDetails={handleViewDetails}
                        onAction={handleAction}
                    />

                    {/* Pagination */}
                    {pagination && pagination.totalRecords > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={(newPage) => setPage(newPage)}
                            onLimitChange={(newLimit) => {
                                setLimit(newLimit);
                                setPage(1);
                            }}
                        />
                    )}
                </>
            )}

            {/* Details Modal */}
            <PaymentDetailsModal
                paymentId={selectedPaymentId}
                isOpen={Boolean(selectedPaymentId)}
                onClose={() => setSelectedPaymentId(null)}
            />

            {/* Action Transition Modal */}
            <PaymentActionModal
                isOpen={actionState.isOpen}
                payment={actionState.payment}
                actionType={actionState.actionType}
                onClose={() => setActionState({ isOpen: false, payment: null, actionType: null })}
                onSuccess={handleActionSuccess}
            />
        </div>
    );
}
