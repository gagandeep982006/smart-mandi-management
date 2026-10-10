# System Prerequisites & Environment Requirements

Before setting up the **Digital Agricultural & Mandi Procurement Ecosystem**, ensure your host machine meets the following hardware and software requirements.

---

## 1. Hardware Requirements

- **Processor**: 4 physical CPU cores or higher (running 4 backends and 4 React dev servers simultaneously creates heavy Node.js process load).
- **RAM**: Minimum 8 GB RAM (16 GB strongly recommended for smooth concurrent execution of all 8 dev servers + MySQL + MongoDB).
- **Disk Storage**: At least 5 GB of free disk space for `node_modules`, database tables, and MongoDB collections.
- **Operating System**: Windows 10/11, macOS (12+), or Linux (Ubuntu 20.04/22.04 LTS).

---

## 2. Software Requirements

### A. Node.js & Package Managers
- **Node.js**: Version **v18.18.0** or **v20.x** LTS (Node.js 18+ is required by Express 5 and modern crypto packages).
- **npm**: Version **9.x** or **10.x** (comes bundled with Node.js).
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### B. MySQL Database Server
- **Version**: MySQL **8.0.x** or **8.4.x** (MySQL 8.0+ is required for Common Table Expressions, Window Functions, and `COLLATE utf8mb4_0900_ai_ci`).
- **Default Port**: `3306`
- **Replication Replicas (Optional for local dev)**: Additional instances listening on ports `3307`, `3308`, `3309` if testing multi-secondary routing.

### C. MongoDB Document Database
- **Version**: MongoDB **6.0.x** or **7.0.x** Community Server.
- **Default Port**: `27017`
- **Default Database Name**: `farmer_history`

### D. Web Browsers
- Google Chrome, Mozilla Firefox, or Microsoft Edge (recent versions supporting modern ES modules and SameSite cookie policies).
