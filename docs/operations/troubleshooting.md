# Troubleshooting & Common Issues

This guide provides diagnostic steps and fixes for common issues encountered during setup, development, and daily operation.

---

## 1. Port Conflicts (`EADDRINUSE`)

### Symptom:
```text
Error: listen EADDRINUSE: address already in use :::5001
```

### Fix:
Find and kill the conflicting process occupying the port:

```powershell
# Windows PowerShell:
$processId = (Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue).OwningProcess
if ($processId) { Stop-Process -Id $processId -Force }
```

```bash
# Linux / macOS:
kill -9 $(lsof -t -i:5001)
```

---

## 2. Foreign Key Constraint Violations (`ERROR 1451`)

### Symptom:
```text
ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails
```

### Cause:
Attempting to delete a parent row (e.g. `mandi_counter` or `booking`) while dependent child rows exist with `ON DELETE RESTRICT` (e.g. `payment`).

### Fix:
**Never bypass using `SET FOREIGN_KEY_CHECKS = 0;`**. Follow the exact reverse-dependency deletion order documented in **[DATABASE_DELETION_GUIDE.md](../../DATABASE_DELETION_GUIDE.md)**:
1. Delete `payment_completion_proof` &rarr;
2. Delete `payment` &rarr;
3. Delete `queue_token` &rarr;
4. Delete `booking` &rarr;
5. Delete target parent row.

---

## 3. Direct Deletion of User Details Blocked (`SQLSTATE 45000`)

### Symptom:
```text
ERROR 1644 (45000): Direct deletion of userdetails is prohibited. Details are deleted only when the user account is deleted.
```

### Cause:
Triggers `prevent_direct_delete_*` deliberately block direct deletion of profile detail rows to protect account referential integrity.

### Fix:
Delete the parent user row instead (`DELETE FROM app_users WHERE user_id = ?;`), which cleanly cascades and deletes the associated detail row.

---

## 4. Rate Limiting & OTP Lockout (`HTTP 429`)

### Symptom:
```json
{ "success": false, "message": "Too many requests. Please try again later." }
```

### Cause:
- Requested OTP again within the 5-minute cooldown (`OTP_RESEND_COOLDOWN_MINUTES`).
- Entered invalid OTP 5 consecutive times (`LOGIN_MAX_FAILED_ATTEMPTS`), triggering a 2-hour lockout (`LOGIN_LOCKOUT_HOURS`).

### Fix:
- Wait for the 5-minute cooldown or lockout duration to expire.
- In local development, restarting the backend process (`Ctrl+C` then restart) instantly clears the server-side in-memory `Map`.

---

## 5. Missing Aadhaar Pepper Error

### Symptom:
```text
CONFIGURATION ERROR: AADHAAR_PEPPER environment variable is missing.
```

### Fix:
Ensure `AADHAAR_PEPPER` is configured in the portal backend's `.env` file with a high-entropy secret string.
