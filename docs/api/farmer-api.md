# Farmer Portal API Reference

The Farmer Portal backend provides self-service APIs for farmer registration, profile verification, appointment scheduling, and queue tracking.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register-farmer`
Self-service farmer onboarding endpoint.
- **Request Body**:
  ```json
  {
    "name": "Sukhwinder Singh",
    "mobile_number": "9812345678",
    "email": "sukhwinder@example.com",
    "address": "Village Nilokheri",
    "state_id": 1126,
    "district_id": 1229,
    "tehsil_id": 1743,
    "aadhaar_number": "123456789012",
    "bank_name": "State Bank of India",
    "account_number": "12345678901234",
    "ifsc_code": "SBIN0001234",
    "land_area": 5.5,
    "ownership_type": "owned",
    "land_type": "agricultural"
  }
  ```
- **Response**: `201 Created` with `{ "success": true, "farmer_id": 101174 }`.

### `POST /api/auth/request-otp`
Sends login OTP to farmer's mobile number.
- **Rate Limit**: 5-minute cooldown.
- **Request Body**: `{ "phone_number": "9812345678" }`

### `POST /api/auth/verify-otp`
Verifies OTP and sets `farmer_token` HttpOnly cookie.
- **Response**: `200 OK` with `Set-Cookie: farmer_token=...; HttpOnly`.

---

## 2. Farmer Operations Endpoints (`/api/farmer`)

### `GET /api/farmer/profile`
Returns authenticated farmer's verified profile, land parcels, and bank account.
- **Auth**: Required (`farmer_token`).

### `GET /api/farmer/available-mandis?crop_id=:id`
Returns mandis actively operating counters for the specified crop.

### `GET /api/farmer/available-slots?counter_id=:id&service_date=:YYYY-MM-DD`
Computes and returns available time slots for a counter on a given date:
- Validates 7-day effective working days and timings.
- Returns list of slot intervals (e.g. `["09:00 - 09:15", "09:15 - 09:30"]`) and remaining daily capacity.

### `POST /api/farmer/book-slot`
Books an appointment reservation and issues a digital queue token.
- **Request Body**:
  ```json
  {
    "counter_id": 4001,
    "crop_id": 1041,
    "session_id": 1101,
    "quantity_req": 50.00,
    "booking_time": "2026-10-15 09:30:00"
  }
  ```
- **Response**: `201 Created` with `{ "booking_id": 72120, "token_number": "TK-4001-042", "queue_position": 14 }`.

### `POST /api/farmer/cancel-booking/:bookingId`
Cancels an unserved appointment (subject to the 30-minute lock before counter opening).

### `GET /api/farmer/my-bookings`
Lists all historical and upcoming bookings with live token status.

### `GET /api/farmer/sales-history`
Lists completed sales and associated DBT payment status (`PENDING`, `PROCESSING`, `PAID`).
