# Government Farmer & Mandi Procurement Management Portal

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.2.8-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/express-4.21.2-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/mysql2-3.15.3-orange.svg)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/mongoose-8.13.2-green.svg)](https://www.mongodb.com/)
[![Security](https://img.shields.io/badge/auth-HttpOnly%20JWT%20Cookie-red.svg)]()

A robust, enterprise-grade government portal designed to digitize and regulate the agricultural procurement ecosystem. The portal centralizes the administration of farmers, agricultural market yards (*mandis*), weighing/procurement counters, commodity crops, seasonal procurement sessions, state procurement quotas, and jurisdictional government officers across a strict three-tier geographical hierarchy (State &rarr; District &rarr; Tehsil). It enforces granular Role-Based Access Control (RBAC), Permission-Based Access Control (PBAC), dynamic location scoping, and two-tier cryptographic Aadhaar protection.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [The Solution](#2-the-solution)
3. [Key Features](#3-key-features)
4. [User Roles](#4-user-roles)
5. [Permission System](#5-permission-system)
6. [Location-Based Access Control (LBAC)](#6-location-based-access-control-lbac)
7. [Authentication Architecture](#7-authentication-architecture)
8. [Database Architecture](#8-database-architecture)
9. [Primary / Secondary MySQL Router](#9-primary--secondary-mysql-router)
10. [MySQL Read Views](#10-mysql-read-views)
11. [MongoDB Audit & History Logging](#11-mongodb-audit--history-logging)
12. [Aadhaar & Identity Security](#12-aadhaar--identity-security)
13. [Password Security](#13-password-security)
14. [Important Business Rules](#14-important-business-rules)
15. [Backend Architecture](#15-backend-architecture)
16. [Frontend Architecture](#16-frontend-architecture)
17. [End-to-End Data Flow](#17-end-to-end-data-flow)
18. [API Categories](#18-api-categories)
19. [Technology Stack](#19-technology-stack)
20. [Security Controls](#20-security-controls)
21. [Project Structure](#21-project-structure)
22. [Installation & Setup](#22-installation--setup)
23. [Environment Configuration](#23-environment-configuration)
24. [Future Scope](#24-future-scope)

---

## 1. Problem Statement

Traditional agricultural supply chain and government procurement operations face significant administrative and security bottlenecks:

- **Fragmented Farmer Registrations**: Farmer identities, agricultural land parcels, and bank accounts are often documented across disparate registers, leading to duplicate entries and disbursement delays.
- **Mandi Capacity Mismatches**: Procurement yards lack coordinated capacity controls between overall mandi throughput limits and individual operational counters, causing queue overflow and logistical gridlock.
- **Unregulated Jurisdictional Access**: Field officers operating without strict geographical boundaries may inadvertently or unauthorizedly inspect and mutate records belonging to outside administrative jurisdictions.
- **Unstructured Procurement Quotas & Sessions**: Managing seasonal procurement windows and enforcing Minimum Support Price (MSP) and Lower Selling Price (LSP) quotas without centralized validation leads to target discrepancies.
- **Identity Theft & Data Exposure**: Storing sensitive personal identifiers (such as Aadhaar numbers) or account credentials in plaintext or reversibly encrypted formats poses extreme compliance and privacy risks.
- **Lack of Tamper-Evident Audit Trails**: Routine modifications, removals, and administrative overrides often occur without persistent attribution to the executing officer.

---

## 2. The Solution

The **Government Farmer & Mandi Procurement Management Portal** resolves these challenges by providing a unified, secure administrative web application backed by an Express.js API gateway and a dual-database architecture:

```
User (Browser)
   │
   ▼
[Authentication Layer] ───────► HttpOnly Cookie + JWT Verification
   │
   ▼
[Authorization Layer] ────────► RBAC + PBAC (requirePermission / requireAnyPermission)
   │
   ▼
[Location Scoping Layer] ─────► loadUserScope & applyLocationScope (State/District/Tehsil)
   │
   ▼
[Controller Layer] ───────────► Business Validation & Rules Engine
   │
   ├──► READ Operations  ──────► getReadDatabase()  ──► MySQL Views (vw_*) / Replicas
   ├──► WRITE Operations ──────► getWriteDatabase() ──► Primary MySQL (Base Tables)
   └──► Audit & History  ──────► Mongoose / MongoDB ──► RecentLogs & History Collections
```

- **Separation of Concerns**: Clear separation between `READ` operations (routed through optimized read views on secondary database pools) and `WRITE` operations (executed against primary relational tables with transactional integrity).
- **Hardened Identity Boundary**: Direct authentication token inspection via secure HTTP cookies, shielding sessions from browser-side JavaScript access.
- **Auditable Lifecycle**: System activities, deletions, and administrative actions are automatically persisted to MongoDB collections.

---

## 3. Key Features

### 3.1 Authentication & Session Management
- **HttpOnly Cookie JWT Transport**: No tokens stored in `localStorage` or `sessionStorage`, mitigating Cross-Site Scripting (XSS) credential extraction.
- **Session Validation (`/api/auth/me`)**: Validates active cookie sessions on dashboard navigation without requiring re-login.
- **Secure Cookie Flags**: Hardened with `httpOnly: true`, `secure: true` (in production), and `sameSite: "lax"`.
- **Synchronized Expiration**: Cookie `maxAge` matches the backend `JWT_EXPIRES_IN` duration.
- **Graceful Logout (`/api/auth/logout`)**: Immediately clears the session cookie and redirects the client.

### 3.2 Authorization & Access Control
- **Role-Based Access Control (RBAC)**: Supports roles tailored to government administrative tiers (`dba`, `admin`, `State Officer`, `District Officer`, `Tehsil Officer`, `User`).
- **Permission-Based Access Control (PBAC)**: Fine-grained permissions structured as `module.action` (e.g., `farmer.read`, `mandi.create`).
- **Composite Checks**: Supports both "ALL required permissions" (`requirePermission`) and "ANY required permission" (`requireAnyPermission`).
- **Location-Based Authorization**: Automatically confines officer queries to their designated jurisdiction.

### 3.3 User & Officer Management
- **Administrative Directory**: Comprehensive user registry with search, status toggling (`active`/`inactive`), and soft pagination.
- **Granular Assignment**: Assign specific roles, permission arrays, and geographical jurisdiction (`state_id`, `district_id`, `tehsil_id`).
- **Global Administrative Scope**: User management endpoints intentionally bypass location scoping so administrators retain portal-wide visibility.

### 3.4 Geographical Hierarchy Management
- **State Management**: Create, list, search, and delete state entities (`state_name`, `state_code`).
- **District Management**: Register districts bound strictly to parent states (`state_id`, `district_name`, `district_code`).
- **Tehsil Management**: Register tehsils bound to parent districts (`district_id`, `tehsil_name`, `tehsil_code`).

### 3.5 Farmer & Land Registry
- **Comprehensive Profile**: Full name, mobile number, email address, residential address, state, district, tehsil, and registration timestamp.
- **Cryptographic Aadhaar Security**: Deterministic HMAC blind indexing for $O(1)$ Aadhaar lookup plus salted bcrypt hashing for verification. Raw Aadhaar numbers are never stored.
- **Verification Flags**: Tracks `aadhaar_verified`, `aadhaar_verified_at`, `mobile_verified`, and `mobile_verified_at`.
- **Integrated Bank Details**: Bank name, account number, IFSC code, and account verification status (`bank_account` table).
- **Land Parcel Management**: Tracks land area (acres), ownership type (`owned`, `leased`), land type (`irrigated`, `non-irrigated`), and land verification status (`pending`, `verified`, `rejected`).
- **Historical Tracking**: Soft-deletion of farmer records archives state to MongoDB (`FarmerHistory`).

### 3.6 Mandi & Counter Management
- **Mandi Registry**: Name, tehsil binding, physical intake capacity (quintals/metric tons), and registration date.
- **Dynamic Mandi Status**: Computes `'active'` or `'inactive'` status based on the presence and operational state of assigned counters.
- **Counter Allocation**: Create specific numbered counters assigned to designated commodities (`crop_id`) with per-day intake quotas.
- **Capacity Integrity Enforcement**: Strict validation ensures total allocated counter capacity never exceeds overall mandi capacity.

### 3.7 Crop Management
- **Commodity Directory**: Create, update, list, and delete recognized agricultural commodities (`crop_name`, `crop_type`).
- **Relational Linkage**: Relational foreign keys connect crops to counters, procurement quotas, and sessions.

### 3.8 Procurement Sessions
- **Seasonal Scheduling**: Configure procurement sessions bound to target crops (`start_date`, `end_date`).
- **Lifecycle Logic**: Automatically determines session status based on system date:
  - **Upcoming**: Scheduled for the future; dates may be adjusted.
  - **Active**: Currently ongoing; start date is locked, end date can be extended.
  - **Ended**: Concluded session; permanently locked against modifications.

### 3.9 Procurement Quotas
- **State-Wise Targets**: Set procurement volume targets per state and crop.
- **Pricing Thresholds**: Enforces Minimum Support Price (MSP) and Lower Selling Price (LSP) with validation rules ensuring $\text{MSP} \ge \text{LSP} > 0$.

### 3.10 System Audit & Recent Activity
- **MongoDB Audit Logging**: Key state-changing operations trigger entries in the `RecentLogs` collection with authenticated `user_id`, `username`, descriptive activity text, and timestamp.
- **Dashboard Feed**: Displays recent operations in real time on the administrative homepage.

---

## 4. User Roles

Access to portal capabilities is governed by a combination of the user's assigned **Role**, explicit **Permissions**, and **Location Scope**:

| Role | Target Level | Typical Jurisdiction | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **`dba`** | System Architecture | Global (All States) | Complete administrative authority; manages system users, roles, view definitions, and global configurations. |
| **`admin`** | Executive Oversight | Global / Multi-State | Comprehensive administrative oversight; manages procurement quotas, sessions, mandis, and platform users. |
| **`State Officer`** | State Directorate | Specific `state_id` | Manages state-level procurement quotas, inspects districts, mandis, and farmers within their state. |
| **`District Officer`**| District Directorate| Specific `district_id` | Manages tehsils, mandis, and counter allocations across their assigned district; reviews farmer registrations. |
| **`Tehsil Officer`**  | Local Execution     | Specific `tehsil_id`   | Verifies local farmer identities, land parcels, mandi counters, and daily intake operations. |
| **`User`**            | Standard User / Read Only | Scoped or Global | View-only access to portal metrics, public session dates, and mandi availability without mutation rights. |

> **Note**: A user's operational privileges are not determined solely by role name; the backend explicitly checks the user's `permissions` array for each route.

---

## 5. Permission System

Permissions follow the standard hierarchical pattern: `module.action`.

### Implemented Permission Modules
- **`user.*`**: `user.create`, `user.read`, `user.update`, `user.delete`
- **`location.*`**: `location.create`, `location.read`, `location.delete`
- **`mandi.*`**: `mandi.create`, `mandi.read`, `mandi.update`, `mandi.delete`
- **`mandi_counter.*`**: `mandi_counter.create`, `mandi_counter.read`, `mandi_counter.update`, `mandi_counter.delete`
- **`crop.*`**: `crop.create`, `crop.read`, `crop.update`, `crop.delete`
- **`farmer.*`**: `farmer.create`, `farmer.read`, `farmer.update`, `farmer.delete`
- **`procurement_session.*`**: `procurement_session.create`, `procurement_session.read`, `procurement_session.update`, `procurement_session.delete`
- **`procurement_quota.*`**: `procurement_quota.create`, `procurement_quota.read`, `procurement_quota.update`, `procurement_quota.delete`

### Middleware Enforcement

1. **`requirePermission(...requiredPermissions)`**:
   Enforces that the authenticated user possesses **ALL** specified permissions. If any single permission is missing, the request is rejected with `403 Forbidden`.
   ```javascript
   router.post("/addmandi", authenticateToken, requirePermission("mandi.create"), loadUserScope, addMandi);
   ```

2. **`requireAnyPermission(...requiredPermissions)`**:
   Allows execution if the user possesses **AT LEAST ONE** of the listed permissions. Used for routes shared across multiple administrative personas.
   ```javascript
   router.get("/getusers", authenticateToken, requireAnyPermission("user.read", "user.manage"), getUsers);
   ```

---

## 6. Location-Based Access Control (LBAC)

The portal implements strict hierarchical geographical scoping:

$$\text{State} \longrightarrow \text{District} \longrightarrow \text{Tehsil}$$

### Jurisdiction Resolution (`loadUserScope`)
When an officer authenticates, their scope is extracted from their verified JWT and stored on `req.userScope`:
- If `tehsil_id` is defined &rarr; The officer is restricted to that specific tehsil.
- If `district_id` is defined &rarr; The officer can access records across all tehsils within that district.
- If `state_id` is defined &rarr; The officer can access records across all districts and tehsils within that state.
- If all are `null` &rarr; The officer possesses global, nationwide administrative scope (e.g., DBA / National Admin).

### Dynamic Query Scoping (`applyLocationScope`)
SQL queries are not duplicated per role. The utility `applyLocationScope(baseQuery, values, userScope, columnMap)` dynamically appends necessary `WHERE` clauses and bound parameters:

```javascript
const scoped = applyLocationScope(query, [mandiId], req.userScope, {
    stateColumn: "d.state_id",
    districtColumn: "d.district_id",
    tehsilColumn: "m.tehsil_id"
});
const [rows] = await readDb.query(scoped.query, scoped.values);
```

### Global Exemption for User Administration
User management APIs (`/api/app-users/*`) intentionally **bypass** location scoping. This allows authorized DBAs and national administrators to manage officer accounts across any jurisdiction without artificial location constraints.

---

## 7. Authentication Architecture

```
Client (React)                  API Gateway (Express)                MySQL Database
  │                                    │                                    │
  ├─── POST /api/auth/login ──────────►│                                    │
  │    { username, password }          ├── Query user by username ─────────►│
  │                                    │◄─ Return record + password_hash ───┤
  │                                    │                                    │
  │                                    ├── bcrypt.compare(password, hash)   │
  │                                    │   ├── Valid: Sign JWT              │
  │                                    │   └── Set HttpOnly Cookie: token   │
  │◄── 200 OK + User Metadata ─────────┤                                    │
  │    (Set-Cookie: token=...; HttpOnly)                                    │
  │                                    │                                    │
  ├─── GET /api/mandis (Cookie) ──────►│                                    │
  │                                    ├── cookie-parser reads token        │
  │                                    ├── jwt.verify(token, secret)        │
  │                                    ├── req.user populated               │
  │                                    ├── check requirePermission(...)     │
  │                                    ├── loadUserScope applied            │
  │                                    └── Execute controller logic ───────►│
```

### Security Configuration
- **HttpOnly Transport**: The cookie cannot be inspected or altered using `document.cookie`, safeguarding against session theft via XSS.
- **SameSite Protection**: Set to `"lax"` to defend against Cross-Site Request Forgery (CSRF) on state-modifying requests initiated from external origins.
- **Production TLS**: Enforces `secure: true` when `NODE_ENV === "production"`, ensuring cookies are transmitted strictly over HTTPS.
- **Frontend Alignment**: Native `fetch` requests across all contexts and components set `credentials: "include"`.
- **CORS Credentials**: Configured with explicit allowed origins (`FRONTEND_URL`, `http://localhost:3000`, `http://127.0.0.1:3000`) and `credentials: true`. Wildcards (`*`) are disallowed.

---

## 8. Database Architecture

> [!IMPORTANT]
> **Database Deletion Order & Constraints**: Because tables enforce `ON DELETE RESTRICT` on critical operational and financial relationships (such as bookings, payments, and counters), records cannot be deleted arbitrarily without triggering foreign key violation errors. Always follow the step-by-step reverse-dependency order documented in **[DATABASE_DELETION_GUIDE.md](../DATABASE_DELETION_GUIDE.md)**.

The system utilizes a dual-database architecture: **MySQL** for structured transactional data and **MongoDB** for audit trails and historical records.

```
                      ┌──────────────────────────────────────┐
                      │           Express Backend            │
                      └───────────┬──────────────┬───────────┘
                                  │              │
                    SQL Queries   │              │   Mongoose / JSON
               (Direct mysql2)    │              │   (Audit & Logs)
                                  ▼              ▼
                     ┌──────────────────┐  ┌──────────────────┐
                     │  MySQL Database  │  │ MongoDB Database │
                     └──────────────────┘  └──────────────────┘
```

### Entity-Relationship (ER) Diagram (MySQL & MongoDB)

The complete data model comprises 12 relational MySQL tables and 4 MongoDB audit/history collections. The ER diagram below illustrates all primary keys (PK), foreign keys (FK), unique constraints (UK), attribute types, cardinalities, and cross-database logical references:

```mermaid
erDiagram
    STATE ||--o{ DISTRICT : "contains"
    DISTRICT ||--o{ TEHSIL : "contains"

    STATE ||--o{ APP_USERS : "scopes (optional)"
    DISTRICT ||--o{ APP_USERS : "scopes (optional)"
    TEHSIL ||--o{ APP_USERS : "scopes (optional)"

    STATE ||--o{ FARMER : "resides in"
    DISTRICT ||--o{ FARMER : "resides in"
    TEHSIL ||--o{ FARMER : "resides in"

    FARMER ||--|| BANK_ACCOUNT : "owns"
    FARMER ||--o{ FARMER_LAND : "owns"

    TEHSIL ||--o{ MANDI : "located in"
    MANDI ||--o{ MANDI_COUNTER : "operates"
    CROP ||--o{ MANDI_COUNTER : "assigned to"

    CROP ||--o{ PROCUREMENT_SESSION : "procures"
    STATE ||--o{ PROCUREMENT_QUOTA : "targets"
    CROP ||--o{ PROCUREMENT_QUOTA : "applies to"

    APP_USERS ..o{ RECENT_LOGS : "logs activity (MongoDB)"
    APP_USERS ..o{ FARMER_HISTORY : "deletes (MongoDB)"
    APP_USERS ..o{ MANDI_HISTORY : "deletes (MongoDB)"
    APP_USERS ..o{ MANDI_COUNTER_HISTORY : "deletes (MongoDB)"

    STATE {
        int state_id PK
        string state_name UK
        string state_code UK
    }

    DISTRICT {
        int district_id PK
        int state_id FK
        string district_name
        string district_code UK
    }

    TEHSIL {
        int tehsil_id PK
        int district_id FK
        string tehsil_name
        string tehsil_code UK
    }

    APP_USERS {
        int user_id PK
        string username UK
        string password_hash
        string role
        json permissions
        int state_id FK "nullable"
        int district_id FK "nullable"
        int tehsil_id FK "nullable"
        string status
        timestamp created_at
    }

    FARMER {
        int farmer_id PK
        string name
        string mobile_number
        string email
        text address
        int state_id FK
        int district_id FK
        int tehsil_id FK
        string aadhaar_hash
        string aadhaar_lookup UK
        boolean aadhaar_verified
        timestamp aadhaar_verified_at
        date registration_date
        string status
        string verification_status
        boolean mobile_verified
        timestamp mobile_verified_at
        timestamp created_at
    }

    BANK_ACCOUNT {
        int account_id PK
        int farmer_id FK "UK - 1:1"
        string bank_name
        string account_number
        string ifsc_code
        string verification_status
        timestamp created_at
    }

    FARMER_LAND {
        int land_id PK
        int farmer_id FK
        decimal area
        string ownership_type
        string land_type
        string land_verification
        timestamp created_at
    }

    CROP {
        int crop_id PK
        string crop_name UK
        string crop_type
        timestamp created_at
    }

    MANDI {
        int mandi_id PK
        string mandi_name
        int tehsil_id FK
        int capacity
        timestamp created_at
    }

    MANDI_COUNTER {
        int counter_id PK
        int mandi_id FK
        int counter_number
        string counter_name
        int crop_id FK
        int capacity_per_day
        string status
        timestamp created_at
    }

    PROCUREMENT_SESSION {
        int session_id PK
        string session_name
        int crop_id FK
        date start_date
        date end_date
        timestamp created_at
    }

    PROCUREMENT_QUOTA {
        int quota_id PK
        int state_id FK
        int crop_id FK
        decimal amount
        decimal lsp
        decimal msp
        timestamp created_at
    }

    RECENT_LOGS {
        objectId id PK
        int user_id FK "ref: app_users"
        string username
        string recent_activity
        date navigate_at "TTL: 24h"
    }

    FARMER_HISTORY {
        objectId id PK
        int deleted_by FK "ref: app_users"
        int farmer_id "historical id"
        string farmer_name
        string email
        string mobile_number
        string address
        string aadhaar_lookup
        date deleted_at "TTL: 90d"
    }

    MANDI_HISTORY {
        objectId id PK
        int deleted_by FK "ref: app_users"
        int mandi_id "historical id"
        string mandi_name
        int tehsil_id
        int capacity
        date deleted_at "TTL: 90d"
    }

    MANDI_COUNTER_HISTORY {
        objectId id PK
        int deleted_by FK "ref: app_users"
        int counter_id "historical id"
        int mandi_id
        string counter_name
        string status
        date deleted_at "TTL: 90d"
    }
```

### Database Entities Summary

#### MySQL Relational Tables (12 Entities)
- **`app_users`**: Administrative credentials, hashed passwords, roles, permissions, location foreign keys, and account status.
- **`state`**, **`district`**, **`tehsil`**: Geographical hierarchy with cascade/restrict foreign key constraints.
- **`farmer`**: Core farmer identities, encrypted Aadhaar references (`aadhaar_lookup`, `aadhaar_hash`), contact info, and verification flags.
- **`bank_account`**: 1-to-1 banking details linked to farmers (`farmer_id UNIQUE`).
- **`farmer_land`**: 1-to-Many land parcels specifying acreage, ownership, irrigation type, and verification status.
- **`mandi`**: Market yards bound to tehsils with overall intake capacity.
- **`mandi_counter`**: Specific weighing/intake counters bound to mandis and designated crops.
- **`crop`**: Agricultural commodity catalogue (`crop_name`, `crop_type`).
- **`procurement_session`**: Seasonal procurement windows bound to crops.
- **`procurement_quota`**: State-level procurement targets and pricing thresholds (LSP / MSP).

#### MongoDB Collections (4 Entities)
- **`recentlogs`**: High-throughput audit trail tracking administrative user actions with automatic 24-hour TTL expiration.
- **`farmerhistories`**: Soft-delete archive preserving deleted farmer records and contact information (90-day TTL).
- **`mandihistories`**: Soft-delete archive preserving removed mandi metadata and deleting officer attribution (90-day TTL).
- **`mandicounterhistories`**: Soft-delete archive preserving deleted counter information (90-day TTL).

---

## 9. Primary / Secondary MySQL Router

The backend includes a database router (`backend/services/databaserouter.js`) that separates read and write traffic:

- **WRITE Operations (INSERT, UPDATE, DELETE)**: Always executed against the **Primary Database** via `getWriteDatabase()`.
- **READ Operations (SELECT)**: Routed through `getReadDatabase()`. The router connects to available secondary read replicas (`SECONDARY_DB_*`, `SECONDARY_DB2_*`, `SECONDARY_DB3_*`). If no secondary replicas are operational or configured, it automatically falls back to the Primary database.

```javascript
// Example: Safe Query Routing
const writeDb = getWriteDatabase().promise();
await writeDb.query("INSERT INTO mandi (...) VALUES (...)", [...]);

const readDb = getReadDatabase().promise();
const [rows] = await readDb.query("SELECT * FROM vw_mandis WHERE ...", [...]);
```

---

## 10. MySQL Read Views

Six dedicated MySQL read views (`backend/model/views.js`) encapsulate complex joins, optimize repeated queries, and enforce security by excluding sensitive columns:

| View Name | Primary Source Tables | Key Columns Included | Intentionally Excluded Columns | Primary Consumers |
| :--- | :--- | :--- | :--- | :--- |
| **`vw_app_users`** | `app_users`, `state`, `district`, `tehsil` | `user_id`, `username`, `role`, `permissions`, `state`, `district`, `tehsil`, `status`, `created_at` | `password_hash` | User management directory, single-user lookup |
| **`vw_farmers`** | `farmer`, `bank_account` | `farmer_id`, `name`, `mobile_number`, `email`, `address`, `state_id`, `district_id`, `tehsil_id`, `registration_date`, `status`, `verification_status`, `bank_name`, `account_number`, `ifsc_code` | `aadhaar_hash`, `aadhaar_lookup`, `bank_created_at` | Farmer directory, verification modal, Aadhaar search |
| **`vw_mandis`** | `mandi`, `tehsil`, `district`, `state`, `mandi_counter` | `mandi_id`, `mandi_name`, `tehsil_id`, `tehsil_name`, `district_id`, `district_name`, `state_id`, `state_name`, `capacity`, `status` (computed) | *Internal counter IDs* | Mandi list, metrics count, counter lookup |
| **`vw_mandi_counters`** | `mandi_counter`, `mandi`, `tehsil`, `district`, `crop` | `counter_id`, `mandi_id`, `mandi_name`, `counter_number`, `counter_name`, `crop_id`, `crop_name`, `capacity_per_day`, `status`, `tehsil_id`, `district_id`, `state_id` | *None* | Mandi counters page, counter details modal |
| **`vw_procurement_sessions`** | `procurement_session`, `crop` | `session_id`, `session_name`, `crop_id`, `crop_name`, `start_date`, `end_date`, `created_at` | *None* | Procurement session schedule, seasonal overview |
| **`vw_procurement_quota`** | `procurement_quota`, `state`, `crop` | `quota_id`, `state_id`, `state_name`, `crop_id`, `crop_name`, `amount`, `lsp`, `msp`, `created_at` | *None* | State quota allocation table, MSP/LSP inspection |

> **Strict Rule**: Views are **READ-ONLY**. All mutation queries (`INSERT`, `UPDATE`, `DELETE`) bypass views and execute directly on the underlying base tables.

---

## 11. MongoDB Audit & History Logging

To maintain a permanent, tamper-evident record of administrative operations, the system integrates MongoDB via Mongoose:

1. **Activity Logging (`RecentLogs`)**:
   Tracks user interactions such as adding mandis, creating sessions, and updating statuses:
   ```javascript
   await RecentLogs.create({
       user_id: req.user.user_id,
       username: req.user.username,
       recent_activity: `Mandi id ${mandi_id} updated`
   });
   ```

2. **Soft-Delete Archive Collections**:
   When entities are removed from MySQL, complete snapshots are archived in MongoDB before base table deletion:
   - `MandiHistory`: Archives deleted mandi records with `deleted_by` user tracking.
   - `MandiCounterHistory`: Archives deleted counters.
   - `FarmerHistory`: Archives deleted farmer profiles and bank account associations.

---

## 12. Aadhaar & Identity Security

Indian Aadhaar numbers are 12-digit sensitive personal identifiers requiring strict data protection:

```
Raw Aadhaar (Input)
   │
   ├── HMAC-SHA256(Raw Aadhaar, AADHAAR_PEPPER) ──► aadhaar_lookup (64-char Hex)
   │                                                 (Used for O(1) Unique Search)
   │
   └── bcrypt.hash(Raw Aadhaar, salt=12) ──────────► aadhaar_hash (Salted One-Way)
                                                     (Used for High-Security Verification)
```

1. **No Plaintext Storage**: Plaintext 12-digit Aadhaar numbers are **never** stored in database tables, log files, or views.
2. **Deterministic Blind Index (`aadhaar_lookup`)**: Computed via HMAC-SHA256 using a private, high-entropy pepper (`AADHAAR_PEPPER`). This produces a unique 64-character hex hash, enabling $O(1)$ unique lookups without exposing the identity.
3. **Salted Hash Verification (`aadhaar_hash`)**: Computed using bcrypt with 12 salt rounds, used when explicit identity verification is requested.
4. **Secret Isolation**: The `AADHAAR_PEPPER` is kept isolated in the environment configuration and never shares fallback values with `JWT_SECRET`.
5. **Zero Egress**: Neither `aadhaar_lookup` nor `aadhaar_hash` is ever returned in frontend API responses.

---

## 13. Password Security

User credentials in the `app_users` table are hashed using **bcrypt**:

- **Configurable Rounds**: Work factor is governed by `process.env.BCRYPT_SALT_ROUNDS` (defaults to 12).
- **Uniformity**: Registration via `/api/auth/register` and officer provisioning via `/api/app-users/users` both enforce identical bcrypt standards.
- **Zero Exposure**: `password_hash` is explicitly excluded from `vw_app_users` and all controller responses.

---

## 14. Important Business Rules

### Mandi & Counter Capacity Invariance
A mandi's registered intake capacity represents its physical limit. Counter capacities cannot conflict with mandi capacities:

$$\text{Mandi Capacity} \ge \sum \text{Assigned Counter Capacities}$$

- **Adding a Counter**: The system calculates $\sum \text{Existing Counter Capacity} + \text{New Counter Capacity}$. If this sum exceeds the parent mandi capacity, the request is rejected with `400 Bad Request`.
- **Modifying Mandi Capacity**: An existing mandi's capacity cannot be decreased below the sum of capacities currently assigned to its active counters.

### Procurement Session Date Restrictions
Procurement sessions govern legal purchasing periods for commodities:
- **`Upcoming` Session** ($\text{Start Date} > \text{Current Date}$): Both `start_date` and `end_date` can be modified.
- **`Active` Session** ($\text{Start Date} \le \text{Current Date} \le \text{End Date}$): `start_date` is **locked** and cannot be changed; `end_date` may be extended.
- **`Ended` Session** ($\text{End Date} < \text{Current Date}$): The session is concluded and **locked** against all modifications.

### Procurement Quota Pricing Integrity
When defining state-level procurement targets:
- Minimum Support Price (MSP) must equal or exceed Lower Selling Price (LSP): $\text{MSP} \ge \text{LSP} > 0$.
- Target procurement volumes must be strictly greater than zero.

---

## 15. Backend Architecture

The backend is built with Express.js and structured modularly:

- **Entry Point (`backend/index.js`)**: Configures Express, parses cookies and JSON bodies, establishes database connections, defines CORS rules, and mounts modular routers.
- **Database Initialization (`backend/model/`)**: Sequentialized startup scripts that create tables and views without deadlocks.
- **Middleware Chain (`backend/middleware/`)**:
  1. `authenticateToken.js`: Validates the HttpOnly cookie and decodes the JWT.
  2. `requirePermission.js`: Validates required permissions against the user's token.
  3. `loadUserScope.js`: Extracts geographical jurisdiction parameters into `req.userScope`.
- **Controllers (`backend/controllers/`)**: Encapsulates business logic, parameters validation, capacity checks, and query routing.
- **Services (`backend/services/`)**:
  - `databaserouter.js`: Routes read/write database queries.
  - `mongodb.js`: Manages the MongoDB connection pool.
  - `aadhaarSecurity.js`: Manages HMAC blind indexing and bcrypt hashing.
- **Utilities (`backend/utils/`)**:
  - `locationScope.js`: Injects location filters into queries.

---

## 16. Frontend Architecture

The frontend is a single-page application built with React 19 and React Router 7:

- **Layout & Structure (`components/home/DashboardLayout.js`)**: Renders a persistent header, responsive sidebar, and an active route outlet. Validates session state against `/api/auth/me`.
- **State Management (`context/`)**: Organized into dedicated context providers wrapping the component tree:
  - `AuthState`: Manages login, logout, and session checks.
  - `StateState`, `DistrictState`, `TehsilState`: Manages geographical hierarchies.
  - `MandiState`: Manages mandis and counters.
  - `FarmerState`: Manages farmer profiles, land parcels, and verification.
  - `CropState`: Manages commodities.
  - `ProcurementState`: Manages sessions and quotas.
  - `InfoState`: Manages dashboard summary statistics.
- **Credentials Inclusion**: Every `fetch` request sets `credentials: "include"`, ensuring session cookies accompany all API interactions.

---

## 17. End-to-End Data Flow

### 1. User Login Flow
```
User (Browser)               Frontend Context                 Backend (Auth)                MySQL
     │                              │                                │                        │
     ├── Inputs Credentials ───────►│                                │                        │
     │   (username, password)       ├── POST /api/auth/login ───────►│                        │
     │                              │   (credentials: "include")     ├── SELECT user record ─►│
     │                              │                                │◄── User + password_hash┤
     │                              │                                │                        │
     │                              │                                ├── bcrypt.compare()     │
     │                              │                                ├── Generate JWT         │
     │                              │                                ├── res.cookie('token')  │
     │                              │◄── 200 OK + User Metadata ─────┤                        │
     │                              │   (Set-Cookie: token=...;      │                        │
     │                              │    HttpOnly; SameSite=Lax)     │                        │
     │◄── Redirect to Dashboard ────┤                                │                        │
```

### 2. Read Request Flow (SELECT via View)
```
Frontend View                 API Router                      Middleware Stack               MySQL (Read)
     │                            │                                  │                            │
     ├── GET /api/mandis ────────►│                                  │                            │
     │   (Cookie sent by browser) ├── authenticateToken ────────────►│                            │
     │                            │   (Verify cookie JWT)            │                            │
     │                            ├── requirePermission('mandi.read')│                            │
     │                            ├── loadUserScope                  │                            │
     │                            │   (Resolve state/district/tehsil)│                            │
     │                            │                                  │                            │
     │                            ├── mandiController.getMandis ─────┼── SELECT FROM vw_mandis ──►│
     │                            │                                  │   WHERE location scoped    │
     │                            │                                  │◄── Filtered Rows ──────────┤
     │◄── 200 OK (Mandi JSON) ────┤                                  │                            │
```

### 3. Write Request Flow (INSERT / UPDATE / DELETE)
```
Frontend View                 API Router                      Controller                   MySQL (Primary)
     │                            │                               │                              │
     ├── POST /api/mandis/add ───►│                               │                              │
     │   (Payload + Cookie)       ├── Authenticate & Authorize ──►│                              │
     │                            │                               ├── Validate Capacities        │
     │                            │                               ├── getWriteDatabase()         │
     │                            │                               ├── INSERT INTO mandi ────────►│
     │                            │                               │   (Base Table)               │
     │                            │                               │◄── result.insertId ──────────┤
     │                            │                               │                              │
     │                            │                               ├── RecentLogs.create() ──► [MongoDB]
     │◄── 201 Created ────────────┤                               │                              │
```

---

## 18. API Categories

| Category | Base Endpoint | Description | Key Protected Actions |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/api/auth` | Session and account management | `login`, `logout`, `me`, `register` |
| **App Users** | `/api/app-users` | Officer account administration | `getusers`, `users` (create/update/delete), `status` |
| **Locations** | `/api/location` | State, district, tehsil hierarchy | `state/*`, `district/*`, `tehsil/*` |
| **Farmers** | `/api/farmer` | Farmer registry & identity | `addfarmer`, `getfarmer/aadhaar/:id`, `removefarmer`, `update` |
| **Farmer Land** | `/api/farmer/land` | Land parcels & verification | `addland`, `removeland`, `farmer/:id`, `:id/verification` |
| **Mandis** | `/api/mandis` | Market yard management | `addmandi`, `getmandis`, `gettotalmandis`, `removemandi`, `update` |
| **Mandi Counters** | `/api/mandicounters` | Weighing counters & capacity | `addcounter`, `mandicounter/:id`, `removecounter`, `updatecounter` |
| **Crops** | `/api/crops` | Commodity catalogue | `addcrop`, `getcrops`, `removecrop`, `update` |
| **Procurement** | `/api/procurement` | Sessions and state quotas | `addprocurementsession`, `addprocurementQuota`, `quota/state/:id`, `total` |
| **Recent Logs** | `/api/recent-log` | MongoDB audit trail | Paginated activity logs (`?page=1&count=10`) |

---

## 19. Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.2.8 | Single Page Application (SPA) client |
| **Routing** | React Router DOM | 7.18.3 | Client-side routing and protected route layouts |
| **Backend Runtime** | Node.js | &ge; 18.0.0 | JavaScript server-side execution environment |
| **Web Framework** | Express.js | 4.21.2 | RESTful API gateway and route handlers |
| **Relational Database** | MySQL | 8.x | Transactional data storage and relational tables |
| **MySQL Client** | mysql2 | 3.15.3 | High-performance MySQL client with connection pooling |
| **Document Database** | MongoDB | &ge; 6.0 | Audit logging and history archives |
| **ODM** | Mongoose | 8.13.2 | Schema modeling for MongoDB collections |
| **Authentication** | jsonwebtoken | 9.0.2 | Signed JWT generation and verification |
| **Cookie Middleware**| cookie-parser | 1.4.7 | Server-side cookie parsing |
| **Password Security**| bcrypt | 6.0.0 | Salted password and Aadhaar hash generation |
| **Cryptographic Engine**| Node.js `crypto` | Built-in | HMAC-SHA256 blind index generation |
| **CORS Middleware** | cors | 2.8.5 | Cross-Origin Resource Sharing with credentials |

---

## 20. Security Controls

| Threat / Risk Vector | Implemented Defense Mechanism | Architectural Location |
| :--- | :--- | :--- |
| **Credential Theft via XSS** | JWTs are stored in **HttpOnly cookies**, preventing client JavaScript access. | `backend/controllers/authController.js` |
| **Cross-Site Request Forgery** | Cookie `SameSite` attribute is set to **`"lax"`**, blocking cross-site mutation requests. | Express cookie options |
| **Network Interception** | In production, cookies enforce the **`secure: true`** flag (HTTPS only). | Express cookie options |
| **Aadhaar Data Exposure** | Plaintext Aadhaar numbers are never stored; identity is protected via **HMAC-SHA256 blind indexing** and **bcrypt hashing**. | `backend/services/aadhaarSecurity.js` |
| **Unauthorized Data Mutations** | Fine-grained **Role-Based** and **Permission-Based** middleware inspects each request before execution. | `backend/middleware/requirePermission.js` |
| **Jurisdictional Breaches** | **Location Scoping Engine** dynamically binds state, district, and tehsil filters to SQL queries. | `backend/utils/locationScope.js` |
| **Credential Exposure via Views** | Sensitive fields (`password_hash`, `aadhaar_hash`, `aadhaar_lookup`) are excluded from MySQL views. | `backend/model/views.js` |
| **SQL Injection** | All dynamic SQL executions utilize **parameterized queries** (`?` placeholders). | All backend controllers |

---

## 21. Project Structure

```
goverment portel/
├── backend/
│   ├── controllers/
│   │   ├── appUserController.js            # User provisioning and status management
│   │   ├── authController.js               # Login, logout, registration, and /me session check
│   │   ├── cropController.js               # Commodity catalogue CRUD
│   │   ├── districtController.js           # District entity CRUD
│   │   ├── farmerController.js             # Farmer registry and Aadhaar lookup
│   │   ├── farmerlandController.js         # Land parcel details and verification
│   │   ├── mandiController.js              # Mandi directory and capacity management
│   │   ├── mandiCounterController.js       # Mandi counter allocation and validation
│   │   ├── procurementQuotaController.js   # State-level quota and pricing thresholds
│   │   ├── procurementSessionController.js # Seasonal procurement windows and lifecycle
│   │   ├── stateController.js              # State entity CRUD
│   │   ├── tehsilController.js             # Tehsil entity CRUD
│   │   └── mongocontroller/
│   │       ├── farmerHistoryController.js  # Archived farmer deletion queries
│   │       └── recentlogsController.js     # Paginated MongoDB audit log queries
│   ├── middleware/
│   │   ├── authenticateToken.js            # Extracts and verifies HttpOnly cookie JWT
│   │   ├── loadUserScope.js                # Populates req.userScope from token
│   │   └── requirePermission.js            # requirePermission & requireAnyPermission
│   ├── model/
│   │   ├── appUser.js                      # MySQL app_users table initialization
│   │   ├── database.js                     # Base database setup
│   │   ├── farmeraddress.js                # State, district, tehsil tables initialization
│   │   ├── farmercrop.js                   # Crop table initialization
│   │   ├── farmerland.js                   # Farmer land table initialization
│   │   ├── farmerregister.js               # Farmer and bank_account tables initialization
│   │   ├── initializeProcurementSession.js # Procurement tables initialization
│   │   ├── mandi.js                        # Mandi and counter tables initialization
│   │   ├── views.js                        # Creates/updates the 6 MySQL read views
│   │   └── mongomodel/
│   │       ├── FarmerHistory.js            # Mongoose schema for farmer archives
│   │       ├── MandiHistory.js             # Mongoose schema for mandi archives
│   │       ├── MandiCounterHistory.js      # Mongoose schema for counter archives
│   │       └── RecentLogs.js               # Mongoose schema for activity audit logs
│   ├── routes/
│   │   ├── appUserRoute.js                 # /api/app-users routes
│   │   ├── authRoute.js                    # /api/auth routes
│   │   ├── cropRoute.js                    # /api/crops routes
│   │   ├── districtRoute.js                # /api/location/district routes
│   │   ├── farmerRoute.js                  # /api/farmer routes
│   │   ├── farmerlandRoute.js              # /api/farmer/land routes
│   │   ├── mandiRoute.js                   # /api/mandis routes
│   │   ├── mandicounterRoute.js            # /api/mandicounters routes
│   │   ├── procurementRoute.js             # /api/procurement routes
│   │   ├── stateRoute.js                   # /api/location/state routes
│   │   ├── tehsilRoute.js                  # /api/location/tehsil routes
│   │   └── mongoroute/
│   │       ├── farmerHistoryRoutes.js      # /api/farmer-history routes
│   │       └── recentlogsRoute.js          # /api/recent-log routes
│   ├── services/
│   │   ├── aadhaarSecurity.js              # HMAC blind indexing & bcrypt verification
│   │   ├── databaserouter.js               # Read/write database connection pool router
│   │   └── mongodb.js                      # Mongoose connection management
│   ├── utils/
│   │   └── locationScope.js                # Dynamic SQL location filtering utility
│   ├── index.js                            # Express server entry point
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddUser/
│   │   │   │   ├── AddUser.js              # Provision new administrative users
│   │   │   │   └── Users.js                # User management table & status toggles
│   │   │   ├── Chatbot/
│   │   │   │   └── Chatbot.js              # Portal assistant interface
│   │   │   ├── Crop/
│   │   │   │   └── Crops.js                # Commodity management interface
│   │   │   ├── District/
│   │   │   │   └── District.js             # District configuration interface
│   │   │   ├── Farmer/
│   │   │   │   ├── AddFarmer.js            # Farmer registration form
│   │   │   │   ├── Farmer.js               # Farmer directory and details modal
│   │   │   │   └── FarmerLand.js           # Land parcel management interface
│   │   │   ├── home/
│   │   │   │   ├── DashboardLayout.js      # Base layout & session verification
│   │   │   │   └── Home.js                 # Dashboard metrics and recent activity
│   │   │   ├── login/
│   │   │   │   └── Login.js                # Officer authentication form
│   │   │   ├── Mandi/
│   │   │   │   ├── AddMandi.js             # Mandi registration form
│   │   │   │   ├── Mandi.js                # Mandi list and capacity overview
│   │   │   │   └── MandiCounter.js         # Counter allocation and status toggling
│   │   │   ├── Procurement/
│   │   │   │   ├── ProcurementQuota.js     # State quota allocation interface
│   │   │   │   └── ProcurementSession.js   # Seasonal session management interface
│   │   │   ├── RecentLogs/
│   │   │   │   └── RecentLogs.js           # Audit activity table
│   │   │   ├── Sidebar/
│   │   │   │   ├── Header.js               # Top navigation bar
│   │   │   │   └── Sidebar.js              # Navigation sidebar with logout button
│   │   │   └── state/
│   │   │       └── State.js                # State configuration interface
│   │   ├── context/
│   │   │   ├── auth/                       # AuthContext & AuthState (Cookie auth)
│   │   │   ├── Crop/                       # CropContext & CropState
│   │   │   ├── District/                   # DistrictContext & DistrictState
│   │   │   ├── Farmer/                     # FarmerContext & FarmerState
│   │   │   ├── Info/                       # InfoContext & InfoState (Dashboard counts)
│   │   │   ├── Mandi/                      # MandiContext & MandiState
│   │   │   ├── Procurement/                # ProcurementContext & ProcurementState
│   │   │   ├── state/                      # StateContext & StateState
│   │   │   └── Tehsil/                     # TehsilContext & TehsilState
│   │   ├── App.js                          # Route configuration
│   │   └── index.js                        # React DOM root entry
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## 22. Installation & Setup

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **MySQL Server**: Version 8.0 or higher (running locally on port 3306 or on a network host)
- **MongoDB Server**: Version 6.0 or higher (running on port 27017)

### 1. Database Preparation
Create the primary MySQL database:
```sql
CREATE DATABASE mandi_management;
```
*(Optional)* If utilizing secondary read replicas, create the corresponding databases (`mandi_management_read1`, etc.) or configure replication.

### 2. Backend Installation
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Verify or configure environment variables
# (Ensure .env exists in backend/ as documented below)

# Start the Express server
node index.js
```
The backend initializes database tables sequentially, executes view creation scripts, connects to MongoDB, and begins listening on port 5000.

### 3. Frontend Installation
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the React development server
npm start
```
The application will launch in your browser at `http://localhost:3000`.

---

## 23. Environment Configuration

### Backend (`backend/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Allowed Frontend URL (CORS with credentials)
FRONTEND_URL=http://localhost:3000

# Primary MySQL Database (Write Node)
PRIMARY_DB_HOST=localhost
PRIMARY_DB_USER=root
PRIMARY_DB_PASSWORD=your_mysql_password
PRIMARY_DB_NAME=mandi_management
PRIMARY_DB_PORT=3306

# Secondary MySQL Database Replicas (Optional read nodes; fall back to Primary)
SECONDARY_DB_HOST=localhost
SECONDARY_DB_USER=root
SECONDARY_DB_PASSWORD=your_mysql_password
SECONDARY_DB_NAME=mandi_management
SECONDARY_DB_PORT=3306

# MongoDB Connection (Audit Logs & Historical Archives)
MONGO_URI=mongodb://127.0.0.1:27017/farmer_history

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d

# Cryptographic Identity Security
AADHAAR_PEPPER=your_isolated_high_entropy_aadhaar_pepper_secret
BCRYPT_SALT_ROUNDS=12

# OTP Abuse Protection & Login Rate Limiting (Server-Side In-Memory Map)
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_HOURS=2
OTP_RESEND_COOLDOWN_MINUTES=5
```

### In-Memory Server-Side Security Store (`securityStore.js`)
The backend uses a dedicated in-memory JavaScript `Map` store for login rate limiting and OTP brute-force defense:
- **Configurable Thresholds**: `LOGIN_MAX_FAILED_ATTEMPTS` (lockout trigger), `LOGIN_LOCKOUT_HOURS` (lockout duration), and `OTP_RESEND_COOLDOWN_MINUTES` (5-minute resend cooldown).
- **Startup Validation**: Enforces that all 3 variables are defined and valid positive numbers at application boot.
- **Privacy & Safety**: Client IP and phone numbers are SHA-256 hashed before keying in the Map.
- **Memory Bounding**: Bounded to a maximum of 10,000 entries with automatic expiry cleanup and FIFO/LRU eviction.
- **Generic Responses**: Never reveals remaining attempts, thresholds, or lockout duration to users. Returns generic `"Unable to verify the OTP. Please check the code and try again."` for incorrect OTP, and `"Too many requests. Please try again later."` when locked out.
- **Security Boundaries**: Cookies never control security decisions; deleting cookies does not reset server rate limits. Successful login clears only the phone failure count while preserving IP rate limits.
- **Known Limitation**: In-memory `Map` data is process-local. Backend restarts clear active counters, and multi-instance deployments maintain separate rate-limiting buckets per process.

### Frontend (`frontend/.env`)

```env
REACT_APP_HOST=http://localhost:5000
```

---

## 24. Future Scope

The current implementation provides a solid foundation for agricultural procurement management. Planned future enhancements include:

- **Biometric Device Integration**: Integrating WebAuthn or certified biometric scanners directly into the Tehsil Officer farmer verification flow.
- **Automated Weighbridge Telemetry**: Integrating IoT weighbridge hardware at mandi counters to automatically record net commodity weights.
- **Direct Benefit Transfer (DBT) / PFMS Integration**: Integrating the Public Financial Management System (PFMS) for automated payment disbursements to verified farmer bank accounts upon procurement session completion.
- **SMS / WhatsApp Notification Gateway**: Integrating transactional notification gateways to deliver automated status alerts to farmers regarding session dates, token allocations, and verification updates.

---

## 25. Central Documentation Links

- 📖 **[Government Portal API Reference](../docs/api/government-api.md)**
- 👤 **[First Government User Bootstrap Guide](./FIRST_USER_REGISTRATION_GUIDE.md)**
- 💾 **[Government Database Schema](../docs/databases/government-database.md)**
- 🔄 **[Government Administration & Quotas Workflow](../docs/workflows/government-administration.md)**
- 🛡️ **[Database Deletion Order Guide](../DATABASE_DELETION_GUIDE.md)**
- 🏠 **[Project Root Documentation](../docs/README.md)**

