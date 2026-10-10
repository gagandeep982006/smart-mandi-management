# Government Database Schema

The Government Portal administers the foundational geographic hierarchy, commodity catalog, procurement sessions, state quotas, and user accounts.

---

## 1. Tables Managed by Government Portal

### Table: `state`
Defines Indian state jurisdictions for quota isolation and Location-Based Access Control (LBAC).
- `state_id` INT AUTO_INCREMENT PRIMARY KEY
- `state_name` VARCHAR(100) NOT NULL UNIQUE
- `state_code` VARCHAR(10) NOT NULL UNIQUE
- **Referenced by**: `district.state_id` (RESTRICT), `procurement_quota.state_id` (RESTRICT), `farmer.state_id` (RESTRICT), `payment_users.state_id` (RESTRICT), `app_users.state_id` (CASCADE).

### Table: `district`
Second-tier geographic division under a state.
- `district_id` INT AUTO_INCREMENT PRIMARY KEY
- `state_id` INT NOT NULL (FK &rarr; `state.state_id` ON DELETE RESTRICT)
- `district_name` VARCHAR(100) NOT NULL
- `district_code` VARCHAR(10) NOT NULL UNIQUE
- **Referenced by**: `tehsil.district_id` (RESTRICT), `farmer.district_id` (RESTRICT), `app_users.district_id` (CASCADE).

### Table: `tehsil`
Third-tier sub-district administrative block where mandis are located.
- `tehsil_id` INT AUTO_INCREMENT PRIMARY KEY
- `district_id` INT NOT NULL (FK &rarr; `district.district_id` ON DELETE RESTRICT)
- `tehsil_name` VARCHAR(100) NOT NULL
- `tehsil_code` VARCHAR(10) NOT NULL UNIQUE
- **Referenced by**: `mandi.tehsil_id` (RESTRICT), `farmer.tehsil_id` (RESTRICT), `app_users.tehsil_id` (CASCADE).

### Table: `crop`
Agricultural commodity catalog.
- `crop_id` INT AUTO_INCREMENT PRIMARY KEY
- `crop_name` VARCHAR(100) NOT NULL
- `crop_type` ENUM('rabi','kharif','zaid') NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Unique Constraint**: `UNIQUE KEY (crop_name, crop_type)`
- **Referenced by**: `mandi_counter.crop_id` (RESTRICT), `procurement_session.crop_id` (RESTRICT), `procurement_quota.crop_id` (RESTRICT), `booking.crop_id` (RESTRICT), `payment.crop_id` (RESTRICT).

### Table: `procurement_session`
Defines operational procurement windows and seasons.
- `session_id` INT AUTO_INCREMENT PRIMARY KEY
- `session_name` VARCHAR(150) NOT NULL
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL
- `crop_id` INT NOT NULL (FK &rarr; `crop.crop_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Referenced by**: `booking.session_id` (RESTRICT).

### Table: `procurement_quota`
State procurement limits, Lower Selling Price (LSP), and Minimum Support Price (MSP).
- `quota_id` INT AUTO_INCREMENT PRIMARY KEY
- `state_id` INT NOT NULL (FK &rarr; `state.state_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `crop_id` INT NOT NULL (FK &rarr; `crop.crop_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `amount` DECIMAL(12,2) NOT NULL (Target quota quantity in quintals)
- `lsp` DECIMAL(12,2) NOT NULL
- `msp` DECIMAL(12,2) NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Unique Constraint**: `UNIQUE KEY (state_id, crop_id)`

### Table: `app_users`
Government administrative user accounts.
- `user_id` INT AUTO_INCREMENT PRIMARY KEY
- `username` VARCHAR(100) NOT NULL UNIQUE
- `role` VARCHAR(50) NOT NULL DEFAULT 'user'
- `permissions` TEXT NOT NULL (JSON array of permissions e.g. `["read","write","update","delete"]`)
- `state_id` INT NULL (FK &rarr; `state.state_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `district_id` INT NULL (FK &rarr; `district.district_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `tehsil_id` INT NULL (FK &rarr; `tehsil.tehsil_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `status` ENUM('active','inactive') DEFAULT 'active'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### Table: `userdetails`
Profile details for Government users.
- `detail_id` INT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT NOT NULL UNIQUE (FK &rarr; `app_users.user_id` ON DELETE CASCADE)
- `full_name` VARCHAR(150) NOT NULL
- `phone_number` VARCHAR(15) NOT NULL UNIQUE
- `email` VARCHAR(255) NULL
- `address` TEXT NULL
- `aadhaar_lookup` VARCHAR(64) NULL UNIQUE
- `aadhaar_hash` VARCHAR(255) NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Trigger**: `prevent_direct_delete_userdetails` prevents direct SQL deletion. Must delete parent `app_users`.

### Table: `gov_login_otp`
Temporary OTP storage for Government user mobile login.
- `otp_id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT NOT NULL (FK &rarr; `app_users.user_id` ON DELETE CASCADE)
- `otp_hash` VARCHAR(255) NOT NULL
- `expires_at` DATETIME NOT NULL
- `attempts` INT NOT NULL DEFAULT 0
- `verified` TINYINT(1) NOT NULL DEFAULT 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
