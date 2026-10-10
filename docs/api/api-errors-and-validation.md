# API Errors & Validation Standards

This document describes the standard HTTP response formats, error codes, and validation mechanisms implemented across all portal backends.

---

## 1. Standard Response Formats

All API responses follow consistent JSON envelope formats:

### Success Response (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (`400`, `401`, `403`, `404`, `409`, `429`, `500`):
```json
{
  "success": false,
  "message": "Human-readable explanation of error",
  "error": "OPTIONAL_ERROR_CODE"
}
```

---

## 2. Standard HTTP Status Codes Used

| Status Code | Meaning in Platform | Typical Trigger |
|---|---|---|
| `200 OK` | Request succeeded | Successful read, status change, or OTP request |
| `201 Created` | Resource created | Farmer registration, booking issued, mandi created |
| `400 Bad Request` | Invalid input or business rule violation | Missing required field, invalid phone format, invalid state transition |
| `401 Unauthorized` | Missing or invalid authentication | Missing JWT cookie, expired session, invalid token signature |
| `403 Forbidden` | Authenticated but unauthorized | Insufficient permissions in `req.user.permissions`, location scope violation |
| `404 Not Found` | Resource does not exist | Invalid counter ID, booking ID not found |
| `409 Conflict` | Unique constraint conflict | Duplicate mobile number, duplicate Aadhaar blind index, existing username |
| `429 Too Many Requests` | Rate limit or security lockout | Exceeded 5 failed login attempts, OTP cooldown active (< 5 minutes) |
| `500 Internal Error` | Unhandled server exception | Database connectivity failure, unhandled runtime exception |

---

## 3. Input Validation Standards

- **Phone Numbers**: Must be exactly 10 digits (`/^\d{10}$/`). Normalized by removing leading `+91` or `0`.
- **Aadhaar Numbers**: Must be exactly 12 digits (`/^\d{12}$/`). Immediately hashed; raw numbers are never echoed back.
- **Amounts & Quantities**: Validated as positive numbers (`DECIMAL(12,2)`). Negative numbers or non-numeric strings are rejected with HTTP 400.
