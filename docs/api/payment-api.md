# Payment Portal API Reference

The Payment Portal backend manages state-isolated procurement disbursements, analytical metrics, status transitions, and audit proofs.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/request-otp`
Requests login OTP for registered payment officers (`payment_users`).
- **Request Body**: `{ "phone_number": "9811122233" }`

### `POST /api/auth/verify-otp`
Verifies OTP and issues `payment_token` HttpOnly cookie.
- **Request Body**: `{ "phone_number": "9811122233", "otp": "998877" }`
- **Response**: `200 OK` with `Set-Cookie: payment_token=...; HttpOnly`.

### `POST /api/auth/logout`
Clears `payment_token` and `token` cookies.

---

## 2. Dashboard Analytics Endpoints (`/api/dashboard`)

### `GET /api/dashboard/metrics`
Returns high-level disbursement statistics for the officer's state:
- Total Disbursed Amount (₹).
- Pending Payout Amount (₹).
- Completed vs Pending transaction counts.
- Recent activity timeline from MongoDB `PaymentLog`.

---

## 3. Payment Ledger Endpoints (`/api/payments`)

### `GET /api/payments`
Returns paginated, searchable payment records using the pre-joined view `vw_payment_details`.
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10, max: 50)
  - `status` (`PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`)
  - `search` (Search by farmer name, mobile, or transaction reference)
  - `district_id`, `tehsil_id` (Optional sub-location filters)
- **State Isolation**: Automatically applies `WHERE f.state_id = req.user.state_id`.

### `GET /api/payments/:paymentId`
Returns complete transaction details, including farmer profile, bank account, land records, counter details, and transaction proof.

### `PATCH /api/payments/:paymentId/status`
Executes an atomic status transition on the payment record.
- **Auth**: Required (`payment_token` with `process` permission).
- **Request Body (Approving to `PROCESSING`)**:
  ```json
  {
    "new_status": "PROCESSING",
    "notes": "Initiating NEFT bank transfer batch"
  }
  ```
- **Request Body (Finalizing as `PAID`)**:
  ```json
  {
    "new_status": "PAID",
    "transaction_reference": "SBIN2026101500918234",
    "notes": "Direct Benefit Transfer credited successfully",
    "screenshot": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
  ```
- **Action**: Atomically locks row, validates state transition, updates `payment`, inserts into `payment_completion_proof`, and emits audit event to MongoDB `PaymentLog`.
