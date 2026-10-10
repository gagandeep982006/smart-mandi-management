# Authorization & Access Control Models

The platform combines three complementary authorization paradigms to enforce defense-in-depth across administrative, operational, and geographical boundaries.

---

## 1. The Three Access Control Layers

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Role-Based Access Control (RBAC)                            │
│    Assigns coarse personas: admin, dba, operator, officer       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Permission-Based Access Control (PBAC)                      │
│    Granular capability flags: ["read", "write", "update", "delete"] │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Location-Based Access Control (LBAC)                        │
│    Dynamic geographic boundaries: State -> District -> Tehsil   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based & Permission-Based Middleware (`requirePermission`)

Every authenticated route can protect endpoints using the `requirePermission(requiredAction)` middleware:

```javascript
// Middleware Usage Example (Government & Mandi)
router.post("/counters", 
    authenticateToken, 
    requirePermission("write"), 
    createCounter
);

router.delete("/counters/:id", 
    authenticateToken, 
    requirePermission("delete"), 
    deleteCounter
);
```

### Evaluation Logic:
1. `req.user.permissions` is parsed from the JWT cookie payload or user row.
2. If `req.user.role === "admin"` or `req.user.role === "dba"`, full administrative access is granted.
3. Otherwise, the array must contain the specific action (`"read"`, `"write"`, `"update"`, or `"delete"`). If missing, an HTTP `403 Forbidden` response is returned immediately.

---

## 3. Location-Based Access Control (LBAC)

To prevent officers from one state or district from inspecting or modifying records belonging to another jurisdiction, the system implements dynamic SQL query rewriting:

### Resolution (`loadUserScope`):
Extracts `state_id`, `district_id`, and `tehsil_id` from the officer's JWT token and attaches them to `req.userScope`.

### Dynamic Query Scoping (`applyLocationScope`):
```javascript
// utils/locationScope.js
const { query, values } = applyLocationScope(
    baseQuery,
    [mandiId],
    req.userScope,
    {
        stateColumn: "d.state_id",
        districtColumn: "d.district_id",
        tehsilColumn: "m.tehsil_id"
    }
);
const [rows] = await readDb.query(query, values);
```

- If `tehsil_id` is defined &rarr; Appends `AND m.tehsil_id = ?`.
- If `district_id` is defined &rarr; Appends `AND d.district_id = ?`.
- If `state_id` is defined &rarr; Appends `AND d.state_id = ?`.
- If all are null (National Admin / System DBA) &rarr; No location filter appended.
