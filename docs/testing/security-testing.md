# Security & Rate Limiting Verification

This guide outlines manual and automated testing steps to verify rate limiting, OTP cooldowns, lockout policies, and authentication boundaries.

---

## 1. Verifying OTP Resend Cooldown (5 Minutes)

### Test Procedure (using curl):
```bash
# Request 1 (Initial OTP Request)
curl -X POST http://localhost:5001/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"9876543210"}'
# Expected Result: HTTP 200 OK

# Request 2 (Immediate Second Request within 5 mins)
curl -X POST http://localhost:5001/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"9876543210"}'
# Expected Result: HTTP 429 Too Many Requests
```

---

## 2. Verifying Account Lockout (5 Failed Attempts)

### Test Procedure:
Submit 5 consecutive invalid OTP codes for a phone number:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:5001/api/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d '{"phone_number":"9876543210","otp":"000000"}'
done
```
- First 4 attempts: Return HTTP `400 Bad Request` (`"Unable to verify the OTP. Please check the code and try again."`).
- 5th and subsequent attempts: Return HTTP `429 Too Many Requests` (`"Too many requests. Please try again later."`).

---

## 3. Verifying Cookie Protection

1. Authenticate successfully and inspect the HTTP response headers in browser DevTools or curl:
   ```text
   Set-Cookie: gov_token=eyJhbGciOi...; Path=/; HttpOnly; SameSite=Lax
   ```
2. Verify `HttpOnly` flag is present.
3. Open browser console on the frontend and execute `console.log(document.cookie);`. Ensure the token is **not visible** in the output.
