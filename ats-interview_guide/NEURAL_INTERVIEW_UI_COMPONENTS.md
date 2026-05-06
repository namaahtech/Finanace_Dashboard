# 🧠 Neural Interview Module
## UI Component Library & Design System

Your interview module should match the dark, emerald-accent theme from your existing ATS dashboard.

---

## Design System Foundation

### Color Variables
```css
:root {
  /* Primary Colors */
  --color-emerald-50: #F0FDF4;
  --color-emerald-100: #DCFCE7;
  --color-emerald-500: #16A34A;
  --color-emerald-600: #15803D;
  --color-emerald-700: #166534;
  --color-emerald-900: #14532D;

  /* Rose Accent */
  --color-rose-500: #F43F5E;
  --color-rose-600: #E11D48;

  /* Dark Mode */
  --color-gray-50: #F9FAFB;
  --color-gray-900: #111827;
  --color-gray-800: #1F2937;
  --color-gray-700: #374151;
  --color-gray-600: #4B5563;
  --color-gray-400: #9CA3AF;
  --color-gray-300: #D1D5DB;

  /* Status Colors */
  --color-green-500: #22C55E;
  --color-yellow-500: #EAB308;
  --color-red-500: #EF4444;

  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

---

## Core Components

### 1. Status Badge

```jsx
// StatusBadge.jsx
import React from 'react';
import styles from './StatusBadge.module.css';

export const StatusBadge = ({ status, label, icon = null }) => {
  const statusConfig = {
    connected: {
      bgColor: 'bg-emerald-900',
      textColor: 'text-emerald-300',
      dotColor: 'bg-emerald-500',
      icon: '✓'
    },
    waiting: {
      bgColor: 'bg-yellow-900',
      textColor: 'text-yellow-300',
      dotColor: 'bg-yellow-500',
      icon: '⏳'
    },
    recording: {
      bgColor: 'bg-red-900',
      textColor: 'text-red-300',
      dotColor: 'bg-red-500 animate-pulse',
      icon: '⚫'
    },
    error: {
      bgColor: 'bg-red-900',
      textColor: 'text-red-300',
      dotColor: 'bg-red-500',
      icon: '✕'
    }
  };

  const config = statusConfig[status] || statusConfig.waiting;

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor} border border-current border-opacity-30
    `}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
      <span>{label}</span>
    </div>
  );
};
```

### 2. Control Button

```jsx
// ControlButton.jsx
import React from 'react';

export const ControlButton = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  active = true,
  size = 'md'
}) => {
  const variants = {
    primary: 'bg-gray-700 hover:bg-gray-600 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-900 hover:bg-red-800 text-red-300',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-300'
  };

  const sizes = {
    sm: 'px-2 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-2 rounded-lg font-medium transition-all duration-200
        ${sizes[size]}
        ${variants[variant]}
        ${!active ? 'opacity-50' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className={size === 'sm' ? 'text-lg' : 'text-2xl'}>{icon}</span>
      <span className={size === 'sm' ? 'text-xs' : 'text-xs font-medium'}>{label}</span>
    </button>
  );
};
```

### 3. Connection Quality Indicator

```jsx
// ConnectionQuality.jsx
import React, { useState, useEffect } from 'react';

export const ConnectionQuality = ({ stats }) => {
  const [quality, setQuality] = useState('excellent');

  useEffect(() => {
    if (!stats) return;

    const { packetsLost, jitter, latency } = stats;
    
    if (packetsLost > 50 || jitter > 100 || latency > 200) {
      setQuality('poor');
    } else if (packetsLost > 20 || jitter > 50 || latency > 100) {
      setQuality('fair');
    } else if (packetsLost > 5 || jitter > 20 || latency > 50) {
      setQuality('good');
    } else {
      setQuality('excellent');
    }
  }, [stats]);

  const qualityConfig = {
    excellent: { color: 'text-emerald-500', bars: 5, label: 'Excellent' },
    good: { color: 'text-emerald-500', bars: 4, label: 'Good' },
    fair: { color: 'text-yellow-500', bars: 3, label: 'Fair' },
    poor: { color: 'text-red-500', bars: 2, label: 'Poor' }
  };

  const config = qualityConfig[quality];

  return (
    <div className="flex items-center gap-3">
      {/* Signal Bars */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 transition-all duration-200 ${
              i < config.bars ? `h-4 ${config.color}` : 'h-2 bg-gray-600'
            }`}
          ></div>
        ))}
      </div>

      {/* Stats */}
      <div className="text-xs text-gray-300">
        <div className={config.color}>{config.label}</div>
        {stats && (
          <div className="text-gray-400 text-xs">
            {stats.latency}ms latency
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Video Container

```jsx
// VideoContainer.jsx
import React from 'react';

export const VideoContainer = ({
  videoRef,
  label,
  isLocal = false,
  isMuted = false,
  isSpeaking = false
}) => {
  return (
    <div className={`
      relative rounded-xl overflow-hidden bg-black
      ${isSpeaking ? 'ring-2 ring-emerald-500' : 'ring-1 ring-gray-700'}
    `}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
      />

      {/* Label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="text-xs text-gray-300 bg-black bg-opacity-50 px-2 py-1 rounded-full">
          {label}
        </span>
        {isLocal && (
          <span className="text-xs text-gray-400 bg-black bg-opacity-50 px-2 py-1 rounded-full">
            (You)
          </span>
        )}
      </div>

      {/* Speaking Indicator */}
      {isSpeaking && !isLocal && (
        <div className="absolute top-3 right-3">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      )}

      {/* Camera Off Overlay */}
      {!videoRef?.current?.srcObject && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-400">Camera Off</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5. Interview Control Panel

```jsx
// InterviewControlPanel.jsx
import React, { useState } from 'react';
import { ControlButton } from './ControlButton';

export const InterviewControlPanel = ({
  onMuteAudio,
  onMuteVideo,
  onScreenShare,
  onShareDocument,
  onNotes,
  onEndInterview,
  isAudioOn = true,
  isVideoOn = true,
  isScreenSharing = false
}) => {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="flex justify-center gap-4 p-6 bg-gray-800 border-t border-gray-700">
      <ControlButton
        icon={isAudioOn ? '🎤' : '🔇'}
        label={isAudioOn ? 'Mute' : 'Unmute'}
        onClick={onMuteAudio}
        variant="primary"
        active={isAudioOn}
      />

      <ControlButton
        icon={isVideoOn ? '📹' : '📹'}
        label={isVideoOn ? 'Stop' : 'Start'}
        onClick={onMuteVideo}
        variant="primary"
        active={isVideoOn}
      />

      <ControlButton
        icon={isScreenSharing ? '🖥️' : '🖥️'}
        label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        onClick={onScreenShare}
        variant={isScreenSharing ? 'success' : 'primary'}
      />

      <ControlButton
        icon="📁"
        label="Share File"
        onClick={onShareDocument}
        variant="primary"
      />

      <ControlButton
        icon="📝"
        label="Notes"
        onClick={() => setShowNotes(!showNotes)}
        variant="secondary"
        active={showNotes}
      />

      <ControlButton
        icon="☎️"
        label="End"
        onClick={onEndInterview}
        variant="danger"
      />
    </div>
  );
};
```

### 6. Intelligence Side Panel

```jsx
// IntelligenceSidePanel.jsx
import React, { useState } from 'react';

export const IntelligenceSidePanel = ({
  candidateName,
  matchScore,
  technicalScore,
  communicationScore,
  strategicQuestions,
  strengths,
  gaps,
  onAskAI,
  onSuggestQuestion
}) => {
  const [expanded, setExpanded] = useState('questions');

  return (
    <div className="h-full bg-gray-800 border-l border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 z-10">
        <h2 className="text-white font-bold text-lg mb-2">🧠 Intelligence Panel</h2>
        <p className="text-gray-400 text-xs">{candidateName}</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Match Score Card */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <h3 className="text-emerald-400 font-semibold mb-3">Match Analysis</h3>
          
          <div className="space-y-3">
            {/* Overall Match */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">Overall Match</span>
                <span className="text-white font-bold">{matchScore}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${matchScore}%` }}
                ></div>
              </div>
            </div>

            {/* Technical Score */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">Technical</span>
                <span className="text-white font-bold">{technicalScore}/10</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(technicalScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Communication Score */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">Communication</span>
                <span className="text-white font-bold">{communicationScore}/10</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(communicationScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setExpanded('questions')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              expanded === 'questions'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setExpanded('analysis')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              expanded === 'analysis'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Analysis
          </button>
        </div>

        {/* Questions Tab */}
        {expanded === 'questions' && (
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm">Strategic Questions</h4>
            {strategicQuestions && strategicQuestions.map((q, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-lg p-3 border-l-2 border-emerald-500 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                {q}
              </div>
            ))}
            <button
              onClick={onSuggestQuestion}
              className="w-full py-2 px-3 bg-emerald-900 hover:bg-emerald-800 text-emerald-300 rounded-lg text-sm font-medium transition-colors"
            >
              💭 Suggest Next Question
            </button>
          </div>
        )}

        {/* Analysis Tab */}
        {expanded === 'analysis' && (
          <div className="space-y-4">
            {/* Strengths */}
            <div>
              <h4 className="text-emerald-400 font-semibold text-sm mb-2">✅ Strengths</h4>
              <ul className="space-y-1">
                {strengths?.map((strength, i) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps */}
            <div>
              <h4 className="text-red-400 font-semibold text-sm mb-2">⚠️ Areas to Probe</h4>
              <ul className="space-y-1">
                {gaps?.map((gap, i) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span className="text-red-500">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* AI Assistant */}
        <div className="bg-emerald-900 bg-opacity-20 rounded-lg p-4 border border-emerald-800">
          <h4 className="text-emerald-400 font-semibold text-sm mb-2">🤖 AI Assistant</h4>
          <button
            onClick={onAskAI}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ask AI a Question
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 7. Interview Timer

```jsx
// InterviewTimer.jsx
import React, { useState, useEffect } from 'react';

export const InterviewTimer = ({ startTime, duration = 3600, warningTime = 300 }) => {
  const [elapsed, setElapsed] = useState(0);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsed = Math.floor((now - startTime) / 1000);
      setElapsed(newElapsed);

      const remaining = duration - newElapsed;
      setIsWarning(remaining <= warningTime && remaining > 0);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, duration, warningTime]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold
      ${isWarning
        ? 'bg-red-900 text-red-300'
        : 'bg-gray-700 text-gray-300'
      }
    `}>
      <span className={isWarning ? 'animate-pulse' : ''}>⏱️</span>
      <span>{formatTime(elapsed)}</span>
      {isWarning && <span className="text-xs ml-2">(Time limit approaching)</span>}
    </div>
  );
};
```

### 8. Interview Lobby Card

```jsx
// InterviewLobbyCard.jsx
import React from 'react';
import { StatusBadge } from './StatusBadge';

export const InterviewLobbyCard = ({
  candidateName,
  candidateEmail,
  position,
  scheduledTime,
  matchScore,
  cameraStatus,
  microphoneStatus,
  networkStatus,
  queuePosition
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{candidateName}</h3>
          <p className="text-gray-400 text-sm">{candidateEmail}</p>
        </div>
        {matchScore && (
          <div className="text-right">
            <p className="text-gray-400 text-xs">Match Score</p>
            <p className="text-emerald-400 font-bold text-2xl">{matchScore}%</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3 mb-6 pb-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Position</span>
          <span className="text-white text-sm">{position}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Scheduled Time</span>
          <span className="text-white text-sm">{new Date(scheduledTime).toLocaleString()}</span>
        </div>
        {queuePosition && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Queue Position</span>
            <span className="text-white text-sm font-bold">#{queuePosition}</span>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-3">
        <StatusBadge
          status={cameraStatus === 'ok' ? 'connected' : 'error'}
          label={cameraStatus === 'ok' ? '📹 Camera' : '📹 No Camera'}
        />
        <StatusBadge
          status={microphoneStatus === 'ok' ? 'connected' : 'error'}
          label={microphoneStatus === 'ok' ? '🎤 Mic' : '🎤 No Mic'}
        />
        <StatusBadge
          status={networkStatus === 'good' ? 'connected' : networkStatus === 'fair' ? 'waiting' : 'error'}
          label={networkStatus === 'good' ? '📡 Good' : '📡 ' + networkStatus.charAt(0).toUpperCase() + networkStatus.slice(1)}
        />
      </div>
    </div>
  );
};
```

---

## Complete Interview Room Layout

```jsx
// InterviewRoom.jsx - Full Page Component
import React, { useState, useEffect, useRef } from 'react';
import { VideoContainer } from './VideoContainer';
import { InterviewControlPanel } from './InterviewControlPanel';
import { IntelligenceSidePanel } from './IntelligenceSidePanel';
import { InterviewTimer } from './InterviewTimer';
import { ConnectionQuality } from './ConnectionQuality';
import { StatusBadge } from './StatusBadge';

export const InterviewRoom = ({ interviewId, role = 'candidate' }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStats, setConnectionStats] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(role === 'interviewer');
  const [startTime] = useState(Date.now());

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left */}
          <div>
            <h1 className="text-white font-bold text-lg">Neural Assessment Interview</h1>
            <p className="text-gray-400 text-sm">
              {isScreenSharing ? '🖥️ Screen Sharing Active' : '👥 Interview in Progress'}
            </p>
          </div>

          {/* Center */}
          <InterviewTimer startTime={startTime} duration={3600} />

          {/* Right */}
          <div className="flex items-center gap-4">
            <ConnectionQuality stats={connectionStats} />
            <StatusBadge status="recording" label="RECORDING" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-2 gap-2 p-4">
          {/* Remote Video */}
          <VideoContainer
            videoRef={remoteVideoRef}
            label="Interviewer"
            isMuted={false}
            isSpeaking={true}
          />

          {/* Local Video */}
          <VideoContainer
            videoRef={localVideoRef}
            label={role === 'interviewer' ? 'You (Interviewer)' : 'You (Candidate)'}
            isMuted={true}
            isLocal={true}
          />
        </div>

        {/* Intelligence Panel - Interviewer Only */}
        {role === 'interviewer' && isSidePanelOpen && (
          <IntelligenceSidePanel
            candidateName="Darshan Murthy K"
            matchScore={89}
            technicalScore={9}
            communicationScore={8}
            strategicQuestions={[
              "Walk me through your most complex project",
              "How do you handle technical debt?",
              "Tell me about a time you failed"
            ]}
            strengths={[
              "Strong technical foundation",
              "Clear communication",
              "Project complexity demonstrated"
            ]}
            gaps={[
              "Limited backend exposure",
              "No DevOps mentioned",
              "Team leadership experience unclear"
            ]}
            onAskAI={() => alert('AI assistant')}
            onSuggestQuestion={() => alert('Suggest next question')}
          />
        )}
      </div>

      {/* Controls */}
      <InterviewControlPanel
        onMuteAudio={() => setIsAudioOn(!isAudioOn)}
        onMuteVideo={() => setIsVideoOn(!isVideoOn)}
        onScreenShare={() => setIsScreenSharing(!isScreenSharing)}
        onShareDocument={() => alert('Share document')}
        onNotes={() => alert('Interviewer notes')}
        onEndInterview={() => alert('End interview')}
        isAudioOn={isAudioOn}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
      />
    </div>
  );
};

export default InterviewRoom;
```

---

## Animations & Transitions

### Fade In Effect
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
```

### Pulse Effect (for recording)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Slide Up (for panel reveal)
```css
@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
```

---

## Responsive Design

### Mobile-First Approach
```jsx
// Layout adapts for mobile
<div className="grid grid-cols-2 gap-2 md:gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
  {/* Video grids stack on mobile */}
</div>

// Side panel becomes modal on mobile
<aside className="hidden lg:block w-80 bg-gray-800">
  {/* Intelligence panel hidden on mobile */}
</aside>

// Controls stack vertically on mobile
<footer className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  {/* Buttons wrap on mobile */}
</footer>
```

---

## Accessibility Features

### Keyboard Navigation
```jsx
export const InterviewRoom = () => {
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'M':
        case 'm':
          // Toggle mute
          e.preventDefault();
          setIsAudioOn(!isAudioOn);
          break;
        case 'V':
        case 'v':
          // Toggle video
          e.preventDefault();
          setIsVideoOn(!isVideoOn);
          break;
        case 'S':
        case 's':
          // Toggle screen share
          e.preventDefault();
          setIsScreenSharing(!isScreenSharing);
          break;
        case 'Escape':
          // Leave interview
          e.preventDefault();
          onEndInterview();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
};
```

### ARIA Labels
```jsx
<button
  aria-label="Toggle microphone (press M to toggle)"
  aria-pressed={isAudioOn}
  role="switch"
>
  🎤
</button>
```

---

This component library matches your existing design system perfectly and provides all the UI elements needed for a production-grade neural interview experience.
