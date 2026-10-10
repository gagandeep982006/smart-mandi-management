-- =============================================================================
-- MANDI PORTAL DATABASE SCHEMA (farmer_db)
-- Generated: 2026-10-09T17:58:10.242Z
-- Execution Mode: Dependency-ordered parent before child with IF NOT EXISTS
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- BASE TABLES
-- -----------------------------------------------------------------------------

-- Table: state
CREATE TABLE IF NOT EXISTS `state` (
  `state_id` int NOT NULL AUTO_INCREMENT,
  `state_name` varchar(100) NOT NULL,
  `state_code` varchar(10) NOT NULL,
  PRIMARY KEY (`state_id`),
  UNIQUE KEY `state_name` (`state_name`),
  UNIQUE KEY `state_code` (`state_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: district
CREATE TABLE IF NOT EXISTS `district` (
  `district_id` int NOT NULL AUTO_INCREMENT,
  `state_id` int NOT NULL,
  `district_name` varchar(100) NOT NULL,
  `district_code` varchar(10) NOT NULL,
  PRIMARY KEY (`district_id`),
  UNIQUE KEY `district_code` (`district_code`),
  KEY `state_id` (`state_id`),
  CONSTRAINT `district_ibfk_1` FOREIGN KEY (`state_id`) REFERENCES `state` (`state_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1229 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: tehsil
CREATE TABLE IF NOT EXISTS `tehsil` (
  `tehsil_id` int NOT NULL AUTO_INCREMENT,
  `district_id` int NOT NULL,
  `tehsil_name` varchar(100) NOT NULL,
  `tehsil_code` varchar(10) NOT NULL,
  PRIMARY KEY (`tehsil_id`),
  UNIQUE KEY `tehsil_code` (`tehsil_code`),
  KEY `district_id` (`district_id`),
  CONSTRAINT `tehsil_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1743 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: crop
CREATE TABLE IF NOT EXISTS `crop` (
  `crop_id` int NOT NULL AUTO_INCREMENT,
  `crop_name` varchar(100) NOT NULL,
  `crop_type` enum('rabi','kharif','zaid') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`crop_id`),
  UNIQUE KEY `crop_name` (`crop_name`,`crop_type`)
) ENGINE=InnoDB AUTO_INCREMENT=1041 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi
CREATE TABLE IF NOT EXISTS `mandi` (
  `mandi_id` int NOT NULL AUTO_INCREMENT,
  `mandi_name` varchar(100) NOT NULL,
  `tehsil_id` int NOT NULL,
  `capacity` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`mandi_id`),
  UNIQUE KEY `uq_mandi_name_tehsil` (`mandi_name`,`tehsil_id`),
  KEY `idx_mandi_tehsil` (`tehsil_id`),
  CONSTRAINT `fk_mandi_tehsil` FOREIGN KEY (`tehsil_id`) REFERENCES `tehsil` (`tehsil_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1386 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi_timing
CREATE TABLE IF NOT EXISTS `mandi_timing` (
  `mandi_id` int NOT NULL,
  `opening_time` time NOT NULL DEFAULT '09:00:00',
  `closing_time` time NOT NULL DEFAULT '17:00:00',
  `pending_opening_time` time DEFAULT NULL,
  `pending_closing_time` time DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mandi_id`),
  CONSTRAINT `fk_mt_mandi` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi_working_day
CREATE TABLE IF NOT EXISTS `mandi_working_day` (
  `working_day_id` int NOT NULL AUTO_INCREMENT,
  `mandi_id` int NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `is_working` tinyint(1) NOT NULL DEFAULT '1',
  `pending_is_working` tinyint(1) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`working_day_id`),
  UNIQUE KEY `uq_mandi_day` (`mandi_id`,`day_of_week`),
  KEY `idx_mwd_lookup` (`mandi_id`,`day_of_week`,`is_working`),
  CONSTRAINT `fk_mwd_mandi` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi_counter
CREATE TABLE IF NOT EXISTS `mandi_counter` (
  `counter_id` int NOT NULL AUTO_INCREMENT,
  `mandi_id` int NOT NULL,
  `counter_number` int NOT NULL,
  `counter_name` varchar(100) NOT NULL,
  `crop_id` int NOT NULL,
  `capacity_per_day` decimal(12,2) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`counter_id`),
  UNIQUE KEY `mandi_id` (`mandi_id`,`counter_number`),
  KEY `idx_counter_mandi` (`mandi_id`),
  KEY `idx_counter_crop` (`crop_id`),
  CONSTRAINT `fk_counter_crop` FOREIGN KEY (`crop_id`) REFERENCES `crop` (`crop_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_counter_mandi` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: counter_avg_time
CREATE TABLE IF NOT EXISTS `counter_avg_time` (
  `id` int NOT NULL AUTO_INCREMENT,
  `counter_id` int NOT NULL,
  `mandi_id` int NOT NULL,
  `avg_time_minutes` int NOT NULL DEFAULT '15',
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `effective_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_counter_avg` (`counter_id`),
  KEY `fk_cat_user` (`updated_by`),
  KEY `idx_cat_mandi` (`mandi_id`),
  KEY `idx_cat_counter_mandi` (`counter_id`,`mandi_id`),
  CONSTRAINT `fk_cat_counter` FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cat_mandi` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cat_user` FOREIGN KEY (`updated_by`) REFERENCES `mandi_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2993 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: counter_service_time
CREATE TABLE IF NOT EXISTS `counter_service_time` (
  `counter_id` int NOT NULL,
  `average_time_minutes` int NOT NULL DEFAULT '15',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`counter_id`),
  CONSTRAINT `fk_cst_counter` FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: procurement_session
CREATE TABLE IF NOT EXISTS `procurement_session` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `session_name` varchar(150) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `crop_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_procurement_session_crop` (`crop_id`),
  CONSTRAINT `fk_procurement_session_crop` FOREIGN KEY (`crop_id`) REFERENCES `crop` (`crop_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: procurement_quota
CREATE TABLE IF NOT EXISTS `procurement_quota` (
  `quota_id` int NOT NULL AUTO_INCREMENT,
  `state_id` int NOT NULL,
  `crop_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `lsp` decimal(12,2) NOT NULL,
  `msp` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`quota_id`),
  UNIQUE KEY `state_id` (`state_id`,`crop_id`),
  KEY `idx_quota_state` (`state_id`),
  KEY `idx_quota_crop` (`crop_id`),
  CONSTRAINT `fk_quota_crop` FOREIGN KEY (`crop_id`) REFERENCES `crop` (`crop_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_quota_state` FOREIGN KEY (`state_id`) REFERENCES `state` (`state_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2085 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: farmer
CREATE TABLE IF NOT EXISTS `farmer` (
  `farmer_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `mobile_number` varchar(15) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `state_id` int NOT NULL,
  `district_id` int NOT NULL,
  `tehsil_id` int NOT NULL,
  `aadhaar_hash` varchar(255) NOT NULL,
  `aadhaar_lookup` varchar(64) NOT NULL,
  `aadhaar_verified` tinyint(1) DEFAULT '0',
  `aadhaar_verified_at` timestamp NULL DEFAULT NULL,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `verification_status` tinyint(1) DEFAULT '0',
  `mobile_verified` tinyint(1) DEFAULT '0',
  `mobile_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`farmer_id`),
  UNIQUE KEY `mobile_number` (`mobile_number`),
  UNIQUE KEY `uq_farmer_aadhaar_lookup` (`aadhaar_lookup`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_farmer_state` (`state_id`),
  KEY `idx_farmer_district` (`district_id`),
  KEY `idx_farmer_tehsil` (`tehsil_id`),
  CONSTRAINT `fk_farmer_district` FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_farmer_state` FOREIGN KEY (`state_id`) REFERENCES `state` (`state_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_farmer_tehsil` FOREIGN KEY (`tehsil_id`) REFERENCES `tehsil` (`tehsil_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101174 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: bank_account
CREATE TABLE IF NOT EXISTS `bank_account` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `farmer_id` int NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(11) NOT NULL,
  `verification_status` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `farmer_id` (`farmer_id`),
  KEY `idx_bank_account_farmer` (`farmer_id`),
  CONSTRAINT `fk_bank_account_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`farmer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: farmer_land
CREATE TABLE IF NOT EXISTS `farmer_land` (
  `land_id` int NOT NULL AUTO_INCREMENT,
  `farmer_id` int NOT NULL,
  `area` decimal(12,2) NOT NULL,
  `ownership_type` enum('owned','leased','shared') NOT NULL,
  `land_type` enum('agricultural','irrigated','non_irrigated') NOT NULL,
  `land_verification` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `land_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`land_id`),
  KEY `idx_farmer_land_farmer` (`farmer_id`),
  CONSTRAINT `fk_farmer_land_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`farmer_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101010 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: booking
CREATE TABLE IF NOT EXISTS `booking` (
  `booking_id` int NOT NULL AUTO_INCREMENT,
  `farmer_id` int NOT NULL,
  `crop_id` int NOT NULL,
  `session_id` int NOT NULL,
  `counter_id` int NOT NULL,
  `quantity_req` decimal(12,2) NOT NULL,
  `quantity_approved` decimal(12,2) NOT NULL,
  `booking_time` datetime NOT NULL,
  `status` enum('BOOKED','WAITING','CALLED','ARRIVED','PROCESSING','COMPLETED','NOT_ARRIVED','RESCHEDULED','CANCELLED') NOT NULL DEFAULT 'BOOKED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  KEY `idx_b_farmer` (`farmer_id`),
  KEY `idx_b_crop` (`crop_id`),
  KEY `idx_b_session` (`session_id`),
  KEY `idx_b_counter_date` (`counter_id`,`booking_time`),
  KEY `idx_b_status` (`status`),
  CONSTRAINT `fk_b_counter` FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_b_crop` FOREIGN KEY (`crop_id`) REFERENCES `crop` (`crop_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_b_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`farmer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_b_session` FOREIGN KEY (`session_id`) REFERENCES `procurement_session` (`session_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=72120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: queue_token
CREATE TABLE IF NOT EXISTS `queue_token` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `counter_id` int NOT NULL,
  `service_date` date NOT NULL,
  `token_number` varchar(50) NOT NULL,
  `queue_position` int NOT NULL,
  `status` enum('WAITING','CALLED','ARRIVED','PROCESSING','COMPLETED','NOT_ARRIVED','RESCHEDULED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  `issued_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `called_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `arrival_time` datetime DEFAULT NULL,
  `processing_start_time` datetime DEFAULT NULL,
  `completion_time` datetime DEFAULT NULL,
  `early_request_status` varchar(20) DEFAULT NULL,
  `early_req_time` datetime DEFAULT NULL,
  `early_operator_message` varchar(255) DEFAULT NULL,
  `early_farmer_response` varchar(255) DEFAULT NULL,
  `early_responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_counter_date_token` (`counter_id`,`service_date`,`token_number`),
  KEY `idx_qt_booking` (`booking_id`),
  KEY `idx_qt_queue` (`counter_id`,`service_date`,`status`,`queue_position`),
  CONSTRAINT `fk_qt_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qt_counter` FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi_users
CREATE TABLE IF NOT EXISTS `mandi_users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `permissions` text NOT NULL,
  `mandi_id` int NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_mandi_user_mandi_id` (`mandi_id`),
  CONSTRAINT `fk_mandi_user_mandi_id` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1751 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandiuserdetails
CREATE TABLE IF NOT EXISTS `mandiuserdetails` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `aadhaar_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaar_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`detail_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `phone_number` (`phone_number`),
  UNIQUE KEY `aadhaar_lookup` (`aadhaar_lookup`),
  CONSTRAINT `mandiuserdetails_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `mandi_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=376 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: mandi_user_counters
CREATE TABLE IF NOT EXISTS `mandi_user_counters` (
  `user_id` int NOT NULL,
  `counter_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`counter_id`),
  KEY `fk_muc_counter` (`counter_id`),
  CONSTRAINT `fk_muc_counter` FOREIGN KEY (`counter_id`) REFERENCES `mandi_counter` (`counter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_muc_user` FOREIGN KEY (`user_id`) REFERENCES `mandi_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mandi_login_otp
CREATE TABLE IF NOT EXISTS `mandi_login_otp` (
  `otp_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_mandi_user_expires` (`user_id`,`expires_at`),
  CONSTRAINT `mandi_login_otp_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `mandi_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payment
CREATE TABLE IF NOT EXISTS `payment` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `farmer_id` int NOT NULL,
  `mandi_id` int NOT NULL,
  `crop_id` int NOT NULL,
  `quantity_sold` decimal(12,2) NOT NULL,
  `rate_per_unit` decimal(12,2) NOT NULL,
  `total_payable_amount` decimal(12,2) NOT NULL,
  `payment_status` enum('PENDING','PROCESSING','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `payment_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `generated_by_user_id` int DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `idx_p_farmer` (`farmer_id`),
  KEY `idx_p_mandi` (`mandi_id`),
  KEY `idx_p_crop` (`crop_id`),
  KEY `idx_p_status` (`payment_status`),
  KEY `fk_payment_generated_by_user` (`generated_by_user_id`),
  CONSTRAINT `fk_p_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_p_crop` FOREIGN KEY (`crop_id`) REFERENCES `crop` (`crop_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_p_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`farmer_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_p_mandi` FOREIGN KEY (`mandi_id`) REFERENCES `mandi` (`mandi_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_generated_by_user` FOREIGN KEY (`generated_by_user_id`) REFERENCES `mandi_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=68131 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: payment_completion_proof
CREATE TABLE IF NOT EXISTS `payment_completion_proof` (
  `proof_id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `farmer_id` int NOT NULL,
  `operator_id` int NOT NULL,
  `screenshot` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `completion_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_reference` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`proof_id`),
  KEY `idx_payment_id` (`payment_id`),
  KEY `idx_farmer_id` (`farmer_id`),
  CONSTRAINT `fk_proof_farmer` FOREIGN KEY (`farmer_id`) REFERENCES `farmer` (`farmer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proof_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`payment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- VIEWS
-- -----------------------------------------------------------------------------

-- View: vw_mandis
CREATE OR REPLACE VIEW `vw_mandis` AS select `m`.`mandi_id` AS `mandi_id`,`m`.`mandi_name` AS `mandi_name`,`m`.`tehsil_id` AS `tehsil_id`,`t`.`tehsil_name` AS `tehsil_name`,`d`.`district_id` AS `district_id`,`d`.`district_name` AS `district_name`,`s`.`state_id` AS `state_id`,`s`.`state_name` AS `state_name`,`m`.`capacity` AS `capacity`,`m`.`created_at` AS `created_at`,(case when ((count(`mc`.`counter_id`) = 0) or (sum((`mc`.`status` = 'active')) = 0)) then 'inactive' else 'active' end) AS `status` from ((((`mandi` `m` join `tehsil` `t` on((`m`.`tehsil_id` = `t`.`tehsil_id`))) join `district` `d` on((`t`.`district_id` = `d`.`district_id`))) join `state` `s` on((`d`.`state_id` = `s`.`state_id`))) left join `mandi_counter` `mc` on((`m`.`mandi_id` = `mc`.`mandi_id`))) group by `m`.`mandi_id`,`m`.`mandi_name`,`m`.`tehsil_id`,`t`.`tehsil_name`,`d`.`district_id`,`d`.`district_name`,`s`.`state_id`,`s`.`state_name`,`m`.`capacity`,`m`.`created_at`;

-- View: vw_mandi_counters
CREATE OR REPLACE VIEW `vw_mandi_counters` AS select `mc`.`counter_id` AS `counter_id`,`mc`.`mandi_id` AS `mandi_id`,`m`.`mandi_name` AS `mandi_name`,`mc`.`counter_number` AS `counter_number`,`mc`.`counter_name` AS `counter_name`,`mc`.`crop_id` AS `crop_id`,`c`.`crop_name` AS `crop_name`,`mc`.`capacity_per_day` AS `capacity_per_day`,`mc`.`status` AS `status`,`mc`.`created_at` AS `created_at`,`m`.`tehsil_id` AS `tehsil_id`,`t`.`district_id` AS `district_id`,`d`.`state_id` AS `state_id` from ((((`mandi_counter` `mc` join `mandi` `m` on((`mc`.`mandi_id` = `m`.`mandi_id`))) join `tehsil` `t` on((`m`.`tehsil_id` = `t`.`tehsil_id`))) join `district` `d` on((`t`.`district_id` = `d`.`district_id`))) left join `crop` `c` on((`mc`.`crop_id` = `c`.`crop_id`)));

-- View: vw_mandi_counter_details
CREATE OR REPLACE VIEW `vw_mandi_counter_details` AS select `mc`.`counter_id` AS `counter_id`,`mc`.`counter_number` AS `counter_number`,`mc`.`counter_name` AS `counter_name`,`mc`.`mandi_id` AS `mandi_id`,`mc`.`crop_id` AS `crop_id`,`mc`.`capacity_per_day` AS `capacity_per_day`,`mc`.`status` AS `status`,`mc`.`created_at` AS `created_at`,`c`.`crop_name` AS `crop_name`,`c`.`crop_type` AS `crop_type`,coalesce(`cst`.`average_time_minutes`,15) AS `average_time_minutes` from ((`mandi_counter` `mc` left join `crop` `c` on((`mc`.`crop_id` = `c`.`crop_id`))) left join `counter_service_time` `cst` on((`mc`.`counter_id` = `cst`.`counter_id`)));

-- View: vw_booking_queue
CREATE OR REPLACE VIEW `vw_booking_queue` AS select `qt`.`token_id` AS `token_id`,`qt`.`token_number` AS `token_number`,`qt`.`queue_position` AS `queue_position`,`qt`.`status` AS `token_status`,`qt`.`service_date` AS `service_date`,`qt`.`issued_at` AS `issued_at`,`qt`.`called_at` AS `called_at`,`qt`.`arrival_time` AS `arrival_time`,`qt`.`processing_start_time` AS `processing_start_time`,`qt`.`completion_time` AS `completion_time`,`qt`.`failed_at` AS `failed_at`,`qt`.`counter_id` AS `counter_id`,`qt`.`early_request_status` AS `early_request_status`,`qt`.`early_req_time` AS `early_req_time`,`qt`.`early_operator_message` AS `early_operator_message`,`qt`.`early_farmer_response` AS `early_farmer_response`,`qt`.`early_responded_at` AS `early_responded_at`,`b`.`booking_id` AS `booking_id`,`b`.`farmer_id` AS `farmer_id`,`b`.`crop_id` AS `crop_id`,`b`.`session_id` AS `session_id`,`b`.`booking_time` AS `booking_time`,`b`.`quantity_req` AS `quantity_req`,`b`.`quantity_approved` AS `quantity_approved`,`b`.`status` AS `booking_status`,`f`.`name` AS `farmer_name`,`f`.`mobile_number` AS `farmer_mobile`,`c`.`crop_name` AS `crop_name`,`c`.`crop_type` AS `crop_type` from (((`queue_token` `qt` join `booking` `b` on((`qt`.`booking_id` = `b`.`booking_id`))) join `farmer` `f` on((`b`.`farmer_id` = `f`.`farmer_id`))) join `crop` `c` on((`b`.`crop_id` = `c`.`crop_id`)));

-- View: vw_completed_farmers
CREATE OR REPLACE VIEW `vw_completed_farmers` AS select `qt`.`token_id` AS `token_id`,`qt`.`token_number` AS `token_number`,`qt`.`service_date` AS `service_date`,`qt`.`completion_time` AS `completion_time`,`qt`.`counter_id` AS `counter_id`,`b`.`booking_id` AS `booking_id`,`b`.`quantity_approved` AS `quantity_approved`,`f`.`farmer_id` AS `farmer_id`,`f`.`name` AS `farmer_name`,`f`.`mobile_number` AS `farmer_mobile`,`c`.`crop_name` AS `crop_name`,`p`.`payment_id` AS `payment_id`,`p`.`total_payable_amount` AS `total_payable_amount`,coalesce(`p`.`payment_status`,'PENDING') AS `payment_status` from ((((`queue_token` `qt` join `booking` `b` on((`qt`.`booking_id` = `b`.`booking_id`))) join `farmer` `f` on((`b`.`farmer_id` = `f`.`farmer_id`))) join `crop` `c` on((`b`.`crop_id` = `c`.`crop_id`))) left join `payment` `p` on((`b`.`booking_id` = `p`.`booking_id`))) where (`qt`.`status` = 'COMPLETED');

-- -----------------------------------------------------------------------------
-- SCHEDULED EVENTS
-- -----------------------------------------------------------------------------
DELIMITER $$
DROP EVENT IF EXISTS `delete_expired_mandi_otps`$$
CREATE EVENT IF NOT EXISTS `delete_expired_mandi_otps` ON SCHEDULE EVERY 5 MINUTE STARTS '2026-10-09 21:00:08' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM mandi_login_otp WHERE expires_at < NOW() OR verified = 1$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGERS (Enforce Details Deletion ONLY Via Parent User CASCADE)
-- -----------------------------------------------------------------------------
DELIMITER $$

DROP TRIGGER IF EXISTS `prevent_direct_delete_userdetails`$$
CREATE TRIGGER `prevent_direct_delete_userdetails`
BEFORE DELETE ON `userdetails`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Direct deletion of userdetails is prohibited. Details are deleted only when the user account is deleted.';
END$$

DROP TRIGGER IF EXISTS `prevent_direct_delete_mandiuserdetails`$$
CREATE TRIGGER `prevent_direct_delete_mandiuserdetails`
BEFORE DELETE ON `mandiuserdetails`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Direct deletion of mandiuserdetails is prohibited. Details are deleted only when the Mandi user is deleted.';
END$$

DROP TRIGGER IF EXISTS `prevent_direct_delete_paymentuserdetails`$$
CREATE TRIGGER `prevent_direct_delete_paymentuserdetails`
BEFORE DELETE ON `paymentuserdetails`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Direct deletion of paymentuserdetails is prohibited. Details are deleted only when Payment user is deleted.';
END$$

DELIMITER ;
