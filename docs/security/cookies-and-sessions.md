# Cookie Security & Portal Isolation

Session tokens are transmitted and stored strictly inside HTTP cookies with modern browser security attributes.

---

## 1. Portal-Specific Cookie Names

Because multiple portal backends and frontends frequently run simultaneously on `localhost` (or under the same parent domain e.g. `*.agri.gov.in`), using a generic cookie name like `token` or `session` would result in cross-portal session overwrites.

Each portal uses a dedicated, isolated cookie name:

| Portal | Dedicated Cookie Name | Set In Controller | Verified In Middleware |
|---|---|---|---|
| **Government Portal** | `gov_token` | `goverment portel/backend/controllers/authController.js` | `authenticateToken.js` |
| **Mandi Operations** | `mandi_token` | `mandi portel/backend/controllers/authController.js` | `authenticateToken.js` |
| **Farmer Portal** | `farmer_token` | `farmer portel/backend/controller/authController.js` | `authenticateToken.js` |
| **Payment Portal** | `payment_token` | `payment-portal/backend/controllers/authController.js` | `authMiddleware.js` |

---

## 2. Cookie Security Attributes

Every cookie issued by the API gateways is configured with strict security flags:

```javascript
res.cookie("gov_token", token, {
    httpOnly: true,                                       // Blocks JavaScript access (XSS defense)
    secure: process.env.NODE_ENV === "production",         // Enforces HTTPS in production
    sameSite: "lax",                                      // Defends against CSRF
    maxAge: 24 * 60 * 60 * 1000,                          // 24-hour expiration (matches JWT exp)
    path: "/"                                             // Available across all API sub-paths
});
```

### Explanations:
- `httpOnly: true`: The cookie cannot be inspected or altered using `document.cookie` in the browser console or injected scripts.
- `secure: true`: Ensures the cookie is transmitted only over encrypted TLS/HTTPS connections in production.
- `sameSite: "lax"`: Protects against Cross-Site Request Forgery (CSRF) by preventing the cookie from being sent on cross-origin POST requests initiated from third-party sites.
- `credentials: "include"`: All frontend `fetch` calls and Axios instances explicitly specify `credentials: "include"`, instructing the browser to attach the cookie to CORS requests.

---

## 3. Logout & Invalidation Behavior

When an operator or farmer logs out via `/api/auth/logout`:
1. The server calls `res.clearCookie("<portal>_token", { path: "/" })`.
2. The legacy cookie name `"token"` is also cleared defensively (`res.clearCookie("token")`) to remove any residual cookies from earlier platform iterations.
3. The response instructs the browser to purge the cookie immediately.
