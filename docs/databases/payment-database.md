# Payment Database Schema

The Payment Portal oversees government financial disbursements for completed agricultural purchases, state-isolated ledgers, and transaction proofs.

---

## 1. Tables Managed by Payment Portal

### Table: `payment`
Primary financial ledger record created upon weighbridge purchase completion.
- `payment_id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT NOT NULL UNIQUE (FK &rarr; `booking.booking_id` ON DELETE RESTRICT)
- `farmer_id` INT NOT NULL (FK &rarr; `farmer.farmer_id` ON DELETE RESTRICT)
- `mandi_id` INT NOT NULL (FK &rarr; `mandi.mandi_id` ON DELETE RESTRICT)
- `crop_id` INT NOT NULL (FK &rarr; `crop.crop_id` ON DELETE RESTRICT)
- `quantity_sold` DECIMAL(12,2) NOT NULL (Actual weight delivered in quintals)
- `rate_per_unit` DECIMAL(12,2) NOT NULL (Procurement price per unit / MSP)
- `total_payable_amount` DECIMAL(12,2) NOT NULL (Calculated total: `quantity_sold * rate_per_unit`)
- `payment_status` ENUM('PENDING','PROCESSING','PAID','FAILED','CANCELLED') DEFAULT 'PENDING'
- `payment_date` DATETIME NULL
- `generated_by_user_id` INT NULL (FK &rarr; `mandi_users.user_id` ON DELETE SET NULL)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Indexes**:
  - `idx_p_farmer (farmer_id)`
  - `idx_p_mandi (mandi_id)`
  - `idx_p_crop (crop_id)`
  - `idx_p_status (payment_status)`

### Table: `payment_completion_proof`
Transactional audit evidence uploaded by payment officers upon executing bank disbursement.
- `proof_id` INT AUTO_INCREMENT PRIMARY KEY
- `payment_id` INT NOT NULL (FK &rarr; `payment.payment_id` ON DELETE CASCADE)
- `farmer_id` INT NOT NULL (FK &rarr; `farmer.farmer_id` ON DELETE CASCADE)
- `operator_id` INT NOT NULL (ID of executing payment officer)
- `screenshot` LONGTEXT NOT NULL (Base64 encoded bank receipt / transaction screenshot)
- `transaction_reference` VARCHAR(100) NOT NULL (Bank UTR / NEFT reference number)
- `notes` TEXT NOT NULL
- `completion_date` DATETIME DEFAULT CURRENT_TIMESTAMP
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Indexes**: `idx_payment_id (payment_id)`, `idx_farmer_id (farmer_id)`.

### Table: `payment_users`
State-scoped payment disbursement officers.
- `payment_user_id` INT AUTO_INCREMENT PRIMARY KEY
- `username` VARCHAR(100) NOT NULL UNIQUE
- `role` VARCHAR(50) DEFAULT 'payment_officer'
- `permissions` TEXT NOT NULL
- `state_id` INT NOT NULL (FK &rarr; `state.state_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `status` ENUM('active','inactive') DEFAULT 'active'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### Table: `paymentuserdetails`
Profile details for payment officers.
- `detail_id` INT AUTO_INCREMENT PRIMARY KEY
- `payment_user_id` INT NOT NULL UNIQUE (FK &rarr; `payment_users.payment_user_id` ON DELETE CASCADE)
- `full_name` VARCHAR(150) NOT NULL
- `phone_number` VARCHAR(15) NOT NULL UNIQUE
- `email` VARCHAR(255) NULL
- `address` TEXT NULL
- `aadhaar_lookup` VARCHAR(64) NULL UNIQUE
- `aadhaar_hash` VARCHAR(255) NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Trigger**: `prevent_direct_delete_paymentuserdetails` prevents direct row deletion. Must delete parent `payment_users`.

### Table: `payment_login_otp`
Temporary OTP storage for Payment Officer authentication.
- `otp_id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `payment_user_id` INT NOT NULL (FK &rarr; `payment_users.payment_user_id` ON DELETE CASCADE)
- `otp_hash` VARCHAR(255) NOT NULL
- `expires_at` DATETIME NOT NULL
- `attempts` INT DEFAULT 0
- `verified` TINYINT(1) DEFAULT 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
