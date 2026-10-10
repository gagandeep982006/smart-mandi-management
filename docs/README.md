# Comprehensive Project Documentation System

Welcome to the technical documentation system for the **Digital Agricultural & Mandi Procurement Ecosystem**. This multi-portal platform orchestrates government administration, market yard operations, farmer appointment bookings, and MSP payments across a shared primary/secondary database cluster.

---

## 🧭 Documentation Map

### 1. 🏗️ [Architecture](./architecture/README.md)
System topology, portal responsibilities, inter-portal boundaries, and database routing:
- [System Overview](./architecture/system-overview.md)
- [Portal Responsibilities](./architecture/portal-responsibilities.md)
- [Portal Communication & Boundaries](./architecture/portal-communication.md)
- [Database Routing & Topology](./architecture/database-routing.md)
- [Deployment Architecture](./architecture/deployment-architecture.md)
- [Architecture Decisions (ADRs)](./architecture/architecture-decisions.md)

---

### 2. ⚙️ [Setup & Installation](./setup/README.md)
Prerequisites, environment setup, database bootstrap, and running the platform:
- [Prerequisites](./setup/prerequisites.md)
- [Local Development Setup](./setup/local-development.md)
- [Environment Configuration Guide](./setup/environment-configuration.md)
- [Database Initialization Order](./setup/database-initialization.md)
- [Running All Portals Concurrently](./setup/run-all-portals.md)
- [Production Deployment Considerations](./setup/production-deployment.md)
- [First Government User Bootstrap Guide](./setup/first-government-user.md)

---

### 3. 💾 [Databases & Constraints](./databases/README.md)
Relational models, Primary/Secondary replication, views, constraints, and MongoDB logging:
- [MySQL Overview & Shared Schema](./databases/mysql-overview.md)
- [Government Database Schema](./databases/government-database.md)
- [Farmer Database Schema](./databases/farmer-database.md)
- [Mandi Database Schema](./databases/mandi-database.md)
- [Payment Database Schema](./databases/payment-database.md)
- [MongoDB Design & History Collections](./databases/mongodb-design.md)
- [Relationships & Foreign Key Constraints](./databases/relationships-and-constraints.md)
- [Indexes & MySQL Read Views](./databases/indexes-and-views.md)
- [Primary–Secondary Replication & Router](./databases/primary-secondary-replication.md)
- [Backup & Restore Procedures](./databases/backup-and-restore.md)
- [Schema Migrations & Table Evolution](./databases/migrations-and-schema-changes.md)
- [Database Deletion Order Guide](../DATABASE_DELETION_GUIDE.md)

---

### 4. 🔐 [Security & Access Control](./security/README.md)
Authentication, authorization, cryptographical privacy, and rate limiting:
- [Authentication Architecture](./security/authentication.md)
- [Authorization & RBAC / PBAC / LBAC](./security/authorization-and-permissions.md)
- [Cookie Security & Portal Isolation](./security/cookies-and-sessions.md)
- [OTP & Server-Side Map Rate Limiting](./security/otp-and-rate-limiting.md)
- [Aadhaar & Personal Data Protection](./security/aadhaar-and-personal-data.md)
- [Database Security & SQL Injection Defense](./security/database-security.md)
- [Audit Logging & Compliance](./security/audit-logging.md)

---

### 5. 🔄 [Business Workflows](./workflows/README.md)
End-to-end operational flows from onboarding to MSP disbursement:
- [Farmer Registration & Onboarding](./workflows/farmer-registration.md)
- [Booking, Rescheduling & Slot Allocation](./workflows/booking-and-rescheduling.md)
- [Mandi Queue, Weighbridge & Procurement](./workflows/mandi-queue-and-procurement.md)
- [Payment Lifecycle & Disbursement](./workflows/payment-processing.md)
- [Government Administration & Quotas](./workflows/government-administration.md)
- [Cancellation, No-Show & Failure Recovery](./workflows/cancellation-and-failure-recovery.md)

---

### 6. 🌐 [API Reference](./api/README.md)
REST endpoint specifications, authorization rules, and sample payloads:
- [Government Portal API Reference](./api/government-api.md)
- [Farmer Portal API Reference](./api/farmer-api.md)
- [Mandi Portal API Reference](./api/mandi-api.md)
- [Payment Portal API Reference](./api/payment-api.md)
- [API Error Handling & Standard Responses](./api/api-errors-and-validation.md)

---

### 7. 🛠️ [Operations & Maintenance](./operations/README.md)
Operational runbooks, backups, health checks, and troubleshooting:
- [Manual & Automatic Backup Procedures](./operations/manual-and-automatic-backups.md)
- [Monitoring & Health Check Endpoints](./operations/monitoring-and-health-checks.md)
- [Logging & Data Retention Policies](./operations/logging-and-retention.md)
- [Troubleshooting Common Issues](./operations/troubleshooting.md)
- [Disaster Recovery Runbook](./operations/disaster-recovery.md)

---

### 8. 🧪 [Testing Strategy](./testing/README.md)
Testing methodology, security audits, and verification guides:
- [Testing Strategy & Test Commands](./testing/testing-strategy.md)
- [Database & Referential Integrity Testing](./testing/database-testing.md)
- [Security & Rate Limiting Verification](./testing/security-testing.md)
- [Integration & Cross-Portal Flow Testing](./testing/integration-testing.md)

---

### 9. 📊 [Project Analysis & Comparisons](./project-analysis/README.md)
System strengths, trade-offs, competitor evaluations, and viva/interview prep:
- [Features & System Benefits](./project-analysis/features-and-benefits.md)
- [Strengths & Technical Limitations](./project-analysis/strengths-and-limitations.md)
- [Comparison with Existing Agricultural Platforms](./project-analysis/existing-platform-comparison.md)
- [Future Improvements Roadmap](./project-analysis/future-improvements.md)
- [Viva & Technical Interview Guide](./project-analysis/viva-and-interview-questions.md)

---

## 🏢 Portal Quick Links

| Directory | Portal | Tech Stack | Documentation |
|---|---|---|---|
| `goverment portel/` | Government Administrative Portal | Express (5001) / React (3001) | [Government API](./api/government-api.md) \| [Gov Portal README](../goverment%20portel/README.md) |
| `farmer portel/` | Farmer Self-Service Portal | Express (5002) / React (3002) | [Farmer API](./api/farmer-api.md) \| [Farmer Portal README](../farmer%20portel/README.md) |
| `mandi portel/` | Mandi Operations Portal | Express (5001) / React (3000) | [Mandi API](./api/mandi-api.md) \| [Mandi Portal README](../mandi%20portel/README.md) |
| `payment-portal/` | State Payment Disbursement Portal | Express (5004) / React (3004) | [Payment API](./api/payment-api.md) \| [Payment Portal README](../payment-portal/README.md) |
| `home folder/` | Central Launchpad Hub | React (3005) / Static HTML | [Home Hub README](../home%20folder/README.md) |
