# Farmer Registration & Onboarding Workflow

Farmer registration qualifies agricultural producers to participate in government grain procurement at Minimum Support Prices (MSP).

---

## 1. Prerequisites for Onboarding

To register, a farmer must provide:
- Valid Indian 10-digit mobile number.
- 12-digit Aadhaar number for identity verification.
- Residential location (State, District, Tehsil).
- Land parcel information (Survey/Khasra number, area in acres, ownership type).
- Bank account details (Account number, IFSC code, bank name) matching the farmer's legal identity.

---

## 2. Step-by-Step Registration Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Farmer
    participant UI as Farmer Portal UI
    participant API as Farmer Backend Gateway
    participant DB as MySQL Database

    Farmer->>UI: Enters Mobile Number & Profile Data
    UI->>API: POST /api/auth/register-farmer
    API->>API: Validates Mobile Format & Location IDs
    API->>API: Computes aadhaar_lookup = HMAC(Aadhaar, PEPPER)
    API->>API: Computes aadhaar_hash = bcrypt.hash(Aadhaar)
    API->>DB: Checks duplicate aadhaar_lookup OR mobile_number
    alt Duplicate Found
        DB-->>API: Conflict Error (Unique Key Violation)
        API-->>UI: 409 Conflict (Farmer already registered)
    else Unique Record
        API->>DB: INSERT INTO farmer (...)
        API->>DB: INSERT INTO bank_account (farmer_id, ...)
        API->>DB: INSERT INTO farmer_land (farmer_id, ...)
        API-->>UI: 201 Created (Registration Successful)
    end
```

---

## 3. Data Integrity & Verification Rules

1. **Aadhaar Protection**: The 12-digit raw number is immediately discarded from memory once hashes are generated.
2. **Land Verification**: Newly inserted land parcels default to `land_verification = 'pending'`. Administrative officers in the Government Portal verify ownership against land registry databases before seasonal quotas can be booked.
3. **Single Active Bank Account**: The `bank_account.farmer_id` column enforces `UNIQUE KEY`, guaranteeing each farmer has exactly one primary bank account on file for Direct Benefit Transfer disbursements.
