# Disaster Recovery Runbook

This runbook outlines emergency recovery procedures in the event of database failure, data corruption, or hardware outages.

---

## 1. Scenario: Primary MySQL Database Crash

If the Primary MySQL database experiences catastrophic hardware failure or unrecoverable disk corruption:

1. **Promote Most Up-to-Date Secondary Replica**:
   - Check replication status on secondary candidates: `SHOW REPLICA STATUS\G`.
   - Select the replica with lowest `Seconds_Behind_Source`.
   - Stop replica threads: `STOP REPLICA; RESET REPLICA ALL;`.
   - Ensure `read_only = OFF;` on the promoted instance.
2. **Re-point Express Backends**:
   - Update `PRIMARY_DB_HOST` in `.env` files across all four backends to point to the newly promoted host.
   - Restart all backend processes (`pm2 restart all`).
3. **Verify Health**:
   - Boot checks execute `SELECT 1` on Primary and Read DB.
   - Verify that test writes succeed on the promoted database.

---

## 2. Scenario: Secondary Read Replica Desynchronization

If a Secondary database falls out of sync or experiences replication lag:

1. **Router Protection**:
   - In `.env`, change `SECONDARYx_DB_STATUS=STOPPED`.
   - The database router will immediately exclude this replica from read pools and fall back to the next healthy candidate or the Primary.
2. **Re-synchronize Replica**:
   - Restore a consistent snapshot from the Primary using `mysqldump` with `--master-data=2`.
   - Configure replica coordinates: `CHANGE REPLICATION SOURCE TO ...`.
   - Start replication: `START REPLICA;`.
3. **Restore Traffic**:
   - Once `Seconds_Behind_Source = 0`, update `.env` to `SECONDARYx_DB_STATUS=RUNNING`.

---

## 3. Scenario: MongoDB Cluster Outage

- If MongoDB becomes unavailable, relational transactional operations (booking, weighing, disbursements in MySQL) continue running normally.
- Historical logging calls catch errors gracefully (`.catch(err => ...)`), preventing unhandled database exceptions from crashing the Express application servers.
- Bring MongoDB back online (`sudo systemctl restart mongod`) to resume non-blocking audit streaming.
