# Primary–Secondary Replication & Router

The ecosystem implements an application-level **Primary–Secondary Database Router** (`databaserouter.js`) that performs read/write splitting across MySQL database connection pools.

---

## 1. Architectural Motivation

During peak harvesting seasons (e.g. wheat in April, paddy in October), thousands of farmers and market operators continuously query queue positions, available booking slots, and transaction ledgers.

To isolate write transactions (booking slot locking, weighing confirmations, payment status updates) from analytical and listing read queries, the platform routes:
- **All Writes (`INSERT`, `UPDATE`, `DELETE`)**: Directed exclusively to `PRIMARY_DB`.
- **All Reads (`SELECT`)**: Directed to an available Secondary read replica (`SECONDARY1_DB`, `SECONDARY2_DB`, `SECONDARY3_DB`).

---

## 2. Replication Implementation & Pool Management

### Router Lifecycle
1. On backend startup, `initDatabaseRouter()` parses connection parameters for `PRIMARY_DB` and up to three secondary databases (`SECONDARY1`, `SECONDARY2`, `SECONDARY3`).
2. Candidate selection:
   ```javascript
   const runningDatabases = secondaryDatabases.filter(
       item => item.db && item.status === "RUNNING"
   );
   ```
3. Selection behavior:
   - If one or more secondary databases are configured with `STATUS=RUNNING`, one replica is randomly chosen at startup and assigned to handle all read queries for that Node.js process.
   - If no secondary database is running or reachable, the router falls back safely to `PRIMARY_DB` for reads.

---

## 3. Replication Lag & Stale-Read Mitigation

In asynchronous MySQL replication, a small delay (milliseconds to seconds) can occur before changes made on the Primary are applied to Secondary replicas.

To prevent critical workflows from experiencing stale reads:
1. **Critical Status Transitions**: The Payment Portal (`paymentTransitionService.js`) and Mandi Queue transitions execute queries directly on the Primary database inside transactions (`START TRANSACTION; ... SELECT ... FOR UPDATE;`).
2. **Read Views Synchronization**: Analytical dashboards and broad table searches consume the read replica, where a few milliseconds of lag does not impact system correctness.
3. **Replication Recovery**: If a read replica fails during operation, restarting the backend or triggering pool re-initialization redirects reads to the next healthy candidate or the Primary.
