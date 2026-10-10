-- =============================================================================
-- GOVERNMENT PORTAL DATABASE SCHEMA (farmer_db)
-- Generated: 2026-10-09T17:58:10.209Z
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

-- Table: app_users
CREATE TABLE IF NOT EXISTS `app_users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `permissions` text NOT NULL,
  `state_id` int DEFAULT NULL,
  `district_id` int DEFAULT NULL,
  `tehsil_id` int DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_app_user_state` (`state_id`),
  KEY `fk_app_user_district` (`district_id`),
  KEY `fk_app_user_tehsil` (`tehsil_id`),
  CONSTRAINT `fk_app_user_district` FOREIGN KEY (`district_id`) REFERENCES `district` (`district_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_app_user_state` FOREIGN KEY (`state_id`) REFERENCES `state` (`state_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_app_user_tehsil` FOREIGN KEY (`tehsil_id`) REFERENCES `tehsil` (`tehsil_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: userdetails
CREATE TABLE IF NOT EXISTS `userdetails` (
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
  CONSTRAINT `userdetails_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gov_login_otp
CREATE TABLE IF NOT EXISTS `gov_login_otp` (
  `otp_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_gov_user_expires` (`user_id`,`expires_at`),
  CONSTRAINT `gov_login_otp_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `app_users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- VIEWS
-- -----------------------------------------------------------------------------

-- View: vw_app_users
CREATE OR REPLACE VIEW `vw_app_users` AS select `au`.`user_id` AS `user_id`,`au`.`username` AS `username`,`au`.`role` AS `role`,`au`.`permissions` AS `permissions`,`au`.`state_id` AS `state_id`,`au`.`district_id` AS `district_id`,`au`.`tehsil_id` AS `tehsil_id`,`s`.`state_name` AS `state`,`d`.`district_name` AS `district`,`t`.`tehsil_name` AS `tehsil`,`au`.`status` AS `status`,`au`.`created_at` AS `created_at` from (((`app_users` `au` left join `state` `s` on((`au`.`state_id` = `s`.`state_id`))) left join `district` `d` on((`au`.`district_id` = `d`.`district_id`))) left join `tehsil` `t` on((`au`.`tehsil_id` = `t`.`tehsil_id`)));

-- View: vw_mandis
CREATE OR REPLACE VIEW `vw_mandis` AS select `m`.`mandi_id` AS `mandi_id`,`m`.`mandi_name` AS `mandi_name`,`m`.`tehsil_id` AS `tehsil_id`,`t`.`tehsil_name` AS `tehsil_name`,`d`.`district_id` AS `district_id`,`d`.`district_name` AS `district_name`,`s`.`state_id` AS `state_id`,`s`.`state_name` AS `state_name`,`m`.`capacity` AS `capacity`,`m`.`created_at` AS `created_at`,(case when ((count(`mc`.`counter_id`) = 0) or (sum((`mc`.`status` = 'active')) = 0)) then 'inactive' else 'active' end) AS `status` from ((((`mandi` `m` join `tehsil` `t` on((`m`.`tehsil_id` = `t`.`tehsil_id`))) join `district` `d` on((`t`.`district_id` = `d`.`district_id`))) join `state` `s` on((`d`.`state_id` = `s`.`state_id`))) left join `mandi_counter` `mc` on((`m`.`mandi_id` = `mc`.`mandi_id`))) group by `m`.`mandi_id`,`m`.`mandi_name`,`m`.`tehsil_id`,`t`.`tehsil_name`,`d`.`district_id`,`d`.`district_name`,`s`.`state_id`,`s`.`state_name`,`m`.`capacity`,`m`.`created_at`;

-- View: vw_mandi_counters
CREATE OR REPLACE VIEW `vw_mandi_counters` AS select `mc`.`counter_id` AS `counter_id`,`mc`.`mandi_id` AS `mandi_id`,`m`.`mandi_name` AS `mandi_name`,`mc`.`counter_number` AS `counter_number`,`mc`.`counter_name` AS `counter_name`,`mc`.`crop_id` AS `crop_id`,`c`.`crop_name` AS `crop_name`,`mc`.`capacity_per_day` AS `capacity_per_day`,`mc`.`status` AS `status`,`mc`.`created_at` AS `created_at`,`m`.`tehsil_id` AS `tehsil_id`,`t`.`district_id` AS `district_id`,`d`.`state_id` AS `state_id` from ((((`mandi_counter` `mc` join `mandi` `m` on((`mc`.`mandi_id` = `m`.`mandi_id`))) join `tehsil` `t` on((`m`.`tehsil_id` = `t`.`tehsil_id`))) join `district` `d` on((`t`.`district_id` = `d`.`district_id`))) left join `crop` `c` on((`mc`.`crop_id` = `c`.`crop_id`)));

-- View: vw_procurement_sessions
CREATE OR REPLACE VIEW `vw_procurement_sessions` AS select `ps`.`session_id` AS `session_id`,`ps`.`session_name` AS `session_name`,`ps`.`crop_id` AS `crop_id`,`c`.`crop_name` AS `crop_name`,`ps`.`start_date` AS `start_date`,`ps`.`end_date` AS `end_date`,`ps`.`created_at` AS `created_at` from (`procurement_session` `ps` join `crop` `c` on((`ps`.`crop_id` = `c`.`crop_id`)));

-- View: vw_procurement_quota
CREATE OR REPLACE VIEW `vw_procurement_quota` AS select `pq`.`quota_id` AS `quota_id`,`pq`.`state_id` AS `state_id`,`s`.`state_name` AS `state_name`,`pq`.`crop_id` AS `crop_id`,`c`.`crop_name` AS `crop_name`,`pq`.`amount` AS `amount`,`pq`.`lsp` AS `lsp`,`pq`.`msp` AS `msp`,`pq`.`created_at` AS `created_at` from ((`procurement_quota` `pq` join `state` `s` on((`pq`.`state_id` = `s`.`state_id`))) join `crop` `c` on((`pq`.`crop_id` = `c`.`crop_id`)));

-- View: vw_payment_users
CREATE OR REPLACE VIEW `vw_payment_users` AS select `pu`.`payment_user_id` AS `payment_user_id`,`pu`.`payment_user_id` AS `user_id`,`pu`.`username` AS `username`,`pu`.`role` AS `role`,`pu`.`permissions` AS `permissions`,`pu`.`state_id` AS `state_id`,`s`.`state_name` AS `state`,`s`.`state_code` AS `state_code`,`pu`.`status` AS `status`,`pu`.`created_at` AS `created_at`,`pu`.`updated_at` AS `updated_at` from (`payment_users` `pu` join `state` `s` on((`pu`.`state_id` = `s`.`state_id`)));

-- -----------------------------------------------------------------------------
-- SCHEDULED EVENTS
-- -----------------------------------------------------------------------------
DELIMITER $$
DROP EVENT IF EXISTS `delete_expired_gov_otps`$$
CREATE EVENT IF NOT EXISTS `delete_expired_gov_otps` ON SCHEDULE EVERY 5 MINUTE STARTS '2026-10-09 21:00:08' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM gov_login_otp WHERE expires_at < NOW() OR verified = 1$$
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
