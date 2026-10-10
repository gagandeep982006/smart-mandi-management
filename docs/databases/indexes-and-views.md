# Indexes & MySQL Read Views

This document covers index optimization strategies and pre-joined MySQL views implemented to accelerate query performance and simplify complex joins.

---

## 1. Key Performance Indexes

The schema creates indexes strategically on foreign keys, lookup hashes, and high-frequency filter columns:

### A. Aadhaar Blind Index Lookups
- `farmer.uq_farmer_aadhaar_lookup (aadhaar_lookup)`: `UNIQUE` $B\text{-tree}$ index enabling $O(1)$ duplicate checks and login resolution without revealing plaintext Aadhaar.
- `userdetails.aadhaar_lookup`, `mandiuserdetails.aadhaar_lookup`, `paymentuserdetails.aadhaar_lookup`: Unique indexes across user profile tables.

### B. Queue & Booking Scheduling Indexes
- `booking.idx_b_counter_date (counter_id, booking_time)`: Composite index optimizing slot availability calculation and counter-specific daily capacity checks.
- `queue_token.idx_qt_queue (counter_id, service_date, status, queue_position)`: Multi-column composite index accelerating queue display and next-token retrieval.

### C. Financial & Location Indexes
- `payment.idx_p_farmer`, `payment.idx_p_mandi`, `payment.idx_p_crop`, `payment.idx_p_status`: Individual indexes on frequent filter fields.
- `tehsil.district_id`, `district.state_id`: Indexes on foreign keys for fast geographical cascades.

---

## 2. Pre-Joined Analytical MySQL Views

The database defines several pre-joined views to eliminate repetitive multi-table joins in Express controllers:

### View: `vw_payment_details` (Payment Portal)
Comprehensive read view joining payment, booking, farmer, mandi, counter, crop, bank, and land details:
```sql
CREATE OR REPLACE VIEW `vw_payment_details` AS
SELECT 
    p.payment_id,
    p.booking_id,
    p.farmer_id,
    p.mandi_id,
    p.crop_id,
    p.quantity_sold,
    p.rate_per_unit,
    p.total_payable_amount,
    p.payment_status,
    p.payment_date,
    p.created_at AS payment_created_at,
    p.updated_at AS payment_updated_at,
    p.generated_by_user_id,
    f.name AS farmer_name,
    f.mobile_number AS farmer_mobile,
    f.aadhaar_lookup,
    f.state_id,
    f.district_id,
    f.tehsil_id,
    s.state_name,
    d.district_name,
    t.tehsil_name,
    b.account_number,
    b.bank_name,
    b.ifsc_code,
    c.crop_name,
    c.crop_type,
    m.mandi_name,
    mc.counter_name,
    mc.counter_number,
    pcp.proof_id,
    pcp.transaction_reference,
    pcp.completion_date AS proof_completion_date,
    pcp.notes AS proof_notes
FROM payment p
JOIN farmer f ON p.farmer_id = f.farmer_id
JOIN state s ON f.state_id = s.state_id
JOIN district d ON f.district_id = d.district_id
JOIN tehsil t ON f.tehsil_id = t.tehsil_id
LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
JOIN crop c ON p.crop_id = c.crop_id
JOIN mandi m ON p.mandi_id = m.mandi_id
JOIN booking bk ON p.booking_id = bk.booking_id
JOIN mandi_counter mc ON bk.counter_id = mc.counter_id
LEFT JOIN payment_completion_proof pcp ON p.payment_id = pcp.payment_id;
```

### View: `vw_mandis` (Government & Mandi)
Aggregates mandi capacity, location names, and operational active counter statuses:
```sql
CREATE OR REPLACE VIEW `vw_mandis` AS
SELECT 
    m.mandi_id, m.mandi_name, m.tehsil_id, t.tehsil_name,
    d.district_id, d.district_name, s.state_id, s.state_name,
    m.capacity, m.created_at,
    CASE 
        WHEN COUNT(mc.counter_id) = 0 OR SUM(mc.status = 'active') = 0 THEN 'inactive' 
        ELSE 'active' 
    END AS status
FROM mandi m
JOIN tehsil t ON m.tehsil_id = t.tehsil_id
JOIN district d ON t.district_id = d.district_id
JOIN state s ON d.state_id = s.state_id
LEFT JOIN mandi_counter mc ON m.mandi_id = mc.mandi_id
GROUP BY m.mandi_id, m.mandi_name, m.tehsil_id, t.tehsil_name, d.district_id, d.district_name, s.state_id, s.state_name, m.capacity, m.created_at;
```

### View: `vw_mandi_counters`
Flattens counter assignments with parent mandi, tehsil, district, and assigned crop names.

### View: `vw_booking_queue`
Combines tokens, bookings, farmer contact info, and crop details for live counter calling screens.

### View: `vw_completed_farmers`
Lists completed procurement transactions pending or completed for payment.
