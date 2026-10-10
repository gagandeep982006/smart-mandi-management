# Schema Migrations & Table Evolution

This document details guidelines for safely evolving the shared `farmer_db` relational database across all four portals without breaking active operations or foreign key integrity.

---

## 1. Zero-Downtime Migration Principles

Because all four portals share `farmer_db`:
1. **Never Drop or Rename Columns Abruptly**:
   - If a column is deprecated (e.g. changing an old status column), keep the legacy column nullable while adding the new column. Update portal backends in an orderly phase before dropping the column.
2. **Add New Columns as NULL or with Defaults**:
   - When introducing scheduling fields (e.g. `effective_date`, `pending_opening_time`), ensure columns are `DEFAULT NULL` so existing rows remain valid.
3. **Preserve Views**:
   - Dropping or modifying columns used in MySQL views (`vw_mandis`, `vw_payment_details`, `vw_booking_queue`) will invalidate the view. Always run `CREATE OR REPLACE VIEW` alongside schema alterations.

---

## 2. Managing Foreign Key Constraints During Alterations

If modifying an existing foreign key relationship:
```sql
-- Step 1: Drop foreign key constraint using its explicit constraint name
ALTER TABLE `booking` DROP FOREIGN KEY `fk_b_counter`;

-- Step 2: Modify column or add new index if necessary
-- ALTER TABLE `booking` ...

-- Step 3: Re-add foreign key with desired ON DELETE rule
ALTER TABLE `booking` 
ADD CONSTRAINT `fk_b_counter` 
FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) 
ON DELETE RESTRICT;
```

---

## 3. Maintaining Trigger Protection

When altering user tables (`app_users`, `mandi_users`, `payment_users`) and detail tables (`userdetails`, `mandiuserdetails`, `paymentuserdetails`):
- Never delete the `prevent_direct_delete_*` triggers without immediately restoring them.
- Direct row deletion on detail tables must remain prohibited so that details are only purged when the parent user account is removed.
