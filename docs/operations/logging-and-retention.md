# Logging & Data Retention Policies

This document outlines the retention schedules, log rotation, and historical archiving policies implemented across the ecosystem.

---

## 1. Data Retention Matrix

| Data Domain | Storage Medium | Retention Policy | Purge Mechanism |
|---|---|---|---|
| **Payment Audit Logs (`PaymentLog`)** | MongoDB | 5 Years (`PAYMENT_LOG_RETENTION_YEARS`) | Automated MongoDB TTL Index |
| **Operational History (`BookingHistory`, `TokenHistory`)** | MongoDB | 30 Days (`TRANSACTION_HISTORY_RETENTION_DAYS`) | Daily Scheduled Cleaner (`historyCleanupService.js`) |
| **Mandi Operational Logs (`MandiRecentLogs`)** | MongoDB | 7 Days (`RECENT_LOG_RETENTION_DAYS`) | Daily Scheduled Cleaner |
| **Completed Farmers Dashboard** | MySQL | 7 Days lookback (`COMPLETED_FARMERS_RETENTION_DAYS`) | Query filter (Records remain permanent in DB) |
| **MySQL Transactions (`payment`, `booking`)** | MySQL | 5 Years (`FARMER_PROCUREMENT_HISTORY_RETENTION_YEARS`) | Scheduled administrative archive |
| **Login Attempt Logs (`LoginLogs`)** | MongoDB | 90 Days | Security administrative review |

---

## 2. Server Console Logs Management

Express servers log operational activity to `stdout` / `stderr`.

In production:
- Use **PM2 logrotate** to prevent server disk overflow:
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 50M
  pm2 set pm2-logrotate:retain 14
  pm2 set pm2-logrotate:compress true
  ```
- Alternatively, pipe container logs to an enterprise aggregator such as Grafana Loki, AWS CloudWatch, or Elasticsearch.
