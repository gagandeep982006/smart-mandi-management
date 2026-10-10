# Integration & Cross-Portal Flow Testing

This guide walks through manual end-to-end integration testing across all four portals to verify that data changes propagate accurately across the entire procurement lifecycle.

---

## 1. Complete End-to-End Test Scenario

```mermaid
sequenceDiagram
    autonumber
    actor Tester
    participant Gov as Government Portal (3001)
    participant Farmer as Farmer Portal (3002)
    participant Mandi as Mandi Portal (3000)
    participant Pay as Payment Portal (3004)

    Tester->>Gov: 1. Create Crop "Barley", Mandi "Test Mandi", Counter 1, Session
    Tester->>Farmer: 2. Register Farmer & Book Appointment for Tomorrow
    Farmer-->>Tester: Receives Queue Token (e.g. TK-01)
    Tester->>Mandi: 3. Operator logs in, views TK-01 in active queue
    Tester->>Mandi: 4. Calls farmer -> Marks arrived -> Weighs 50 Quintals
    Mandi-->>Tester: Procurement Completed (Payment row created as PENDING)
    Tester->>Pay: 5. Payment Officer logs in, views transaction in ledger
    Tester->>Pay: 6. Advances to PROCESSING -> Enters UTR & uploads proof -> Marks PAID
    Tester->>Farmer: 7. Farmer checks Sales History -> Verifies PAID status & UTR
```

---

## 2. Verification Checklist

During execution, verify:
1. [ ] **Quotas Deduct Correctly**: Verify that booking reduced available quota in `procurement_quota`.
2. [ ] **7-Day Delay Verification**: If changing operating hours in the Mandi Portal, verify that the farmer portal displays the *current* hours for appointments within the next 6 days, and the *new* hours starting on day 7.
3. [ ] **Cross-Portal Session Integrity**: Verify that logging in or logging out of the Mandi Portal does not log the user out of the Payment or Government portal.
4. [ ] **MongoDB Logs Emitted**: Verify in MongoDB Compass or mongosh that `TokenHistory` and `PaymentLog` documents were created with operator usernames and timestamps.
