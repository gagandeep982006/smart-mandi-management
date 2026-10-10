# Database Security & SQL Injection Defense

This document details the safeguards implemented to protect the database layer against SQL injection, unauthorized data mutation, and transaction deadlocks.

---

## 1. Parameterized SQL Queries

All database interactions throughout the platform use parameterized SQL statements through `mysql2`:

```javascript
// SECURE: Parameterized Query Pattern
const query = `
    SELECT * FROM farmer 
    WHERE mobile_number = ? AND status = ?
`;
const [rows] = await db.query(query, [mobileNumber, "active"]);
```

- **No String Concatenation**: User inputs are never interpolated directly into SQL query strings (e.g. `SELECT * FROM farmer WHERE id = ${id}` is prohibited).
- **Driver-Level Escaping**: The `mysql2` driver automatically treats parameterized values as literals, neutralizing all classic SQL injection payloads (`' OR '1'='1`, `'; DROP TABLE ...`).

---

## 2. Dynamic Scope Sanitization (`locationScope.js`)

In the Government and Payment portals, dynamic geographical filters are added to queries via `applyLocationScope()`:
- Bound parameters are passed as an array (`values`).
- Appended clauses (`AND m.tehsil_id = ?`) use positional placeholders.
- The input arrays are concatenated safely, preserving parameter order:
  ```javascript
  return {
      query: modifiedQuery,
      values: [...queryParams, ...scopeValues]
  };
  ```

---

## 3. Transaction Boundaries & Concurrency Locks

To prevent race conditions during high-volume appointment bookings and status changes:
- Operations use MySQL transactions:
  ```sql
  START TRANSACTION;
  SELECT * FROM payment WHERE payment_id = ? FOR UPDATE;
  UPDATE payment SET payment_status = ? WHERE payment_id = ?;
  COMMIT;
  ```
- `SELECT ... FOR UPDATE` acquires an exclusive row-level lock in InnoDB, preventing concurrent transactions from mutating the same payment or slot simultaneously.
