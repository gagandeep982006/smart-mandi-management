# API Documentation Reference

This section provides a complete, factual API reference for all four portal backends based directly on verified Express routes, middleware, and controllers.

---

## 📑 In This Section

1. **[Government Portal API Reference](./government-api.md)**: Geographic setup, crop catalog, procurement quotas, mandi & counter provisioning, user administration, and audit logs.
2. **[Farmer Portal API Reference](./farmer-api.md)**: Phone/OTP auth, profile lookup, slot availability, booking management, and queue token tracking.
3. **[Mandi Portal API Reference](./mandi-api.md)**: Operator auth, counter queues, calling/arrival/completion workflows, and 7-day schedule configuration.
4. **[Payment Portal API Reference](./payment-api.md)**: State-isolated ledger listings, metrics dashboard, status transitions, and proof attachments.
5. **[API Error Handling & Standard Responses](./api-errors-and-validation.md)**: Standard HTTP status codes, error payload schemas, and validation responses.

---

## 🌐 API Base URLs & Ports (Development)

| Portal | Base URL | Auth Cookie Name | Primary Endpoints Prefix |
|---|---|---|---|
| **Government Portal** | `http://localhost:5001` (or `5000`) | `gov_token` | `/api/auth`, `/api/location/*`, `/api/mandis`, `/api/app-users`, `/api/procurement` |
| **Farmer Portal** | `http://localhost:5002` | `farmer_token` | `/api/auth`, `/api/farmer/*` |
| **Mandi Portal** | `http://localhost:5001` | `mandi_token` | `/api/auth`, `/api/mandi`, `/api/counters`, `/api/tokens`, `/api/payments` |
| **Payment Portal** | `http://localhost:5004` | `payment_token` | `/api/auth`, `/api/payments`, `/api/dashboard`, `/api/locations` |

---

## 🔒 Standard Request Headers

For all authenticated requests:
```http
Content-Type: application/json
Accept: application/json
```
Cookies must be passed automatically by browsers (`credentials: "include"`).
