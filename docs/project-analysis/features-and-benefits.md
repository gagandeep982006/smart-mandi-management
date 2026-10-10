# Features & System Benefits

This document summarizes the core features implemented across the platform and the concrete benefits delivered to each user persona in the agricultural procurement supply chain.

---

## 1. Persona-Specific Benefits

### A. For Farmers (Producers)
- **Elimination of Congestion & Waiting**: Farmers book specific time slots up to 7 days in advance, eliminating physical multi-day queues with loaded vehicles outside mandis.
- **Fair Price Transparency**: Bookings and payments automatically bind to official government Minimum Support Price (MSP) rates, preventing predatory discounts by intermediaries.
- **Disbursement Visibility**: Farmers can track live DBT payment progression (`PENDING` &rarr; `PROCESSING` &rarr; `PAID`) and view bank transaction reference numbers directly.
- **Privacy & Data Security**: Citizen Aadhaar numbers are never stored in plaintext, protecting farmers from identity theft.

### B. For Mandi Staff & Counter Operators
- **Calibrated Daily Intake**: Queue slots match physical weighbridge throughput, preventing gridlock.
- **7-Day Operational Stability**: When mandi hours or working days are altered, a 7-day effective date delay guarantees that previously issued farmer appointments are honored without disruption.
- **Automated Purchase Generation**: Marking a vehicle transaction as complete automatically generates the financial payment record in MySQL, eliminating double-entry bookkeeping.

### C. For State Payment & Finance Officers
- **State Isolation**: Ledgers are strictly partitioned by state jurisdiction, preventing accidental cross-state payouts.
- **Concurrency Protection**: Row-level locking (`SELECT ... FOR UPDATE`) prevents duplicate disbursements or race conditions.
- **Audit-Ready Evidence**: Bank transaction references and receipt screenshots are attached directly to every completed payment.

### D. For Government Administrators & DBAs
- **Location-Based Scoping (LBAC)**: Officers access only the geographic jurisdictions (State, District, Tehsil) assigned to their role.
- **Strict Referential Integrity**: Foreign keys prevent orphaned payments, invalid tokens, or accidental deletion of critical infrastructure.
- **Live Analytical Oversight**: Pre-joined MySQL views provide real-time visibility into yard throughput and quota utilization.
