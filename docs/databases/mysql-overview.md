# MySQL Overview & Global Configuration

This document describes the foundational MySQL database configuration, character sets, storage engines, and naming conventions used in `farmer_db`.

---

## 1. Engine & Character Set Standards

All relational tables in the ecosystem adhere to these global standards:

| Setting | Value in Schema | Rationale |
|---|---|---|
| **Storage Engine** | `InnoDB` | Guarantees ACID transactions, row-level locking (`FOR UPDATE`), and foreign key referential integrity. |
| **Character Set** | `utf8mb4` | Supports full Unicode character sets, including Indian regional scripts (Devanagari, Gurmukhi, Telugu, Tamil, etc.) and emojis. |
| **Collation** | `utf8mb4_0900_ai_ci` (or `utf8mb4_unicode_ci` on user details) | Modern Unicode 9.0 collation providing accent-insensitive and case-insensitive comparison. |
| **Foreign Key Mode** | `SET FOREIGN_KEY_CHECKS = 1;` | Enforced at runtime during all application operations. |

---

## 2. Table Naming & Primary Key Conventions

- **Table Names**: Lowercase snake_case singular or domain descriptive (e.g. `state`, `district`, `mandi`, `mandi_counter`, `booking`, `payment`, `userdetails`).
- **Primary Keys**: Surrogate integer auto-increment keys named `<table_singular>_id` (e.g. `state_id`, `mandi_id`, `counter_id`, `booking_id`, `payment_id`).
- **Foreign Keys**: Named after the referenced primary key column (e.g. `booking.counter_id` references `mandi_counter.counter_id`).
- **Constraint Names**: Explicitly prefixed constraint identifiers (e.g. `fk_b_counter`, `fk_p_booking`, `fk_counter_crop`).

---

## 3. Global Schema Table Inventory

The MySQL database contains **21 interconnected base tables**:

```text
Geographical:
  ├── state
  ├── district
  └── tehsil

Commodity & Policy:
  ├── crop
  ├── procurement_session
  └── procurement_quota

Mandi & Logistics:
  ├── mandi
  ├── mandi_timing
  ├── mandi_working_day
  ├── mandi_counter
  ├── counter_avg_time
  └── counter_service_time

Farmer & Operations:
  ├── farmer
  ├── bank_account
  ├── farmer_land
  ├── booking
  └── queue_token

Administration & Security:
  ├── app_users / userdetails / gov_login_otp
  ├── mandi_users / mandiuserdetails / mandi_user_counters / mandi_login_otp
  └── payment_users / paymentuserdetails / payment_login_otp

Disbursement:
  ├── payment
  └── payment_completion_proof
```
