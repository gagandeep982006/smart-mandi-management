# Database & Referential Integrity Testing

This guide explains how to test and verify foreign key constraints, cascading behaviors, triggers, and read views.

---

## 1. Verifying Foreign Key Constraint Enforcement

To verify that MySQL actively enforces `ON DELETE RESTRICT` (and that foreign key checks are not disabled):

```sql
-- Test 1: Attempt to delete a Mandi Counter that has bookings
-- Expected Result: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
DELETE FROM mandi_counter WHERE counter_id = (SELECT counter_id FROM booking LIMIT 1);

-- Test 2: Attempt to delete a Booking that has payments
-- Expected Result: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
DELETE FROM booking WHERE booking_id = (SELECT booking_id FROM payment LIMIT 1);

-- Test 3: Attempt to delete a Farmer with active payments
-- Expected Result: ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
DELETE FROM farmer WHERE farmer_id = (SELECT farmer_id FROM payment LIMIT 1);
```

If these statements throw `ERROR 1451`, foreign key referential integrity is functioning correctly.

---

## 2. Verifying Trigger Protection on User Details

To verify that triggers prevent direct detail deletion:

```sql
-- Test: Attempt direct deletion on userdetails
-- Expected Result: ERROR 1644 (45000): Direct deletion of userdetails is prohibited...
DELETE FROM userdetails LIMIT 1;

-- Test: Attempt direct deletion on mandiuserdetails
-- Expected Result: ERROR 1644 (45000): Direct deletion of mandiuserdetails is prohibited...
DELETE FROM mandiuserdetails LIMIT 1;
```

If these statements throw `SQLSTATE 45000`, the security triggers are active and protecting profile rows.

---

## 3. Verifying MySQL Read Views

Run verification queries against all views:
```sql
SELECT COUNT(*) FROM vw_mandis;
SELECT COUNT(*) FROM vw_mandi_counters;
SELECT COUNT(*) FROM vw_booking_queue;
SELECT COUNT(*) FROM vw_completed_farmers;
SELECT COUNT(*) FROM vw_payment_details;
```
Ensure all views return result rows without SQL syntax or missing column errors.
