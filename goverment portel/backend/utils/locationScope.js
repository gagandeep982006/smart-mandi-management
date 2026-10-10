let locationFilteringEnabled = true;
function setLocationFilteringEnabled(enabled) {
    locationFilteringEnabled = Boolean(enabled);
}
function isLocationFilteringEnabled() {
    return locationFilteringEnabled;
}
function applyLocationScope(queryOrOptions, valuesArg = [], userScopeArg = null, locationConfigArg = {}) {
    let query;
    let values;
    let userScope;
    let locationConfig;

    if (queryOrOptions && typeof queryOrOptions === "object" && typeof queryOrOptions.query === "string") {
        query = queryOrOptions.query;
        values = Array.isArray(queryOrOptions.values) ? [...queryOrOptions.values] : [];
        userScope = queryOrOptions.userScope || null;
        locationConfig = queryOrOptions.locationConfig || {};
    } else {
        query = typeof queryOrOptions === "string" ? queryOrOptions : "";
        values = Array.isArray(valuesArg) ? [...valuesArg] : [];
        userScope = userScopeArg || null;
        locationConfig = locationConfigArg || {};
    }

    // If location filtering is disabled or query is empty, return unmodified
    if (!locationFilteringEnabled || !query || !userScope) {
        return { query, values };
    }

    const { state_id, district_id, tehsil_id } = userScope;

    // Global admin (all null): no location restrictions
    if (state_id === null && district_id === null && tehsil_id === null) {
        return { query, values };
    }

    const stateCol = locationConfig.stateColumn || locationConfig.stateCol;
    const districtCol = locationConfig.districtColumn || locationConfig.districtCol;
    const tehsilCol = locationConfig.tehsilColumn || locationConfig.tehsilCol;

    const conditions = [];
    const locationValues = [];

    // Rule 1: state_id exists -> filter by state
    if (state_id !== null && state_id !== undefined && stateCol) {
        conditions.push(`${stateCol} = ?`);
        locationValues.push(Number(state_id));
    }

    // Rule 2: district_id exists -> filter by district
    if (district_id !== null && district_id !== undefined && districtCol) {
        conditions.push(`${districtCol} = ?`);
        locationValues.push(Number(district_id));
    }

    // Rule 3: tehsil_id exists -> filter by tehsil
    if (tehsil_id !== null && tehsil_id !== undefined && tehsilCol) {
        conditions.push(`${tehsilCol} = ?`);
        locationValues.push(Number(tehsil_id));
    }

    // If no matching columns were specified or no restrictions apply
    if (conditions.length === 0) {
        return { query, values };
    }

    // Identify any trailing clauses (GROUP BY, HAVING, ORDER BY, LIMIT)
    const trailingRegex = /\s+(GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b[\s\S]*$/i;
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

    // Check if prefix already contains a WHERE clause
    const hasWhere = /\bWHERE\b/i.test(prefix);
    const conditionsClause = conditions.join(" AND ");

    if (hasWhere) {
        prefix = `${prefix} AND ${conditionsClause}`;
    } else {
        prefix = `${prefix} WHERE ${conditionsClause}`;
    }

    const modifiedQuery = `${prefix}${suffix}`;

    // Handle parameter positioning: if suffix contains '?' placeholders (e.g. LIMIT ? OFFSET ?),
    // those parameter values must stay at the end of the values array.
    const suffixPlaceholdersMatch = suffix.match(/\?/g);
    const suffixPlaceholderCount = suffixPlaceholdersMatch ? suffixPlaceholdersMatch.length : 0;

    let modifiedValues;
    if (suffixPlaceholderCount > 0 && values.length >= suffixPlaceholderCount) {
        const prefixValues = values.slice(0, values.length - suffixPlaceholderCount);
        const suffixValues = values.slice(values.length - suffixPlaceholderCount);
        modifiedValues = [...prefixValues, ...locationValues, ...suffixValues];
    } else {
        modifiedValues = [...values, ...locationValues];
    }

    return {
        query: modifiedQuery,
        values: modifiedValues
    };
}
function validateLocationInScope(userScope, location = {}) {
    if (!locationFilteringEnabled || !userScope) {
        return { allowed: true };
    }

    if (userScope.state_id !== null && userScope.state_id !== undefined) {
        if (
            location.state_id !== undefined &&
            location.state_id !== null &&
            Number(location.state_id) !== Number(userScope.state_id)
        ) {
            return {
                allowed: false,
                message: `Unauthorized state access. Allowed state_id is ${userScope.state_id}`
            };
        }
    }

    if (userScope.district_id !== null && userScope.district_id !== undefined) {
        if (
            location.district_id !== undefined &&
            location.district_id !== null &&
            Number(location.district_id) !== Number(userScope.district_id)
        ) {
            return {
                allowed: false,
                message: `Unauthorized district access. Allowed district_id is ${userScope.district_id}`
            };
        }
    }

    if (userScope.tehsil_id !== null && userScope.tehsil_id !== undefined) {
        if (
            location.tehsil_id !== undefined &&
            location.tehsil_id !== null &&
            Number(location.tehsil_id) !== Number(userScope.tehsil_id)
        ) {
            return {
                allowed: false,
                message: `Unauthorized tehsil access. Allowed tehsil_id is ${userScope.tehsil_id}`
            };
        }
    }

    return { allowed: true };
}

module.exports = {
    applyLocationScope,
    validateLocationInScope,
    setLocationFilteringEnabled,
    isLocationFilteringEnabled
};
