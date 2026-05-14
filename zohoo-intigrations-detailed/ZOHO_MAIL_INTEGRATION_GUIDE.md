# Zoho Mail Full Integration Guide — Namaah Nexus
**Source:** https://www.zoho.com/mail/help/api/overview.html  
**Date:** 14 May 2026 | **Engine:** Gemma 4:e4b (LOCAL_AI_ENDPOINT)  
**Status:** Infrastructure COMPLETE — Awaiting Credentials

---

## Table of Contents

1. [What's Already Built](#1-whats-already-built)
2. [Activation Checklist (4 Steps to Go Live)](#2-activation-checklist)
3. [OAuth 2.0 Full Flow](#3-oauth-20-full-flow)
4. [All 15 Zoho API Modules — What We Can Build](#4-all-15-api-modules)
5. [Email API — Complete Reference](#5-email-api-complete-reference)
6. [Folders API](#6-folders-api)
7. [Labels API](#7-labels-api)
8. [Threads API](#8-threads-api)
9. [Users (Provisioning) API](#9-users-provisioning-api)
10. [Organization API](#10-organization-api)
11. [Mail Policy API](#11-mail-policy-api)
12. [Notes API](#12-notes-api)
13. [Gemma AI Integration Layer](#13-gemma-ai-integration-layer)
14. [Database Schema (Migration 069)](#14-database-schema)
15. [Full Feature Roadmap](#15-full-feature-roadmap)
16. [Error Codes & Troubleshooting](#16-error-codes--troubleshooting)
17. [How Email ID Creation Works — Both Ways](#17-how-email-id-creation-works--both-ways)

---

## 1. What's Already Built

Everything below is **100% implemented** and ready to activate:

| Component | File | Status |
|-----------|------|--------|
| OAuth Connect (Step 1) | `src/app/api/mail/auth/connect/route.ts` | ✅ Done |
| OAuth Callback (Token Exchange) | `src/app/api/mail/auth/callback/route.ts` | ✅ Done |
| Token Auto-Refresh | `src/lib/zoho-mail.ts → getActiveToken()` | ✅ Done |
| Inbox Sync + Cache | `src/app/api/mail/inbox/route.ts` | ✅ Done |
| Send Email | `src/app/api/mail/send/route.ts` | ✅ Done |
| Draft CRUD | `src/app/api/mail/drafts/route.ts` | ✅ Done |
| Templates CRUD | `src/app/api/mail/templates/route.ts` | ✅ Done |
| File Sharing | `src/app/api/mail/files/route.ts` | ✅ Done |
| AI Classification | `src/app/api/mail/ai/classify/route.ts` | ✅ Done |
| Employee Provisioning | `src/app/api/mail/accounts/create-employee/route.ts` | ✅ Done |
| Mail Hub (Kanban board) | `src/app/admin/mail/page.tsx` | ✅ Done |
| Inbox UI (3-pane) | `src/app/admin/mail/inbox/page.tsx` | ✅ Done |
| Compose UI | `src/app/admin/mail/compose/page.tsx` | ✅ Done |
| Sent Page | `src/app/admin/mail/sent/page.tsx` | ✅ Done |
| Drafts Page | `src/app/admin/mail/drafts/page.tsx` | ✅ Done |
| File Share Page | `src/app/admin/mail/files/page.tsx` | ✅ Done |
| Templates Page | `src/app/admin/mail/templates/page.tsx` | ✅ Done |
| Mail Config (OAuth wizard) | `src/app/admin/mail/config/page.tsx` | ✅ Done |
| Mail Accounts Manager | `src/app/admin/mail/accounts/page.tsx` | ✅ Done |
| Auto-provision on Add Employee | `src/app/admin/users/page.tsx` | ✅ Done |
| Manual "Create Zoho Mail" from RowMenu | `src/app/admin/users/page.tsx` | ✅ Done |
| 9-table DB schema (migration 069) | `src/supabase/migrations/069_zoho_mail_schema.sql` | ✅ Done |

---

## 2. Activation Checklist

### Step 1 — Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- File: src/supabase/migrations/069_zoho_mail_schema.sql
-- Copy-paste entire file into SQL Editor and run
```

This creates 9 tables: `zoho_config`, `zoho_mail_accounts`, `mail_messages`,
`mail_drafts`, `mail_templates`, `mail_file_shares`, `mail_ai_cache`,
`mail_delegations`, `mail_audit_log`.

---

### Step 2 — Create Zoho OAuth App

1. Go to **https://api-console.zoho.in** (India region)
2. Click **"Add Client"** → Select **"Server-based Application"**
3. Fill in:
   - **Client Name:** Namaah Nexus
   - **Homepage URL:** `https://yourdomain.com`
   - **Authorized Redirect URI:** `https://yourdomain.com/api/mail/auth/callback`
4. Enable these **scopes**:
   ```
   ZohoMail.messages.ALL
   ZohoMail.accounts.ALL
   ZohoMail.organization.ALL
   ZohoMail.folders.ALL
   ZohoMail.tags.ALL
   ZohoMail.organization.accounts
   ZohoMail.organization.policy
   ZohoMail.notes
   ```
5. Copy the **Client ID** and **Client Secret**

---

### Step 3 — Set Environment Variables

Add to `.env.local`:

```env
ZOHO_CLIENT_ID=1000.XXXXXXXXXXXXXXXXXXXXXX
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_ORG_ID=your_org_id_here
ZOHO_REDIRECT_URI=https://yourdomain.com/api/mail/auth/callback
ZOHO_MAIL_DOMAIN=namaah.in
ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
ZOHO_MAIL_API_URL=https://mail.zoho.in/api

# Gemma AI (existing — already configured on Mac Mini)
LOCAL_AI_ENDPOINT=http://your-mac-mini-ip:11434/api/generate
LOCAL_AI_MODEL=gemma4:e4b
AI_BRIDGE_KEY=your_bridge_key
```

**How to find ZOHO_ORG_ID:**
- Login to Zoho Mail Admin → Settings → Organization Details
- URL will show: `mail.zoho.in/zm/adminConsole/#/orgs/{ORG_ID}/...`

---

### Step 4 — Connect via Admin UI

1. Go to **Admin → Comms → Mail Config**
2. Enter Client ID + Client Secret + Domain (`namaah.in`)
3. Click **"Connect to Zoho Mail"**
4. Zoho OAuth page opens → Authorize
5. Redirected back → **"Zoho Mail Connected"** ✅
6. Click **"Test Connection"** to verify

**Everything activates automatically from this point.**

---

## 3. OAuth 2.0 Full Flow

### Base URLs (India Region)

```
OAuth Base:   https://accounts.zoho.in
Mail API:     https://mail.zoho.in/api
```

### Authorization Flow

```
Step 1: Build Auth URL
GET https://accounts.zoho.in/oauth/v2/auth
  ?response_type=code
  &client_id={CLIENT_ID}
  &scope=ZohoMail.messages.ALL,ZohoMail.accounts.ALL,ZohoMail.organization.ALL
  &redirect_uri={REDIRECT_URI}
  &access_type=offline           ← Required for refresh token
  &prompt=consent

Step 2: User authorizes → Zoho redirects to:
GET {REDIRECT_URI}?code={AUTH_CODE}&location=in&accounts-server=...

Step 3: Exchange code for tokens
POST https://accounts.zoho.in/oauth/v2/token
  Content-Type: application/x-www-form-urlencoded
  Body:
    grant_type=authorization_code
    &code={AUTH_CODE}
    &client_id={CLIENT_ID}
    &client_secret={CLIENT_SECRET}
    &redirect_uri={REDIRECT_URI}

Response:
{
  "access_token": "1000.xxxx",
  "refresh_token": "1000.yyyy",
  "expires_in": 3600,
  "token_type": "Bearer"
}

Step 4: Refresh access token (runs automatically via getActiveToken())
POST https://accounts.zoho.in/oauth/v2/token
  grant_type=refresh_token
  &refresh_token={REFRESH_TOKEN}
  &client_id={CLIENT_ID}
  &client_secret={CLIENT_SECRET}

Step 5: All API calls
Authorization: Bearer {ACCESS_TOKEN}
```

### Token Management (Already Implemented)

`src/lib/zoho-mail.ts → getActiveToken()`:
- Fetches token from `zoho_config` table
- Checks if expiry < 5 minutes away
- Auto-calls `refreshAccessToken()` if needed
- Returns valid token for every API call

---

## 4. All 15 API Modules

### Module Overview Table

| # | Module | Our Implementation | What It Enables |
|---|--------|-------------------|-----------------|
| 1 | **Email Messages API** | ✅ Full (send, inbox, sync, reply) | Send, receive, search, move, delete emails |
| 2 | **Folders API** | 🔶 Partial (list only) | Create custom folders, organize inbox |
| 3 | **Labels API** | 🔶 Partial (read for AI) | Color labels, filter by label |
| 4 | **Threads API** | 🔶 Partial (thread view) | Bulk operations on conversations |
| 5 | **Users API** | ✅ Full (create-employee) | Provision accounts, manage users |
| 6 | **Organization API** | ❌ Not yet | Org settings, storage, subscription info |
| 7 | **Domains API** | ❌ Not yet | Domain health, MX/SPF/DKIM status |
| 8 | **Groups API** | ❌ Not yet | Department mail groups, shared mailboxes |
| 9 | **Mail Policy API** | ❌ Not yet | Forwarding rules, access restrictions |
| 10 | **Accounts API** | ✅ Full (vacation, forwarding) | Per-user settings, vacation reply |
| 11 | **Signatures API** | ❌ Not yet | Company-wide signature management |
| 12 | **Tasks API** | ❌ Not yet | Create tasks from emails |
| 13 | **Bookmarks API** | ❌ Not yet | Bookmark important emails |
| 14 | **Notes API** | ❌ Not yet | Notes linked to email accounts |
| 15 | **Logs API** | ❌ Not yet | Login history, audit, SMTP logs |

Legend: ✅ Built | 🔶 Partial | ❌ Planned

---

## 5. Email API — Complete Reference

**Base URL:** `https://mail.zoho.in/api`  
**OAuth Scope:** `ZohoMail.messages.ALL`

### 5.1 Send Email

```http
POST /accounts/{accountId}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "fromAddress": "sender@namaah.in",
  "toAddress": "recipient@example.com",
  "ccAddress": "cc@example.com",          // optional
  "bccAddress": "bcc@example.com",         // optional
  "subject": "Email Subject",
  "content": "<p>HTML body</p>",
  "mailFormat": "html",                    // "html" | "plaintext"
  "encoding": "UTF-8"
}

Response:
{
  "status": { "code": 200, "description": "success" },
  "data": { "messageId": "1234567890" }
}
```

### 5.2 Get Inbox Messages

```http
GET /accounts/{accountId}/messages/view
  ?folder=Inbox
  &limit=50
  &start=0
  &sortby=date
  &order=desc

Response:
{
  "data": [{
    "messageId": "...",
    "subject": "...",
    "fromAddress": "...",
    "sender": "Display Name",
    "toAddress": "...",
    "summary": "preview text",
    "receivedTime": "1715673000000",  // epoch ms
    "status": "0",                    // "1" = read
    "hasAttachment": "0",             // "1" = has attachment
    "threadId": "...",
    "folderId": "...",
    "folderName": "Inbox"
  }]
}
```

### 5.3 Get Message by ID (Full Body)

```http
GET /accounts/{accountId}/folders/{folderId}/messages/{messageId}/details

Response:
{
  "data": {
    "messageId": "...",
    "subject": "...",
    "content": "<html>full email body</html>",
    "fromAddress": "...",
    "toAddress": "...",
    "ccAddress": "...",
    "receivedTime": "...",
    "attachments": [{ "attachmentId": "...", "fileName": "...", "size": 1024 }]
  }
}
```

### 5.4 Reply to Email

```http
POST /accounts/{accountId}/messages/{messageId}
Content-Type: application/json

{
  "content": "<p>Reply body</p>",
  "mailFormat": "html",
  "action": "reply"    // "reply" | "replyAll" | "forward"
}
```

### 5.5 Search Emails

```http
GET /accounts/{accountId}/messages/search
  ?searchKey=invoice
  &folder=Inbox
  &limit=20
  &start=0
  &category=subject    // "subject" | "from" | "to" | "body" | "all"
```

### 5.6 Mark Read / Mark Unread

```http
PUT /accounts/{accountId}/updatemessage
Content-Type: application/json

{
  "mode": "markAsRead",              // "markAsRead" | "markAsUnread"
  "messageId": ["id1", "id2"],
  "folderId": "folder_id"
}
```

### 5.7 Move Email

```http
PUT /accounts/{accountId}/updatemessage
Content-Type: application/json

{
  "mode": "move",
  "messageId": ["id1"],
  "folderId": "source_folder_id",
  "targetFolderId": "destination_folder_id"
}
```

### 5.8 Delete Email

```http
DELETE /accounts/{accountId}/folders/{folderId}/messages/{messageId}
```

### 5.9 Save as Draft

```http
POST /accounts/{accountId}/messages
Content-Type: application/json

{
  "toAddress": "draft@example.com",
  "subject": "Draft Subject",
  "content": "Draft body",
  "mailFormat": "html",
  "action": "save"    ← Key: "save" = save as draft, omit = send
}
```

### 5.10 Download Attachment

```http
GET /accounts/{accountId}/folders/{folderId}/messages/{messageId}/attachments/{attachmentId}
```

---

## 6. Folders API

**OAuth Scope:** `ZohoMail.folders.ALL`

| Action | Method | Endpoint |
|--------|--------|----------|
| List all folders | GET | `/accounts/{accountId}/folders` |
| Get specific folder | GET | `/accounts/{accountId}/folders/{folderId}` |
| Create folder | POST | `/accounts/{accountId}/folders` |
| Rename folder | PUT | `/accounts/{accountId}/folders/{folderId}` |
| Move folder | PUT | `/accounts/{accountId}/folders/{folderId}` |
| Mark all as read | PUT | `/accounts/{accountId}/folders/{folderId}` |
| Empty folder | PUT | `/accounts/{accountId}/folders/{folderId}` |
| Delete folder | DELETE | `/accounts/{accountId}/folders/{folderId}` |

### Create Folder Request

```json
POST /accounts/{accountId}/folders
{
  "folderName": "HR Mails",
  "parentFolderId": ""   // empty = root level
}
```

### What This Unlocks for Us

- **Custom Inbox Rules** — Create `HR Mails`, `Finance`, `Client` folders automatically for each new employee
- **Move emails** to correct folder based on AI category (URGENT, WORK, FINANCE)
- **Folder sidebar** in inbox UI (already shows Inbox/Sent/Drafts/Starred/Trash — can add custom)

---

## 7. Labels API

**OAuth Scope:** `ZohoMail.tags.ALL`

| Action | Method | Endpoint |
|--------|--------|----------|
| Create label | POST | `/accounts/{accountId}/labels` |
| List all labels | GET | `/accounts/{accountId}/labels` |
| Get specific label | GET | `/accounts/{accountId}/labels/{labelId}` |
| Update/rename label | PUT | `/accounts/{accountId}/labels/{labelId}` |
| Delete label | DELETE | `/accounts/{accountId}/labels/{labelId}` |

### Create Label Request

```json
POST /accounts/{accountId}/labels
{
  "labelName": "Invoice",
  "labelColor": "#FF6B6B"   // hex color
}
```

### Apply Label to Email

```json
PUT /accounts/{accountId}/updatemessage
{
  "mode": "addLabel",
  "messageId": ["msgId1"],
  "folderId": "folderId",
  "labelId": "labelId"
}
```

### What This Unlocks

- **AI Auto-Labeling** — Gemma classifies email → auto-apply matching Zoho label
- **Label sync** — Keep Zoho labels in sync with our `ai_category` DB field
- **Color-coded inbox** — Visual label system matching our AI categories

---

## 8. Threads API

**OAuth Scope:** `ZohoMail.messages.ALL`

All thread operations use:
```http
PUT /accounts/{accountId}/updatethread
```

### Thread Operations

```json
// Flag thread
{ "mode": "flagThread", "threadId": ["..."] }

// Move thread
{ "mode": "moveThread", "threadId": ["..."], "targetFolderId": "..." }

// Apply label
{ "mode": "addLabel", "threadId": ["..."], "labelId": "..." }

// Remove label
{ "mode": "removeLabel", "threadId": ["..."], "labelId": "..." }

// Mark as read
{ "mode": "markAsRead", "threadId": ["..."] }

// Mark as unread
{ "mode": "markAsUnread", "threadId": ["..."] }

// Mark as spam
{ "mode": "markAsSpam", "threadId": ["..."] }

// Remove from spam
{ "mode": "notSpam", "threadId": ["..."] }
```

### What This Unlocks

- **Thread view** in inbox — Group all replies to same email as one conversation
- **"Mark all in thread as read"** button
- **"Archive thread"** = move thread to Archive folder
- **Spam management** — Mark/unmark spam from UI

---

## 9. Users (Provisioning) API

**OAuth Scope:** `ZohoMail.organization.accounts`

### Create User (Already Implemented in create-employee route)

```http
POST /organization/{orgId}/accounts
{
  "emailAddress": "john.doe@namaah.in",
  "displayName": "John Doe",
  "password": "SecurePass@123",
  "role": "member"    // "member" | "admin"
}

Response:
{
  "data": {
    "mailboxId": "12345678",
    "accountId": "12345678",
    "emailAddress": "john.doe@namaah.in"
  }
}
```

### List All Users

```http
GET /organization/{orgId}/accounts

Response:
{
  "data": [{
    "accountId": "...",
    "emailAddress": "...",
    "displayName": "...",
    "accountStatus": "active"
  }]
}
```

### Get Single User

```http
GET /organization/{orgId}/accounts/{emailAddress}
// OR
GET /organization/{orgId}/accounts/{userId}
```

### Update User

```http
// Reset password
PUT /organization/{orgId}/accounts/{userId}
{ "password": "NewPass@123" }

// Change role
PUT /organization/{orgId}/accounts
{ "role": "admin", "accountId": "..." }

// Disable account
PUT /organization/{orgId}/accounts/{accountId}
{ "accountStatus": "inactive" }

// Enable IMAP
PUT /organization/{orgId}/accounts/{accountId}
{ "imap": true }
```

### Delete User

```http
DELETE /organization/{orgId}/accounts
{ "accountId": "..." }
```

### What This Unlocks

- **Full employee lifecycle** — Create email on hire, disable on termination
- **Role sync** — When HR promotes employee to manager, update Zoho role
- **Password reset** from admin panel
- **Sync terminations** — When employee deactivated in Nexus, disable Zoho account

---

## 10. Organization API

**OAuth Scope:** `ZohoMail.organization.ALL`

### Key Endpoints

```http
// Get org details
GET /organization
Response: { orgName, orgId, subscription, storage, plan }

// Get org storage usage
GET /organization/{orgId}/storage
Response: { totalStorage, usedStorage, freeStorage }

// Get subscription info
GET /organization/{orgId}/subscription

// Get allowed IPs
GET /organization/{orgId}/allowedip

// Get spam settings
GET /organization/{orgId}/spam
```

### What This Unlocks

- **Org Health Dashboard** — Show mail storage usage, subscription plan
- **Security** — Display allowed IPs, enforce IP restrictions
- **Admin overview card** — Total mailboxes, storage used, plan details

---

## 11. Mail Policy API

**OAuth Scope:** `ZohoMail.organization.policy`

### Policy Types

```http
// Create a policy
POST /organization/{orgId}/policy
{
  "policyType": "mailRestriction",   // | "accountRestriction" | "accessRestriction" | "mailForwardPolicy"
  "policyName": "Block External Forwarding",
  "description": "..."
}

// Get all policies
GET /organization/{orgId}/policy

// Get specific policy type
GET /organization/{orgId}/policy/mailForwardPolicy
GET /organization/{orgId}/policy/accessRestriction
GET /organization/{orgId}/policy/mailRestriction
GET /organization/{orgId}/policy/accountRestriction

// Apply policy to users
PUT /organization/{orgId}/policy/{policyId}
{
  "users": ["user1@namaah.in", "user2@namaah.in"]
}

// Apply policy to groups
PUT /organization/{orgId}/policy/{policyId}
{
  "groups": ["groupId1"]
}
```

### What This Unlocks

- **No external forwarding** — Prevent employees forwarding company email externally
- **Role-based access** — Block IMAP/POP for interns
- **Compliance** — Enforce mail policies from admin panel

---

## 12. Notes API

**OAuth Scope:** `ZohoMail.notes`

### Key Operations

```http
// Create note
POST /notes/me
{
  "title": "Note Title",
  "content": "Note content here",
  "bookId": "optional_book_id",
  "tags": ["tag1", "tag2"]
}

// List all notes
GET /notes/me

// Get notes in book
GET /notes/me/books/{bookId}

// Create book (category/folder for notes)
POST /notes/me/books
{ "bookName": "HR Notes" }

// Edit note
PUT /notes/me/{noteId}
{ "title": "Updated", "content": "New content" }

// Delete note
DELETE /notes/me/{noteId}
```

### What This Unlocks

- **Email-linked notes** — Take notes on a candidate/client while in email thread
- **Shared team notes** — Team-wide notes via `/notes/groups/{groupId}`
- **Quick action** — "Add Note" button in inbox reading pane → saves to Zoho Notes

---

## 13. Gemma AI Integration Layer

Our Gemma 4:e4b model (running on Mac Mini via `LOCAL_AI_ENDPOINT`) is integrated at 7 points:

### 13.1 Email Classification (LIVE on inbox sync)

**File:** `src/lib/zoho-mail.ts → classifyEmail()`  
**Trigger:** Every new inbox sync, up to 10 unclassified emails processed async

```
Input:  subject, preview text, sender name
Output: {
  category: "URGENT" | "WORK" | "FINANCE" | "FOLLOW_UP" | "GENERAL",
  priority: 1-5,
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  summary: "2-sentence summary"
}
```

**Implementation:**
```typescript
// Already in src/lib/zoho-mail.ts
export async function classifyEmail(subject: string, preview: string, fromName: string) {
  const prompt = `Classify this email:
Subject: ${subject}
From: ${fromName}
Preview: ${preview}

Return JSON: { "category": "URGENT|WORK|FINANCE|FOLLOW_UP|GENERAL", 
               "priority": 1-5, 
               "sentiment": "POSITIVE|NEGATIVE|NEUTRAL", 
               "summary": "one line summary" }`;
  return callGemma(prompt);
}
```

### 13.2 Reply Suggestions (LIVE in inbox reading pane)

**File:** `src/lib/zoho-mail.ts → generateReplySuggestions()`  
**Trigger:** When user opens an email in inbox

```
Input:  email subject + body
Output: ["Reply option 1", "Reply option 2", "Reply option 3"]
```

User clicks a suggestion → fills compose box → edits and sends.

### 13.3 Thread Summarization (LIVE in Mail Hub)

**File:** `src/lib/zoho-mail.ts → summarizeThread()`  
**Trigger:** User clicks "Summarize" on a thread

```
Input:  Array of messages in thread { from, subject, body }
Output: "2-3 paragraph executive summary of the conversation"
```

### 13.4 Email Tone Improvement (LIVE in Compose)

**File:** `src/app/api/mail/ai/classify/route.ts → mode: "improve_tone"`  
**Trigger:** User clicks "Improve Tone" button in compose window

```
Input:  Draft email body
Output: Professionally rewritten version
```

### 13.5 Email Shortening (LIVE in Compose)

**Trigger:** User clicks "Shorten" button

```
Input:  Long email body
Output: Concise 3-sentence version
```

### 13.6 Subject Line Suggestion (LIVE in Compose)

**Trigger:** User clicks "Suggest Subject"

```
Input:  Email body
Output: 3 suggested subject lines
```

### 13.7 Executive Email Digest (LIVE in Mail Hub)

**Trigger:** User clicks "Generate Digest" button in Mail Hub

```
Input:  List of high-priority emails (priority >= 2, unread)
Output: Executive daily briefing — what needs attention today
```

### 13.8 Future: Auto-Labeling Pipeline

**Not yet implemented — Planned**

```
Flow:
1. Inbox sync fetches new emails
2. Gemma classifies each → category + Zoho label color
3. Auto-call Labels API to apply label to email in Zoho
4. Label syncs back to inbox view

Implementation needed:
  POST /accounts/{accountId}/updatemessage
  { mode: "addLabel", messageId: [...], labelId: "..." }
```

### 13.9 Future: Smart Reply-to-Thread

**Not yet implemented — Planned**

```
Flow:
1. User opens thread in inbox
2. Gemma reads entire thread history
3. Generates context-aware reply draft
4. Auto-populates compose box
```

### Gemma Caching (Already Built)

- `mail_ai_cache` table caches Gemma responses by `zoho_message_id` for 1 hour
- Prevents re-processing same email on every open
- Cache check happens BEFORE calling Gemma endpoint

---

## 14. Database Schema

**Migration:** `src/supabase/migrations/069_zoho_mail_schema.sql`

### Tables Overview

```
zoho_config           — OAuth tokens, org connection state
zoho_mail_accounts    — Employee ↔ Zoho account mapping
mail_messages         — Cached email metadata + AI fields
mail_drafts           — Local draft storage
mail_templates        — Reusable templates (5 seeded)
mail_file_shares      — File upload tracking
mail_ai_cache         — 1-hour Gemma response cache
mail_delegations      — Email access delegation
mail_audit_log        — Full audit trail
```

### Key Schema Details

```sql
-- mail_messages: AI fields added on top of Zoho data
ai_category     text,          -- URGENT|WORK|FINANCE|FOLLOW_UP|GENERAL
ai_priority     integer,       -- 1=highest, 5=lowest
ai_sentiment    text,          -- POSITIVE|NEGATIVE|NEUTRAL
ai_summary      text,          -- Gemma summary
ai_processed_at timestamptz    -- When AI ran

-- zoho_mail_accounts: Employee provisioning map
employee_id     uuid,          -- FK to employees table
zoho_account_id text,          -- Zoho's internal mailboxId
email_address   text,          -- john.doe@namaah.in
is_active       boolean        -- Toggle access

-- mail_audit_log: Full trail
actor_id        uuid,
action          text,          -- send|read|delete|share|classify
metadata        jsonb          -- {to, subject, etc.}
```

### RLS (Row Level Security) — All Tables Protected

```sql
-- mail_messages: Users see own emails, HR/super_admin see all
CREATE POLICY "mail_messages_select" ON mail_messages
  FOR SELECT USING (
    employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'super_admin'))
    OR EXISTS (SELECT 1 FROM mail_delegations WHERE delegate_id = auth.uid() AND is_active = true)
  );
```

---

## 15. Full Feature Roadmap

### Phase 1: LIVE NOW (after credentials added)

| Feature | Where |
|---------|-------|
| Connect Zoho via OAuth wizard | `/admin/mail/config` |
| Inbox sync with Zoho | `/admin/mail/inbox` → Sync button |
| Send emails | `/admin/mail/compose` |
| Reply to emails | `/admin/mail/inbox` → Reply pane |
| AI classification on inbox | Auto-triggered on sync |
| AI reply suggestions | Auto on message open |
| Draft save/load | `/admin/mail/drafts` |
| Template library (5 seeded) | `/admin/mail/templates` |
| File sharing | `/admin/mail/files` |
| Kanban mail board | `/admin/mail` (Hub) |
| Auto-provision email on Add Employee | `/admin/users` → Add Employee |
| Manual "Create Zoho Mail" for existing | `/admin/users` → Row 3-dot menu |
| View all provisioned accounts | `/admin/mail/accounts` |

### Phase 2: Folders & Labels (Next Implementation)

```
Task: Build folder management UI + auto-move by AI category

Files to create:
  src/app/api/mail/folders/route.ts   — CRUD for Zoho folders
  src/app/admin/mail/folders/page.tsx  — Folder manager UI

Key API calls:
  GET  /accounts/{id}/folders          — List all folders
  POST /accounts/{id}/folders          — Create folder
  PUT  /accounts/{id}/updatemessage    — Move email to folder (mode: "move")
  PUT  /accounts/{id}/updatethread     — Move thread to folder (mode: "moveThread")

Gemma integration:
  After inbox sync → for each email with ai_category:
    URGENT   → move to "Priority" folder
    FINANCE  → move to "Finance" folder
    WORK     → stay in Inbox
    FOLLOW_UP → move to "Follow Up" folder
```

### Phase 3: Labels Sync

```
Task: Create Zoho labels matching AI categories, auto-apply on classify

Files to create/modify:
  src/app/api/mail/labels/route.ts     — Label CRUD

On first connect:
  1. Create 5 labels: URGENT(red), WORK(blue), FINANCE(amber), FOLLOW_UP(purple), GENERAL(grey)
  2. Store labelId → category map in zoho_config

On classify:
  POST /accounts/{id}/updatemessage
  { mode: "addLabel", messageId: [...], labelId: category_label_id }
```

### Phase 4: Thread View

```
Task: Full thread/conversation view in inbox reading pane

Files to modify:
  src/app/admin/mail/inbox/page.tsx   — Add thread grouping

API calls:
  GET /accounts/{id}/messages/view?threadId={threadId}  — Get all in thread
  PUT /accounts/{id}/updatethread                         — Thread bulk actions

Gemma integration:
  "Summarize Thread" button → calls summarizeThread() → shows executive summary
```

### Phase 5: Employee Lifecycle Automation

```
Task: Full Zoho account lifecycle sync with employee status

Triggers:
  Employee added   → create Zoho account (already done ✅)
  Employee deactivated → PUT /organization/{org}/accounts/{id} { accountStatus: "inactive" }
  Employee role changed → PUT /organization/{org}/accounts { role: "admin" | "member" }
  Employee deleted → DELETE /organization/{org}/accounts { accountId: "..." }

File to modify:
  src/app/api/users/[id]/route.ts  — Add Zoho sync on PATCH/DELETE
```

### Phase 6: Groups (Department Mailboxes)

```
Task: Create shared mailboxes for each department

Example: hr@namaah.in, finance@namaah.in, engineering@namaah.in

API calls needed:
  POST /api/organization/{orgId}/groups
  {
    "groupName": "HR Team",
    "groupEmailId": "hr@namaah.in",
    "description": "HR department shared mailbox"
  }

  POST /api/organization/{orgId}/groups/{groupId}/members
  { "emailAddress": "employee@namaah.in" }

File to create:
  src/app/api/mail/groups/route.ts
  src/app/admin/mail/groups/page.tsx
```

### Phase 7: Signatures

```
Task: Company-wide signature enforcement

API: POST /accounts/{accountId}/signatures
{
  "signatureName": "Default",
  "content": "<p>...<b>Namaah Technologies</b></p>",
  "isDefault": true
}

Auto-apply to all employees on provisioning:
  After create-employee → call signatures API → set standard company signature
```

### Phase 8: Logs & Audit

```
Task: Mail activity dashboard for HR/admin

API calls:
  GET /organization/{orgId}/logs/login    — Login history
  GET /organization/{orgId}/logs/audit    — Admin action log
  GET /organization/{orgId}/logs/smtp     — Email sending log

Our mail_audit_log table already captures: send, read, delete, share, classify
Combine with Zoho logs for full compliance picture.
```

---

## 16. Error Codes & Troubleshooting

### Common Zoho API Errors

| HTTP Code | Zoho Code | Meaning | Fix |
|-----------|-----------|---------|-----|
| 401 | - | Token expired | `getActiveToken()` auto-refreshes |
| 403 | - | Scope missing | Add missing scope to OAuth app |
| 404 | - | Account/message not found | Check accountId is correct |
| 429 | - | Rate limit hit | Add retry with exponential backoff |
| 503 | - | Zoho API down | Serve from cache (`mail_messages` table) |

### Common Setup Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` | Redirect URI in `.env` ≠ Zoho Console | Must match exactly including protocol |
| `invalid_client` | Wrong CLIENT_ID or CLIENT_SECRET | Copy from Zoho API Console again |
| `no_config` | Migration 069 not run | Run SQL in Supabase |
| `token_failed` | `access_type=offline` missing | Already set in `buildOAuthUrl()` |
| Zoho account create fails | `org_id` not set | Add ZOHO_ORG_ID to `.env.local` |
| AI classification not running | Gemma endpoint down | Check LOCAL_AI_ENDPOINT |

### Rate Limits (Zoho Mail API)

```
Default limit: 100 API calls / minute per token
Inbox sync:    Counted as 1 call (returns up to 200 messages)
Send email:    1 call per send
Classification: Uses LOCAL Gemma — not Zoho API rate limited
```

### Testing Without Live Zoho

The inbox and mail hub pages gracefully handle `connected: false`:
- Shows "Not Connected" banner
- Serves data from `mail_messages` Supabase cache (if populated)
- All AI features work independently of Zoho connection
- Config page shows current connection status

---

## Quick Reference: Zoho API Scopes

```
ZohoMail.messages.ALL        — Send/receive/manage emails, threads
ZohoMail.accounts.ALL        — Vacation reply, forwarding, account settings  
ZohoMail.organization.ALL    — Org-wide settings, subscription, storage
ZohoMail.folders.ALL         — Create/manage folders
ZohoMail.tags.ALL            — Create/manage labels
ZohoMail.organization.accounts — Create/update/delete user accounts
ZohoMail.organization.policy — Mail policies, forward restrictions
ZohoMail.notes               — Notes and books
```

**Minimal scope for basic email:** `ZohoMail.messages.ALL,ZohoMail.accounts.ALL`  
**Full admin scope:** All 8 above combined

---

## Quick Reference: API Base Paths

```
India:  https://mail.zoho.in/api
US:     https://mail.zoho.com/api
EU:     https://mail.zoho.eu/api
AU:     https://mail.zoho.com.au/api

OAuth (India): https://accounts.zoho.in/oauth/v2/auth
Token  (India): https://accounts.zoho.in/oauth/v2/token
```

---

## 17. How Email ID Creation Works — Both Ways

This section explains exactly how a company email address (`@namaah.in`) gets created for any
employee or new joiner — covering both the automatic flow and the two manual paths available to
HR and admins from inside the Namaah Nexus workspace.

---

### The Email Address Format

Every employee receives a **unique** address auto-derived from their full name:

```
Pattern:  firstname.lastname@namaah.in

Examples:
  Priya Sharma    →  priya.sharma@namaah.in
  Rahul Kumar     →  rahul.kumar@namaah.in
  Arun S          →  arun.s@namaah.in
  Mohammed Ali    →  mohammed.ali@namaah.in
```

**Uniqueness guarantee:** The `zoho_mail_accounts` table has a `UNIQUE (email_address)` constraint,
so no two employees can share the same address. If a collision is detected (same first + last name),
the admin is shown a **"Customize"** toggle in the creation modal to type a different local part
before confirming.

The domain (`namaah.in`) is set via `ZOHO_MAIL_DOMAIN` in `.env.local` and can be overridden
per-request if your org uses multiple domains.

---

### Zoho API Used for Both Flows

Both the automatic and manual creation paths call the **same single Zoho API endpoint** from the
Zoho Users API (documented at `zoho.com/mail/help/api/overview.html`):

```http
POST https://mail.zoho.in/api/organization/{orgId}/accounts
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "emailAddress": "priya.sharma@namaah.in",
  "displayName":  "Priya Sharma",
  "password":     "Namaah@auto1234",   ← auto-generated random password
  "role":         "member"             ← "member" | "admin"
}

Response:
{
  "data": {
    "mailboxId":    "1234567890",       ← stored as zoho_account_id in our DB
    "accountId":    "1234567890",
    "emailAddress": "priya.sharma@namaah.in"
  }
}
```

**OAuth Scope required:** `ZohoMail.organization.accounts`

What Zoho does when this call succeeds:
- Creates a real, live mailbox inside the `namaah.in` domain
- Allocates storage quota per your Zoho plan
- Makes the person findable in the org directory
- The new address can immediately receive emails sent to it
- The employee can log in at `mail.zoho.in` using their new address

Our backend (`src/app/api/mail/accounts/create-employee/route.ts`) then stores the mapping in the
`zoho_mail_accounts` table:

```
employee_id     → UUID linking to employees table
zoho_account_id → Zoho's returned mailboxId
email_address   → priya.sharma@namaah.in
display_name    → Priya Sharma
is_active       → true
```

---

### Flow 1 — Automatic Creation (New Employee Being Added)

**Who triggers it:** HR / Admin / Manager when onboarding a new joiner  
**Where it happens:** Admin → Employees → Add Employee form  
**When it fires:** The moment "Create Profile" is clicked

```
Step 1:  HR opens Add Employee form
         ↓
Step 2:  Fills in: Name, Email, Department, Role, Salary, Shift…
         ↓
Step 3:  At the bottom of the form — a Zoho Mail section appears:
         ┌─────────────────────────────────────────────────────────┐
         │  ✓  Auto-create Zoho Mail Account                       │
         │     priya.sharma@namaah.in          ← live preview      │
         └─────────────────────────────────────────────────────────┘
         • Checkbox is ON by default (if Zoho is connected)
         • Email preview updates live as the name is typed
         • If Zoho is NOT connected → checkbox disabled, badge shows
           "ZOHO NOT CONNECTED", employee is still created without mail
         ↓
Step 4:  HR clicks "Create Profile"
         ↓
Step 5:  Two sequential actions run:
         a) Employee record saved to employees table in Supabase
         b) POST /api/mail/accounts/create-employee called with:
            { employee_id: newEmployee.id, name: "Priya Sharma", domain: "namaah.in" }
         ↓
Step 6:  Our API calls Zoho:
         POST /organization/{orgId}/accounts
         { emailAddress: "priya.sharma@namaah.in", displayName: "Priya Sharma", ... }
         ↓
Step 7:  Zoho returns zoho_account_id → stored in zoho_mail_accounts table
         ↓
Step 8:  Toast notification shown to HR:
         ✅ "Zoho Mail created: priya.sharma@namaah.in"
```

**Edge cases handled:**
- If an account already exists for that employee → returns `already_exists: true` with a toast
  saying "Mail already exists: priya.sharma@namaah.in" (no duplicate created)
- If Zoho API call fails (Zoho down, wrong org_id) → employee still created, mail mapping stored
  with `zoho_account_id: null` so it can be retried later
- If `create_zoho_mail` checkbox is unchecked → only employee created, no mail provisioned

---

### Flow 2 — Manual Creation (Existing Employees / Any Time)

There are two separate ways an HR or admin can manually create a Zoho mail address for someone
who already exists in the system or was added without mail provisioning.

---

#### Way A — Row Menu in the Employees Table

**Path:** Admin → Employees → find the employee row → click the ⋮ (3-dot) menu

```
RowMenu options shown:
  ✏  Edit Employee
  ↺  Resend Login Info
  ✉  Send Custom Mail
  ⚡  Create Zoho Mail    ← appears ONLY when Zoho is connected
```

**Steps:**
```
Step 1:  Click ⚡ "Create Zoho Mail" in the row menu
         ↓
Step 2:  Spinner shows while provisioning (button replaced with Loader icon)
         ↓
Step 3:  Calls POST /api/mail/accounts/create-employee with the employee's
         id and name directly — no modal, no extra input needed
         ↓
Step 4:  Zoho API creates the mailbox
         ↓
Step 5:  Toast shows result:
         ✅ "Zoho Mail created: priya.sharma@namaah.in"
         ℹ "Mail already exists: priya.sharma@namaah.in"  (if already provisioned)
         ❌ "Failed to create Zoho Mail. Check connection."  (if API error)
```

This is the fastest path — one click, no modal, no form. Best for bulk one-by-one provisioning
of existing employees.

---

#### Way B — Mail Accounts Manager Page

**Path:** Admin → Comms → Mail Accounts → "Create Account" button (top right)

```
Step 1:  Click "Create Account"
         (button is disabled with tooltip if Zoho is not connected)
         ↓
Step 2:  Modal opens:
         ┌──────────────────────────────────────────────────┐
         │  Create Zoho Mail Account                         │
         │                                                   │
         │  Select Employee                                  │
         │  [ Search by name or email...          ]          │
         │                                                   │
         │  ↓ Results appear as you type:                    │
         │  ● Priya Sharma — Designer · priya@example.com   │
         │  ● Pranav Sharma — Engineer · pranav@ex.com      │
         │                                                   │
         │  Mail Address                    [Customize]      │
         │  [ priya.sharma@namaah.in      ]  ← auto-filled  │
         │                                                   │
         │  [  Cancel  ]  [  Create Mail Account  ]          │
         └──────────────────────────────────────────────────┘
         ↓
Step 3:  Type employee name → select from live search dropdown
         Email preview auto-populates from the selected name
         ↓
Step 4:  (Optional) Click "Customize" to type a different email prefix
         e.g. change to "p.sharma@namaah.in" or "priya.s@namaah.in"
         ↓
Step 5:  Click "Create Mail Account"
         ↓
Step 6:  Same Zoho API call → mailbox created → stored in zoho_mail_accounts
         ↓
Step 7:  Modal closes, accounts table refreshes showing new entry
         Toast: ✅ "Zoho Mail created: priya.sharma@namaah.in"
```

This path is best for:
- Bulk provisioning — search multiple employees one by one with the custom address option
- Correcting auto-generated addresses (e.g., when two people share the same name)
- Admin review — you can see all existing accounts in the table before creating new ones

---

### Mail Accounts Manager — What It Shows

The **Admin → Comms → Mail Accounts** page gives a full overview of all provisioned addresses:

```
Stats bar:
  Total Accounts | Active | Inactive | Zoho Synced

Table columns:
  Employee Name + Designation
  Mail Address (with copy button on hover)
  Zoho Account ID (first 16 chars + "…", or "Pending Sync" if null)
  Date Created
  Status (Active / Inactive toggle — click to toggle without reload)
```

The **"Zoho Synced"** counter shows accounts that have a real Zoho `mailboxId`. If an account
shows "Pending Sync", it means the Zoho API call failed during creation but the mapping is saved
— clicking "Create Zoho Mail" from the row menu will retry.

---

### Who Can Create Email IDs

| Role | Auto on Add Employee | Row Menu "Create Zoho Mail" | Mail Accounts Manager |
|------|---------------------|-----------------------------|-----------------------|
| **super_admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **hr** | ✅ Yes | ✅ Yes | ✅ Yes |
| **manager** | ✅ If allowed to add employees | ✅ Yes | ✅ Yes |
| **lead** | ❌ No | ❌ No | ❌ No |
| **employee** | ❌ No | ❌ No | ❌ No |

Access to these pages is controlled by the RBAC permissions system (`role_permissions` table,
migration 071). The `employees` module key controls Add Employee; the `mail_accounts` module key
controls the Mail Accounts Manager page.

---

### Summary — Which Way to Use When

| Situation | Use This Flow |
|-----------|---------------|
| New joiner being added now | Flow 1 — Auto checkbox in Add Employee form |
| Existing employee who needs mail | Flow 2A — Row menu ⚡ Create Zoho Mail (fastest) |
| Need to customize the email address | Flow 2B — Mail Accounts Manager modal with "Customize" |
| Provisioning multiple old employees at once | Flow 2B — Mail Accounts page, repeat search + create |
| Employee was added but Zoho was offline | Flow 2A — Row menu retries the failed provisioning |

---

*Guide compiled from: https://www.zoho.com/mail/help/api/overview.html and all sub-documentation pages.*  
*Last updated: 14 May 2026*
