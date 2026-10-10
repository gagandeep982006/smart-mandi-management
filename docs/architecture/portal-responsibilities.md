# Portal Responsibilities & Boundaries

The ecosystem enforces a strict separation of concerns across its four core portals and launchpad. This document outlines the distinct functional boundaries, target user personas, and core operations of each portal.

---

## 1. Responsibility Matrix

| Feature / Domain | Government Portal | Mandi Portal | Farmer Portal | Payment Portal | Home Hub |
|---|---|---|---|---|---|
| **Primary Audience** | State/District/Tehsil DBAs & System Admins | Mandi Supervisors & Counter Operators | Registered Farmers | State Payment & Disbursement Officers | All Users |
| **User Management** | ✅ Creates & manages App, Mandi & Payment users | ❌ Read-only operator access (`mandi_users`) | ❌ Self-registration only | ❌ Handled by Gov Portal | ❌ None |
| **Geographic Setup** | ✅ Full hierarchy (`State` &rarr; `District` &rarr; `Tehsil`) | ❌ Consumes assigned location | ❌ Scoped to residence | ❌ Scoped by State ID | ❌ Display only |
| **Mandi & Counter Config** | ✅ Creates Mandis, Counters, and daily capacity limits | ❌ Operational views only | ❌ Reads active counters | ❌ Read-only counter data | ❌ None |
| **Mandi Schedules** | ❌ Initial default creation only | ✅ Configures operating hours & working days (7-day delay) | ❌ Reads effective schedule | ❌ None | ❌ None |
| **Crop & Session Mgmt** | ✅ Creates Crops, Sessions, MSP/LSP & Quotas | ❌ Read-only crop config | ❌ Views eligible crops | ❌ Views crop rates | ❌ None |
| **Farmer Registration** | ✅ Administrative verification & land audit | ❌ Reads completed profiles | ✅ Self-service onboarding | ❌ Reads bank & land records | ❌ None |
| **Appointment Booking** | ❌ View quotas & overall analytics | ❌ Processes scheduled arrivals | ✅ Self-service slot booking & cancellation | ❌ None | ❌ None |
| **Queue Operations** | ❌ High-level summary | ✅ Calls, marks arrived, processes, completes tokens | ✅ Views live queue position | ❌ None | ❌ None |
| **Payment Generation** | ❌ Summary auditing | ✅ Auto-generates payment record upon weighing | ❌ Views disbursement status | ❌ Triggered by Mandi sale | ❌ None |
| **Disbursement Execution** | ❌ Financial reporting | ❌ Cannot disburse funds | ❌ Read-only status | ✅ Transitions `PENDING` &rarr; `PROCESSING` &rarr; `PAID` | ❌ None |

---

## 2. Portal-by-Portal Breakdown

### A. Government Portal (`goverment portel/`)
- **Core Purpose**: System configuration, jurisdictional boundaries, regulatory policy, and personnel administration.
- **Key Modules**:
  - `Location Management`: Hierarchical CRUD for States, Districts, and Tehsils.
  - `Crop & Quota Administration`: Defines agricultural seasons (Kharif, Rabi, Zaid), procurement sessions, MSP/LSP rates, and state quotas.
  - `Mandi & Counter Architecture`: Provisions physical market yards and individual procurement counters with assigned crops.
  - `Officer Provisioning`: Manages `app_users` (Government officers), `mandi_users` (Mandi staff), and `payment_users` (Disbursement officers) with Location-Based Access Control (LBAC).

### B. Mandi Operations Portal (`mandi portel/`)
- **Core Purpose**: Physical market yard logistics, queue token sequencing, weighing counter operations, and purchase confirmation.
- **Key Modules**:
  - `Counter Operator Assignment`: Counter operators log in and operate designated counter lines.
  - `Live Queue Management`: Calls waiting farmer tokens, tracks arrival, initiates weighing/processing, and marks completions.
  - `Schedule Management`: Configures operating hours and working days with a 7-day delayed effective date to protect existing appointments.
  - `Payment Record Creation`: Automatically inserts pending payment rows upon sale completion at the counter.

### C. Farmer Portal (`farmer portel/`)
- **Core Purpose**: Self-service farmer onboarding, land qualification, procurement slot booking, and queue monitoring.
- **Key Modules**:
  - `Registration & Verification`: OTP-based signup with Aadhaar blind index lookup and land parcel documentation.
  - `Appointment Booking`: Real-time slot availability calculation respecting counter service times, operational days, and state quotas.
  - `Digital Queue Token`: Issues sequential appointment passes with estimated service times and live queue tracking.
  - `Sales & Payment Tracking`: Historical sales records and live DBT disbursement status inspection.

### D. Payment Portal (`payment-portal/`)
- **Core Purpose**: State-isolated MSP disbursement, banking verification, and audit proof capture.
- **Key Modules**:
  - `State-Isolated Ledger`: Payment officers only access payments within their assigned state jurisdiction.
  - `Payment Lifecycle Engine`: Atomic transitions from `PENDING` &rarr; `PROCESSING` &rarr; `PAID` (or `FAILED`/`CANCELLED`) using row locking (`FOR UPDATE`).
  - `Proof Verification`: Attaches bank transaction reference numbers and screenshot proofs (`payment_completion_proof`).
  - `Audit Logging`: MongoDB TTL-indexed audit records tracking executing operator IDs, timestamps, and notes.

### E. Unified Home Gateway (`home folder/`)
- **Core Purpose**: Centralized single-click navigation hub linking all four portals with live port checking and environment discovery.
