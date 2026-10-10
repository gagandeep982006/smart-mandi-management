# Mandi Operations Portal

Part of the **Digital Agricultural & Mandi Procurement Ecosystem**. This portal is the real-time operational engine for agricultural market yards (APMC Mandis), counter operators, and weighbridge personnel.

---

## 🏢 Features & Capabilities

- **Counter Line Operator Assignment**: Operators log in via mobile OTP and operate assigned physical weighing counters.
- **Real-Time Queue Management**: Calls waiting farmer tractor-trolleys in sequential token order (`WAITING` &rarr; `CALLED` &rarr; `ARRIVED` &rarr; `PROCESSING` &rarr; `COMPLETED`).
- **No-Show Handling**: Automatically flags missed appointments (`NOT_ARRIVED`) and advances the queue.
- **7-Day Delayed Operational Schedule**: Changes to mandi operating hours, working days, and average service times take effect after 7 days, guaranteeing predictability for farmer bookings.
- **Automated Purchase Generation**: Finalizing grain weight and MSP automatically inserts pending payment records into MySQL for the Payment Portal.

---

## 📁 Directory Structure

```text
mandi portel/
├── backend/
│   ├── controllers/       # Auth, counter, mandi, payment & queue controllers
│   ├── middleware/        # JWT auth, RBAC permissions & counter verification
│   ├── model/             # MongoDB operational history models
│   ├── routes/            # /api/auth, /api/mandi, /api/counters, /api/tokens
│   ├── services/          # Primary/Secondary DB router & cleanup scheduler
│   ├── database/          # schema.sql authoritative database schema
│   ├── .env.example       # Template environment variables
│   └── server.js          # Express application entry point (Port 5001)
│
└── frontend/
    ├── src/               # React 19 operator dashboards & calling screens
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
node server.js
# Runs on http://localhost:5001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### 3. Concurrent Execution
From `frontend/`, run both backend and frontend together:
```bash
npm run both
```

---

## 📚 Central Documentation Links

- 📖 **[Mandi Portal API Reference](../docs/api/mandi-api.md)**
- 💾 **[Mandi Database Schema](../docs/databases/mandi-database.md)**
- 🔄 **[Queue, Weighbridge & Procurement Workflow](../docs/workflows/mandi-queue-and-procurement.md)**
- 🛡️ **[Database Deletion Order Guide](../DATABASE_DELETION_GUIDE.md)**
- 🏠 **[Project Root Documentation](../docs/README.md)**
