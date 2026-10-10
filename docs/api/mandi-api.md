# Mandi Portal API Reference

The Mandi Portal backend manages yard token sequencing, weighbridge callings, purchase confirmation, and 7-day schedule configurations.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/request-otp`
Requests login OTP for registered mandi personnel (`mandi_users`).
- **Request Body**: `{ "phone_number": "9876501234" }`

### `POST /api/auth/verify-otp`
Verifies OTP and issues `mandi_token` HttpOnly cookie.
- **Request Body**: `{ "phone_number": "9876501234", "otp": "654321" }`
- **Response**: `200 OK` with `Set-Cookie: mandi_token=...; HttpOnly`.

### `POST /api/auth/logout`
Clears `mandi_token` and `token` cookies.

---

## 2. Queue & Token Endpoints (`/api/tokens`)

### `GET /api/tokens/active-queue?counter_id=:id&service_date=:YYYY-MM-DD`
Returns queue tokens ordered by `queue_position ASC` for live operator display.

### `POST /api/tokens/:tokenId/call`
Marks a token as `CALLED` and records `called_at = NOW()`.
- **Auth**: Required (`write` permission).

### `POST /api/tokens/:tokenId/arrive`
Marks a called farmer as `ARRIVED` at the weighbridge.

### `POST /api/tokens/:tokenId/process`
Initiates weighing and inspection (`status = 'PROCESSING'`).

### `POST /api/tokens/:tokenId/complete`
Finalizes the procurement sale.
- **Request Body**:
  ```json
  {
    "quantity_sold": 48.50,
    "rate_per_unit": 2275.00
  }
  ```
- **Action**: Atomically sets token `COMPLETED`, booking `COMPLETED`, and generates a `payment` record with status `PENDING`.

### `POST /api/tokens/:tokenId/not-arrived`
Marks a missed appointment as `NOT_ARRIVED` (No-Show).

---

## 3. Mandi Schedule & Timing Endpoints (`/api/mandi`)

### `GET /api/mandi/schedule`
Returns current effective operating hours, weekly working days, and any pending changes with effective dates.

### `PUT /api/mandi/timings`
Schedules a change to mandi opening/closing hours.
- **Enforcement**: Becomes effective after 7 days (`effective_date = CURDATE() + INTERVAL 7 DAY`).
- **2FA Password**: Requires `MANDI_TIMING_SETTINGS_PASSWORD`.
- **Request Body**:
  ```json
  {
    "opening_time": "08:30:00",
    "closing_time": "18:00:00",
    "security_password": "mandi_secure_2026"
  }
  ```

### `PUT /api/mandi/working-days`
Schedules changes to weekly operational days with 7-day delayed effective date.

---

## 4. Counter Service Time Endpoints (`/api/counters`)

### `PUT /api/counters/:counterId/average-time`
Updates a counter's average vehicle service time (in minutes).
- **Enforcement**: Effective exactly 7 days after the modification.
- **Request Body**: `{ "average_time_minutes": 20 }`
