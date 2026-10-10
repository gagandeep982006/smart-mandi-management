# Running All Portals Concurrently

During development and testing, you can run individual portals, all backends, or the entire five-portal suite simultaneously.

---

## 1. Running Individual Portals

Each portal frontend includes a `both` script in `package.json` powered by `concurrently` that launches its backend and frontend together:

### A. Government Portal (Port 5001 / 3001)
```powershell
cd "goverment portel\frontend"
npm run both
```

### B. Mandi Portal (Port 5001 / 3000)
```powershell
cd "mandi portel\frontend"
npm run both
```

### C. Farmer Portal (Port 5002 / 3002)
```powershell
cd "farmer portel\frontend"
npm run both
```

### D. Payment Portal (Port 5004 / 3004)
```powershell
cd "payment-portal\frontend"
npm run both
```

### E. Home Navigation Gateway (Port 3005)
```powershell
cd "home folder"
npm start
# or simply open "home folder\index.html" directly in any browser
```

---

## 2. All-in-One Multi-Terminal Execution Script

To start all portals with one command on Windows, create a batch script or run the following PowerShell snippet:

```powershell
# Start Government Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\SIH\New folder\goverment portel\frontend'; npm run both"

# Start Mandi Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\SIH\New folder\mandi portel\frontend'; npm run both"

# Start Farmer Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\SIH\New folder\farmer portel\frontend'; npm run both"

# Start Payment Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\SIH\New folder\payment-portal\frontend'; npm run both"

# Start Home Hub
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\SIH\New folder\home folder'; npm start"
```

---

## 3. Port Conflict Prevention Checklist

If a portal fails to start with `EADDRINUSE`:
1. Check what is occupying the port:
   ```powershell
   netstat -ano | findstr :5001
   netstat -ano | findstr :3000
   ```
2. Kill the hanging process using PID:
   ```powershell
   taskkill /PID <PID> /F
   ```
3. Ensure `.env` port numbers match the designated ports documented in [System Overview](../architecture/system-overview.md).
