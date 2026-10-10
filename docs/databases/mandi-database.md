# Mandi Database Schema

The Mandi Portal manages market yard facilities, physical weighing counters, operational schedules, daily queue tokens, and counter operators.

---

## 1. Tables Managed by Mandi Portal

### Table: `mandi`
Agricultural market yard (APMC Mandi).
- `mandi_id` INT AUTO_INCREMENT PRIMARY KEY
- `mandi_name` VARCHAR(100) NOT NULL
- `tehsil_id` INT NOT NULL (FK &rarr; `tehsil.tehsil_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `capacity` DECIMAL(12,2) NOT NULL (Maximum daily grain capacity)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Unique Constraint**: `UNIQUE KEY (mandi_name, tehsil_id)`
- **Referenced by**: `mandi_timing.mandi_id` (CASCADE), `mandi_working_day.mandi_id` (CASCADE), `mandi_counter.mandi_id` (CASCADE), `counter_avg_time.mandi_id` (CASCADE), `mandi_users.mandi_id` (CASCADE), `payment.mandi_id` (RESTRICT).

### Table: `mandi_timing`
Operating hours for a mandi with 7-day effective date staging.
- `mandi_id` INT PRIMARY KEY (FK &rarr; `mandi.mandi_id` ON DELETE CASCADE)
- `opening_time` TIME NOT NULL DEFAULT '09:00:00'
- `closing_time` TIME NOT NULL DEFAULT '17:00:00'
- `pending_opening_time` TIME NULL
- `pending_closing_time` TIME NULL
- `effective_date` DATE NULL (Date when pending timings become effective)
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### Table: `mandi_working_day`
Weekly working day configuration (Monday–Sunday) with 7-day effective date staging.
- `working_day_id` INT AUTO_INCREMENT PRIMARY KEY
- `mandi_id` INT NOT NULL (FK &rarr; `mandi.mandi_id` ON DELETE CASCADE)
- `day_of_week` ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL
- `is_working` TINYINT(1) NOT NULL DEFAULT 1
- `pending_is_working` TINYINT(1) NULL
- `effective_date` DATE NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **Unique Constraint**: `UNIQUE KEY (mandi_id, day_of_week)`

### Table: `mandi_counter`
Physical weighbridge and procurement counters in a mandi.
- `counter_id` INT AUTO_INCREMENT PRIMARY KEY
- `mandi_id` INT NOT NULL (FK &rarr; `mandi.mandi_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `counter_number` INT NOT NULL
- `counter_name` VARCHAR(100) NOT NULL
- `crop_id` INT NOT NULL (FK &rarr; `crop.crop_id` ON DELETE RESTRICT ON UPDATE CASCADE)
- `capacity_per_day` DECIMAL(12,2) NOT NULL
- `status` ENUM('active','inactive') DEFAULT 'active'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **Unique Constraint**: `UNIQUE KEY (mandi_id, counter_number)`
- **Referenced by**: `counter_avg_time` (CASCADE), `counter_service_time` (CASCADE), `mandi_user_counters` (CASCADE), `queue_token` (CASCADE), `booking` (RESTRICT).

### Table: `counter_avg_time` & `counter_service_time`
Average service duration in minutes per vehicle transaction, used for slot availability generation.
- `counter_id` INT (FK &rarr; `mandi_counter.counter_id` ON DELETE CASCADE)
- `avg_time_minutes` / `average_time_minutes` INT NOT NULL DEFAULT 15
- `effective_date` DATE NULL (7-day staging for service time changes)
- `updated_by` INT NULL (FK &rarr; `mandi_users.user_id` ON DELETE SET NULL)

### Table: `queue_token`
Operational queue token issued for an appointment booking.
- `token_id` INT AUTO_INCREMENT PRIMARY KEY
- `booking_id` INT NOT NULL (FK &rarr; `booking.booking_id` ON DELETE CASCADE)
- `counter_id` INT NOT NULL (FK &rarr; `mandi_counter.counter_id` ON DELETE CASCADE)
- `service_date` DATE NOT NULL
- `token_number` VARCHAR(50) NOT NULL
- `queue_position` INT NOT NULL
- `status` ENUM('WAITING','CALLED','ARRIVED','PROCESSING','COMPLETED','NOT_ARRIVED','RESCHEDULED','CANCELLED') DEFAULT 'WAITING'
- `issued_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `called_at` DATETIME NULL
- `arrival_time` DATETIME NULL
- `processing_start_time` DATETIME NULL
- `completion_time` DATETIME NULL
- `failed_at` DATETIME NULL
- **Unique Constraint**: `UNIQUE KEY (counter_id, service_date, token_number)`

### Table: `mandi_users` & `mandiuserdetails`
Mandi staff accounts and profile information.
- `user_id` INT AUTO_INCREMENT PRIMARY KEY
- `username` VARCHAR(100) NOT NULL UNIQUE
- `role` VARCHAR(50) NOT NULL DEFAULT 'user'
- `permissions` TEXT NOT NULL
- `mandi_id` INT NOT NULL (FK &rarr; `mandi.mandi_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `status` ENUM('active','inactive') DEFAULT 'active'
- Profile fields in `mandiuserdetails` are protected by trigger `prevent_direct_delete_mandiuserdetails`.

### Table: `mandi_user_counters`
Many-to-many junction table assigning operators to specific physical counters.
- `user_id` INT NOT NULL (FK &rarr; `mandi_users.user_id` ON DELETE CASCADE ON UPDATE CASCADE)
- `counter_id` INT NOT NULL (FK &rarr; `mandi_counter.counter_id` ON DELETE CASCADE ON UPDATE CASCADE)
- PRIMARY KEY (`user_id`, `counter_id`)
