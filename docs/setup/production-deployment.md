# Production Deployment Guide

Deploying the four-portal platform to a production environment requires specific operational hardening, process management, TLS enforcement, and database scaling practices.

---

## 1. Production Build Strategy

### A. Frontend Single-Page Applications
Build production-optimized JavaScript bundles for each React frontend:
```bash
cd "goverment portel/frontend" && npm run build
cd "mandi portel/frontend" && npm run build
cd "farmer portel/frontend" && npm run build
cd "payment-portal/frontend" && npm run build
cd "home folder" && npm run build
```
The compiled output is stored in the `build/` directory of each portal.

### B. Serving Static Builds
In production, serve static builds using high-performance HTTP servers like **Nginx** or **Caddy** rather than `react-scripts start`. Alternatively, the Farmer Portal backend includes automated static serving fallback (`app.use(express.static(frontendBuild))`) when `build/` exists.

---

## 2. Process Management with PM2

Run backend Express services using a process supervisor such as PM2 to guarantee automatic restarts on failure and cluster scaling:

Create an `ecosystem.config.js` at the project root:
```javascript
module.exports = {
  apps: [
    {
      name: "gov-backend",
      script: "./goverment portel/backend/index.js",
      env: { NODE_ENV: "production", PORT: 5001 }
    },
    {
      name: "mandi-backend",
      script: "./mandi portel/backend/server.js",
      env: { NODE_ENV: "production", PORT: 5002 }
    },
    {
      name: "farmer-backend",
      script: "./farmer portel/backend/index.js",
      env: { NODE_ENV: "production", PORT: 5003 }
    },
    {
      name: "payment-backend",
      script: "./payment-portal/backend/server.js",
      env: { NODE_ENV: "production", PORT: 5004 }
    }
  ]
};
```

Launch with:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 3. Production Security Hardening Checklist

1. [ ] **Set `NODE_ENV=production`**: Ensures Express activates performance caching and instructs controllers to set `secure: true` on all authentication cookies.
2. [ ] **Enforce TLS/HTTPS**: All cookie transport requires HTTPS in production to prevent session token interception over untrusted networks.
3. [ ] **Isolate `AADHAAR_PEPPER`**: Store `AADHAAR_PEPPER` and `JWT_SECRET` in a secure secrets manager (such as AWS Secrets Manager, HashiCorp Vault, or encrypted environment files).
4. [ ] **Restrict CORS Allowed Origins**: Set `FRONTEND_URL` in `.env` to the exact public domain (e.g. `https://mandi.gov.in`). Disallow localhost patterns in production.
5. [ ] **Configure MySQL User Grants**: Ensure application database users have only required DML permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on `farmer_db` without administrative privileges (`GRANT`, `DROP DATABASE`).
