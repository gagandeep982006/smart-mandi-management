# Local Development Setup Guide

Follow this step-by-step walkthrough to get the complete four-portal ecosystem running locally on your workstation.

---

## 1. Directory Structure Awareness

The project root contains five application folders. Note their exact casing:
```text
.
├── goverment portel/       # Government Administration Portal (Backend + Frontend)
├── mandi portel/           # Mandi Operations Portal (Backend + Frontend)
├── farmer portel/          # Farmer Self-Service Portal (Backend + Frontend)
├── payment-portal/         # Payment & Disbursement Portal (Backend + Frontend)
├── home folder/            # Unified Navigation Gateway
├── DATABASE_DELETION_GUIDE.md
├── README.md
└── docs/
```

---

## 2. Installing Dependencies

Run `npm install` inside each frontend and backend directory.

### Quick PowerShell Script (Windows):
```powershell
# Government Portal
cd "goverment portel\backend"; npm install; cd ..\frontend; npm install; cd ..\..

# Mandi Portal
cd "mandi portel\backend"; npm install; cd ..\frontend; npm install; cd ..\..

# Farmer Portal
cd "farmer portel\backend"; npm install; cd ..\frontend; npm install; cd ..\..

# Payment Portal
cd "payment-portal\backend"; npm install; cd ..\frontend; npm install; cd ..\..

# Home Portal Hub
cd "home folder"; npm install; cd ..
```

### Quick Bash Script (Linux / macOS):
```bash
for dir in "goverment portel" "mandi portel" "farmer portel" "payment-portal"; do
  (cd "$dir/backend" && npm install)
  (cd "$dir/frontend" && npm install)
done
(cd "home folder" && npm install)
```

---

## 3. Creating Local `.env` Files

For each backend directory, copy the provided `.env.example` to create your local `.env`:
```powershell
Copy-Item "goverment portel\backend\.env.example" "goverment portel\backend\.env"
Copy-Item "mandi portel\backend\.env.example" "mandi portel\backend\.env"
Copy-Item "farmer portel\backend\.env.example" "farmer portel\backend\.env"
Copy-Item "payment-portal\backend\.env.example" "payment-portal\backend\.env"
```

Edit each `.env` file to set your local MySQL password, MongoDB URI, and high-entropy secrets (`JWT_SECRET`, `AADHAAR_PEPPER`). Refer to the [Environment Configuration Guide](./environment-configuration.md).

---

## 4. Starting Database Services

Ensure your local MySQL and MongoDB services are running:

### Windows:
```powershell
net start MySQL80
net start MongoDB
```

### Linux (systemd):
```bash
sudo systemctl start mysql
sudo systemctl start mongod
```

Initialize the database schema by importing `mandi portel/backend/database/schema.sql` into MySQL. See [Database Initialization Order](./database-initialization.md).
