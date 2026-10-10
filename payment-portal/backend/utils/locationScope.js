/**
 * Centralized Location Scope and State Isolation Utility
 * 
 * Enforces strict state isolation on all SQL queries and validates
 * that requested district and tehsil filters legitimately belong to the
 * authenticated user's assigned state.
 */

/**
 * Injects state, district, and tehsil filters into a SQL query string
 * while strictly positioning values before any trailing LIMIT/OFFSET placeholders.
 * 
 * @param {string} query - Base SQL query
 * @param {Array} values - Base query values
 * @param {Object} userScope - Authenticated user's scope { state_id }
 * @param {Object} filters - Optional filters { district_id, tehsil_id }
 * @param {Object} columnConfig - Column mapping { stateCol, districtCol, tehsilCol }
 * @returns {Object} { query: string, values: Array }
 */
function applyPaymentLocationScope(query, values = [], userScope, filters = {}, columnConfig = {}) {
    if (!userScope || userScope.state_id === undefined || userScope.state_id === null) {
        throw new Error("Missing state_id in authenticated user scope");
    }

    const stateCol = columnConfig.stateCol || "f.state_id";
    const districtCol = columnConfig.districtCol || "f.district_id";
    const tehsilCol = columnConfig.tehsilCol || "f.tehsil_id";

    const conditions = [];
    const locationValues = [];

    // Rule 1: State Isolation (MANDATORY on every query)
    conditions.push(`${stateCol} = ?`);
    locationValues.push(Number(userScope.state_id));

    // Rule 2: District Filter (Optional, applied only within allowed state)
    if (filters.district_id !== undefined && filters.district_id !== null && String(filters.district_id).trim() !== "") {
        conditions.push(`${districtCol} = ?`);
        locationValues.push(Number(filters.district_id));
    }

    // Rule 3: Tehsil Filter (Optional, applied only within allowed district)
    if (filters.tehsil_id !== undefined && filters.tehsil_id !== null && String(filters.tehsil_id).trim() !== "") {
        conditions.push(`${tehsilCol} = ?`);
        locationValues.push(Number(filters.tehsil_id));
    }

    // Identify trailing clauses (ORDER BY, LIMIT, OFFSET, GROUP BY)
    const trailingRegex = /\s+(ORDER\s+BY|LIMIT|GROUP\s+BY|HAVING)\b[\s\S]*$/i;
    const trailingMatch = query.match(trailingRegex);

    let prefix;
    let suffix;

    if (trailingMatch) {
        prefix = query.slice(0, trailingMatch.index);
        suffix = query.slice(trailingMatch.index);
    } else {
        prefix = query;
        suffix = "";
    }

    const hasWhere = /\bWHERE\b/i.test(prefix);
    const conditionsClause = conditions.join(" AND ");

    if (hasWhere) {
        prefix = `${prefix} AND ${conditionsClause}`;
    } else {
        prefix = `${prefix} WHERE ${conditionsClause}`;
    }

    const modifiedQuery = `${prefix}${suffix}`;

    // Manage parameter order if suffix has placeholders (e.g. LIMIT ? OFFSET ?)
    const suffixPlaceholders = suffix.match(/\?/g);
    const suffixCount = suffixPlaceholders ? suffixPlaceholders.length : 0;

    let modifiedValues;
    if (suffixCount > 0 && values.length >= suffixCount) {
        const prefixValues = values.slice(0, values.length - suffixCount);
        const suffixValues = values.slice(values.length - suffixCount);
        modifiedValues = [...prefixValues, ...locationValues, ...suffixValues];
    } else {
        modifiedValues = [...values, ...locationValues];
    }

    return {
        query: modifiedQuery,
        values: modifiedValues
    };
}

/**
 * Validates whether a district belongs to the user's state.
 */
async function validateDistrictInState(districtId, stateId, db) {
    if (!districtId) return true;
    const [rows] = await db.query(
        "SELECT district_id FROM district WHERE district_id = ? AND state_id = ?",
        [Number(districtId), Number(stateId)]
    );
    return rows.length > 0;
}

/**
 * Validates whether a tehsil belongs to a given district and state.
 */
async function validateTehsilInDistrict(tehsilId, districtId, stateId, db) {
    if (!tehsilId) return true;
    let sql = `
        SELECT t.tehsil_id 
        FROM tehsil t 
        JOIN district d ON t.district_id = d.district_id 
        WHERE t.tehsil_id = ? AND d.state_id = ?
    `;
    const params = [Number(tehsilId), Number(stateId)];

    if (districtId) {
        sql += " AND t.district_id = ?";
        params.push(Number(districtId));
    }

    const [rows] = await db.query(sql, params);
    return rows.length > 0;
}

module.exports = {
    applyPaymentLocationScope,
    validateDistrictInState,
    validateTehsilInDistrict
};
