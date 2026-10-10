import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { apiRequest } from "../../api/client";

export default function PaymentFilters({
    filters,
    onFilterChange,
    onClearFilters
}) {
    const [districts, setDistricts] = useState([]);
    const [tehsils, setTehsils] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Fetch districts in user's state
    useEffect(() => {
        let isMounted = true;
        async function fetchDistricts() {
            setLoadingLocations(true);
            try {
                const res = await apiRequest("/locations/districts");
                if (res.success && isMounted) {
                    setDistricts(res.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch districts:", err);
            } finally {
                if (isMounted) setLoadingLocations(false);
            }
        }
        fetchDistricts();
        return () => { isMounted = false; };
    }, []);

    // Fetch tehsils when selected district changes
    useEffect(() => {
        let isMounted = true;
        async function fetchTehsils() {
            if (!filters.district_id) {
                setTehsils([]);
                return;
            }
            try {
                const res = await apiRequest(`/locations/tehsils?district_id=${filters.district_id}`);
                if (res.success && isMounted) {
                    setTehsils(res.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch tehsils:", err);
            }
        }
        fetchTehsils();
        return () => { isMounted = false; };
    }, [filters.district_id]);

    const handleDistrictChange = (e) => {
        const districtId = e.target.value;
        onFilterChange({
            district_id: districtId,
            tehsil_id: "" // Reset tehsil when district changes
        });
    };

    const hasActiveFilters = Boolean(filters.search || filters.district_id || filters.tehsil_id);

    return (
        <div className="filter-bar">
            {/* Payment ID Search */}
            <div className="filter-item search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search by Payment ID..."
                    value={filters.search || ""}
                    onChange={(e) => onFilterChange({ search: e.target.value })}
                />
            </div>

            {/* District Filter */}
            <div className="filter-item">
                <select
                    className="form-control"
                    value={filters.district_id || ""}
                    onChange={handleDistrictChange}
                    style={{ minWidth: "180px" }}
                    disabled={loadingLocations}
                >
                    <option value="">All Districts</option>
                    {districts.map((d) => (
                        <option key={d.district_id} value={d.district_id}>
                            {d.district_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tehsil Filter */}
            <div className="filter-item">
                <select
                    className="form-control"
                    value={filters.tehsil_id || ""}
                    onChange={(e) => onFilterChange({ tehsil_id: e.target.value })}
                    style={{ minWidth: "180px" }}
                    disabled={!filters.district_id || tehsils.length === 0}
                >
                    <option value="">All Tehsils</option>
                    {tehsils.map((t) => (
                        <option key={t.tehsil_id} value={t.tehsil_id}>
                            {t.tehsil_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={onClearFilters}
                    style={{ gap: "4px" }}
                    title="Reset all filters"
                >
                    <RotateCcw size={14} />
                    <span>Clear Filters</span>
                </button>
            )}
        </div>
    );
}
