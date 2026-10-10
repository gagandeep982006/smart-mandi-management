# Testing Strategy Documentation

This section provides technical guides for verifying referential integrity, security defenses, rate limiting, and cross-portal operational workflows.

---

## 📑 In This Section

1. **[Testing Strategy Overview](./testing-strategy.md)**: Current testing infrastructure, test scripts, and test suite execution.
2. **[Database & Referential Integrity Testing](./database-testing.md)**: Validating foreign key constraints (`ON DELETE RESTRICT`), triggers, and view schemas.
3. **[Security & Rate Limiting Verification](./security-testing.md)**: Testing OTP cooldowns, lockout limits, blind index hashing, and SQL parameterization.
4. **[Integration & Cross-Portal Flow Testing](./integration-testing.md)**: End-to-end verification across Government, Farmer, Mandi, and Payment portals.
