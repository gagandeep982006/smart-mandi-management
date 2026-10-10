# Farmer Database Schema

The Farmer Portal manages farmer identity, agricultural land parcels, bank accounts, and appointment bookings.

---

## 1. Tables Managed by Farmer Portal

### Table: `farmer`
Primary farmer entity containing profile and cryptographic identity markers.
- `farmer_id` INT AUTO_INCREMENT PRIMARY KEY
- `name` VARCHAR(100) NOT NULL
- `mobile_number` VARCHAR(15) NOT NULL UNIQUE
- `email` VARCHAR(255) NULL UNIQUE
- `address` VARCHAR(255) NULL
- `state_id` INT NOT NULL (FK &rarr; `state.state_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `district_id` INT NOT NULL (FK &rarr; `district.district_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `tehsil_id` INT NOT NULL (FK &rarr; `tehsil.tehsil_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `aadhaar_hash` VARCHAR(255) NOT NULL (bcrypt hash for storage verification)
- `aadhaar_lookup` VARCHAR(64) NOT NULL UNIQUE (HMAC-SHA256 blind index for deterministic lookup)
- `aadhaar_verified` TINYINT(1) DEFAULT 0
- `aadhaar_verified_at` TIMESTAMP NULL
- `registration_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `status` ENUM('active','inactive','suspended') DEFAULT 'active'
- `verification_status` TINYINT(1) DEFAULT 0
- `mobile_verified` TINYINT(1) DEFAULT 0
- `mobile_verified_at` TIMESTAMP NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Referenced by**: `bank_account.farmer_id` (CASCADE), `farmer_land.farmer_id` (CASCADE), `booking.farmer_id` (CASCADE), `payment.farmer_id` (RESTRICT), `payment_completion_proof.farmer_id` (CASCADE).

### Table: `bank_account`
Farmer banking credentials for Direct Benefit Transfer (DBT) disbursement.
- `account_id` INT AUTO_INCREMENT PRIMARY KEY
- `farmer_id` INT NOT NULL UNIQUE (FK &rarr; `farmer.farmer_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `bank_name` VARCHAR(100) NOT NULL
- `account_number` VARCHAR(50) NOT NULL
- `ifsc_code` VARCHAR(11) NOT NULL
- `verification_status` TINYINT(1) DEFAULT 0
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Table: `farmer_land`
Agricultural land parcels owned or leased by the farmer, used to calculate maximum allowable procurement quotas.
- `land_id` INT AUTO_INCREMENT PRIMARY KEY
- `farmer_id` INT NOT NULL (FK &rarr; `farmer.farmer_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `area` DECIMAL(12,2) NOT NULL (Land area in acres / hectares)
- `ownership_type` ENUM('owned','leased','shared') NOT NULL
- `land_type` ENUM('agricultural','irrigated','non_irrigated') NOT NULL
- `land_verification` ENUM('pending','verified','rejected') DEFAULT 'pending'
- `land_verified_at` TIMESTAMP NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Table: `booking`
Appointment reservations booked by farmers to sell grain at a specific mandi counter.
- `booking_id` INT AUTO_INCREMENT PRIMARY KEY
- `farmer_id` INT NOT NULL (FK &rarr; `farmer.farmer_id` ON DELETE CASCADE)
- `crop_id` INT NOT NULL (FK &rarr; `crop.crop_id` ON DELETE RESTRICT)
- `session_id` INT NOT NULL (FK &rarr; `procurement_session.session_id` ON DELETE RESTRICT)
- `counter_id` INT NOT NULL (FK &rarr; `mandi_counter.counter_id` ON DELETE RESTRICT)
- `quantity_req` DECIMAL(12,2) NOT NULL (Requested sale quantity)
- `quantity_approved` DECIMAL(12,2) NOT NULL (Approved quantity eligible for sale)
- `booking_time` DATETIME NOT NULL (Scheduled appointment date & time)
- `status` ENUM('BOOKED','WAITING','CALLED','ARRIVED','PROCESSING','COMPLETED','NOT_ARRIVED','RESCHEDULED','CANCELLED') DEFAULT 'BOOKED'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Referenced by**: `queue_token.booking_id` (CASCADE), `payment.booking_id` (RESTRICT).
- **Composite Index**: `KEY idx_b_counter_date (counter_id, booking_time)`.
