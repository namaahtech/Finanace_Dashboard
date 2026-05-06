# 🧠 Neural Assessment Interview Module
## Complete Feature Architecture & Implementation Guide
**Namaah Nexus - ATS + Interview Management System**

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Phase 1: Pre-Interview (Scheduling & Lobby)](#phase-1-pre-interview)
3. [Phase 2: Live Interview Room](#phase-2-live-interview-room)
4. [Phase 3: Recording & Post-Interview](#phase-3-recording--post-interview)
5. [Gemma LLM Integration (Local)](#gemma-llm-integration)
6. [Security & Permissions Framework](#security--permissions-framework)
7. [Database Schema Extensions](#database-schema-extensions)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [UI/UX Implementation Standards](#uiux-implementation-standards)
10. [Advanced Features & Research](#advanced-features--research)

---

## System Overview

### Architecture Flow
```
Resume → ATS Scanner → Accepted Candidate 
  ↓
Schedule Interview (Admin assigns date/time)
  ↓
Auto-email with secure link sent to candidate
  ↓
Candidate enters pre-call lobby → Interviewer lobby
  ↓
Permissions check (Camera/Mic/Screen Share)
  ↓
Live Neural Assessment Room
  ↓
Real-time Recording + Gemma Analysis
  ↓
Post-interview verdict + Resume analysis + Real-time feedback
  ↓
Archive to candidate UUID + Compliance storage
```

### Key Principles
- **Zero Third-Party Dependency**: No Zoom, Google Meet, or external platforms
- **Local AI Processing**: All analysis happens on Mac Mini (Gemma model)
- **End-to-End Encryption**: All video/audio streams encrypted via SRTP (WebRTC)
- **Audit Trail**: Every interaction logged, timestamped, and searchable
- **Role-Based Access**: Admin, Interviewer, Candidate roles with granular permissions

---

## Phase 1: Pre-Interview

### 1.1 Smart Scheduling System

#### Features:
- **Admin Dashboard**: 
  - Calendar view with color-coded clusters
  - Bulk scheduling (drag-select multiple candidates)
  - Timezone-aware scheduling (detect candidate location from IP)
  - Suggested optimal times based on interviewer availability + candidate past interview history
  - Conflict detection (prevent double-booking)

- **Candidate Calendar Sync** (optional):
  - One-way sync with Google Calendar / Outlook (read candidate's availability)
  - Provide "Available Windows" to candidate before scheduling
  
- **Rescheduling Engine**:
  - Candidate can request reschedule via email link (max 3 times)
  - Automatic notification to admin with conflict resolution
  - Graceful fallback if no slots available

#### Database Tables (Supabase):
```
interviews {
  id UUID PRIMARY KEY,
  application_id UUID (FK),
  interviewer_id UUID (FK),
  scheduled_time TIMESTAMP WITH TIMEZONE,
  status ENUM ('scheduled', 'in_progress', 'completed', 'no_show', 'rescheduled'),
  interview_type ENUM ('initial', 'technical', 'final'),
  unique_access_token VARCHAR UNIQUE,  -- For secure link
  room_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
}

interview_permissions {
  id UUID PRIMARY KEY,
  interview_id UUID (FK),
  user_id UUID (FK),  -- Can be null for candidates
  permission_type ENUM ('view_video', 'screen_share', 'document_share', 'audio', 'video'),
  granted_at TIMESTAMP,
  expires_at TIMESTAMP,
  granted_by UUID (FK),  -- Admin who granted
}

interview_availability {
  id UUID PRIMARY KEY,
  interviewer_id UUID (FK),
  day_of_week INT (0-6),
  start_time TIME,
  end_time TIME,
  max_concurrent_interviews INT,
  buffer_minutes INT (minimum break between interviews),
}
```

---

### 1.2 Automated Email Orchestration

#### Email Templates (Nodemailer):

**Template 1: Initial Interview Invitation**
```
Subject: Your Neural Assessment Interview - Namaah Nexus

Hi [Candidate Name],

You've been selected for the next stage of our hiring process at [Company]. 

📅 Interview Details:
- Date & Time: [DATE] at [TIME] ([Candidate Timezone])
- Duration: 45-60 minutes
- Role: [Job Cluster]
- Interviewer: [Name, Title]

🔐 Secure Interview Room:
[UNIQUE_SECURE_LINK_WITH_INTERVIEW_ID]

✅ Before the interview:
1. Test your camera & microphone by clicking the link 15 mins early
2. Have your resume ready (may be referenced)
3. Ensure quiet background & stable internet
4. Allow browser permissions for camera/microphone

Questions? Reply to this email.

Best,
Namaah Nexus
```

**Template 2: Reminder (24 hours before)**
```
Subject: Reminder: Your Neural Assessment Interview Tomorrow

Hi [Candidate Name],

Your interview is scheduled for tomorrow at [TIME]. Click the link below to join:
[UNIQUE_SECURE_LINK]

🛠️ Technical Check:
We recommend testing your setup 15 minutes early.

See you tomorrow!
```

**Template 3: Post-Interview**
```
Subject: Your Interview Summary & Next Steps

Hi [Candidate Name],

Thank you for participating in our neural assessment interview! 

📊 Interview Insights:
- Match Score: [SCORE]%
- Key Strengths: [Generated from Gemma analysis]
- Areas for Growth: [Generated from Gemma analysis]

Next Steps: [Scheduled callback date OR We'll be in touch within 3 days]

Best,
Namaah Nexus
```

#### Implementation:
```javascript
// /api/admin/recruitment/schedule
POST /api/admin/recruitment/schedule
{
  candidate_ids: [UUID],
  interviewer_id: UUID,
  scheduled_time: ISO8601,
  interview_type: 'initial|technical|final',
  cluster_id: UUID
}

Response: {
  interviews_created: [{
    id: UUID,
    candidate_email: string,
    unique_access_token: string,
    email_sent: boolean,
    email_delivery_status: 'pending|sent|failed'
  }]
}
```

---

### 1.3 Pre-Call Lobby (Candidate + Interviewer Separate)

#### Candidate Lobby (Pre-Interview):
```
┌─────────────────────────────────────────┐
│  Neural Assessment - Waiting Room       │
│  Status: Waiting for Interviewer...     │
├─────────────────────────────────────────┤
│                                         │
│   🎥 [Camera Preview - 720p Live]      │
│                                         │
│   ✅ Microphone: Detected               │
│   ✅ Camera: 1920x1080 (HD)             │
│   ✅ Internet: 25 Mbps (Good)           │
│                                         │
│   Your Position in Queue: #1 (Next)     │
│                                         │
│   [📋] Interview Details:               │
│   • Role: Google - Frontend - React     │
│   • Interviewer: Darshan Murthy K      │
│   • Duration: ~45 mins                  │
│                                         │
│   [⚙️] Microphone Settings              │
│   [⚙️] Camera Settings                  │
│   [?] FAQ / Technical Help              │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Live video preview (no server needed, local canvas rendering)
- Device diagnostics (bandwidth test, mic/camera health)
- Queue position display (real-time via Supabase Broadcast)
- Candidate cannot proceed until both camera AND microphone are granted
- Option to request device permissions again if initially denied
- FAQ panel for common tech issues
- Estimated wait time (based on current interviewer + queue)

#### Interviewer Lobby (Pre-Interview):
```
┌─────────────────────────────────────────┐
│  Neural Assessment - Host Control       │
│  Status: Ready to Receive               │
├─────────────────────────────────────────┤
│                                         │
│  📊 ATS Candidate Report (Pinned):      │
│  ├─ Name: Darshan Murthy K              │
│  ├─ Match: 89% [=============]          │
│  ├─ Technical Skills: 9/10              │
│  ├─ Experience: 8/10                    │
│  └─ Key Questions: [View Full Report]   │
│                                         │
│  👥 Queue Overview:                     │
│  ├─ [1] Darshan Murthy K ⏱️ Waiting    │
│  │       Camera: ✅ Mic: ✅             │
│  ├─ [2] Sarah Johnson ⏰ Scheduled      │
│  └─ [3] Alex Chen ⏰ Scheduled          │
│                                         │
│  [🎯] Admit Next Candidate              │
│  [🔊] Test Speaker                      │
│  [📊] View Full ATS Report              │
│  [⚙️] Room Settings                      │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Live ATS report preview (no need to alt-tab)
- Queue display with real-time updates
- Candidate health status (camera/mic confirmed)
- One-click admit button
- Option to skip candidate with reason logging
- Room settings (audio input/output, lighting check)
- Interviewer bio + candidate history (if repeat interviewer)

#### Permissions Prompt (Modal - Appears on first entry):
```
┌─────────────────────────────────────────┐
│  🔐 Permissions Required                 │
├─────────────────────────────────────────┤
│                                         │
│  This interview room needs access to:   │
│                                         │
│  📹 Camera              [Allow] [Deny]  │
│  🎤 Microphone          [Allow] [Deny]  │
│  🖥️ Screen Share         [Allow] [Deny] │
│  📁 File Upload (docs)  [Allow] [Deny]  │
│                                         │
│  ⓘ Why we need these:                   │
│  • Camera: Live video assessment        │
│  • Mic: Two-way audio communication     │
│  • Screen: Share code/designs           │
│  • Files: Upload portfolios/docs        │
│                                         │
│  [Continue] (requires Camera + Mic)     │
│  [Exit Interview]                       │
│                                         │
└─────────────────────────────────────────┘
```

**Backend Tracking:**
```javascript
// Track permissions granted
interview_permissions {
  interview_id,
  user_id (null for anonymous candidate),
  permission_type: 'camera'|'microphone'|'screen_share'|'document_share',
  granted: boolean,
  granted_at: timestamp,
  expired: boolean (if revoked mid-interview)
}
```

---

## Phase 2: Live Interview Room

### 2.1 Main Interview UI Layout

#### Candidate View (When Host Admits):
```
┌─────────────────────────────────────────────────────────────────┐
│ Neural Assessment Live Interview                    [⏱️ 12:34]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │  Host (Interviewer)  │  │ You (Candidate)          │        │
│  │                      │  │ [Local Video - 720p]     │        │
│  │ [Remote Video Feed]  │  │                          │        │
│  │                      │  └──────────────────────────┘        │
│  │                      │                                      │
│  └──────────────────────┘                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [🎤] Mute/Unmute  [📹] Stop/Start Video  [🖥️] Share Screen    │
│  [📁] Share File   [💬] Message/Notes      [☎️] Leave Interview │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Interviewer View (Dual Panel):
```
┌──────────────────────────────────────────────────────────────────┐
│ Neural Assessment Live Interview           [⏱️ 23:45] [Recording]│
├────────────────────────────────┬──────────────────────────────────┤
│                                │                                  │
│  ┌──────────────────────┐     │  📊 INTELLIGENCE PANEL           │
│  │                      │     │                                  │
│  │  Candidate (Main)    │     │  👤 Darshan Murthy K             │
│  │  [Remote Video Feed] │     │  📌 89% Match Score              │
│  │  Darshan Murthy K    │     │                                  │
│  │                      │     │  🎯 Strategic Questions:         │
│  └──────────────────────┘     │  1. Explain this project?        │
│                                │  2. Biggest technical challenge? │
│  [Local Self View - Mute]      │  3. Team collaboration style?    │
│                                │                                  │
│  [🎤] [📹] [🖥️] [📁] [💬] [☎️] │  ⏸️  Current Question:           │
│                                │  "Walk me through your React..."│
│                                │                                  │
│                                │  ✅ Strengths Detected:         │
│                                │  • Clear communication          │
│                                │  • Strong technical depth       │
│                                │                                  │
│                                │  ⚠️  Areas to Probe:            │
│                                │  • Limited DevOps exposure      │
│                                │                                  │
│                                │  🎯 Next Question Suggested:    │
│                                │  "Tell me about deployment..."  │
│                                │                                  │
│                                │  [Take Notes] [Mark Strong]     │
│                                │  [Mark Weak] [Ask AI for Q]     │
│                                │                                  │
└────────────────────────────────┴──────────────────────────────────┘
```

### 2.2 Advanced Control Panel (Interviewer Only)

#### Hidden Side Panel (Swipe/Click to expand):
```
┌──────────────────────────────┐
│ ⚙️ NEURAL COMMAND CENTER     │
├──────────────────────────────┤
│                              │
│ 🎛️ STREAM CONTROLS           │
│ ├─ Candidate Mic Level: ████ │
│ ├─ Your Mic Level: ███       │
│ ├─ Echo Cancellation: ON     │
│ ├─ Noise Suppression: ON     │
│ └─ Background Blur: OFF      │
│                              │
│ 👥 PARTICIPANT MANAGEMENT    │
│ ├─ Darshan (Main) - [⋯]      │
│ │  ├─ Mute Audio             │
│ │  ├─ Disable Video          │
│ │  └─ End Interview           │
│ └─ [+ Add Observer/Evaluator]│
│                              │
│ 🎬 RECORDING STATUS          │
│ ├─ Status: RECORDING ⚫       │
│ ├─ Duration: 12m 34s         │
│ ├─ Bitrate: 2.5 Mbps         │
│ └─ Storage: Encrypted via UUID│
│                              │
│ 📋 DOCUMENT SHARING          │
│ ├─ Shared Docs: 3            │
│ │  ├─ resume.pdf             │
│ │  ├─ portfolio.zip          │
│ │  └─ design_mockup.fig      │
│ └─ [+ Request Document]      │
│                              │
│ 🔒 PERMISSIONS STATUS        │
│ ├─ Camera: ✅ Active         │
│ ├─ Microphone: ✅ Active     │
│ ├─ Screen Share: ✅ Ready    │
│ └─ Recording: ✅ Consent OK  │
│                              │
│ 💾 REAL-TIME NOTES          │
│ [Text area for interviewer] │
│ [Auto-saves every 5 secs]   │
│                              │
│ 🤖 GEMMA AI ASSISTANCE      │
│ ├─ [💭] Ask AI a Question   │
│ ├─ [📊] Show Strength Gaps  │
│ ├─ [🎯] Suggest Next Q      │
│ └─ [📈] Real-time Sentiment │
│                              │
│ ⏱️ MEETING TIMER             │
│ ├─ Elapsed: 12:34            │
│ ├─ Remaining: 32:26          │
│ └─ [⚠️] 5-min warning alert  │
│                              │
└──────────────────────────────┘
```

### 2.3 Screen Sharing & Document Management

#### Screen Share Initiation:
```javascript
// Candidate screen shares code/design
POST /api/interview/[interview_id]/screen-share {
  action: 'start|stop',
  stream_id: UUID,
  content_type: 'code|design|presentation|other'
}

// Candidate shares document
POST /api/interview/[interview_id]/document-share {
  file: File,
  document_type: 'resume|portfolio|certificate|other',
  expiry: timestamp (auto-delete after interview)
}
```

#### UI for Shared Content:
```
┌─────────────────────────────────────┐
│ 🖥️ SHARED CONTENT                   │
├─────────────────────────────────────┤
│                                     │
│  Mode: Screen Share                 │
│  Candidate sharing: Code Editor     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Candidate's Screen]        │   │
│  │ VS Code - React Component   │   │
│  │                             │   │
│  │ const useCustomHook = ...   │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [📥] Save to Interview Record     │
│  [📸] Capture Screenshot           │
│  [🔍] Annotate/Draw                │
│  [❌] Stop Screen Share            │
│                                     │
└─────────────────────────────────────┘
```

### 2.4 Real-time Gemma AI Integration

#### Live Interview Analysis (Runs in background):
```python
# /services/gemma_interview_analyzer.py

class InterviewAnalyzer:
    def __init__(self, interview_id, candidate_context):
        self.gemma_client = GemmaClient(model='gemma-7b-it')
        self.interview_id = interview_id
        self.candidate_data = candidate_context  # From ATS report
        self.transcript = []
        self.sentiment_timeline = []
        
    def analyze_response(self, question_text, candidate_response, duration_seconds):
        """
        Real-time analysis of candidate response
        """
        prompt = f"""
        You are an expert technical interviewer evaluating a candidate.
        
        Candidate Background:
        {json.dumps(self.candidate_data)}
        
        Question Asked: {question_text}
        
        Candidate's Response (duration: {duration_seconds}s):
        {candidate_response}
        
        Provide JSON analysis:
        {{
            "response_quality": 1-10,
            "clarity": 1-10,
            "technical_depth": 1-10,
            "communication": 1-10,
            "confidence_level": "low|medium|high",
            "red_flags": [list],
            "green_flags": [list],
            "gaps_identified": [list],
            "suggested_follow_up": "string",
            "alignment_with_role": 1-10
        }}
        """
        
        # Stream response for real-time UI updates
        analysis = self.gemma_client.stream_completion(prompt)
        return self.parse_analysis(analysis)
    
    def suggest_next_question(self, conversation_history):
        """
        AI-powered question suggestion based on flow
        """
        prompt = f"""
        Based on this interview conversation, suggest the most strategic next question
        that would best assess the candidate's fit.
        
        Conversation:
        {conversation_history}
        
        Candidate ATS Profile:
        {self.candidate_data}
        
        Return JSON:
        {{
            "suggested_question": "string",
            "reasoning": "string",
            "difficulty": "easy|medium|hard",
            "targets_skill": "string"
        }}
        """
        return self.gemma_client.completion(prompt)
    
    def real_time_sentiment(self, audio_transcript):
        """
        Detect confidence, engagement, frustration from speech patterns
        """
        prompt = f"""
        Analyze the candidate's emotional state and engagement from this transcript:
        {audio_transcript}
        
        Return JSON:
        {{
            "sentiment": "confident|neutral|anxious|frustrated|engaged",
            "engagement_score": 1-10,
            "clarity_score": 1-10,
            "confidence_trajectory": "increasing|stable|decreasing"
        }}
        """
        return self.gemma_client.completion(prompt)
```

#### WebSocket Real-time Updates to Interviewer:
```javascript
// /pages/interview/[id].jsx - Interviewer view

useEffect(() => {
  const channel = supabase
    .channel(`gemma-analysis-${interviewId}`)
    .on(
      'broadcast',
      { event: 'response_analyzed' },
      (payload) => {
        // Update intelligence panel in real-time
        setAnalysis({
          responseQuality: payload.response_quality,
          suggestedFollowUp: payload.suggested_follow_up,
          alignmentScore: payload.alignment_with_role,
          sentiment: payload.confidence_level
        });
      }
    )
    .subscribe();
  
  return () => channel.unsubscribe();
}, [interviewId]);
```

### 2.5 Two-Way Audio/Video with WebRTC

#### Key Features:
- **Codec**: VP8 for video, Opus for audio (open-source, no licensing)
- **Bitrate Adaptation**: Automatically scales 500kbps - 4Mbps based on network
- **SRTP Encryption**: All streams encrypted end-to-end
- **Echo Cancellation**: Built-in via WebRTC's Echo Canceller
- **Noise Suppression**: Mac Mini can offload to Gemma for enhanced filtering
- **Bandwidth Monitor**: Display connection quality to both parties

#### Implementation:
```javascript
// /utils/peerConnection.js

export class InterviewPeerConnection {
  constructor(config) {
    this.config = {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] }
        // No TURN relay needed if on same network; add for production
      ],
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      }
    };
    
    this.peerConnection = new RTCPeerConnection(this.config);
    this.setupMediaTracks();
    this.setupStats();
  }
  
  async setupMediaTracks() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false // Prevent distortion on loud speakers
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    });
    
    stream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, stream);
    });
  }
  
  setupStats() {
    // Monitor connection quality every 1 second
    setInterval(async () => {
      const stats = await this.peerConnection.getStats();
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          const videoStats = {
            bytesReceived: report.bytesReceived,
            framesDecoded: report.framesDecoded,
            packetsLost: report.packetsLost,
            jitter: report.jitter
          };
          // Emit to UI
          window.dispatchEvent(new CustomEvent('videoStats', { detail: videoStats }));
        }
      });
    }, 1000);
  }
}
```

#### Connection Quality Display:
```
Network Status Bar (Top of screen):
┌──────────────────────────────────┐
│ 📡 Connection: Good  ▓▓▓▓▓░░      │  (4/5 bars)
│ 📊 Bitrate: 2.1 Mbps              │
│ 🔄 Latency: 45ms                  │
│ 📦 Packet Loss: <0.5%             │
└──────────────────────────────────┘
```

---

## Phase 3: Recording & Post-Interview

### 3.1 Multi-Track Recording Architecture

#### Recording Streams:
```javascript
// /api/interview/[id]/recording

{
  interview_id: UUID,
  recording_status: 'recording' | 'stopped' | 'processing' | 'finalized',
  tracks: {
    candidate_video: {
      codec: 'VP8',
      bitrate: '1-2 Mbps',
      resolution: '1280x720',
      file: 's3://recordings/[uuid]/candidate_video.webm'
    },
    interviewer_video: {
      codec: 'VP8',
      bitrate: '1-2 Mbps',
      resolution: '1280x720',
      file: 's3://recordings/[uuid]/interviewer_video.webm'
    },
    shared_screen: {
      codec: 'VP8',
      bitrate: '500kbps-2Mbps (dynamic)',
      resolution: 'variable',
      file: 's3://recordings/[uuid]/screen_share.webm'
    },
    audio_mixed: {
      codec: 'Opus',
      bitrate: '48kbps-128kbps',
      channels: 2,
      file: 's3://recordings/[uuid]/audio_mixed.opus'
    },
    audio_candidate: {
      codec: 'Opus',
      bitrate: '64kbps',
      file: 's3://recordings/[uuid]/audio_candidate.opus'
    },
    audio_interviewer: {
      codec: 'Opus',
      bitrate: '64kbps',
      file: 's3://recordings/[uuid]/audio_interviewer.opus'
    },
    transcript: {
      format: 'JSON',
      speaker_identified: true,
      timestamps: true,
      confidence: 'float 0-1'
    }
  },
  
  metadata: {
    duration_seconds: 2847,
    start_time: ISO8601,
    end_time: ISO8601,
    candidate_uuid: UUID,
    interviewer_uuid: UUID,
    interview_type: 'initial|technical|final',
    audio_analysis: {
      candidate_talk_time: '55%',
      interviewer_talk_time: '45%',
      silence_duration: '180s'
    },
    encryption: {
      method: 'AES-256-GCM',
      key_derivation: 'PBKDF2',
      encrypted_at: ISO8601
    }
  }
}
```

### 3.2 Encrypted Storage (Supabase + S3)

#### Storage Architecture:
```
AWS S3 Structure:
s3://namaah-interviews/
├── [candidate-uuid]/
│   ├── [interview-id]/
│   │   ├── candidate_video.webm (encrypted)
│   │   ├── interviewer_video.webm (encrypted)
│   │   ├── screen_share.webm (encrypted)
│   │   ├── audio_mixed.opus (encrypted)
│   │   ├── transcript.json (encrypted)
│   │   ├── gemma_analysis.json (encrypted)
│   │   └── metadata.json
│   │
│   └── interview_history.json (index of all interviews)
```

#### Encryption Implementation:
```javascript
// /services/recordingStorage.js

import crypto from 'crypto';

export class SecureRecordingStorage {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.algorithm = 'aes-256-gcm';
  }
  
  async encryptAndStore(interviewId, candidateUuid, fileStream, fileType) {
    // Derive key from interview_id + candidate_uuid
    const key = crypto
      .pbkdf2Sync(
        `${interviewId}:${candidateUuid}`,
        process.env.SALT_KEY,
        100000,
        32,
        'sha256'
      );
    
    // Generate IV for this specific file
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt stream
    const encryptedStream = fileStream
      .pipe(cipher)
      .on('data', (chunk) => {
        // Stream to S3
        s3Client.upload({
          Bucket: 'namaah-interviews',
          Key: `${candidateUuid}/${interviewId}/${fileType}.webm.encrypted`,
          Body: chunk,
          Metadata: {
            'interview-id': interviewId,
            'candidate-uuid': candidateUuid,
            'iv': iv.toString('hex'),
            'algorithm': this.algorithm
          }
        });
      });
    
    return {
      fileKey: `${candidateUuid}/${interviewId}/${fileType}.webm.encrypted`,
      iv: iv.toString('hex'),
      encrypted_at: new Date().toISOString()
    };
  }
  
  async decrypt(fileKey, candidateUuid, interviewId) {
    // Only allow candidate or authorized admin to decrypt
    const key = crypto.pbkdf2Sync(
      `${interviewId}:${candidateUuid}`,
      process.env.SALT_KEY,
      100000,
      32,
      'sha256'
    );
    
    const s3Object = await s3Client.getObject({
      Bucket: 'namaah-interviews',
      Key: fileKey
    });
    
    const iv = Buffer.from(s3Object.Metadata.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    
    return s3Object.Body.pipe(decipher);
  }
}
```

### 3.3 Automated Transcript & Sentiment Analysis

#### Speech-to-Text (Whisper or Gemma-based):
```javascript
// /services/transcriptionService.js

async function generateTranscript(audioStream, interviewId) {
  /**
   * Two options:
   * 1. OpenAI Whisper API (cloud-based, most accurate)
   * 2. Local Whisper model (privacy-first, slower)
   * 3. Gemma audio understanding (lightweight, on Mac Mini)
   */
  
  // Option 3: Use Gemma for transcript generation
  const whisperLite = new WhisperLite({
    model: 'gemma-7b', // Can understand speech context
    language: 'en'
  });
  
  const transcript = await whisperLite.transcribe(audioStream, {
    task: 'transcribe',
    language: 'en',
    word_level_timestamps: true
  });
  
  return {
    text: transcript.text,
    segments: transcript.segments.map(seg => ({
      start_time: seg.start,
      end_time: seg.end,
      speaker: identifySpeaker(seg.audio_fingerprint),
      text: seg.text,
      confidence: seg.confidence
    })),
    speaker_count: identifyUniqueVoices(transcript),
    detected_languages: ['en']
  };
}

function identifySpeaker(audioFingerprint) {
  /**
   * Use audio fingerprinting to distinguish candidate vs interviewer
   * Compare tone, pitch, speaking patterns
   */
  const tone = analyzeAudioCharacteristics(audioFingerprint);
  
  if (tone.pitch_avg > 150) return 'candidate'; // Typically higher
  if (tone.pitch_avg < 80) return 'interviewer'; // Typically lower
  
  return 'unknown';
}
```

#### Gemma-Based Post-Interview Analysis:
```python
# /services/postInterviewAnalysis.py

def comprehensive_interview_analysis(interview_data):
    """
    Complete post-interview analysis using local Gemma model
    """
    
    gemma = GemmaClient(model='gemma-7b-it')
    
    analysis_prompt = f"""
    You are an expert HR analyst and technical interviewer evaluator.
    
    === INTERVIEW CONTEXT ===
    Candidate: {interview_data['candidate_name']}
    Position: {interview_data['job_cluster']}
    ATS Pre-Interview Match Score: {interview_data['ats_match_score']}%
    Duration: {interview_data['duration_minutes']} minutes
    
    === INTERVIEW TRANSCRIPT ===
    {interview_data['transcript']}
    
    === AUDIO ANALYSIS ===
    Candidate talk time: {interview_data['candidate_talk_time']}%
    Interviewer talk time: {interview_data['interviewer_talk_time']}%
    Silence duration: {interview_data['silence_duration_seconds']}s
    
    === SCREEN SHARE ARTIFACTS ===
    {interview_data['shared_artifacts']}
    
    Provide a comprehensive JSON analysis:
    
    {{
        "overall_verdict": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
        "confidence": 0.0-1.0,
        
        "technical_assessment": {{
            "score": 1-10,
            "strengths": ["skill1", "skill2"],
            "gaps": ["gap1", "gap2"],
            "evidence": "quote from interview"
        }},
        
        "communication_assessment": {{
            "score": 1-10,
            "clarity": 1-10,
            "articulation": 1-10,
            "evidence": "narrative"
        }},
        
        "cultural_fit": {{
            "score": 1-10,
            "collaboration_style": "string",
            "learning_agility": "string",
            "growth_mindset": true|false
        }},
        
        "role_alignment": {{
            "match_percentage": 0-100,
            "primary_role_fit": "string",
            "alternative_role_fit": ["role1", "role2"]
        }},
        
        "red_flags": [
            {{
                "flag": "string",
                "severity": "critical|high|medium|low",
                "context": "evidence"
            }}
        ],
        
        "green_flags": [
            {{
                "flag": "string",
                "significance": "high|medium|low",
                "context": "evidence"
            }}
        ],
        
        "recommended_next_step": "offer|second_interview|rejection|hold",
        
        "interviewer_notes_summary": "string",
        
        "questions_for_candidate": ["if follow-up needed"],
        
        "suggested_onboarding_focus": ["if hired"]
    }}
    """
    
    analysis = gemma.completion(analysis_prompt)
    return json.loads(analysis)
```

---

## Gemma LLM Integration

### 4.1 Local Gemma Model Setup (Mac Mini)

#### Installation & Configuration:
```bash
# On Mac Mini - Install Ollama + Gemma

# 1. Install Ollama
brew install ollama

# 2. Pull Gemma model (7B or 13B)
ollama pull gemma:7b-instruct-q4_K_M  # Quantized for faster inference

# 3. Start Ollama service
ollama serve  # Runs on localhost:11434

# 4. Test connectivity
curl http://localhost:11434/api/generate -X POST -d '{
  "model": "gemma:7b-instruct-q4_K_M",
  "prompt": "Who is the CEO of Anthropic?",
  "stream": false
}'
```

#### Node.js Integration:
```javascript
// /utils/gemmaClient.js

import fetch from 'node-fetch';

export class GemmaClient {
  constructor(model = 'gemma:7b-instruct-q4_K_M') {
    this.baseUrl = process.env.GEMMA_API_URL || 'http://localhost:11434';
    this.model = model;
  }
  
  async completion(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        num_predict: options.max_tokens || 2000
      })
    });
    
    const data = await response.json();
    return data.response;
  }
  
  async *streamCompletion(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: true,
        temperature: options.temperature || 0.7
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line) {
          const data = JSON.parse(line);
          yield data.response;
        }
      }
    }
  }
}
```

### 4.2 Advanced Gemma Use Cases for Interviews

#### A. Real-time Question Optimization
```javascript
// During interview - AI suggests better questions based on flow

async function optimizeQuestionFlow(conversationHistory, candidateProfile) {
  const prompt = `
  Based on this conversation and candidate profile, what's the NEXT BEST question
  to ask that will most effectively assess fit?
  
  Conversation:
  ${conversationHistory}
  
  Candidate Profile:
  ${JSON.stringify(candidateProfile)}
  
  Return ONLY JSON, no markdown:
  {
    "question": "specific, well-formed question",
    "why_this_question": "reasoning",
    "expected_insight": "what this reveals",
    "difficulty": "easy|medium|hard|technical_deep_dive"
  }
  `;
  
  return await gemmaClient.completion(prompt);
}
```

#### B. Behavioral Pattern Recognition
```python
def analyze_communication_patterns(transcript_segments):
    """
    Detect leadership, collaboration, conflict resolution from speech patterns
    """
    gemma_prompt = """
    Analyze this candidate's communication for behavioral indicators:
    
    Transcript Segments:
    """ + transcript_segments + """
    
    Identify:
    - Leadership tendencies (takes charge, defers, collaborative)
    - Conflict handling (defensive, open, problem-solving)
    - Learning style (asks questions, assumes knowledge, iterative)
    - Confidence markers (hesitation, assertiveness, uncertainty)
    - Collaboration signals (we vs I, credit attribution)
    
    Return JSON with behavioral_profile and specific_evidence_quotes
    """
    
    return gemma.completion(gemma_prompt)
```

#### C. Role-Specific Assessment Framework
```javascript
// Dynamically adjust assessment criteria based on job cluster

async function generateRoleSpecificRubric(jobCluster, gemmaClient) {
  const prompt = `
  For a "${jobCluster}" role, generate a detailed evaluation rubric.
  
  Return JSON:
  {
    "must_haves": ["core_skill_1", "core_skill_2"],
    "nice_to_haves": ["nice_skill_1"],
    "red_flags_for_this_role": ["flag_1"],
    "key_questions": [
      { "question": "...", "assesses": "skill", "ideal_answer_elements": [...] }
    ],
    "scoring_criteria": {
      "technical": "weighting",
      "communication": "weighting",
      "cultural_fit": "weighting"
    }
  }
  `;
  
  return await gemmaClient.completion(prompt);
}
```

#### D. Live Competency Gap Analysis
```javascript
// During interview - identify skill gaps in real-time

async function identifyCompetencyGaps(responses, requiredSkills) {
  const prompt = `
  Based on candidate responses, identify skill gaps vs. required competencies.
  
  Required: ${requiredSkills}
  Candidate Responses: ${responses}
  
  Return JSON:
  {
    "gaps": [
      { "skill": "...", "severity": "critical|high|medium", "evidence": "..." }
    ],
    "adjacent_strengths": ["could_compensate_with"],
    "training_needs": ["if_hired_should_focus_on"]
  }
  `;
  
  return await gemmaClient.completion(prompt);
}
```

---

## Security & Permissions Framework

### 5.1 Role-Based Access Control (RBAC)

```javascript
// /db/permissions.ts

enum InterviewRole {
  ADMIN = 'admin',           // Can schedule, cancel, view all
  INTERVIEWER = 'interviewer', // Can conduct interviews
  OBSERVER = 'observer',     // Can watch (no control)
  CANDIDATE = 'candidate',   // Can only access their own interview
  RECRUITER = 'recruiter'    // Can schedule, view reports
}

interface InterviewPermission {
  interview_id: UUID;
  user_id: UUID | null;      // null = candidate with unique token
  role: InterviewRole;
  
  // Granular permissions
  can_start_interview: boolean;
  can_end_interview: boolean;
  can_mute_participant: boolean;
  can_remove_participant: boolean;
  can_record: boolean;
  can_view_transcript: boolean;
  can_download_recording: boolean;
  can_share_recording: boolean;
  
  // Temporal constraints
  valid_from: timestamp;
  valid_until: timestamp;
  
  // Audit trail
  granted_by: UUID;
  granted_at: timestamp;
  last_accessed: timestamp;
}

// Permission checks before any action
async function checkPermission(
  userId: UUID | null,
  interviewId: UUID,
  action: string
): Promise<boolean> {
  const permission = await db.query(
    `SELECT * FROM interview_permissions 
     WHERE interview_id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [interviewId, userId]
  );
  
  if (!permission) return false;
  
  // Check temporal validity
  if (new Date() < permission.valid_from || new Date() > permission.valid_until) {
    return false;
  }
  
  // Check specific action permission
  const actionKey = `can_${action}`;
  return permission[actionKey] === true;
}
```

### 5.2 Consent & Recording Authorization

#### Explicit Consent Flow:
```javascript
// Before recording starts - MUST get explicit consent

interface RecordingConsent {
  interview_id: UUID;
  user_id: UUID | null;  // null for candidate with unique token
  
  consents_to: {
    video_recording: boolean;
    audio_recording: boolean;
    transcript_generation: boolean;
    ai_analysis: boolean;
    sharing_with_team: boolean;  // Can hiring team view?
  };
  
  restrictions: {
    cannot_share_beyond: ['team'|'external'],
    retention_period: 'months' | number,
    access_revocation_allowed: boolean
  };
  
  consented_at: timestamp;
  consent_ip_address: string;
  user_agent: string;  // For audit trail
  consent_version: 'v1';
}

// UI Component - Must appear before interview starts
export const ConsentModal = ({ interviewId, onConsent }) => (
  <Modal title="Recording & Analysis Consent">
    <Checkbox label="I consent to video recording" name="video" required />
    <Checkbox label="I consent to audio recording" name="audio" required />
    <Checkbox label="Automatic transcript generation" name="transcript" />
    <Checkbox label="AI analysis of responses" name="ai_analysis" />
    <Checkbox label="Sharing recording with hiring team" name="sharing" />
    
    <Alert type="info">
      This interview will be recorded and analyzed. Your consent is required to proceed.
      You can revoke access after the interview via your candidate dashboard.
    </Alert>
    
    <Button onClick={() => onConsent(getFormData())}>I Agree - Start Interview</Button>
  </Modal>
);
```

### 5.3 Data Retention & Deletion Policies

```javascript
// /services/dataRetention.js

class DataRetentionManager {
  async enforceRetentionPolicy(candidateUuid) {
    /**
     * Default: 90 days retention
     * Offer candidate options:
     * - Delete after 7 days
     * - Keep for 1 year
     * - Permanent archive (if hired)
     */
    
    const retention = await db.query(
      `SELECT retention_policy FROM candidates WHERE uuid = $1`,
      [candidateUuid]
    );
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retention.retention_days);
    
    // Schedule deletion job
    await scheduler.schedule({
      jobType: 'delete_interview_data',
      candidateUuid,
      executeAt: expiryDate,
      dataToDelete: [
        'video_recordings',
        'audio_recordings',
        'transcript',
        'gemma_analysis',
        'interviewer_notes'
      ]
    });
  }
  
  async deleteDataSecurely(dataId) {
    /**
     * Cryptographic erasure:
     * 1. Overwrite encryption key with random data
     * 2. Delete database records
     * 3. Verify S3 objects deleted
     */
    
    const encryptionKey = await getEncryptionKey(dataId);
    
    // Overwrite with random data (3-pass DOD 5220.22-M)
    for (let i = 0; i < 3; i++) {
      await overwriteKey(encryptionKey, crypto.randomBytes(256));
    }
    
    // Delete from database
    await db.query('DELETE FROM interview_recordings WHERE id = $1', [dataId]);
    
    // Delete from S3
    await s3Client.deleteObject({
      Bucket: 'namaah-interviews',
      Key: `${dataId}/*`
    });
  }
}
```

---

## Database Schema Extensions

### 6.1 Complete Interview Tables

```sql
-- Core Interview Table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  interviewer_id UUID NOT NULL REFERENCES users(id),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  
  status ENUM ('scheduled', 'awaiting_candidate', 'in_progress', 'completed', 'no_show', 'cancelled') DEFAULT 'scheduled',
  interview_type ENUM ('initial', 'technical', 'behavioral', 'final') NOT NULL,
  
  unique_access_token VARCHAR(255) UNIQUE NOT NULL,
  room_id UUID NOT NULL,
  
  recording_status ENUM ('not_recording', 'recording', 'processing', 'completed', 'encrypted') DEFAULT 'not_recording',
  recording_file_key VARCHAR(512),
  recording_duration_seconds INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recording Metadata
CREATE TABLE interview_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  
  candidate_video_key VARCHAR(512),
  interviewer_video_key VARCHAR(512),
  screen_share_key VARCHAR(512),
  audio_mixed_key VARCHAR(512),
  audio_candidate_key VARCHAR(512),
  audio_interviewer_key VARCHAR(512),
  
  transcript_key VARCHAR(512),
  transcript_raw TEXT,
  transcript_speaker_labeled JSONB,
  
  encryption_key_derivation_method VARCHAR(50) DEFAULT 'PBKDF2',
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_iv_hex VARCHAR(32),
  
  storage_location ENUM ('s3', 's3_encrypted', 'local') DEFAULT 's3_encrypted',
  storage_class ENUM ('standard', 'glacier') DEFAULT 'standard',
  
  file_size_bytes BIGINT,
  bitrate_average FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_interview_id (interview_id),
  INDEX idx_created_at (created_at)
);

-- Interview Analysis (Gemma output)
CREATE TABLE interview_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  
  overall_verdict ENUM ('STRONG_YES', 'YES', 'MAYBE', 'NO', 'STRONG_NO'),
  confidence FLOAT,
  
  technical_assessment JSONB,  -- { score, strengths[], gaps[], evidence }
  communication_assessment JSONB,
  cultural_fit JSONB,
  
  red_flags JSONB,  -- [{ flag, severity, context }]
  green_flags JSONB,
  
  role_alignment_percentage INT,
  alternative_roles TEXT[],
  
  recommended_next_step VARCHAR(100),
  interviewer_notes_summary TEXT,
  
  audio_analysis JSONB,  -- { talk_time_pct, silence_duration, sentiment_progression }
  behavioral_patterns JSONB,  -- { leadership, conflict_handling, learning_style }
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_version VARCHAR(50),  -- gemma-7b-instruct-v1
  processing_time_seconds INT,
  
  INDEX idx_interview_id (interview_id),
  INDEX idx_overall_verdict (overall_verdict)
);

-- Real-time Intelligence Panel Data
CREATE TABLE interview_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  captured_at TIMESTAMP WITH TIME ZONE,
  
  -- Real-time analysis at this snapshot point
  current_question VARCHAR(500),
  response_quality_score INT,
  confidence_level ENUM ('low', 'medium', 'high'),
  suggested_follow_up VARCHAR(500),
  
  behavioral_assessment JSONB,
  skill_gaps_detected TEXT[],
  
  INDEX idx_interview_id (interview_id),
  INDEX idx_timestamp (timestamp)
);

-- Permissions Management
CREATE TABLE interview_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  user_id UUID REFERENCES users(id),  -- NULL for anonymous candidate
  
  role ENUM ('admin', 'interviewer', 'observer', 'candidate', 'recruiter'),
  
  can_start_interview BOOLEAN DEFAULT FALSE,
  can_end_interview BOOLEAN DEFAULT FALSE,
  can_mute_participant BOOLEAN DEFAULT FALSE,
  can_remove_participant BOOLEAN DEFAULT FALSE,
  can_record BOOLEAN DEFAULT FALSE,
  can_view_transcript BOOLEAN DEFAULT FALSE,
  can_download_recording BOOLEAN DEFAULT FALSE,
  can_share_recording BOOLEAN DEFAULT FALSE,
  
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_interview_id (interview_id),
  INDEX idx_user_id (user_id)
);

-- Consent & Compliance
CREATE TABLE recording_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  user_id UUID REFERENCES users(id),
  
  consents_to JSONB,  -- { video_recording, audio_recording, transcript_generation, ai_analysis, sharing_with_team }
  restrictions JSONB,  -- { cannot_share_beyond, retention_period, access_revocation_allowed }
  
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consent_ip_address INET,
  user_agent TEXT,
  consent_version VARCHAR(10),
  
  access_revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  
  INDEX idx_interview_id (interview_id)
);

-- Audit Trail
CREATE TABLE interview_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  
  event_type ENUM ('started', 'participant_joined', 'participant_left', 'permission_changed', 'recording_started', 'recording_stopped', 'ended', 'verdict_submitted', 'data_accessed', 'data_deleted'),
  event_actor_id UUID REFERENCES users(id),  -- NULL for candidate
  event_details JSONB,
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  
  INDEX idx_interview_id (interview_id),
  INDEX idx_timestamp (timestamp)
);
```

---

## API Endpoints Reference

### 7.1 Interview Lifecycle Endpoints

```javascript
// ==================== SCHEDULING ====================
POST /api/interview/schedule
Body: {
  candidate_ids: UUID[],
  interviewer_id: UUID,
  scheduled_time: ISO8601,
  interview_type: 'initial'|'technical'|'final',
  cluster_id: UUID
}
Response: { interviews_created: [...], emails_sent: number }

GET /api/interview/availability?interviewer_id=UUID&start_date=ISO8601&end_date=ISO8601
Response: { available_slots: [...], unavailable_reasons: {...} }

PATCH /api/interview/:id/reschedule
Body: { new_scheduled_time: ISO8601, reason?: string }
Response: { success: boolean, email_sent: boolean }

DELETE /api/interview/:id
Body: { reason: string, notify_candidate: boolean }
Response: { success: boolean }

// ==================== PRE-INTERVIEW ====================
GET /api/interview/:id/pre-call-data?token=unique_access_token
Response: {
  interview: {...},
  candidate: {...},
  ats_report: {...},
  recruiter_notes: [...]
}

POST /api/interview/:id/permissions/check
Body: { action: string, user_id?: UUID }
Response: { allowed: boolean, reason?: string }

POST /api/interview/:id/device-diagnostics
Body: { device_type: 'camera'|'microphone', test_result: {...} }
Response: { status: 'ok'|'warning'|'error', message: string }

// ==================== DURING INTERVIEW ====================
POST /api/interview/:id/start
Body: { start_time: ISO8601 }
Response: { room_url: string, offer_sdp: string }  // WebRTC

POST /api/interview/:id/end
Body: { end_time: ISO8601, final_notes?: string }
Response: { session_archived: boolean }

POST /api/interview/:id/recording/start
Body: {}
Response: { recording_id: UUID, stream_key: string }

POST /api/interview/:id/recording/stop
Body: {}
Response: { recording_duration: number, processing_started: boolean }

POST /api/interview/:id/screen-share/start
Body: { stream_id: UUID }
Response: { stream_key: string }

POST /api/interview/:id/document-share
Body: { file: File, document_type: string }
Response: { document_id: UUID, shared_at: timestamp }

POST /api/interview/:id/intelligence/ask-ai
Body: { question: string, context: 'response_analysis'|'question_suggestion'|'skill_gap' }
Response: { answer: string, confidence: float, sources: [...] }

POST /api/interview/:id/intelligence/sentiment-snapshot
Body: { transcript_segment: string }
Response: { sentiment: string, confidence_score: float, engagement: float }

// ==================== POST-INTERVIEW ====================
POST /api/interview/:id/verdict
Body: {
  recommendation: 'STRONG_YES'|'YES'|'MAYBE'|'NO'|'STRONG_NO',
  summary: string,
  next_step: string,
  interviewed_by: UUID
}
Response: { verdict_recorded: boolean, notification_sent: boolean }

GET /api/interview/:id/analysis
Response: { analysis: {...}, gemma_processing_time: number }

GET /api/interview/:id/transcript
Response: { transcript: [...], speaker_labels: {...}, confidence: float }

GET /api/interview/:id/recording/download?type=full|candidate_video|transcript
Response: { download_url: string, expires_in: 3600 }  // Presigned S3 URL

POST /api/interview/:id/recording/delete
Body: { reason: string }
Response: { deletion_scheduled: boolean, effective_date: timestamp }

// ==================== ADMIN / REPORTING ====================
GET /api/interview/reports/bulk
Query: { start_date, end_date, cluster_id, interviewer_id }
Response: { interviews: [...], summary_stats: {...} }

GET /api/interview/:id/audit-trail
Response: { events: [{event_type, actor_id, timestamp, details}] }

POST /api/interview/:id/share-recording
Body: { share_with_user_ids: UUID[], share_link_expires_in: seconds }
Response: { shared_links: [...], permissions_created: boolean }
```

---

## UI/UX Implementation Standards

### 8.1 Design System (Matching Your Current Theme)

#### Color Palette:
```css
/* From your screenshots */
--primary-emerald: #1ECB7F;    /* CTA, Active states */
--primary-dark: #0F172A;       /* Dark background */
--accent-rose: #EF4444;        /* Recording indicator, delete actions */
--accent-neutral: #6B7280;     /* Secondary text, inactive */
--success-green: #22C55E;      /* Status: Connected, Good */
--warning-orange: #F59E0B;     /* Caution states */
--error-red: #DC2626;          /* Critical errors */

/* Backgrounds */
--bg-primary: #0F172A;
--bg-secondary: #1F2937;       /* Slightly lighter for cards */
--bg-tertiary: #374151;        /* Further lighter for hover */

/* Text */
--text-primary: #F3F4F6;       /* Main text on dark */
--text-secondary: #D1D5DB;     /* Secondary text */
--text-muted: #9CA3AF;         /* Disabled, placeholder */
```

#### Typography:
```css
/* Headings: Use sans-serif display font */
--font-display: 'Geist', -apple-system, sans-serif;  /* Bold, modern */
font-size: 32px;
font-weight: 700;
letter-spacing: -0.02em;

/* Body: Refined, readable */
--font-body: 'Inter', -apple-system, sans-serif;
font-size: 14px;
line-height: 1.6;
font-weight: 400;

/* Monospace: For code, technical info */
--font-mono: 'Menlo', 'Courier New', monospace;
font-size: 13px;
```

#### Component Patterns:

**Status Badge:**
```jsx
const StatusBadge = ({ status, label }) => (
  <div className={`
    inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
    ${status === 'connected' ? 'bg-green-900 text-green-300' : ''}
    ${status === 'recording' ? 'bg-red-900 text-red-300' : ''}
    ${status === 'waiting' ? 'bg-gray-800 text-gray-300' : ''}
  `}>
    <span className={`w-2 h-2 rounded-full ${
      status === 'connected' ? 'bg-green-500' : 
      status === 'recording' ? 'bg-red-500' : 'bg-yellow-500'
    }`}></span>
    {label}
  </div>
);
```

**Control Panel Button:**
```jsx
const ControlButton = ({ icon, label, onClick, variant = 'primary' }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-2 px-4 py-3 rounded-lg
      font-medium transition-all duration-200
      ${variant === 'primary' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
      ${variant === 'secondary' ? 'bg-gray-700 hover:bg-gray-600 text-white' : ''}
      ${variant === 'danger' ? 'bg-red-900 hover:bg-red-800 text-red-300' : ''}
    `}
  >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);
```

### 8.2 Responsive Layouts

```jsx
// Interview Room - Responsive
export const InterviewRoom = () => (
  <div className="flex flex-col h-screen bg-gray-900">
    {/* Header */}
    <header className="flex justify-between items-center p-4 border-b border-gray-800">
      <h1 className="text-lg font-bold text-white">Neural Assessment</h1>
      <ConnectionStatus />
    </header>
    
    {/* Main Content */}
    <div className="flex flex-1 overflow-hidden">
      {/* Video Area - Responsive Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-4">
        {/* Remote Video (Full on mobile) */}
        <div className="rounded-lg overflow-hidden bg-black">
          <video autoPlay playsInline className="w-full h-full object-cover" />
        </div>
        
        {/* Local Video (Hidden on mobile) */}
        <div className="rounded-lg overflow-hidden bg-gray-800 hidden sm:block">
          <video autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      </div>
      
      {/* Intelligence Panel - Sidebar (Hidden on mobile) */}
      <aside className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto hidden lg:block">
        <IntelligencePanel />
      </aside>
    </div>
    
    {/* Controls - Bottom */}
    <footer className="flex justify-center gap-4 p-4 border-t border-gray-800 bg-gray-900">
      <ControlButton icon={<Mic />} label="Mute" />
      <ControlButton icon={<Video />} label="Stop Video" />
      <ControlButton icon={<Share2 />} label="Screen" />
      <ControlButton icon={<Phone />} label="End" variant="danger" />
    </footer>
  </div>
);
```

---

## Advanced Features & Research

### 9.1 Behavioral Analysis Features Using Gemma

#### Verbal Tics & Confidence Detection:
```python
def analyze_verbal_patterns(transcript_with_timestamps):
    """
    Detect:
    - Filler words (um, uh, like, you know)
    - Confidence markers (I think, maybe, definitely)
    - Question patterns (curious, defensive)
    - Speaking pace changes
    """
    
    pattern_analysis = {
        "filler_words": extract_fillers(transcript),
        "confidence_progression": track_confidence_over_time(transcript),
        "question_markers": [
            {
                "statement": "...",
                "question_asked": true|false,
                "confidence": 0.0-1.0
            }
        ],
        "pace_changes": [
            {
                "timestamp": "00:12:30",
                "original_pace": "normal",
                "new_pace": "faster",
                "trigger": "technical_question",
                "interpretation": "nervous|excited|focused"
            }
        ]
    }
    
    return pattern_analysis
```

#### Team Collaboration Signals:
```python
def detect_collaboration_signals(responses):
    """
    From responses like "Tell me about a project you worked on"
    Detect:
    - Use of "we" vs "I"
    - Credit attribution (give credit vs take credit)
    - Conflict resolution approach
    - Mentoring mindset
    """
    
    collaboration_score = {
        "team_player_index": 0-10,  # Based on we/I ratio, credit giving
        "leadership_signals": [...],
        "conflict_approach": "collaborative|assertive|compromising|avoiding",
        "growth_mindset": true|false,  # Learns from feedback?
        "evidence": [
            { "quote": "...", "indicator": "team_player|individual_contributor" }
        ]
    }
    
    return collaboration_score
```

### 9.2 Bias Mitigation & Fairness

```python
def assess_interview_fairness(interview_data):
    """
    Ensure fair evaluation:
    - Time given to respond (equal opportunity)
    - Question difficulty consistency across candidates
    - Interviewer interruptions
    - Emotional reaction to answers
    """
    
    fairness_report = {
        "average_response_time_allowed": 45,  # seconds
        "response_time_variance": 0.15,  # <15% variance is fair
        "question_topics": ["technical", "behavioral", "experience"],
        "question_difficulty_consistency": 0.88,  # 0-1
        
        "interviewer_interruptions": {
            "count": 3,
            "average_interruption_delay": 12,  # seconds
            "threshold_flag": "within normal range"
        },
        
        "language_analysis": {
            "positive_language_ratio": 0.65,
            "negative_language_ratio": 0.15,
            "neutral_language_ratio": 0.20,
            "balance_assessment": "balanced"
        },
        
        "fairness_score": 0.92  # 0-1, higher is fairer
    }
    
    return fairness_report
```

### 9.3 Automated Follow-up Questions

```python
def generate_targeted_followups(candidate_response, skill_gap):
    """
    Intelligent follow-up questions to probe skill gaps
    """
    
    prompt = f"""
    Candidate answered: "{candidate_response}"
    
    Skill gap identified: {skill_gap}
    
    Generate 3 progressive follow-up questions:
    1. Warm-up (easy, builds confidence)
    2. Core (targets the gap)
    3. Deep-dive (assesses depth)
    
    Each should:
    - Be specific and unambiguous
    - Probe the skill gap without being hostile
    - Allow demonstration of knowledge
    - Be answerable in 2-5 minutes
    
    Return JSON with questions, reasoning, and expected_insight
    """
    
    followups = gemma.completion(prompt)
    return followups
```

### 9.4 Real-time Visual Engagement Metrics

```javascript
// Detect engagement from webcam feed (optional - privacy-first)
export class EngagementDetector {
  /**
   * Using Gemma's vision capabilities (if available) or simple metrics:
   * - Face detection: Is candidate looking at camera?
   * - Head movement: Is candidate nodding (agreement) or shaking (disagreement)?
   * - Eye contact: Looking at camera vs looking down (confidence)
   * - Posture: Leaning forward (engaged) vs back (disengaged)
   */
  
  analyzeEngagement(videoFrame) {
    // Simple approach: Monitor camera presence
    // Advanced: Use local vision model (Gemma-Vision)
    
    return {
      looking_at_camera: boolean,
      engagement_score: 0-10,
      confidence_signal: 'high|medium|low',
      attention_wandering: boolean,
      posture_assessment: 'engaged|neutral|disengaged'
    };
  }
}
```

### 9.5 Market Competency Benchmarking

```python
def benchmark_against_market(candidate_assessment, job_cluster):
    """
    Compare candidate's skills against:
    - Historical candidates for this role
    - Industry benchmarks
    - Salary expectations alignment
    """
    
    prompt = f"""
    Based on this candidate's assessment:
    {candidate_assessment}
    
    For role: {job_cluster}
    
    Provide market analysis:
    {
        "percentile_ranking": "top 5%|top 10%|top 25%|etc",
        "salary_alignment": "competitive|above_market|below_market",
        "skill_maturity": "junior|mid|senior|lead",
        "growth_trajectory": "high|moderate|standard",
        "unique_strengths": ["strength_1"],
        "market_recommendations": ["recommendation"]
    }
    """
    
    return gemma.completion(prompt)
```

---

## Implementation Priority & Phased Rollout

### Phase 1: MVP (Week 1-2)
- ✅ Pre-call lobby (candidate + interviewer)
- ✅ WebRTC video/audio (2-way communication)
- ✅ Recording infrastructure (encrypted storage)
- ✅ Automated email scheduling
- ✅ Basic Gemma integration (post-interview analysis)

### Phase 2: Intelligence (Week 3-4)
- Real-time Gemma analysis during interview
- Interviewer side panel with ATS data
- Screen sharing
- Document upload
- Post-interview verdict submission

### Phase 3: Advanced (Week 5-6)
- Behavioral pattern recognition
- Real-time sentiment analysis
- AI-powered question suggestions
- Fairness assessment
- Team collaboration detection

### Phase 4: Optimization (Week 7+)
- Visual engagement metrics
- Market benchmarking
- Advanced permission management
- Bulk interview reporting
- Candidate communications (auto-feedback)

---

## Summary

This comprehensive Neural Assessment Interview Module provides:

✅ **End-to-end security**: Encrypted recordings, permission controls, audit trails
✅ **Local AI intelligence**: Gemma-powered analysis without data leaving your network
✅ **Streamlined UX**: Matching your existing design system
✅ **Scalability**: Supports bulk interviewing, multiple concurrent rooms
✅ **Compliance-ready**: GDPR, recording consent, data retention policies
✅ **Interviewer empowerment**: Real-time insights, suggested questions, behavioral analysis
✅ **Fairness & transparency**: Bias detection, equal opportunity assessment

The system eliminates third-party dependencies while providing superior candidate experience and interviewer intelligence compared to Zoom, Google Meet, or DeloitteInduction.
