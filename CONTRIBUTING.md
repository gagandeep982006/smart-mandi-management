# Contributing Guidelines

Thank you for your interest in contributing to the **Digital Agricultural & Mandi Procurement Ecosystem**. This project provides digital governance and logistics infrastructure for agricultural marketing and Direct Benefit Transfer (DBT) procurement.

---

## 1. Code of Conduct

- Maintain respectful and constructive communication.
- Focus on security, data integrity, and compliance with statutory procurement standards.
- Protect sensitive data: Never submit test data containing real phone numbers, real Aadhaar numbers, real bank accounts, or real server credentials.

---

## 2. Development Workflow

### Step 1: Branching Strategy
- Create feature or fix branches from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  # or
  git checkout -b fix/issue-description
  ```

### Step 2: Code Guidelines
- **Modularity**: Preserve the boundary between the four portals (`goverment portel`, `mandi portel`, `farmer portel`, `payment-portal`).
- **Database Routing**: 
  - All write operations (`INSERT`, `UPDATE`, `DELETE`) and transactions must target the Primary database via `getWriteDatabase()`.
  - Read queries should use `getReadDatabase()` where applicable.
- **Foreign Key Constraints**: Never bypass foreign key constraints with `SET FOREIGN_KEY_CHECKS = 0;`. Always write deletion queries in proper dependency order as specified in [DATABASE_DELETION_GUIDE.md](./DATABASE_DELETION_GUIDE.md).
- **Authentication**: Store JWT sessions strictly in HttpOnly cookies using portal-specific cookie names (`gov_token`, `mandi_token`, `farmer_token`, `payment_token`).
- **Input Validation & Parameterization**: Always use parameterized SQL queries (`?` placeholders). Never concatenate unsanitized user inputs into SQL strings.

### Step 3: Testing & Local Verification
- Test all endpoints with appropriate role and location scoping.
- Verify that rate limiting and OTP cooldowns function as intended.
- Ensure all frontend fetch calls specify `credentials: "include"`.

---

## 3. Pull Request Checklist

Before submitting a Pull Request, verify:
1. [ ] No `.env` files or secret values are committed.
2. [ ] No real citizen/farmer data exists in seed files or test scripts.
3. [ ] All SQL queries are parameterized.
4. [ ] Documentation in `docs/` is updated if database schemas, environment variables, or APIs were modified.
5. [ ] Relative Markdown links resolve cleanly.
