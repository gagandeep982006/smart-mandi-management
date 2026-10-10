import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
    if (!pagination) return null;

    const { page = 1, limit = 10, totalRecords = 0, totalPages = 1 } = pagination;

    const startIdx = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, totalRecords);

    // Calculate visible page range (up to 5 buttons)
    const getPageNumbers = () => {
        const pages = [];
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, page + 2);

        if (end - start < 4) {
            if (start === 1) {
                end = Math.min(totalPages, start + 4);
            } else if (end === totalPages) {
                start = Math.max(1, end - 4);
            }
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="pagination-wrapper">
            <div className="pagination-info">
                Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of <strong>{totalRecords}</strong> payments
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {onLimitChange && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--gray-600)" }}>
                        <span>Rows per page:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="form-control"
                            style={{ width: "auto", padding: "4px 8px", height: "30px", fontSize: "12px" }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                )}

                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        title="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {getPageNumbers().map((p) => (
                        <button
                            key={p}
                            className={`pagination-btn ${p === page ? "active" : ""}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        className="pagination-btn"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        title="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
