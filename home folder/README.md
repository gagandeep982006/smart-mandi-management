# National Agricultural Procurement Portal Hub (Home Gateway)

A dedicated, unified frontend navigation gateway that provides direct single-click redirection and status overview for all four agricultural procurement portals.

---

## 1. Connected Portals Overview

| Portal | Default URL | Role / Target Audience | Primary Functionality |
|---|---|---|---|
| **🌾 Farmer Portal** | [http://localhost:3002](http://localhost:3002) | Farmers & Agricultural Producers | Slot booking, digital token pass, quota inspection, 30-min security cancellation lock |
| **🏢 Mandi Portal** | [http://localhost:3000](http://localhost:3000) | Mandi Staff & Weighbridge Operators | Counter queue management, arrival calls, weighbridge recording, 7-day timing schedule |
| **🏛️ Government Portal** | [http://localhost:3001](http://localhost:3001) | State / District / Tehsil Administrators | 3-tier jurisdictional setup, crop MSP & quotas, mandi setup, user provisioning |
| **💳 Payment Portal** | [http://localhost:3004](http://localhost:3004) | State Finance & Disbursement Officers | State-isolated ledgers, DBT bank payouts, audit proof capture, transition workflows |

---

## 2. How to Run the Home Gateway

You can run and access the Home Gateway using either of the following methods:

### Option A: Instant Standalone (No Node/NPM Needed)
Simply double-click or open `index.html` located in `home folder/` in Google Chrome, Microsoft Edge, or Firefox.
It contains the full standalone UI, search filter, and port configurator with zero installation required.

```powershell
# Open directly in default browser from terminal:
Start-Process "d:\SIH\New folder\home folder\index.html"
```

### Option B: React Development Server (`PORT=3005`)
From the `home folder` directory:

```powershell
cd "d:\SIH\New folder\home folder"
npm start
```
The application will launch on **http://localhost:3005**.

---

## 3. Features

1. **One-Click Redirection**:
   Direct launch buttons for all four portals opening in new browser tabs.
2. **Search & Filter**:
   Filter portals by keyword (e.g. `quota`, `weighbridge`, `token`, `dbt`, `aadhaar`) or by role category (Farmer, Mandi, Government, Payment).
3. **Port & Host Configurator**:
   Click the **"Configure Ports"** button in the header to customize any portal's host or port (saved locally in your browser so custom Docker or remote IP setups persist).
4. **Lifecycle Architecture Visualizer**:
   Visual breakdown showing the complete flow from Government setup to Farmer booking, Mandi weighing, and Payment disbursement.
5. **Zero Backend Required**:
   Pure frontend implementation with no backend process needed.

---

## 4. Central Documentation Links

- 🏛️ **[Government Portal Documentation](../goverment%20portel/README.md)**
- 🌾 **[Mandi Portal Documentation](../mandi%20portel/README.md)**
- 🚜 **[Farmer Portal Documentation](../farmer%20portel/README.md)**
- 💳 **[Payment Portal Documentation](../payment-portal/README.md)**
- 🏠 **[Project Root Documentation](../docs/README.md)**

