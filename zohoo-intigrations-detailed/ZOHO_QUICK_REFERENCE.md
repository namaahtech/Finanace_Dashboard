# ZOHO MAIL INTEGRATION - QUICK REFERENCE GUIDE
## Code Snippets, API Endpoints & Troubleshooting

---

## PART 1: ENVIRONMENT VARIABLES (.env)

```
# ZOHO CREDENTIALS
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
ZOHO_ORG_ID=namaah_organization_id

# DATABASE
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexus_workspace
DB_USER=postgres
DB_PASSWORD=secure_password

# CLOUD STORAGE
AWS_ACCESS_KEY=your_aws_key
AWS_SECRET_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET=nexus-workspace-files

# AI ENGINE
GEMMA_MAC_IP=192.168.1.100
GEMMA_MAC_PORT=5000

# SERVER
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_key
```

---

## PART 2: CORE API ENDPOINTS

### Email Management

```
GET /api/mail/inbox
Response: { emails: [...], total: 245, unread: 12 }

GET /api/mail/inbox?page=1&limit=20
Response: Paginated inbox

GET /api/mail/sent
Response: All sent emails

GET /api/mail/drafts
Response: User's draft emails

GET /api/mail/message/:messageId
Response: Full message with thread

POST /api/mail/send
Body: { to, cc, bcc, subject, body }
Response: { success: true, messageId: "..." }

POST /api/mail/reply/:messageId
Body: { body, attachmentIds: [] }
Response: { success: true }

POST /api/mail/draft
Body: { to, subject, body }
Response: { success: true, draftId: "..." }

POST /api/mail/draft/:draftId/send
Response: { success: true, messageId: "..." }

DELETE /api/mail/:messageId
Response: { success: true }

GET /api/mail/search?q=query
Response: { results: [...] }
```

### File Management

```
POST /api/files/upload
Body: FormData with file
Response: { fileId: "...", fileName: "..." }

POST /api/files/share
Body: { fileId, withUserId, permission: "VIEW|EDIT|DOWNLOAD" }
Response: { success: true }

GET /api/files/shared-with-me
Response: { files: [...] }

GET /api/files/download/:fileId
Response: { downloadUrl: "..." }

DELETE /api/files/:fileId
Response: { success: true }
```

### Meeting Management

```
POST /api/meetings/create
Body: { title, startTime, endTime, participants: [...] }
Response: { meetingId: "...", joinUrl: "..." }

GET /api/meetings/upcoming
Response: { meetings: [...] }

GET /api/meetings/:meetingId
Response: Full meeting details

PUT /api/meetings/:meetingId
Body: { title, startTime, endTime }
Response: { success: true }

DELETE /api/meetings/:meetingId
Response: { success: true }
```

---

## PART 3: AUTHENTICATION FLOW

### 1. User Clicks "Connect Zoho"

```javascript
// Frontend: Login.js
const connectZoho = () => {
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?
    response_type=code&
    client_id=${process.env.REACT_APP_ZOHO_CLIENT_ID}&
    scope=ZohoMail.accounts.ALL,ZohoMail.messages.ALL&
    redirect_uri=${encodeURIComponent(process.env.REACT_APP_REDIRECT_URI)}&
    state=${generateRandomString()}`;
  
  window.location.href = authUrl;
};
```

### 2. Zoho Redirects Back with Code

```javascript
// Backend: routes/auth.js
app.get('/auth/zoho/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state for security
  if (state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state' });
  }

  try {
    // Exchange code for token
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ZOHO_REDIRECT_URI
      })
    });

    const data = await response.json();

    // Save tokens to database (encrypted)
    await db.zohoTokens.create({
      userId: req.user.id,
      accessToken: encryptToken(data.access_token),
      refreshToken: encryptToken(data.refresh_token),
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    });

    res.redirect('/workspace/mail/inbox');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Get Fresh Token Before API Call

```javascript
// Backend: middleware/zohoAuth.js
async function ensureFreshToken(req, res, next) {
  const tokens = await db.zohoTokens.findOne({ userId: req.user.id });
  
  if (!tokens) {
    return res.status(401).json({ error: 'Not connected to Zoho' });
  }

  // Check if expired
  if (tokens.expiresAt < new Date()) {
    // Refresh the token
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: decryptToken(tokens.refreshToken)
      })
    });

    const data = await response.json();

    // Update tokens
    await db.zohoTokens.update(
      { userId: req.user.id },
      {
        accessToken: encryptToken(data.access_token),
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
      }
    );

    req.accessToken = data.access_token;
  } else {
    req.accessToken = decryptToken(tokens.accessToken);
  }

  next();
}
```

---

## PART 4: COMMON CODE PATTERNS

### Pattern 1: Get User's Inbox with RBAC

```javascript
async function getUserInbox(userId, page = 1) {
  // Get user and their role
  const user = await db.users.findOne({ id: userId });
  
  // Get fresh token
  const tokens = await db.zohoTokens.findOne({ userId });
  if (tokens.expiresAt < new Date()) {
    await refreshToken(userId); // Use function from above
  }

  // Call Zoho API
  const response = await fetch(
    `https://mail.zoho.com/api/accounts/default/folders/INBOX/messages`,
    {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  let emails = (await response.json()).data.messages || [];

  // Apply RBAC filter based on role
  if (user.role === 'EMPLOYEE') {
    // Employees only see their own emails
    emails = emails.filter(e => e.from === user.emailAddress);
  } else if (user.role === 'TEAM_LEAD') {
    // Team leads see team emails
    emails = emails.filter(e => {
      const emailUser = await db.users.findOne({ emailAddress: e.from });
      return emailUser?.teamId === user.teamId;
    });
  }
  // SUPER_ADMIN sees all (no filter)

  return {
    emails: emails,
    total: emails.length,
    unread: emails.filter(e => !e.isRead).length
  };
}
```

### Pattern 2: Send Email with File Attachment

```javascript
async function sendEmailWithAttachment(userId, to, subject, body, fileId) {
  // Get file from database
  const file = await db.files.findOne({ id: fileId });
  
  // Get fresh token
  const tokens = await db.zohoTokens.findOne({ userId });
  const user = await db.users.findOne({ id: userId });

  // Call Zoho send API
  const response = await fetch(
    'https://mail.zoho.com/api/accounts/default/messages/send',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromAddress: user.emailAddress,
        toAddress: to,
        subject: subject,
        content: body,
        mailFormat: 'html',
        attachments: {
          filename: file.fileName,
          content: file.s3Url // Zoho can pull from URL
        }
      })
    }
  );

  const result = await response.json();

  // Log email sent
  await db.emails.create({
    zohoMessageId: result.data.messageId,
    userId: userId,
    direction: 'SENT',
    to: to,
    subject: subject,
    body: body,
    attachmentIds: [fileId],
    timestamp: new Date()
  });

  return { success: true, messageId: result.data.messageId };
}
```

### Pattern 3: Classify Email with Gemma AI

```javascript
async function classifyEmailWithAI(emailId) {
  const email = await db.emails.findOne({ id: emailId });

  try {
    // Call Gemma model on Mac Mini
    const response = await fetch(`http://${process.env.GEMMA_MAC_IP}:${process.env.GEMMA_MAC_PORT}/api/gemma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Classify this email:
        
        Subject: ${email.subject}
        Body: ${email.body.substring(0, 500)}
        
        Respond ONLY with JSON:
        {
          "category": "WORK|PERSONAL|URGENT|MEETING|HR|FINANCE|OTHER",
          "priority": 1-5,
          "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
          "tags": ["tag1", "tag2"]
        }`,
        model: 'gemma-4:e4b',
        temperature: 0.7,
        maxTokens: 300
      })
    });

    const data = await response.json();
    const classification = JSON.parse(data.output);

    // Update email with AI data
    await db.emails.update({ id: emailId }, {
      aiCategory: classification.category,
      aiPriority: classification.priority,
      aiSentiment: classification.sentiment,
      aiTags: classification.tags,
      classifiedAt: new Date()
    });

    return classification;
  } catch (error) {
    // If Gemma is down, continue without AI
    console.error('Gemma error:', error);
    return null;
  }
}
```

---

## PART 5: ERROR HANDLING

### Handle Token Errors

```javascript
async function handleZohoApiError(error) {
  if (error.message.includes('401')) {
    // Token expired or invalid
    // Call refresh token function
    // Retry request
    return { retry: true };
  }
  
  if (error.message.includes('403')) {
    // Access denied
    // Check user permissions
    return { error: 'Access denied', code: 403 };
  }
  
  if (error.message.includes('429')) {
    // Rate limited
    // Wait and retry
    await sleep(1000);
    return { retry: true };
  }
  
  if (error.message.includes('500')) {
    // Zoho server error
    // Log and notify user
    return { error: 'Service temporarily unavailable', code: 500 };
  }

  return { error: 'Unknown error', code: 999 };
}
```

### Fallback if AI is Down

```javascript
async function getEmailWithFallback(emailId) {
  const email = await db.emails.findOne({ id: emailId });

  // Try to classify with AI
  const classification = await classifyEmailWithAI(emailId);

  // Return email with or without AI data
  return {
    ...email,
    aiCategory: classification?.category || 'UNCLASSIFIED',
    aiPriority: classification?.priority || 3,
    aiSentiment: classification?.sentiment || 'NEUTRAL'
  };
}
```

---

## PART 6: TESTING CHECKLIST

### Unit Tests

```javascript
describe('Zoho Mail Integration', () => {
  
  test('Should connect to Zoho OAuth', async () => {
    const token = await getZohoToken();
    expect(token).toBeDefined();
    expect(token.accessToken).toBeTruthy();
  });

  test('Should fetch inbox', async () => {
    const inbox = await getUserInbox('user123');
    expect(inbox.emails).toBeInstanceOf(Array);
    expect(inbox.total).toBeGreaterThan(0);
  });

  test('Should send email', async () => {
    const result = await sendEmail('user123', 'test@example.com', 'Test', 'Body');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
  });

  test('Should enforce RBAC', async () => {
    const adminEmails = await getUserInbox('admin123');
    const employeeEmails = await getUserInbox('employee456');
    
    expect(adminEmails.total).toBeGreaterThan(employeeEmails.total);
  });

  test('Should share file', async () => {
    const result = await shareFile('file123', 'user456', 'VIEW');
    expect(result.success).toBe(true);
  });

  test('Should classify email with AI', async () => {
    const classification = await classifyEmailWithAI('email789');
    expect(classification.category).toBeTruthy();
    expect(classification.priority).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```javascript
describe('End-to-End Email Flow', () => {
  
  test('Should send and receive email', async () => {
    // User 1 sends email
    const sendResult = await sendEmail('user1', 'user2@namaah.com', 'Test', 'Hello');
    expect(sendResult.success).toBe(true);

    // Wait for sync
    await sleep(5000);

    // User 2 should see it
    const inbox = await getUserInbox('user2');
    const found = inbox.emails.find(e => e.subject === 'Test');
    expect(found).toBeDefined();
  });

  test('Should share file and recipient can download', async () => {
    // Upload file
    const file = await uploadFile('file.pdf', 'user1');
    
    // Share with user2
    await shareFile(file.fileId, 'user2', 'VIEW');
    
    // User2 can see shared file
    const shared = await getSharedFilesWithMe('user2');
    expect(shared.files.length).toBeGreaterThan(0);
    
    // User2 can download
    const url = await getDownloadUrl(file.fileId, 'user2');
    expect(url).toBeTruthy();
  });
});
```

---

## PART 7: TROUBLESHOOTING

### Problem: "Invalid OAuth credentials"

```
Solution:
1. Check .env file has correct CLIENT_ID & CLIENT_SECRET
2. Verify redirect URI matches in Zoho console
3. Regenerate credentials if necessary
4. Clear browser cookies and try again
```

### Problem: "Token expired / Invalid token"

```
Solution:
1. Ensure refresh token middleware is active
2. Check database for corrupted tokens
3. Query: SELECT * FROM zoho_tokens WHERE expiresAt < NOW();
4. Clear old tokens and re-authenticate
```

### Problem: "Emails not loading in inbox"

```
Solution:
1. Check Zoho API response: console.log(zohoResponse)
2. Verify RBAC filter isn't too restrictive
3. Check database has email records
4. Test with: GET /api/mail/inbox?limit=5
```

### Problem: "File upload failing"

```
Solution:
1. Check S3 credentials in .env
2. Verify S3 bucket exists and is accessible
3. Check file size (should be < 25MB)
4. Test S3 connection: aws s3 ls
```

### Problem: "AI classification not working"

```
Solution:
1. Check Mac Mini is online: ping GEMMA_MAC_IP
2. Verify Gemma service is running on port
3. Test directly: curl http://GEMMA_MAC_IP:5000/health
4. If offline, system still works (AI disabled gracefully)
```

---

## PART 8: PERFORMANCE TIPS

### 1. Cache Token Refreshes

```javascript
const tokenCache = {};

async function getTokenCached(userId) {
  if (tokenCache[userId] && tokenCache[userId].expiresAt > new Date()) {
    return tokenCache[userId];
  }

  const tokens = await db.zohoTokens.findOne({ userId });
  if (tokens.expiresAt < new Date()) {
    await refreshToken(userId);
  }

  tokenCache[userId] = tokens;
  return tokens;
}
```

### 2. Paginate Large Email Lists

```javascript
// Bad: Fetch all 5000 emails at once
const allEmails = await zoho.getEmails();

// Good: Fetch in pages of 50
async function getAllEmailsPaginated() {
  let allEmails = [];
  let page = 1;
  
  while (true) {
    const emails = await zoho.getEmails({ limit: 50, offset: (page-1)*50 });
    if (emails.length === 0) break;
    
    allEmails = allEmails.concat(emails);
    page++;
  }
  
  return allEmails;
}
```

### 3. Index Database Queries

```sql
-- Add these indexes for fast queries
CREATE INDEX idx_emails_userId_timestamp 
ON emails(userId, timestamp DESC);

CREATE INDEX idx_file_sharing_sharedWith 
ON file_sharing(sharedWith);

CREATE INDEX idx_zoho_tokens_userId 
ON zoho_tokens(userId);
```

---

## QUICK START (Copy-Paste Ready)

### Start Your Server

```bash
# Install dependencies
npm install

# Setup database
npm run db:migrate

# Start server
npm start

# Should output:
# ✓ Database connected
# ✓ Zoho API ready
# ✓ Server running on port 3000
```

### Test Connection

```bash
# Test Zoho API
curl -X GET http://localhost:3000/api/mail/inbox \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return:
# { "emails": [...], "total": 245, "unread": 12 }
```

---

**Document Version:** 1.0  
**Last Updated:** 8th May 2026  
**Status:** Ready for Reference
