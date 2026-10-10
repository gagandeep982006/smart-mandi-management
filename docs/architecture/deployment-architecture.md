# Deployment Architecture & Process Topology

This document details the process layout, port mappings, network communication, and deployment considerations for running the multi-portal platform in development and production environments.

---

## 1. Process & Port Topology

The ecosystem consists of multiple distinct Node.js Express servers and React single-page applications (SPAs):

| Component | Directory | Dev Port | Protocol / Transport | Purpose |
|---|---|---|---|---|
| **Government Backend** | `goverment portel/backend` | `5001` (or `5000`) | HTTP / JSON REST | Administrative APIs & LBAC |
| **Government Frontend** | `goverment portel/frontend` | `3001` (or `3000`) | Web Browser / React 19 | Admin Dashboard |
| **Mandi Backend** | `mandi portel/backend` | `5001` (or `5002`) | HTTP / JSON REST | Counter Queue APIs |
| **Mandi Frontend** | `mandi portel/frontend` | `3000` | Web Browser / React 19 | Market Yard Operator UI |
| **Farmer Backend** | `farmer portel/backend` | `5002` (or `5003`) | HTTP / JSON REST | Farmer Self-Service APIs |
| **Farmer Frontend** | `farmer portel/frontend` | `3002` | Web Browser / React 19 | Farmer Appointment UI |
| **Payment Backend** | `payment-portal/backend` | `5004` | HTTP / JSON REST | Payment & Disbursement APIs |
| **Payment Frontend** | `payment-portal/frontend` | `3004` | Web Browser / React 19 | Finance Officer Dashboard |
| **Home Portal Hub** | `home folder/` | `3005` (or static) | Web Browser / React 19 | Unified Navigation Launcher |
| **MySQL Primary** | External / Container | `3306` | MySQL Wire Protocol | Write Database (`farmer_db`) |
| **MySQL Replicas** | External / Container | `3307`, `3308`, `3309` | MySQL Wire Protocol | Read Replicas (Optional) |
| **MongoDB** | External / Container | `27017` | MongoDB Wire Protocol | Audit DB (`farmer_history`) |

---

## 2. Reverse Proxy & Production Topology

In a production environment, all Express backends and React static assets should be placed behind an enterprise reverse proxy (such as Nginx, Caddy, or an AWS Application Load Balancer):

```mermaid
flowchart TD
    Client["Client Browser / Mobile Devices"] -->|HTTPS (Port 443)| ReverseProxy["Nginx / Reverse Proxy"]

    subgraph InternalNetwork [Internal Application Network]
        ReverseProxy -->|/api/gov/*| GovNode["Government Backend (127.0.0.1:5001)"]
        ReverseProxy -->|/api/mandi/*| MandiNode["Mandi Backend (127.0.0.1:5002)"]
        ReverseProxy -->|/api/farmer/*| FarmerNode["Farmer Backend (127.0.0.1:5003)"]
        ReverseProxy -->|/api/payment/*| PaymentNode["Payment Backend (127.0.0.1:5004)"]

        ReverseProxy -->|/gov/*| GovStatic["Government Static Build (/build)"]
        ReverseProxy -->|/mandi/*| MandiStatic["Mandi Static Build (/build)"]
        ReverseProxy -->|/farmer/*| FarmerStatic["Farmer Static Build (/build)"]
        ReverseProxy -->|/payment/*| PaymentStatic["Payment Static Build (/build)"]
        ReverseProxy -->|/| HomeStatic["Home Hub Static Build (/build)"]
    end
```

---

## 3. Process Management Recommendations

- **Development**: Each portal provides a `"both"` npm script (`npm run both`) utilizing `concurrently` to start the local backend server and React dev server simultaneously in a single terminal.
- **Production**:
  - Run backends using **PM2** or **Docker containers** (`pm2 start ecosystem.config.js`).
  - Pre-build frontend SPAs (`npm run build`) and serve via Nginx or Express static middleware (`express.static`).
  - Configure TLS/SSL termination with automatic HTTP-to-HTTPS redirects.
  - Set `NODE_ENV=production` in all backend environments to enforce strict cookie security (`secure: true`, `sameSite: "lax"`).
