# ImpulsaRed Security Specification

This document outlines the security architecture and RLS (Row Level Security) invariants for the ImpulsaRed platform.

## 1. Data Invariants

1.  **Identity Integrity:** Users MUST NOT be able to modify their own `role`, `xp`, `level`, or `percentage` fields. These are system-managed.
2.  **Financial Atomicity:** Transactions MUST ONLY be inserted by the system (service_role) or restricted to `pending` status if user-initiated (e.g., plan purchase request).
3.  **Privacy:** PII (email, address, phone) MUST NOT be readable by other users unless they have an Admin role.
4.  **Relationship Integrity:** Referrals MUST be immutable once created.
5.  **Global Safety:** All tables MUST have a default `FORCE ROW LEVEL SECURITY` and a default-deny policy.

## 2. Red Team Audit: The "Dirty Dozen" (Attack Vectors)

| Attack ID | Description | Target Table | Expected Result |
| :--- | :--- | :--- | :--- |
| **ATH-01** | Privilege Escalation (Self-Admin) | `users` | `PERMISSION_DENIED` |
| **ATH-02** | XP/Level Manipulation | `users` | `PERMISSION_DENIED` |
| **ATH-03** | PII Scraper (Cross-User Read) | `users` | `PERMISSION_DENIED` |
| **FIN-01** | Unauthorized Deposit Creation | `transactions` | `PERMISSION_DENIED` |
| **FIN-02** | Commission Hijacking | `transactions` | `PERMISSION_DENIED` |
| **MLM-01** | Referral Tree Poisoning | `referrals` | `PERMISSION_DENIED` |
| **SYS-01** | Global Setting Modification | `settings` | `PERMISSION_DENIED` |
| **SYS-02** | Feature Flag Manipulation | `features` | `PERMISSION_DENIED` |
| **COM-01** | Cross-User Notification Read | `notifications` | `PERMISSION_DENIED` |
| **COM-02** | Support Ticket Snooping | `tickets` | `PERMISSION_DENIED` |
| **TSK-01** | Task Completion Spoofing | `user_tasks` | `PERMISSION_DENIED` |
| **VIR-01** | Conversion Event Flooding | `conversion_events`| `RATE_LIMIT_DENIED` (Future) |

## 3. Conflict Report & Mitigation Plan

- **Gap Found:** Several tables (`features`, `plan_features`, `tickets`, `conversion_events`, `penalty_tasks`) currently have NO RLS policies in `apply_phase6_rls.sql`.
- **Mitigation:** Implement **Phase 7: Comprehensive Hardening** to cover every table in the system.
