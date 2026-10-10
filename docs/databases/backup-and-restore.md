# Backup & Restore Procedures

This document provides verified procedures for executing database backups, verifying consistency, and performing point-in-time recovery for MySQL and MongoDB.

> [!NOTE]
> **Replication is NOT a Backup**: Primary–Secondary database replication duplicates live mutations immediately. If a record is mistakenly deleted or corrupted on the Primary, that corruption is instantly replicated to all Secondaries. Independent, point-in-time snapshot backups are essential.

---

## 1. MySQL Full Logical Backup (`mysqldump`)

### Safe Backup Command (Windows / Linux)
To export all tables, triggers, routines, events, and views from `farmer_db`:

```bash
# Export full database with triggers, events, and single-transaction consistency:
mysqldump -u your_backup_user -p \
  --single-transaction \
  --quick \
  --triggers \
  --routines \
  --events \
  --default-character-set=utf8mb4 \
  farmer_db > farmer_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Explanation of Flags:
- `--single-transaction`: Creates an ACID-consistent snapshot without locking tables (InnoDB).
- `--quick`: Streams rows directly rather than buffering entire tables in RAM.
- `--triggers`: Exports custom triggers (`prevent_direct_delete_*`).
- `--routines`: Exports stored procedures and functions.
- `--events`: Exports scheduled cleanup events (`delete_expired_gov_otps`, `delete_expired_mandi_otps`).

---

## 2. MySQL Restoration Procedure

To restore `farmer_db` into a fresh or recovered MySQL instance:

### Step 1: Create Blank Database
```sql
CREATE DATABASE IF NOT EXISTS `farmer_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;
```

### Step 2: Import Backup
```bash
# Windows PowerShell:
mysql -u your_db_user -p farmer_db < "farmer_db_backup_20261010.sql"

# Linux / macOS:
mysql -u your_db_user -p farmer_db < "./farmer_db_backup_20261010.sql"
```

---

## 3. MongoDB Backup & Restoration (`mongodump` / `mongorestore`)

### Backup Command
```bash
mongodump --uri="mongodb://127.0.0.1:27017/farmer_history" --out="./mongo_backups/$(date +%Y%m%d)"
```

### Restore Command
```bash
mongorestore --uri="mongodb://127.0.0.1:27017/farmer_history" --drop "./mongo_backups/20261010/farmer_history"
```

---

## 4. Verification & Integrity Checklist

After restoring:
1. [ ] Verify table counts: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'farmer_db';` (Expect 21 base tables + 5 views).
2. [ ] Verify triggers exist: `SHOW TRIGGERS FROM farmer_db;`.
3. [ ] Verify views resolve: `SELECT COUNT(*) FROM vw_mandis; SELECT COUNT(*) FROM vw_payment_details;`.
4. [ ] Boot any portal backend to ensure connection tests (`SELECT 1`) pass cleanly.
