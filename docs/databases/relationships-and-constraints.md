# Relationships & Foreign Key Constraints

This document details the foreign key constraints, cascading policies, and deletion dependencies across the `farmer_db` relational database.

> [!IMPORTANT]
> **Complete Deletion Order Recipes**: For exact step-by-step SQL scripts (`START TRANSACTION; ... COMMIT;`) required to delete records without encountering constraint errors, see the dedicated **[Database Deletion Order Guide](../../DATABASE_DELETION_GUIDE.md)**.

---

## 1. Foreign Key Action Rules Overview

In MySQL InnoDB:
- 🔴 **`ON DELETE RESTRICT`**: Prohibits deletion of the parent row if any child row references it. The child records must be resolved or deleted first.
- 🟢 **`ON DELETE CASCADE`**: Automatically removes dependent child rows when the parent is deleted.
- 🟡 **`ON DELETE SET NULL`**: Retains child rows but sets the foreign key column to `NULL` (used for auditing references like `generated_by_user_id`).
- 🛡️ **SQL Triggers (`BEFORE DELETE`)**: Application triggers that deliberately raise SQLSTATE `45000` to prevent direct deletion of profile rows.

---

## 2. Complete Foreign Key Matrix

| Parent Table | Child Table | Foreign Key | Rule | Operational Rationale |
|---|---|---|---|---|
| `state` | `district` | `state_id` | 🔴 **RESTRICT** | Cannot delete a state while districts exist. |
| `state` | `procurement_quota` | `state_id` | 🔴 **RESTRICT** | Prevents deleting state with active procurement quotas. |
| `state` | `farmer` | `state_id` | 🔴 **RESTRICT** | Protects registered farmer state affiliations. |
| `state` | `payment_users` | `state_id` | 🔴 **RESTRICT** | Protects state payment officer accounts. |
| `state` | `app_users` | `state_id` | 🟢 **CASCADE** | State admins cascade on state removal. |
| `district` | `tehsil` | `district_id` | 🔴 **RESTRICT** | Cannot delete district while sub-districts exist. |
| `district` | `farmer` | `district_id` | 🔴 **RESTRICT** | Protects registered farmer district affiliations. |
| `district` | `app_users` | `district_id` | 🟢 **CASCADE** | District admins cascade on district removal. |
| `tehsil` | `mandi` | `tehsil_id` | 🔴 **RESTRICT** | Mandis must be resolved before removing a tehsil. |
| `tehsil` | `farmer` | `tehsil_id` | 🔴 **RESTRICT** | Protects registered farmer tehsil affiliations. |
| `tehsil` | `app_users` | `tehsil_id` | 🟢 **CASCADE** | Tehsil admins cascade on tehsil removal. |
| `crop` | `mandi_counter` | `crop_id` | 🔴 **RESTRICT** | Cannot delete crop assigned to physical counters. |
| `crop` | `procurement_session`| `crop_id` | 🔴 **RESTRICT** | Cannot delete crop with active procurement sessions. |
| `crop` | `procurement_quota` | `crop_id` | 🔴 **RESTRICT** | Cannot delete crop with allocated statutory quotas. |
| `crop` | `booking` | `crop_id` | 🔴 **RESTRICT** | Cannot delete crop with booked appointments. |
| `crop` | `payment` | `crop_id` | 🔴 **RESTRICT** | Cannot delete crop with financial purchase records. |
| `mandi` | `mandi_timing` | `mandi_id` | 🟢 **CASCADE** | Timing schedule cascades on mandi deletion. |
| `mandi` | `mandi_working_day` | `mandi_id` | 🟢 **CASCADE** | Working days schedule cascades. |
| `mandi` | `counter_avg_time` | `mandi_id` | 🟢 **CASCADE** | Counter avg timing config cascades. |
| `mandi` | `mandi_users` | `mandi_id` | 🟢 **CASCADE** | Mandi staff user accounts cascade. |
| `mandi` | `mandi_counter` | `mandi_id` | 🟢 **CASCADE** | Counters cascade (**Blocked if child bookings exist!**). |
| `mandi` | `payment` | `mandi_id` | 🔴 **RESTRICT** | Mandi with historical payments cannot be deleted. |
| `mandi_counter` | `booking` | `counter_id` | 🔴 **RESTRICT** | **Crucial Block**: Bookings block counter deletion! |
| `mandi_counter` | `queue_token` | `counter_id` | 🟢 **CASCADE** | Queue tokens cascade on counter deletion. |
| `mandi_counter` | `counter_avg_time` | `counter_avg_time.counter_id` | 🟢 **CASCADE** | Average times cascade. |
| `mandi_counter` | `counter_service_time`| `counter_service_time.counter_id`| 🟢 **CASCADE** | Service times cascade. |
| `mandi_counter` | `mandi_user_counters`| `mandi_user_counters.counter_id`| 🟢 **CASCADE** | Operator assignments cascade. |
| `procurement_session`| `booking` | `session_id` | 🔴 **RESTRICT** | Bookings block procurement session deletion. |
| `booking` | `payment` | `booking_id` | 🔴 **RESTRICT** | **Crucial Block**: Payments block booking deletion! |
| `booking` | `queue_token` | `booking_id` | 🟢 **CASCADE** | Queue tokens cascade on booking deletion. |
| `payment` | `payment_completion_proof`| `payment_id` | 🟢 **CASCADE** | Proof screenshots cascade on payment deletion. |
| `farmer` | `bank_account` | `farmer_id` | 🟢 **CASCADE** | Bank details cascade on farmer deletion. |
| `farmer` | `farmer_land` | `farmer_id` | 🟢 **CASCADE** | Land parcels cascade on farmer deletion. |
| `farmer` | `booking` | `farmer_id` | 🟢 **CASCADE** | Bookings cascade (**Blocked if child payments exist!**). |
| `farmer` | `payment` | `farmer_id` | 🔴 **RESTRICT** | **Crucial Block**: Payments block farmer deletion! |
| `app_users` | `userdetails` | `user_id` | 🟢 **CASCADE** | Details cascade (**Trigger blocks direct delete**). |
| `mandi_users` | `mandiuserdetails` | `user_id` | 🟢 **CASCADE** | Details cascade (**Trigger blocks direct delete**). |
| `payment_users` | `paymentuserdetails`| `payment_user_id`| 🟢 **CASCADE** | Details cascade (**Trigger blocks direct delete**). |

---

## 3. Reverse Dependency Deletion Chain (Example)

To delete a physical **Mandi Counter (`mandi_counter`)**, records must be deleted in exact reverse dependency order:
```text
1. payment_completion_proof  (Child of payment)
2. payment                   (Child of booking)
3. queue_token               (Child of booking/counter)
4. booking                   (Child of counter)
5. mandi_counter             (Target table - timing and operator links cascade automatically)
```

Refer to **[DATABASE_DELETION_GUIDE.md](../../DATABASE_DELETION_GUIDE.md)** for complete SQL scripts for all entities.
