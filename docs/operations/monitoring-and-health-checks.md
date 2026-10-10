# Monitoring & Health Checks

This document covers service health check endpoints, diagnostic commands, and uptime monitoring across the ecosystem.

---

## 1. Verified Health Check Endpoints

Each backend exposes dedicated diagnostic endpoints for load balancers and uptime monitoring tools:

| Portal | Endpoint | Method | Response Payload |
|---|---|---|---|
| **Mandi Portal** | `/health` | `GET` | `{ "status": "OK", "service": "Mandi Portal Backend" }` |
| **Payment Portal** | `/api/health` | `GET` | `{ "status": "OK", "service": "Payment Portal Backend", "port": 5004, "timestamp": "..." }` |
| **Government Portal** | `/api/location/state` | `GET` | Validates active MySQL database read connectivity |
| **Farmer Portal** | `/api/farmer/available-mandis` | `GET` | Validates active MySQL read connectivity |

---

## 2. Process Health Inspection

To check if all backend Express servers are running locally:

### Windows PowerShell:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 3001, 3002, 3004, 3005, 5001, 5002, 5004 } | Select-Object LocalPort, OwningProcess
```

### Linux / macOS:
```bash
lsof -i :5001 -i :5002 -i :5004 -i :3000 -i :3001 -i :3002 -i :3004 -i :3005
```

---

## 3. Database Connection Pool Diagnostics

The backend outputs connection status logs at startup:
- `Primary Database (Write) connected successfully.` (Verified via `SELECT 1`).
- `Read Database (SECONDARY1) connected successfully.` (Verified via `SELECT 1`).
- `[MongoDB] Connected successfully for Payment Portal audit logs.`

If a database pool is exhausted:
- Review `connectionLimit: 10` in `databaserouter.js`.
- Increase connection limits on high-traffic production databases if connection timeout errors occur (`ER_CON_COUNT_ERROR`).
