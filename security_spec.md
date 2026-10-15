# Security Specification for FLEXchat

## Data Invariants
1. A user can only write their own user profile (`request.auth.uid == userId`).
2. A user cannot grant themselves administrator privileges (`isAdmin()` check via `/admins/{userId}`).
3. Contact requests can only be initiated by the authenticated user (`fromUserId == request.auth.uid`).
4. Conversations can only be read or written by participants (`request.auth.uid in resource.data.participantIds`).
5. Messages within conversations can only be created by participants, and `senderId == request.auth.uid`.
6. Calls can only be created, answered, or updated by the designated caller or receiver.
7. Only administrators can read and update abuse reports.

## The Dirty Dozen Payloads (Strictly Blocked by Rules)
1. **Self-Escalation Attack**: User attempts to write to `/admins/{uid}` directly. (BLOCKED: user cannot write to `/admins`)
2. **Ghost Profile Hijack**: User A writes to `/users/{userB_id}`. (BLOCKED: `request.auth.uid == userId` enforced)
3. **Impersonated Sender Message**: User A posts message with `senderId: "userB"`. (BLOCKED: `incoming().senderId == request.auth.uid`)
4. **Eavesdropping Conversation**: Non-participant queries messages of a conversation. (BLOCKED: participant check on parent/message)
5. **Call Hijacking**: User C answers Call between User A and User B. (BLOCKED: callerId/receiverId constraint)
6. **Fake Contact Acceptance**: User A (sender) sets status to 'accepted' on their own request. (BLOCKED: only `toUserId` can accept)
7. **PII Injection**: Injecting 2MB payload into `statusMessage`. (BLOCKED: `.size() <= 200` constraint)
8. **Malicious ID injection**: Path containing traversal or junk characters. (BLOCKED: `isValidId()` regex guard)
9. **Tampering with Message History**: Modifying `createdAt` or message text after the fact. (BLOCKED: immutable timestamp checks)
10. **Report Tampering**: Non-admin modifies or deletes report status. (BLOCKED: admin-only write on reports)
11. **Bypassing Read Receipt Rules**: User C marks messages as read for User B. (BLOCKED: auth verification)
12. **Unauthenticated Query**: Anonymous user reads user list or calls. (BLOCKED: `isSignedIn()`)
