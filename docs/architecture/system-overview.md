# System Overview

The **Digital Agricultural & Mandi Procurement Ecosystem** is an enterprise-grade platform designed to digitize public procurement, regulate market yard logistics, guarantee Minimum Support Price (MSP) disbursements, and provide transparent appointment scheduling for Indian farmers.

---

## 1. Problem Statement & Operational Context

In traditional grain procurement and Agricultural Produce Market Committee (APMC) yards:
- **Long Physical Queues**: Farmers queue with heavily loaded tractor-trolleys for days without guaranteed appointment slots, causing traffic congestion, grain spoilage, and exploitation by middlemen.
- **Capacity Mismatches**: Mandi yards operate with fixed physical weighing counters and uncalibrated daily intake limits.
- **Disbursement Bottlenecks**: Financial reconciliation between mandi weighbridge scale records and bank transfers is prone to manual data entry errors and lack of verifiable audit trails.
- **Jurisdiction Leaks**: State procurement officers require strict geographical boundary enforcement (State &rarr; District &rarr; Tehsil) to ensure state quotas and budgetary allocations remain isolated.

---

## 2. Platform Architecture

The platform addresses these issues through a **modular distributed micro-portal architecture** connected to a unified relational and document data backbone:

1. **Four Specialized Portals**:
   - **Government Portal**: Administrative engine configuring crops, seasons, quotas, mandis, counters, and personnel.
   - **Mandi Portal**: Real-time operational engine managing yard queues, token callings, weighing, and purchase generation.
   - **Farmer Portal**: Self-service portal for farmers to register, verify land records, book time slots, and monitor queues.
   - **Payment Portal**: State-isolated financial engine overseeing DBT payments, status transitions, and audit records.
2. **Unified Navigation Hub (`home folder`)**:
   - Single-click launcher allowing operators, officers, and farmers to navigate between portals seamlessly.
3. **Primary-Secondary MySQL Topology**:
   - Centralizes transactional integrity on a Primary Write database (`farmer_db`) while distributing intensive read queries (queue displays, listings, search) across up to three Secondary read replicas.
4. **MongoDB Audit & Session Log Layer**:
   - Maintains immutable, non-blocking operational logs (`BookingHistory`, `TokenHistory`, `PaymentHistory`, `PaymentLog`, `LoginLogs`).

---

## 3. Technology Stack Summary

| Layer | Technologies Verified in Codebase |
|---|---|
| **Frontend Framework** | React 19 (`react`, `react-dom`, `react-router-dom`), `lucide-react`, `react-scripts` 5.0.1 |
| **Backend Runtime** | Node.js (v18+ recommended) with Express.js 5 (`express` ^5.2.1) |
| **Relational Database** | MySQL 8.x with `mysql2` connection pooling and Primary/Secondary routing |
| **Document Database** | MongoDB with Mongoose ODM (`mongoose` ^9.x) for audit trails and time-to-live (TTL) collections |
| **Authentication & Tokens** | JSON Web Tokens (`jsonwebtoken` ^9.0.3) signed with 256-bit symmetric secrets |
| **Session Transport** | Secure, HttpOnly, SameSite cookies via `cookie-parser` |
| **Password Cryptography** | `bcrypt` (^6.0.0) with salt rounds configured |
| **Identity Protection** | HMAC-SHA256 blind indexing with high-entropy pepper (`AADHAAR_PEPPER`) + bcrypt storage |
| **Rate Limiting** | Dedicated server-side in-memory JavaScript `Map` with bounded LRU eviction |
