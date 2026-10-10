# Cancellation, No-Show & Failure Recovery Workflow

This document details error recovery, missed appointments, booking cancellations, and payment dispute workflows.

---

## 1. Farmer Appointment Cancellation

### Permitted Window:
- A farmer can cancel an appointment up to 30 minutes before the mandi counter's opening time on the scheduled date.
- Cancellations attempted within 30 minutes of opening time are rejected with HTTP 400 to prevent sudden empty capacity in the yard.

### Cancellation Transaction:
1. `booking.status` transitions from `BOOKED` &rarr; `CANCELLED`.
2. Associated `queue_token` transitions from `WAITING` &rarr; `CANCELLED`.
3. Daily counter capacity is immediately restored for other farmers to book.
4. An audit record is stored in MongoDB `BookingHistory`.

---

## 2. No-Show Handling (`NOT_ARRIVED`)

When an appointment is called at the weighbridge:
1. The token transitions to `CALLED`.
2. The physical arrival timer starts.
3. If the farmer fails to present their vehicle at the scale after multiple calls, the operator clicks **"Mark No-Show"**:
   - `queue_token.status` transitions to `NOT_ARRIVED`, setting `failed_at = NOW()`.
   - `booking.status` transitions to `NOT_ARRIVED`.
   - The next waiting token in sequence (`queue_position ASC`) is called immediately.
4. **Rescheduling No-Shows**: The farmer can log into the Farmer Portal and request an appointment reschedule for a future operational date.

---

## 3. Payment Failure Recovery

If a bank transfer fails (e.g. incorrect IFSC code, dormant bank account):
1. **Transition to `FAILED`**:
   - Payment officer transitions the status from `PROCESSING` &rarr; `FAILED`.
   - Officer logs the failure reason (e.g. `"Invalid bank account number"`).
2. **Account Correction**:
   - The farmer updates their banking credentials in the Farmer Portal.
3. **Disbursement Retry**:
   - The payment record transitions back from `FAILED` &rarr; `PROCESSING`.
   - The payout is re-executed with updated banking credentials, and the successful bank reference number is uploaded to finalize the transaction as `PAID`.
