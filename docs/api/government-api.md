# Government Portal API Reference

The Government Portal backend exposes endpoints for administrative configuration, geographic management, crop quotas, and user provisioning.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new government administrative user account.
- **Auth**: Public / Administrative setup.
- **Request Body**:
  ```json
  {
    "username": "rohtak_dba",
    "full_name": "Rajesh Kumar",
    "phone_number": "9876543210",
    "email": "rajesh@agri.gov.in",
    "address": "Mini Secretariat, Rohtak",
    "aadhaar": "123456789012",
    "role": "district_admin",
    "permissions": ["read", "write", "update", "delete"],
    "state_id": 1126,
    "district_id": 1229,
    "tehsil_id": null
  }
  ```
- **Response**: `201 Created` with `{ "success": true, "message": "User registered successfully" }`.

### `POST /api/auth/request-otp`
Requests a 6-digit OTP for phone login.
- **Rate Limit**: 5-minute resend cooldown enforced.
- **Request Body**: `{ "phone_number": "9876543210" }`
- **Response**: `200 OK` `{ "success": true, "message": "OTP sent successfully" }`.

### `POST /api/auth/verify-otp`
Verifies OTP and issues `gov_token` HttpOnly cookie.
- **Request Body**: `{ "phone_number": "9876543210", "otp": "123456" }`
- **Response**: `200 OK` with `Set-Cookie: gov_token=...; HttpOnly`.

### `POST /api/auth/logout`
Clears `gov_token` and `token` cookies.

---

## 2. Geographical Location Endpoints

### `GET /api/location/state`
Returns list of all registered states.

### `GET /api/location/district?state_id=:id`
Returns districts scoped to a state.

### `GET /api/location/tehsil?district_id=:id`
Returns tehsils scoped to a district.

---

## 3. Crop & Procurement Session Endpoints

### `GET /api/crops`
Lists all registered commodity crops.

### `POST /api/crops`
Registers a new crop commodity.
- **Auth**: Required (`write` permission).
- **Request Body**: `{ "crop_name": "Wheat (Sharbati)", "crop_type": "rabi" }`

### `POST /api/procurement/session`
Creates a seasonal procurement window.
- **Request Body**:
  ```json
  {
    "session_name": "Rabi Procurement 2026",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "crop_id": 1041
  }
  ```

### `POST /api/procurement/quota`
Sets state procurement quotas and support prices.
- **Request Body**:
  ```json
  {
    "state_id": 1126,
    "crop_id": 1041,
    "amount": 500000.00,
    "msp": 2275.00,
    "lsp": 2100.00
  }
  ```

---

## 4. Mandi & Counter Provisioning Endpoints

### `GET /api/mandis`
Returns all mandis (filtered dynamically via `loadUserScope` and `applyLocationScope`).

### `POST /api/mandis`
Creates a new physical market yard.
- **Request Body**: `{ "mandi_name": "Karnal Grain Market", "tehsil_id": 1743, "capacity": 25000.00 }`

### `POST /api/mandicounters`
Creates an operational counter line in a mandi.
- **Request Body**:
  ```json
  {
    "mandi_id": 1386,
    "counter_number": 1,
    "counter_name": "Counter 1 - Weighbridge A",
    "crop_id": 1041,
    "capacity_per_day": 1000.00
  }
  ```

---

## 5. User Administration Endpoints (`/api/app-users`)

- `GET /api/app-users`: Lists government administrative users.
- `POST /api/app-users`: Creates a government user account.
- `DELETE /api/app-users/:id`: Deletes user account (cascades to `userdetails`).
- `GET /api/mandi-app-user`: Lists Mandi operators.
- `GET /api/payment-users`: Lists Payment officers.
