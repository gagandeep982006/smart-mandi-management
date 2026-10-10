# Setup & Installation Guide

This section provides comprehensive instructions for installing, configuring, bootstrapping, and executing the four portals and the central home hub in both local development and production environments.

---

## 📑 In This Section

1. **[Prerequisites](./prerequisites.md)**: Hardware requirements, Node.js version, MySQL, and MongoDB prerequisites.
2. **[Local Development Setup](./local-development.md)**: Step-by-step repository cloning, dependency installation, and local configuration.
3. **[Environment Configuration Guide](./environment-configuration.md)**: Complete parameter reference for all `.env` variables across all portals.
4. **[Database Initialization Order](./database-initialization.md)**: Schema loading order, views, triggers, and demo seeding scripts.
5. **[Running All Portals Concurrently](./run-all-portals.md)**: How to run backends, frontends, or all systems concurrently.
6. **[Production Deployment Considerations](./production-deployment.md)**: Hardening, TLS, reverse proxies, and production runtime guidance.
7. **[First Government User Bootstrap Guide](./first-government-user.md)**: How to register the initial System Administrator / DBA user via `/api/auth/register` in a clean database.

---

## ⚡ Quick Start Summary

```bash
# 1. Install dependencies for all portals
cd "d:/SIH/New folder/goverment portel/backend" && npm install
cd "d:/SIH/New folder/goverment portel/frontend" && npm install
cd "d:/SIH/New folder/farmer portel/backend" && npm install
cd "d:/SIH/New folder/farmer portel/frontend" && npm install
cd "d:/SIH/New folder/mandi portel/backend" && npm install
cd "d:/SIH/New folder/mandi portel/frontend" && npm install
cd "d:/SIH/New folder/payment-portal/backend" && npm install
cd "d:/SIH/New folder/payment-portal/frontend" && npm install
cd "d:/SIH/New folder/home folder" && npm install

# 2. Configure .env files in each backend (use .env.example as template)

# 3. Initialize MySQL schema and start MongoDB

# 4. Run individual portal development servers using:
npm run both
```
