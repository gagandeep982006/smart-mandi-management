# Farmer Self-Service Portal

Part of the **Digital Agricultural & Mandi Procurement Ecosystem**. This portal empowers agricultural producers to register their profiles, manage land parcels, book grain procurement appointment slots, receive digital queue tokens, and track government MSP payments.

---

## 🌾 Features & Capabilities

- **Farmer Self-Service Registration**: Mobile number + OTP onboarding with two-tier Aadhaar cryptographic protection (blind index lookup + bcrypt storage hash).
- **Land Parcel & Bank Management**: Documents agricultural land area and binds bank accounts for Direct Benefit Transfer (DBT) disbursements.
- **Dynamic Slot Availability**: 7-day lookahead booking engine calibrated against physical counter capacity and 7-day effective mandi operational schedules.
- **Digital Queue Token Pass**: Sequential appointment passes (`TK-XXXX-XXX`) with estimated service times and live status tracking.
- **Sales & Payment History**: Transparent visibility into completed weighbridge transactions and live payout status (`PENDING`, `PROCESSING`, `PAID`).

---

## 📁 Directory Structure

```text
farmer portel/
├── backend/
│   ├── config/            # MySQL and MongoDB connection setup
│   ├── controller/        # Auth, farmer profile & booking controllers
│   ├── database/          # Primary/Secondary database router
│   ├── middleware/        # JWT cookie authentication middleware
│   ├── model/             # OTP table initializers & MongoDB models
│   ├── routes/            # /api/auth and /api/farmer routes
│   ├── services/          # Slot availability & in-memory security store
│   ├── .env.example       # Template environment variables
│   └── index.js           # Express application entry point (Port 5002)
│
└── frontend/
    ├── src/               # React 19 UI components, hooks & services
    ├── public/            # Static assets
    └── package.json       # React dependencies & scripts
```

---

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your local MySQL password and MongoDB URI
node index.js
# Runs on http://localhost:5002
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3002
```

### 3. Concurrent Execution
From `frontend/`, run both backend and frontend together:
```bash
npm run both
```

---

## 📚 Central Documentation Links

- 📖 **[Farmer Portal API Reference](../docs/api/farmer-api.md)**
- 💾 **[Farmer Database Schema](../docs/databases/farmer-database.md)**
- 🔄 **[Booking & Slot Allocation Workflow](../docs/workflows/booking-and-rescheduling.md)**
- 🔐 **[Aadhaar & Personal Data Security](../docs/security/aadhaar-and-personal-data.md)**
- 🏠 **[Project Root Documentation](../docs/README.md)**
