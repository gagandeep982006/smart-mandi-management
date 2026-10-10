# First Government User Bootstrap Guide

> **Objective**: Bootstrap the initial System Administrator / DBA user account in a fresh database for the Government Portal (`goverment portel`).
>
> When the database is newly initialized, the `app_users` and `userdetails` tables are completely empty. Because normal user creation in the UI requires an authenticated administrator, the backend provides an **unauthenticated bootstrap endpoint**:
>
> `POST /api/auth/register` (configured in [`backend/routes/authRoute.js`](./backend/routes/authRoute.js)).

---

## Table of Contents

1. [Why This Route Exists](#1-why-this-route-exists)
2. [Route Specifications](#2-route-specifications)
3. [Recommended Payload for the 1st Superadmin User](#3-recommended-payload-for-the-1st-superadmin-user)
4. [Step-by-Step Execution Methods](#4-step-by-step-execution-methods)
   - [Method A: PowerShell (Windows)](#method-a-powershell-windows)
   - [Method B: cURL (Linux / macOS / Git Bash)](#method-b-curl-linux--macos--git-bash)
   - [Method C: Postman / Thunder Client](#method-c-postman--thunder-client)
   - [Method D: Standalone Node.js Script](#method-d-standalone-nodejs-script)
5. [How to Log In as the 1st User](#5-how-to-log-in-as-the-1st-user)
6. [Field Validations & Database Schema Mapping](#6-field-validations--database-schema-mapping)
7. [Troubleshooting & Common Errors](#7-troubleshooting--common-errors)

---

## 1. Why This Route Exists

In a newly initialized system:
- The database contains no user records.
- Standard administrative endpoints require `authenticateToken` and `requirePermission("write")`.
- `POST /api/auth/register` is intentionally **unprotected by authentication middleware**, allowing you to create the very first administrative account to bootstrap the platform.
- **No Passwords**: The application uses mobile number + OTP authentication. You do not need to provide or store a password.
- **Atomic Insertion**: The endpoint automatically initiates a MySQL transaction:
  1. Inserts the core user into `app_users`.
  2. Inserts profile details and cryptographic Aadhaar hashes into `userdetails`.
  3. Commits the transaction or rolls back on failure.

---

## 2. Route Specifications

| Attribute | Specification |
|---|---|
| **HTTP Method** | `POST` |
| **Route Path** | `/api/auth/register` |
| **Backend Base URL** | `http://localhost:5001` (or `http://localhost:5000` depending on `.env`) |
| **Authentication** | **None** (Public bootstrap endpoint) |
| **Content-Type** | `application/json` |
| **Success Status** | `201 Created` |

---

## 3. Recommended Payload for the 1st Superadmin User

For your first user, configure **National / Global Scope** with all permissions:

```json
{
  "username": "admin",
  "full_name": "System Super Administrator",
  "phone_number": "9876543210",
  "email": "admin@agri.gov.in",
  "address": "Ministry of Agriculture, Krishi Bhawan, New Delhi",
  "aadhaar": "123456789012",
  "role": "admin",
  "permissions": ["read", "write", "update", "delete"],
  "state_id": null,
  "district_id": null,
  "tehsil_id": null
}
```

> [!TIP]
> **Why set location IDs to `null`?**
> Setting `state_id`, `district_id`, and `tehsil_id` to `null` grants **Global / Nationwide Scope**. The Location-Based Access Control (LBAC) engine will not restrict this user, allowing them to view and manage mandis, quotas, and officers across all states and districts.

---

## 4. Step-by-Step Execution Methods

Ensure the Government Portal backend is running before executing any of these commands:
```powershell
cd "d:\SIH\New folder\goverment portel\backend"
node index.js
# Confirmed running on http://localhost:5001 (or 5000)
```

### Method A: PowerShell (Windows)

Open PowerShell and run:

```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    username     = "admin"
    full_name    = "System Super Administrator"
    phone_number = "9876543210"
    email        = "admin@agri.gov.in"
    address      = "Krishi Bhawan, New Delhi"
    aadhaar      = "123456789012"
    role         = "admin"
    permissions  = @("read", "write", "update", "delete")
    state_id     = $null
    district_id  = $null
    tehsil_id    = $null
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/api/auth/register" -Method Post -Headers $headers -Body $body
```

#### Expected Output:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 1
}
```

---

### Method B: cURL (Linux / macOS / Git Bash)

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "full_name": "System Super Administrator",
    "phone_number": "9876543210",
    "email": "admin@agri.gov.in",
    "address": "Krishi Bhawan, New Delhi",
    "aadhaar": "123456789012",
    "role": "admin",
    "permissions": ["read", "write", "update", "delete"],
    "state_id": null,
    "district_id": null,
    "tehsil_id": null
  }'
```

---

### Method C: Postman / Thunder Client

1. Open Postman or VS Code Thunder Client.
2. Set Method to **POST**.
3. Set URL to `http://localhost:5001/api/auth/register`.
4. Go to the **Body** tab &rarr; select **raw** &rarr; format **JSON**.
5. Paste the JSON payload from [Section 3](#3-recommended-payload-for-the-1st-superadmin-user).
6. Click **Send**.
7. Confirm response code is `201 Created`.

---

### Method D: Standalone Node.js Script

You can create a temporary file `seed_admin.js` in `goverment portel/backend/` and run it:

```javascript
// goverment portel/backend/seed_admin.js
const fetch = require("node-fetch"); // or native fetch in Node 18+

async function seedFirstUser() {
    const payload = {
        username: "admin",
        full_name: "System Super Administrator",
        phone_number: "9876543210",
        email: "admin@agri.gov.in",
        address: "Krishi Bhawan, New Delhi",
        aadhaar: "123456789012",
        role: "admin",
        permissions: ["read", "write", "update", "delete"],
        state_id: null,
        district_id: null,
        tehsil_id: null
    };

    const port = process.env.PORT || 5001;
    const res = await fetch(`http://localhost:${port}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response:", data);
}

seedFirstUser();
```

Execute with:
```bash
node seed_admin.js
```

---

## 5. How to Log In as the 1st User

Once the user is registered, authenticate via the Phone + OTP flow:

### Step 1: Request Login OTP
```bash
curl -X POST http://localhost:5001/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210"}'
```
Response:
```json
{ "success": true, "message": "OTP sent successfully" }
```

### Step 2: Retrieve the OTP
In development, check the terminal where the Government backend is running to see the generated OTP or query MySQL directly:
```sql
SELECT * FROM gov_login_otp WHERE user_id = 1 ORDER BY otp_id DESC LIMIT 1;
```

### Step 3: Verify OTP & Receive Session Cookie
In the browser UI (`http://localhost:3001` or `3000`), enter the 6-digit OTP. The backend validates the code and issues the **`gov_token`** HttpOnly JWT cookie.

You are now logged in as the Super Administrator! You can access:
- **Add User** (provisioning district/tehsil officers)
- **Add Mandi User** (provisioning market yard operators)
- **Add Payment User** (provisioning state payment officers)
- **Mandi & Counter Management**
- **Crops & Quotas Setup**

---

## 6. Field Validations & Database Schema Mapping

| Field Name | Type | Constraints | Destination Column in MySQL |
|---|---|---|---|
| `username` | String | Required, $\ge 3$ characters, unique | `app_users.username` |
| `role` | String | Optional (defaults to `"user"`). Use `"admin"` or `"dba"` | `app_users.role` |
| `permissions` | Array | Optional (defaults to `["read"]`). Use `["read", "write", "update", "delete"]` | `app_users.permissions` (stored as JSON string) |
| `state_id` | Integer | Optional. Must match an existing `state.state_id` if provided | `app_users.state_id` |
| `district_id` | Integer | Optional. Must belong to `state_id` | `app_users.district_id` |
| `tehsil_id` | Integer | Optional. Must belong to `district_id` | `app_users.tehsil_id` |
| `full_name` | String | Required | `userdetails.full_name` |
| `phone_number`| String | Required, exactly 10 digits, unique | `userdetails.phone_number` |
| `email` | String | Optional, standard email format | `userdetails.email` |
| `address` | String | Optional | `userdetails.address` |
| `aadhaar` | String | Optional, exactly 12 digits | Stored as `aadhaar_lookup` (HMAC) and `aadhaar_hash` (bcrypt) |

---

## 7. Troubleshooting & Common Errors

### Error: `409 Conflict: Username already exists`
- **Cause**: An account with this username already exists in `app_users`.
- **Fix**: Use a different username, or check existing users: `SELECT user_id, username FROM app_users;`.

### Error: `409 Conflict: Phone number is already registered`
- **Cause**: An account with this phone number already exists in `userdetails`.
- **Fix**: Use a different phone number, or log into the existing account using this number.

### Error: `400 Bad Request: Phone number must be a valid 10-digit number`
- **Cause**: Phone number was passed with country code (e.g. `+91`) or formatting spaces.
- **Fix**: Pass strictly 10 digits (e.g. `"9876543210"`).

### Error: `400 Bad Request: state_id is required when district_id is provided`
- **Cause**: A child location was passed without its parent location.
- **Fix**: For the initial superadmin, omit all location IDs or pass `null` for nationwide scope.

### Error: `500 CONFIGURATION ERROR: AADHAAR_PEPPER is missing`
- **Cause**: The backend `.env` file does not define `AADHAAR_PEPPER`.
- **Fix**: Open `goverment portel/backend/.env` and ensure `AADHAAR_PEPPER=your_secret_pepper_string` is set, then restart the backend.
