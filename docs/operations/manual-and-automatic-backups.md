# Manual & Automatic Backup Runbook

This runbook defines procedures for taking on-demand manual backups and configuring automated nightly backups for MySQL and MongoDB.

---

## 1. On-Demand Manual Backups

### A. MySQL Full Backup (`mysqldump`)
Run the following command on the host or database server:

```bash
# Windows PowerShell:
mysqldump -u your_backup_user -p `
  --single-transaction `
  --quick `
  --triggers `
  --routines `
  --events `
  --default-character-set=utf8mb4 `
  farmer_db > "backup_farmer_db_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Linux / macOS:
mysqldump -u your_backup_user -p \
  --single-transaction \
  --quick \
  --triggers \
  --routines \
  --events \
  --default-character-set=utf8mb4 \
  farmer_db > "backup_farmer_db_$(date +%Y%m%d_%H%M%S).sql"
```

### B. MongoDB Backup (`mongodump`)
```bash
mongodump --uri="mongodb://127.0.0.1:27017/farmer_history" --out="./mongo_backups/$(date +%Y%m%d_%H%M%S)"
```

---

## 2. Automated Scheduled Backups (Cron / Windows Task Scheduler)

### Linux Nightly Cron Job
Add to `/etc/cron.d/agri_portal_backup`:
```cron
# Run every night at 02:00 AM
0 2 * * * root /usr/local/bin/backup_farmer_ecosystem.sh >> /var/log/backup_ecosystem.log 2>&1
```

### Script: `/usr/local/bin/backup_farmer_ecosystem.sh`
```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/farmer_db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# 1. Backup MySQL
mysqldump -u root -p"$MYSQL_PWD" --single-transaction --quick --triggers --routines --events farmer_db | gzip > "$BACKUP_DIR/mysql_farmer_db_$TIMESTAMP.sql.gz"

# 2. Backup MongoDB
mongodump --uri="mongodb://127.0.0.1:27017/farmer_history" --archive="$BACKUP_DIR/mongo_history_$TIMESTAMP.archive.gz" --gzip

# 3. Purge backups older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup completed successfully."
```

---

## 3. Off-Site Storage & Encryption
- Store backups on physically separated storage (e.g. AWS S3, Azure Blob Storage, or remote NAS).
- Encrypt backup archives using GPG or AWS KMS before off-site transfer.
