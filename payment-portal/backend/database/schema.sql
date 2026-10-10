-- =============================================================================
-- PAYMENT PORTAL DATABASE SCHEMA (farmer_db)
-- Generated: 2026-10-09T17:58:10.265Z
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

-- Table: payment_users
CREATE TABLE IF NOT EXISTS `payment_users` (
  `payment_user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'payment_officer',
  `permissions` text NOT NULL,
  `state_id` int NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_payment_users_state` (`state_id`),
  CONSTRAINT `fk_payment_users_state` FOREIGN KEY (`state_id`) REFERENCES `state` (`state_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1005 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: paymentuserdetails
CREATE TABLE IF NOT EXISTS `paymentuserdetails` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `payment_user_id` int NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `aadhaar_lookup` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhaar_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`detail_id`),
  UNIQUE KEY `payment_user_id` (`payment_user_id`),
  UNIQUE KEY `phone_number` (`phone_number`),
  UNIQUE KEY `aadhaar_lookup` (`aadhaar_lookup`),
  CONSTRAINT `paymentuserdetails_ibfk_1` FOREIGN KEY (`payment_user_id`) REFERENCES `payment_users` (`payment_user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payment_login_otp
CREATE TABLE IF NOT EXISTS `payment_login_otp` (
  `otp_id` bigint NOT NULL AUTO_INCREMENT,
  `payment_user_id` int NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_payment_user_expires` (`payment_user_id`,`expires_at`),
  CONSTRAINT `payment_login_otp_ibfk_1` FOREIGN KEY (`payment_user_id`) REFERENCES `payment_users` (`payment_user_id`) ON DELETE CASCADE
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

-- View: vw_payment_details (Comprehensive joined view for payment listings, state isolation & detailed inspection)
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
    p.created_at,
    p.updated_at,
    p.generated_by_user_id,

    -- Farmer Information
    f.name AS farmer_name,
    f.mobile_number AS farmer_mobile,
    f.email AS farmer_email,
    f.address AS farmer_address,
    f.state_id AS farmer_state_id,
    f.district_id AS farmer_district_id,
    f.tehsil_id AS farmer_tehsil_id,
    f.state_id AS state_id,
    f.district_id AS district_id,
    f.tehsil_id AS tehsil_id,
    f.aadhaar_lookup,
    f.aadhaar_verified,
    f.registration_date AS farmer_registration_date,
    f.status AS farmer_status,
    f.verification_status AS farmer_verification_status,
    fs.state_name AS farmer_state_name,
    fd.district_name AS farmer_district_name,
    ft.tehsil_name AS farmer_tehsil_name,

    -- Booking Information
    b.session_id,
    b.counter_id,
    b.quantity_req,
    b.quantity_approved,
    b.booking_time,
    b.status AS booking_status,
    b.created_at AS booking_created_at,

    -- Crop Information
    c.crop_name,
    c.crop_type,

    -- Mandi Details
    m.mandi_name,
    m.capacity AS mandi_capacity,
    m.tehsil_id AS mandi_tehsil_id,
    m.created_at AS mandi_created_at,
    ms.state_name AS mandi_state_name,
    md.district_name AS mandi_district_name,
    mt.tehsil_name AS mandi_tehsil_name,

    -- Mandi Counter Details
    mc.counter_number,
    mc.counter_name,
    mc.capacity_per_day AS counter_capacity_per_day,
    mc.status AS counter_status,
    mc.created_at AS counter_created_at,
    mcc.crop_name AS counter_supported_crop,

    -- Generating Mandi User Details
    mu.user_id AS counter_user_id,
    mud.full_name AS counter_user_name,
    mud.phone_number AS counter_user_phone,
    mud.email AS counter_user_email,
    mud.address AS counter_user_address

FROM payment p
JOIN farmer f ON p.farmer_id = f.farmer_id
JOIN state fs ON f.state_id = fs.state_id
LEFT JOIN district fd ON f.district_id = fd.district_id
LEFT JOIN tehsil ft ON f.tehsil_id = ft.tehsil_id
JOIN booking b ON p.booking_id = b.booking_id
JOIN crop c ON p.crop_id = c.crop_id
JOIN mandi m ON p.mandi_id = m.mandi_id
LEFT JOIN tehsil mt ON m.tehsil_id = mt.tehsil_id
LEFT JOIN district md ON mt.district_id = md.district_id
LEFT JOIN state ms ON md.state_id = ms.state_id
LEFT JOIN mandi_counter mc ON b.counter_id = mc.counter_id
LEFT JOIN crop mcc ON mc.crop_id = mcc.crop_id
LEFT JOIN mandi_users mu ON p.generated_by_user_id = mu.user_id
LEFT JOIN mandiuserdetails mud ON mu.user_id = mud.user_id;

-- View: vw_mandi_counter_users (Counter operator assignments and mandi location information)
CREATE OR REPLACE VIEW `vw_mandi_counter_users` AS
SELECT 
    mu.user_id AS user_id,
    mud.full_name AS full_name,
    mud.phone_number AS phone_number,
    mud.email AS email,
    mud.address AS address,
    muc.counter_id AS counter_id,
    mc.counter_number AS counter_number,
    mc.counter_name AS counter_name,
    mc.mandi_id AS mandi_id,
    m.mandi_name AS mandi_name,
    t.tehsil_id AS tehsil_id,
    t.tehsil_name AS tehsil_name,
    d.district_id AS district_id,
    d.district_name AS mandi_district_name,
    s.state_id AS state_id,
    s.state_name AS mandi_state_name
FROM mandi_users mu
LEFT JOIN mandiuserdetails mud ON mu.user_id = mud.user_id
JOIN mandi_user_counters muc ON mu.user_id = muc.user_id
JOIN mandi_counter mc ON muc.counter_id = mc.counter_id
JOIN mandi m ON mc.mandi_id = m.mandi_id
LEFT JOIN tehsil t ON m.tehsil_id = t.tehsil_id
LEFT JOIN district d ON t.district_id = d.district_id
LEFT JOIN state s ON d.state_id = s.state_id;

-- View: vw_payment_users
CREATE OR REPLACE VIEW `vw_payment_users` AS select `pu`.`payment_user_id` AS `payment_user_id`,`pu`.`payment_user_id` AS `user_id`,`pu`.`username` AS `username`,`pu`.`role` AS `role`,`pu`.`permissions` AS `permissions`,`pu`.`state_id` AS `state_id`,`s`.`state_name` AS `state`,`s`.`state_code` AS `state_code`,`pu`.`status` AS `status`,`pu`.`created_at` AS `created_at`,`pu`.`updated_at` AS `updated_at` from (`payment_users` `pu` join `state` `s` on((`pu`.`state_id` = `s`.`state_id`)));

-- -----------------------------------------------------------------------------
-- SCHEDULED EVENTS
-- -----------------------------------------------------------------------------
DELIMITER $$
DROP EVENT IF EXISTS `delete_expired_payment_otps`$$
CREATE EVENT IF NOT EXISTS `delete_expired_payment_otps` ON SCHEDULE EVERY 5 MINUTE STARTS '2026-10-09 21:00:08' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM payment_login_otp WHERE expires_at < NOW() OR verified = 1$$
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
