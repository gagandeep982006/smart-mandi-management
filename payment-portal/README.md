# State Payment Portal

A production-structured, state-isolated procurement payment disbursement system for the Department of Agriculture, Government of India. It integrates with the existing MySQL Primary/Secondary cluster and MongoDB audit logging database to manage MSP disbursements for farmers.

> [!IMPORTANT]
> **Database Deletion Dependencies**: Payment records enforce `ON DELETE RESTRICT` on bookings, farmers, crops, and mandis. To safely delete parent entities or perform payment rollbacks, follow **[DATABASE_DELETION_GUIDE.md](../DATABASE_DELETION_GUIDE.md)**.

---

## 1. Architecture and Folder Structure

The project is strictly separated into two top-level application directories:

```
payment-portal/
├── backend/
│   ├── config/                     # Configuration definitions
│   ├── controllers/
│   │   ├── authController.js       # Login, session, and logout handlers
│   │   ├── dashboardController.js  # Live state metrics and recent logs
│   │   ├── locationController.js   # Scoped district and tehsil lookups
│   │   └── paymentController.js    # Scoped listings, details, and transitions
│   ├── middleware/
│   │   ├── authMiddleware.js       # HttpOnly cookie JWT verification & user loader
│   │   └── permissionMiddleware.js # Route-level RBAC (read, process, update)
│   ├── models/
│   │   └── PaymentLog.js           # Mongoose audit log model with TTL index
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth routes
│   │   ├── dashboardRoutes.js      # /api/dashboard routes
│   │   ├── locationRoutes.js       # /api/locations routes
│   │   └── paymentRoutes.js        # /api/payments routes
│   ├── services/
│   │   ├── aadhaarService.js       # Authorized HMAC pepper Aadhaar resolution
│   │   ├── auditLogService.js      # Non-blocking MongoDB audit log writer
│   │   ├── databaserouter.js       # Primary/Secondary MySQL router (read/write)
│   │   └── paymentTransitionService.js # Transaction-safe row-locked status changes
│   ├── utils/
│   │   └── locationScope.js        # SQL query scope rewriter for state isolation
│   ├── .env                        # Local environment configuration
│   ├── .env.example                # Environment variable template
│   ├── package.json
│   └── server.js                   # Express application entry point (Port 5004)
│
├── frontend/
│   ├── public/
│   │   └── index.html              # HTML shell
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Fetch wrapper with credentials: "include"
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ConfirmDialog.js# Confirmation modal with reason input
│   │   │   │   ├── LoadingSpinner.js
│   │   │   │   ├── Pagination.js   # Server-side pagination controls
│   │   │   │   └── StatusBadge.js  # Color-coded payment status badge
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.js
│   │   │   │   ├── Header.js       # Top bar with state badge and user identity
│   │   │   │   └── Sidebar.js      # Collapsible navigation sidebar
│   │   │   └── payments/
│   │   │       ├── PaymentActionModal.js # Transition execution modal
│   │   │       ├── PaymentDetailsModal.js# Farmer, Land, Bank, Mandi & Counter tabs
│   │   │       ├── PaymentFilters.js     # Exact ID search, district & tehsil scope
│   │   │       ├── PaymentListPage.js    # Reusable list container for sections
│   │   │       └── PaymentTable.js       # Responsive data table with action buttons
│   │   ├── context/
│   │   │   └── AuthContext.js      # React Context for session management
│   │   ├── pages/
│   │   │   ├── CancelledPaymentsPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── FailedPaymentsPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── PaidPaymentsPage.js
│   │   │   ├── PendingPaymentsPage.js
│   │   │   └── ProcessingPaymentsPage.js
│   │   ├── styles/
│   │   │   ├── components.css      # Table, modal, and badge styles
│   │   │   ├── dashboard.css       # Layout grid, sidebar, and metrics styles
│   │   │   └── globals.css         # Typography, CSS variables, and buttons
│   │   ├── App.js                  # React Router configuration
│   │   └── index.js                # React DOM root entry
│   ├── .env                        # Port 3004 and API URL configuration
│   └── package.json                # Configured with concurrently
└── README.md
```

---

## 2. Technologies and Ports

| Component | Technology | Default Port | Description |
|---|---|---|---|
| **Backend** | Node.js, Express.js | `5004` | RESTful API with cookie JWT authentication |
| **Frontend** | React 19 (CRA), React Router 7 | `3004` | Modern administrative dashboard |
| **Relational DB** | MySQL 8.x (`mysql2`) | `3306` | Primary write pool + Secondary read replicas |
| **Document DB** | MongoDB (`mongoose`) | `27017` | Audit logs collection with automated TTL index |

---

## 3. Installation Commands

Navigate to each directory to install dependencies:

```bash
# 1. Install Backend Dependencies
cd payment-portal/backend
npm install

# 2. Install Frontend Dependencies
cd ../frontend
npm install
```

---

## 4. Environment Configuration (`.env`)

### Backend Configuration (`payment-portal/backend/.env`)

```ini
PORT=5004
NODE_ENV=development
FRONTEND_URL=http://localhost:3004

# JWT Session Configuration (Cookie: payment_token)
JWT_SECRET=gagandeep_yadav_982006
JWT_EXPIRES_IN=1d

# Aadhaar Security Pepper
AADHAAR_PEPPER=gagan_yadav_982006

# MongoDB Connection for Audit Logs
MONGO_URI=mongodb://127.0.0.1:27017/farmer_history

# Primary MySQL Database (Write DB & Critical Transactions)
PRIMARY_DB_HOST=localhost
PRIMARY_DB_PORT=3306
PRIMARY_DB_USER=root
PRIMARY_DB_PASSWORD=your_password
PRIMARY_DB_NAME=farmer_db
PRIMARY_DB_STATUS=RUNNING

# Secondary MySQL Database Replicas (Read DBs)
SECONDARY1_DB_HOST=localhost
SECONDARY1_DB_PORT=3306
SECONDARY1_DB_USER=root
SECONDARY1_DB_PASSWORD=your_password
SECONDARY1_DB_NAME=farmer_db
SECONDARY1_DB_STATUS=RUNNING

SECONDARY2_DB_HOST=localhost
SECONDARY2_DB_PORT=3306
SECONDARY2_DB_USER=root
SECONDARY2_DB_PASSWORD=your_password
SECONDARY2_DB_NAME=farmer_db
SECONDARY2_DB_STATUS=RUNNING

SECONDARY3_DB_HOST=localhost
SECONDARY3_DB_PORT=3306
SECONDARY3_DB_USER=root
SECONDARY3_DB_PASSWORD=your_password
SECONDARY3_DB_NAME=farmer_db
SECONDARY3_DB_STATUS=RUNNING

# Audit Log Retention Configuration
PAYMENT_LOG_RETENTION_YEARS=5
PAYMENT_RECENT_LOG_DAYS=7

# Pagination Configuration
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=50
```

### Frontend Configuration (`payment-portal/frontend/.env`)

```ini
PORT=3004
REACT_APP_API_URL=http://localhost:5004/api
```

---

## 5. How to Run Both Applications Together

Run the `concurrently` script directly from the `frontend/` directory:

```bash
cd payment-portal/frontend
npm run both
```

This single command starts:
1. **Backend** on `http://localhost:5004`
2. **Frontend** on `http://localhost:3004`

---

## 6. Authentication and `payment_token` Cookie

- Authentication verifies the operator's credentials against the `payment_users` table using `bcrypt.compare`.
- Upon successful authentication, a JWT is signed with payload `{ payment_user_id, username, role, state_id, permissions }`.
- The token is dispatched via an **HttpOnly cookie** named `payment_token` with settings:
  - `httpOnly: true` (prevents XSS theft)
  - `secure: process.env.NODE_ENV === 'production'`
  - `sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'`
  - `maxAge: 24 * 60 * 60 * 1000` (1 day)
- Frontend uses `credentials: "include"` on every request; the JWT is **never** stored in `localStorage` or `sessionStorage`.
- `POST /api/auth/logout` clears the `payment_token` cookie and records an audit log.

---

## 7. Permissions and State/District/Tehsil Isolation

Every payment user is associated with a single `state_id`.

### Enforced Permissions:
1. `payment.read`: View dashboard metrics, list payments, inspect detailed farmer, land, bank, mandi, counter, and audit records.
2. `payment.process`: Move payments from `PENDING` to `PROCESSING`, mark as `PAID`, or mark as `FAILED`.
3. `payment.update`: Cancel `PENDING` payments, restore `CANCELLED` payments, or retry `FAILED` payments.

### Mandatory Security & Location Rules:
- **Strict State Boundary**: Every payment query automatically injects `f.state_id = ?` matching `req.user.state_id`.
- **Backend Enforced**: Frontend-supplied `state_id` values are ignored.
- **District/Tehsil Ownership Validation**: Query parameters for `district_id` and `tehsil_id` are strictly verified against the database to confirm they belong to the user's assigned state before applying them to SQL queries.
- **Cross-State Protection**: If a user requests a payment ID belonging to another state, the API returns `403 Forbidden` and records an unauthorized access attempt in MongoDB.

---

## 8. Primary/Secondary Read/Write Routing

Implements the project's database router pattern via `services/databaserouter.js`:
- `getWriteDatabase()`: Always returns the **Primary** connection pool.
- `getReadDatabase()`: Randomly selects an available **Secondary** database whose status is `RUNNING`. If none are available, falls back to the **Primary**.
- Writes, status transitions, and transactions run exclusively on the Primary.
- Critical payment transitions acquire an exclusive row lock (`SELECT ... FOR UPDATE`) inside a transaction to prevent concurrent race conditions.

---

## 9. Payment Sections and Status Workflow

The portal maps the database `payment.payment_status` ENUM values across 6 dashboard sections:

| Section | Target Status | Allowed Actions | Required Permission | Requires Reason / Proof |
|---|---|---|---|---|
| **Dashboard** | All | View live metrics & recent audit activity | `payment.read` | No |
| **Pending Payments** | `PENDING` | • View Details<br>• Mark Processing (`PROCESSING`)<br>• Cancel (`CANCELLED`) | `payment.read`<br>`payment.process`<br>`payment.update` | No<br>No<br>**Reason Required** |
| **Processing Payments** | `PROCESSING` | • View Details<br>• Mark Paid (`PAID`)<br>• Mark Failed (`FAILED`) | `payment.read`<br>`payment.process`<br>`payment.process` | No<br>**Screenshot Required (+ UTR)**<br>**Reason Required** |
| **Completed / Paid** | `PAID` | • View Details & Payment Proof Receipt | `payment.read` | No |
| **Cancelled Payments** | `CANCELLED` | • View Details<br>• Restore to `PENDING` or `PROCESSING` | `payment.read`<br>`payment.update` / `payment.process` | No<br>**Reason Required** |
| **Failed Payments** | `FAILED` | • View Details<br>• Retry to `PENDING` or `PROCESSING` | `payment.read`<br>`payment.update` / `payment.process` | No<br>**Reason Required** |

---

## 9b. Payment Completion Proof and Screenshot Storage (SQL Table)

When a payment operator transitions a payment to `PAID`, a payment proof screenshot (bank transfer receipt or UTR slip) is **mandatory**.

### New SQL Table: `payment_completion_proof`
The proof is stored in a dedicated MySQL table created with foreign key relationships:

```sql
CREATE TABLE IF NOT EXISTS payment_completion_proof (
    proof_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    farmer_id INT NOT NULL,
    operator_id INT NOT NULL,
    screenshot LONGTEXT NOT NULL,
    completion_date DATETIME NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proof_payment (payment_id),
    INDEX idx_proof_farmer (farmer_id),
    CONSTRAINT fk_proof_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_farmer FOREIGN KEY (farmer_id) REFERENCES farmer(farmer_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Key Workflow Features:
1. **Mandatory Non-Null Verification**: The database schema and backend transition service strictly require `screenshot`, `transaction_reference` (UTR), and `notes`. None of them can be NULL or blank when marking a payment as `PAID`.
2. **Atomic Execution**: The proof record is inserted inside the same row-locked MySQL database transaction as the status update.
3. **Modal Upload & Preview**: Operators drag-and-drop or select an image file with live thumbnail preview, file size info, mandatory UTR reference input, and mandatory disbursal remarks.
4. **Inspection & Zoom**: Viewing completed payments renders a dedicated **Payment Proof** tab displaying the receipt image with a click-to-enlarge lightbox modal, UTR reference number, timestamp, and verifying operator.
5. **Payload Support**: Backend Express middleware supports base64 image payloads up to 50MB.

---

## 9c. Responsive Navigation and Sticky Sidebar

- **Static / Sticky Sidebar**: On desktop and laptop screens, the navigation sidebar remains anchored (`position: sticky; top: 0; height: 100vh;`) while long data tables scroll independently.
- **Laptop / Desktop Navigation**: The 3-line hamburger menu toggle button is automatically hidden on laptops and desktops (`display: none !important`), preserving standard persistent sidebar view.
- **Mobile Responsive Drawer**: On tablets and mobile phones (`max-width: 900px`):
  - Sidebar collapses off-screen into an overlay drawer (`transform: translateX(-100%)`).
  - Hamburger menu button becomes visible in the header.
  - Tapping hamburger slides the drawer into view over a darkened backdrop.
  - Tapping the backdrop, the close (`X`) button, or any navigation link automatically closes the drawer.

---

## 10. Pagination, Search and Location Filtering

- **Server-Side Pagination**: Uses parameterized SQL `LIMIT ? OFFSET ?`.
- **Configurable Page Size**: Dropdown options for `10`, `20`, and `50` rows per page.
- **Exact Payment ID Search**: Validates integer format before querying.
- **Location Filter Dropdowns**: Dynamically queries only districts and tehsils within the user's state.
- **Clear Filters**: Resets filters and resets pagination to page 1.

---

## 11. MongoDB Audit Logs and Retention Configuration

Stored in MongoDB collection `payment_portal_logs` via `models/PaymentLog.js`:
- **Recorded Fields**: `payment_id`, `state_id`, `operator_id`, `operator_username`, `action`, `previous_status`, `new_status`, `amount`, `outcome`, `reason`, `ip_address`, `timestamp`.
- **Privacy Assurance**: Passwords, OTPs, full Aadhaar numbers, and sensitive bank keys are **never** logged.
- **Automated Retention**:
  - `PAYMENT_LOG_RETENTION_YEARS=5`: Managed via MongoDB TTL index (`expireAfterSeconds = years * 365 * 24 * 60 * 60`).
  - `PAYMENT_RECENT_LOG_DAYS=7`: Filters logs displayed on the live dashboard.

---

## 12. Mandi and Mandi Counter Details in View Modal

Extends payment inspection with comprehensive Mandi details:
1. **Mandi Details**:
   - Mandi ID and Mandi Name
   - Location (Mandi State, District, Tehsil)
   - Daily intake capacity
2. **Mandi Counter Details**:
   - Counter ID, Counter Number, Counter Name
   - Operational Status (`active`/`inactive`)
   - Daily Counter Intake Capacity (Quintals/day)
   - Supported Crop
3. **Farmer & Aadhaar**:
   - Beneficiary Name, Mobile, Residential Address
   - Authorized 12-digit Aadhaar number resolved via HMAC pepper blind index (`6000 000X XXXX`)
   - Verification status
4. **Bank & Land Details**:
   - Bank Name, Account Number, IFSC, and PFMS verification
   - Attached land parcels, acreage, ownership, and land verification

---

## 13. API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user and issues `payment_token` cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user and state scope |
| `POST` | `/api/auth/logout` | Authenticated | Clears session cookie and writes audit log |

### Payments (`/api/payments`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/payments` | `payment.read` | Lists paginated payments scoped to state with filters |
| `GET` | `/api/payments/:id` | `payment.read` | Full payment details (Farmer, Mandi, Counter, Bank, Land, Logs) |
| `POST` | `/api/payments/:id/transition` | Contextual | Safely executes status transition with row locking |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | `payment.read` | Returns counts and sums grouped by status for state |
| `GET` | `/api/dashboard/recent-logs` | `payment.read` | Returns MongoDB audit logs within recent days window |

### Location Filtering (`/api/locations`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/locations/districts` | Authenticated | Returns districts belonging strictly to user's state |
| `GET` | `/api/locations/tehsils` | Authenticated | Returns tehsils for selected district in user's state |

---

## 14. Default Demo Credentials

To test the Payment Portal with existing seed data:

- **Username**: `AssamPY`
- **Password**: `AssamPY123`
- **Role**: `payment_officer`
- **Assigned State**: `Assam` (State ID: `1056`)
- **Assigned Permissions**: `payment.read`, `payment.process`, `payment.update`

---

## 15. MySQL Views Architecture & Read Optimization

To eliminate redundant and repetitive multi-table JOINs across payment endpoints while preserving database performance and state isolation, complex read queries in `paymentController.js` are optimized using dedicated MySQL views.

### 1. Defined & Reused MySQL Views

| View Name | Source Tables Joined | Primary Purpose in Controller |
|---|---|---|
| `vw_payment_details` | `payment`, `farmer`, `state (fs)`, `district (fd)`, `tehsil (ft)`, `booking`, `crop`, `mandi`, `tehsil (mt)`, `district (md)`, `state (ms)`, `mandi_counter`, `crop (mcc)`, `mandi_users`, `mandiuserdetails` | Used by `getPayments` (paginated list & count) and `getPaymentById` (full inspection) to deliver payment, beneficiary, location, mandi, counter, and generating operator details in a single query. |
| `vw_mandi_counter_users` | `mandi_users`, `mandiuserdetails`, `mandi_user_counters`, `mandi_counter`, `mandi`, `tehsil`, `district`, `state` | Used by `getPaymentById` as a fallback lookup when payments lack an explicit `generated_by_user_id`, matching assigned counter operators. |
| `vw_farmer_land_details` | `farmer_land`, `farmer`, `state`, `district`, `tehsil` | Reused by `getPaymentById` for fetching farmer land parcel verification details. |
| `vw_farmer_token_details` | `queue_token`, `booking`, `farmer`, `crop`, `mandi_counter`, `mandi` | Reused by `getPaymentById` for resolving Mandi gate queue tokens. |

### 2. Architectural Principles & Guarantees

1. **State Isolation & Parameterized Location Scoping**:
   - `applyPaymentLocationScope` configures `{ stateCol: "p.farmer_state_id", districtCol: "p.farmer_district_id", tehsilCol: "p.farmer_tehsil_id" }` when querying `vw_payment_details`.
   - Strict state authorization checks and optional district/tehsil filters are enforced at the SQL level, preventing any cross-state record exposure.
2. **Primary/Secondary Replica Alignment**:
   - `databaseInitializer.js` executes `CREATE OR REPLACE VIEW` for `vw_payment_details` and `vw_mandi_counter_users` across the Primary write DB and all running Secondary read replicas upon application boot.
   - Dynamic read routing via `databaserouter.js` seamlessly selects replicas with guaranteed view presence.
3. **Write Integrity on Base Tables**:
   - All write operations, including atomic state transitions (`transitionPaymentStatus`), row-level locks (`SELECT ... FOR UPDATE`), and audit proof storage (`payment_completion_proof`), operate directly on base physical tables on the Primary database. Views are strictly utilized for high-throughput reads.

---

## 16. OTP Abuse Protection & In-Memory Rate Limiting

The Payment Portal backend implements login rate limiting and OTP abuse prevention using a dedicated server-side in-memory JavaScript `Map` store (`services/securityStore.js`):

### Configurable Security Settings (`.env`)
```env
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_HOURS=2
OTP_RESEND_COOLDOWN_MINUTES=5
```
- **Startup Validation**: Validates at application boot that `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCKOUT_HOURS`, and `OTP_RESEND_COOLDOWN_MINUTES` exist and are valid positive numbers.
- **5-Minute Resend Cooldown**: Subsequent OTP requests within 5 minutes are rejected immediately with HTTP 429 without database lookups.
- **Lockout Mechanism**: When failed verification attempts reach `LOGIN_MAX_FAILED_ATTEMPTS`, the phone number is locked out for `LOGIN_LOCKOUT_HOURS` hours.
- **Generic Security Responses**:
  - Verification failures return HTTP 400: `"Unable to verify the OTP. Please check the code and try again."`
  - Lockout and cooldown triggers return HTTP 429: `"Too many requests. Please try again later."`
  - Thresholds, remaining attempts, and lockout expiry times are never disclosed to users.
- **Memory Bounding & Eviction**:
  - Maximum 10,000 entries with automatic purge of expired items and FIFO/LRU eviction.
  - Keys are SHA-256 hashed to avoid storing plaintext phone numbers or IPs.
- **Security Boundaries**: Cookies never dictate security state. Clearing browser cookies does not reset server rate limits. Successful authentication resets only the user's phone failure counter, never IP rate limits.
- **Known Limitation**: In-memory JavaScript `Map` is process-local. Backend restarts clear active counters, and multi-instance deployments maintain separate rate-limiting buckets per process.

---

## 17. Central Documentation Links

- 📖 **[Payment Portal API Reference](../docs/api/payment-api.md)**
- 💾 **[Payment Database Schema](../docs/databases/payment-database.md)**
- 🔄 **[Payment Processing & State Machine Workflow](../docs/workflows/payment-processing.md)**
- 🛡️ **[Database Deletion Order Guide](../DATABASE_DELETION_GUIDE.md)**
- 🏠 **[Project Root Documentation](../docs/README.md)**

