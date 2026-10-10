# Environment Configuration Guide

Each portal backend reads configuration settings via `process.env` loaded using `dotenv`. This reference document details every verified environment variable, its purpose, default/example values, and whether modifying it requires a process restart.

> [!CAUTION]
> **Security Notice**: Never commit `.env` files to git or publish production secrets. Use `.env.example` templates with placeholders when sharing code.

---

## 1. Common Core Environment Variables

These variables are shared across multiple portals:

| Variable Name | Purpose | Example Value | Requires Restart |
|---|---|---|---|
| `PORT` | Local TCP port for the Express backend server | `5001`, `5002`, `5004` | Yes |
| `NODE_ENV` | Runtime mode (`development` or `production`) | `development` | Yes |
| `FRONTEND_URL` | Trusted origin allowed by CORS middleware | `http://localhost:3000` | Yes |
| `PRIMARY_DB_HOST` | Hostname/IP of Primary MySQL (Write DB) | `localhost` | Yes |
| `PRIMARY_DB_PORT` | Port of Primary MySQL instance | `3306` | Yes |
| `PRIMARY_DB_USER` | MySQL authentication username | `root` | Yes |
| `PRIMARY_DB_PASSWORD` | MySQL authentication password | `replace_with_your_password` | Yes |
| `PRIMARY_DB_NAME` | Primary relational database name | `farmer_db` | Yes |
| `PRIMARY_DB_STATUS` | Health status flag checked by databaserouter | `RUNNING` | Yes |
| `SECONDARY1_DB_HOST`| Hostname of Secondary MySQL Read Replica 1 | `localhost` | Yes |
| `SECONDARY1_DB_PORT`| Port of Secondary MySQL Read Replica 1 | `3306` (or `3307`) | Yes |
| `SECONDARY1_DB_USER`| Username for Secondary Replica 1 | `root` | Yes |
| `SECONDARY1_DB_PASSWORD`| Password for Secondary Replica 1 | `replace_with_your_password`| Yes |
| `SECONDARY1_DB_NAME`| Database name on Replica 1 | `farmer_db` | Yes |
| `SECONDARY1_DB_STATUS`| Replication/running status for Replica 1 | `RUNNING` | Yes |
| `MONGO_URI` | MongoDB connection connection string | `mongodb://127.0.0.1:27017/farmer_history` | Yes |
| `JWT_SECRET` | Cryptographic secret for signing JWT cookies | `replace_with_a_long_random_secret` | Yes |
| `JWT_EXPIRES_IN` | Token validity duration | `1d` or `1h` | Yes |
| `AADHAAR_PEPPER` | HMAC-SHA256 pepper for Aadhaar blind index | `replace_with_a_high_entropy_secret` | Yes |

---

## 2. Server-Side Rate Limiting & Abuse Prevention Variables

All four portal backends enforce in-memory rate limiting via `services/securityStore.js`. Missing or invalid numbers cause backend startup to fail safely:

| Variable Name | Purpose | Verified Value | Scope |
|---|---|---|---|
| `LOGIN_MAX_FAILED_ATTEMPTS` | Maximum failed login/OTP attempts before lockout | `5` | Per Phone / User |
| `LOGIN_LOCKOUT_HOURS` | Temporary account lockout duration in hours | `2` | Hours |
| `OTP_RESEND_COOLDOWN_MINUTES`| Minimum time required between successive OTP requests | `5` | Minutes |

---

## 3. Portal-Specific Variables

### A. Government Portal Backend (`goverment portel/backend/.env`)
| Variable Name | Purpose | Example Value |
|---|---|---|
| `GOV_SECURITY_VERIFICATION_PASSWORD` | Password required for sensitive DBA actions (user provisioning) | `replace_with_secure_gov_password` |

### B. Mandi Portal Backend (`mandi portel/backend/.env`)
| Variable Name | Purpose | Example Value |
|---|---|---|
| `BCRYPT_SALT_ROUNDS` | Salt rounds for operator passwords | `12` |
| `TRANSACTION_HISTORY_RETENTION_DAYS` | Days to retain MongoDB operational session history | `30` |
| `RECENT_LOG_RETENTION_DAYS` | Days to retain MandiRecentLogs in MongoDB | `7` |
| `COMPLETED_FARMERS_RETENTION_DAYS` | Lookback period in days for completed farmer dashboard | `7` |
| `MANDI_TIMING_SETTINGS_PASSWORD` | Password required to alter operating hours/working days | `replace_with_secure_mandi_password` |

### C. Farmer Portal Backend (`farmer portel/backend/.env`)
| Variable Name | Purpose | Example Value |
|---|---|---|
| `FARMER_SALES_HISTORY_YEARS` | Years of past sales history shown to farmer in UI | `2` |
| `RECENT_BOOKING_DAYS` | Days of recent bookings shown to farmer | `7` |
| `FARMER_PROCUREMENT_HISTORY_RETENTION_YEARS`| Scheduled retention for booking/tokens in MySQL | `5` |
| `PAGINATION_LIMIT` | Default rows per page for listings | `10` |

### D. Payment Portal Backend (`payment-portal/backend/.env`)
| Variable Name | Purpose | Example Value |
|---|---|---|
| `PAYMENT_LOG_RETENTION_YEARS` | Years before MongoDB TTL index automatically cleans logs | `5` |
| `PAYMENT_RECENT_LOG_DAYS` | Days of recent activity to display on dashboard | `7` |
| `DEFAULT_PAGE_SIZE` | Default page size for payment transaction tables | `10` |
| `MAX_PAGE_SIZE` | Maximum page size permitted per request | `50` |
