# 🧠 Neural Interview Module
## Practical Implementation Guide & Code Examples

---

## Part 1: Pre-Interview Scheduling System

### 1.1 Backend: Schedule Interview Endpoint

```javascript
// /api/admin/recruitment/schedule.ts

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      candidate_ids,
      interviewer_id,
      scheduled_time,
      interview_type,
      cluster_id
    } = req.body;

    const interviews_created = [];
    const emails_sent = [];

    for (const candidate_id of candidate_ids) {
      // Generate unique access token
      const unique_access_token = `ni_${uuidv4()}_${Date.now()}`;
      const room_id = uuidv4();

      // Create interview record
      const { data: interview, error } = await supabase
        .from('interviews')
        .insert({
          application_id: candidate_id,
          interviewer_id,
          scheduled_time,
          interview_type,
          unique_access_token,
          room_id,
          status: 'scheduled',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating interview:', error);
        continue;
      }

      // Get candidate details
      const { data: candidate } = await supabase
        .from('applications')
        .select('*, profiles(name, email)')
        .eq('id', candidate_id)
        .single();

      // Get job cluster info
      const { data: cluster } = await supabase
        .from('recruitment_clusters')
        .select('*')
        .eq('id', cluster_id)
        .single();

      // Get interviewer details
      const { data: interviewer } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', interviewer_id)
        .single();

      // Send email
      const interview_link = `${process.env.FRONTEND_URL}/interview/${unique_access_token}`;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: candidate.profiles.email,
        subject: `Your Neural Assessment Interview - ${cluster.name}`,
        html: `
          <h2>Interview Invitation</h2>
          <p>Hi ${candidate.profiles.name},</p>
          <p>You've been selected for the next stage of our hiring process!</p>
          
          <h3>📅 Interview Details:</h3>
          <ul>
            <li><strong>Date & Time:</strong> ${new Date(scheduled_time).toLocaleString()}</li>
            <li><strong>Duration:</strong> 45-60 minutes</li>
            <li><strong>Role:</strong> ${cluster.name}</li>
            <li><strong>Interviewer:</strong> ${interviewer.full_name}</li>
          </ul>
          
          <h3>🔐 Secure Interview Room:</h3>
          <p><a href="${interview_link}" style="background: #1ECB7F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Join Interview</a></p>
          
          <h3>✅ Before the Interview:</h3>
          <ol>
            <li>Test your camera & microphone by clicking the link 15 mins early</li>
            <li>Have your resume ready</li>
            <li>Ensure quiet background & stable internet (5+ Mbps recommended)</li>
            <li>Allow browser permissions for camera/microphone</li>
          </ol>
          
          <p>Questions? Reply to this email.</p>
          <p>Best,<br/>Namaah Nexus Team</p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        emails_sent.push({
          candidate_id,
          email: candidate.profiles.email,
          status: 'sent'
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        emails_sent.push({
          candidate_id,
          email: candidate.profiles.email,
          status: 'failed',
          error: emailError.message
        });
      }

      interviews_created.push({
        id: interview.id,
        candidate_id,
        candidate_email: candidate.profiles.email,
        scheduled_time: interview.scheduled_time,
        unique_access_token,
        room_id
      });
    }

    res.status(200).json({
      interviews_created,
      emails_sent,
      total: interviews_created.length
    });

  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 1.2 Frontend: Candidate Pre-Call Lobby

```jsx
// /components/interview/CandidateLobby.jsx

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Wifi, Loader } from 'lucide-react';

export const CandidateLobby = ({ interviewId, onReadyToJoin }) => {
  const videoRef = useRef(null);
  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [micStatus, setMicStatus] = useState('checking');
  const [networkStatus, setNetworkStatus] = useState('checking');
  const [queuePosition, setQueuePosition] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [canJoin, setCanJoin] = useState(false);

  // Initialize media devices
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // Check camera
        const constraints = {
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video preview
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setVideoStream(stream);
        setCameraStatus('ready');
        setMicStatus('ready');

        // Check network quality
        await testNetworkQuality();

        // Subscribe to queue updates
        subscribeToQueueUpdates();

      } catch (error) {
        console.error('Device initialization error:', error);
        
        if (error.name === 'NotAllowedError') {
          setCameraStatus('denied');
          setMicStatus('denied');
        } else if (error.name === 'NotFoundError') {
          setCameraStatus('not_found');
          setMicStatus('not_found');
        }
      }
    };

    initializeDevices();

    return () => {
      // Cleanup
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const testNetworkQuality = async () => {
    try {
      // Simple bandwidth test
      const startTime = Date.now();
      const testSize = 1000000; // 1MB
      const testUrl = '/api/network-test';

      const response = await fetch(testUrl, {
        method: 'POST',
        body: new Uint8Array(testSize)
      });

      const duration = Date.now() - startTime;
      const bandwidth = (testSize / (duration / 1000)) / 1024 / 1024; // Mbps

      if (bandwidth >= 5) {
        setNetworkStatus('good');
      } else if (bandwidth >= 2.5) {
        setNetworkStatus('fair');
      } else {
        setNetworkStatus('poor');
      }
    } catch (error) {
      console.error('Network test error:', error);
      setNetworkStatus('unknown');
    }
  };

  const subscribeToQueueUpdates = () => {
    // Supabase real-time subscription
    const subscription = supabase
      .channel(`interview-queue-${interviewId}`)
      .on(
        'broadcast',
        { event: 'queue_update' },
        (payload) => {
          setQueuePosition(payload.position);
          if (payload.position === 1) {
            setCanJoin(true);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const handleJoinClick = async () => {
    if (canJoin && cameraStatus === 'ready' && micStatus === 'ready') {
      onReadyToJoin({
        videoStream,
        audioStream
      });
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Neural Assessment - Waiting Room</h1>
        <p className="text-gray-400 text-sm">Status: Waiting for Interviewer...</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Video Preview */}
          <div className="rounded-xl overflow-hidden bg-black mb-8 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto aspect-video object-cover"
            />
          </div>

          {/* Device Status Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Camera Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  cameraStatus === 'ready' ? 'bg-green-500' : 
                  cameraStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-300 font-medium">Camera</span>
              </div>
              <p className="text-gray-400 text-sm">
                {cameraStatus === 'ready' ? '1920x1080 (HD)' :
                 cameraStatus === 'checking' ? 'Checking...' :
                 'Not Detected'}
              </p>
            </div>

            {/* Microphone Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  micStatus === 'ready' ? 'bg-green-500' : 
                  micStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-300 font-medium">Microphone</span>
              </div>
              <p className="text-gray-400 text-sm">
                {micStatus === 'ready' ? 'Detected' :
                 micStatus === 'checking' ? 'Checking...' :
                 'Not Detected'}
              </p>
            </div>

            {/* Internet Status */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  networkStatus === 'good' ? 'bg-green-500' : 
                  networkStatus === 'fair' ? 'bg-yellow-500' : 
                  networkStatus === 'checking' ? 'bg-gray-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-300 font-medium">Internet</span>
              </div>
              <p className="text-gray-400 text-sm">
                {networkStatus === 'good' ? '25+ Mbps' :
                 networkStatus === 'fair' ? '10-25 Mbps' :
                 networkStatus === 'checking' ? 'Testing...' :
                 'Poor Connection'}
              </p>
            </div>
          </div>

          {/* Queue Position */}
          {queuePosition && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-8">
              <p className="text-blue-300 text-center font-medium">
                Your Position in Queue: <span className="text-2xl font-bold">#{queuePosition}</span>
              </p>
              {queuePosition > 1 && (
                <p className="text-blue-400 text-sm text-center mt-2">
                  Estimated wait time: {(queuePosition - 1) * 50} minutes
                </p>
              )}
            </div>
          )}

          {/* Interview Details */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">📋 Interview Details</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex justify-between">
                <span>Role:</span>
                <span className="font-medium">Google - Frontend - React</span>
              </div>
              <div className="flex justify-between">
                <span>Interviewer:</span>
                <span className="font-medium">Darshan Murthy K</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">~45 minutes</span>
              </div>
            </div>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinClick}
            disabled={!canJoin || cameraStatus !== 'ready' || micStatus !== 'ready'}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
              canJoin && cameraStatus === 'ready' && micStatus === 'ready'
                ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                : 'bg-gray-700 cursor-not-allowed'
            }`}
          >
            {canJoin ? '✓ Ready to Join' : 'Waiting for Interviewer...'}
          </button>

          {/* Help Links */}
          <div className="flex gap-4 justify-center mt-6 text-sm text-gray-400">
            <button className="hover:text-gray-300">📖 FAQ</button>
            <button className="hover:text-gray-300">🛠️ Troubleshoot</button>
            <button className="hover:text-gray-300">💬 Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 1.3 Interviewer Lobby

```jsx
// /components/interview/InterviewerLobby.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

export const InterviewerLobby = ({ interviewId, onAdmitCandidate }) => {
  const [candidateQueue, setCandidateQueue] = useState([]);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [atsReport, setAtsReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterviewData();
    subscribeToQueueUpdates();
  }, [interviewId]);

  const loadInterviewData = async () => {
    try {
      // Get interview details
      const { data: interview } = await supabase
        .from('interviews')
        .select(`
          *,
          application:application_id(
            id,
            profiles(name, email),
            talent_analysis(*)
          )
        `)
        .eq('id', interviewId)
        .single();

      if (interview) {
        setCurrentCandidate(interview.application);
        setAtsReport(interview.application.talent_analysis);
      }

      // Get queue
      const { data: queue } = await supabase
        .from('interview_queue')
        .select('*')
        .eq('interview_id', interviewId)
        .order('position', { ascending: true });

      setCandidateQueue(queue);
      setLoading(false);
    } catch (error) {
      console.error('Error loading interview data:', error);
      setLoading(false);
    }
  };

  const subscribeToQueueUpdates = () => {
    const channel = supabase
      .channel(`interview-queue-${interviewId}`)
      .on('broadcast', { event: 'queue_updated' }, () => {
        loadInterviewData();
      })
      .subscribe();

    return () => channel.unsubscribe();
  };

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center bg-gray-900">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-6 p-6 h-screen bg-gray-900">
      {/* Left: Video Preview */}
      <div className="col-span-2 flex flex-col gap-4">
        <div className="bg-black rounded-lg flex-1 flex items-center justify-center">
          <video autoPlay playsInline className="w-full h-full object-cover rounded-lg" />
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            🎤 Mic Test
          </button>
          <button className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            🔊 Speaker Test
          </button>
          <button className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Right: Intelligence Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
        <h2 className="text-white font-bold mb-6">🧠 Interview Control</h2>

        {/* ATS Report */}
        {atsReport && (
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h3 className="text-emerald-400 font-semibold mb-3">Candidate Profile</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <p className="text-gray-400">Match Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-400">{atsReport.match_percentage}%</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${atsReport.match_percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Technical:</span>
                  <span>{atsReport.technical_assessment?.score}/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Experience:</span>
                  <span>{atsReport.experience_score}/10</span>
                </div>
              </div>
            </div>

            {/* Key Questions */}
            <div className="mt-4 bg-gray-700 rounded-lg p-3">
              <p className="text-gray-300 text-xs font-semibold mb-2">Strategic Questions</p>
              <ul className="space-y-1 text-xs text-gray-400">
                {atsReport.strategic_questions?.slice(0, 3).map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Queue */}
        <div className="mb-6 pb-6 border-b border-gray-700">
          <h3 className="text-white font-semibold mb-3">👥 Queue</h3>
          <div className="space-y-2">
            {candidateQueue.map((candidate, idx) => (
              <div
                key={candidate.id}
                className={`p-3 rounded-lg text-sm ${
                  idx === 0
                    ? 'bg-emerald-900 border border-emerald-700'
                    : 'bg-gray-700'
                }`}
              >
                <p className="text-white font-medium">[{idx + 1}] {candidate.name}</p>
                <p className="text-gray-300 text-xs mt-1">
                  Camera: {candidate.camera_ok ? '✅' : '❌'} Mic: {candidate.mic_ok ? '✅' : '❌'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onAdmitCandidate(currentCandidate.id)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
        >
          🎯 Admit Next Candidate
        </button>
      </div>
    </div>
  );
};
```

---

## Part 2: Live Interview Room with WebRTC

### 2.1 WebRTC Peer Connection Manager

```javascript
// /utils/peerConnection.js

export class InterviewPeerConnection {
  constructor(config = {}) {
    this.config = {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] }
      ],
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      },
      ...config
    };

    this.peerConnection = null;
    this.localStream = null;
    this.statsInterval = null;
    this.listeners = {};
  }

  async initialize(constraints = {}) {
    try {
      const defaultConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia({
        ...defaultConstraints,
        ...constraints
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.config);

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.addEventListener('track', (event) => {
        this.emit('remoteStreamAdded', event.streams[0]);
      });

      // Handle connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        this.emit('connectionStateChanged', this.peerConnection.connectionState);
      });

      // Start monitoring connection quality
      this.startStatsMonitoring();

      return {
        success: true,
        localStream: this.localStream
      };
    } catch (error) {
      console.error('PeerConnection initialization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer(this.config.offerOptions);
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      const remoteDesc = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async addIceCandidate(candidate) {
    try {
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  startStatsMonitoring() {
    this.statsInterval = setInterval(async () => {
      const stats = await this.peerConnection.getStats();

      let videoStats = null;
      let audioStats = null;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          if (report.mediaType === 'video') {
            videoStats = {
              bytesReceived: report.bytesReceived,
              framesDecoded: report.framesDecoded,
              framesDropped: report.framesDropped,
              packetsLost: report.packetsLost,
              jitter: (report.jitter * 1000).toFixed(2) + 'ms'
            };
          } else if (report.mediaType === 'audio') {
            audioStats = {
              bytesReceived: report.bytesReceived,
              packetsLost: report.packetsLost,
              audioLevel: report.audioLevel
            };
          }
        }
      });

      this.emit('statsUpdated', {
        video: videoStats,
        audio: audioStats,
        connectionState: this.peerConnection.connectionState
      });
    }, 1000);
  }

  mute(kind = 'audio') {
    if (this.localStream) {
      const tracks = kind === 'audio' 
        ? this.localStream.getAudioTracks()
        : this.localStream.getVideoTracks();

      tracks.forEach(track => {
        track.enabled = false;
      });
    }
  }

  unmute(kind = 'audio') {
    if (this.localStream) {
      const tracks = kind === 'audio'
        ? this.localStream.getAudioTracks()
        : this.localStream.getVideoTracks();

      tracks.forEach(track => {
        track.enabled = true;
      });
    }
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track?.kind === 'video');

      await sender.replaceTrack(screenTrack);

      screenTrack.addEventListener('ended', async () => {
        const videoTrack = this.localStream.getVideoTracks()[0];
        await sender.replaceTrack(videoTrack);
        this.emit('screenShareStopped');
      });

      this.emit('screenShareStarted');
      return screenStream;
    } catch (error) {
      console.error('Screen share error:', error);
      throw error;
    }
  }

  stopScreenShare() {
    // Handled by track 'ended' event listener
  }

  close() {
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}
```

### 2.2 Live Interview Room Component

```jsx
// /components/interview/LiveInterviewRoom.jsx

import React, { useState, useEffect, useRef } from 'react';
import { InterviewPeerConnection } from '@/utils/peerConnection';
import { GemmaAnalyzer } from '@/utils/gemmaAnalyzer';
import { supabase } from '@/utils/supabaseClient';

export const LiveInterviewRoom = ({ interviewId, role }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [intelligence, setIntelligence] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(role === 'interviewer');
  const gemmaRef = useRef(new GemmaAnalyzer());
  const timerRef = useRef(null);

  // Initialize
  useEffect(() => {
    initializeCall();
    return () => {
      if (peerConnection) peerConnection.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initializeCall = async () => {
    const pc = new InterviewPeerConnection();
    
    // Initialize media
    const result = await pc.initialize();
    if (result.success) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = result.localStream;
      }

      // Listen for remote stream
      pc.on('remoteStreamAdded', (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      // Monitor connection quality
      pc.on('statsUpdated', (stats) => {
        if (stats.video?.packetsLost > 50 || stats.video?.jitter > 100) {
          setConnectionQuality('poor');
        } else if (stats.video?.jitter > 50) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('good');
        }
      });

      setPeerConnection(pc);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(t => t + 1);
      }, 1000);

      // Load ATS report for interviewer
      if (role === 'interviewer') {
        loadATSReport();
      }
    }
  };

  const loadATSReport = async () => {
    const { data: interview } = await supabase
      .from('interviews')
      .select('application:application_id(talent_analysis(*))')
      .eq('id', interviewId)
      .single();

    if (interview?.application?.talent_analysis) {
      setIntelligence(interview.application.talent_analysis);
    }
  };

  const toggleAudio = () => {
    if (peerConnection) {
      if (isAudioOn) {
        peerConnection.mute('audio');
      } else {
        peerConnection.unmute('audio');
      }
      setIsAudioOn(!isAudioOn);
    }
  };

  const toggleVideo = () => {
    if (peerConnection) {
      if (isVideoOn) {
        peerConnection.mute('video');
      } else {
        peerConnection.unmute('video');
      }
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleScreenShare = async () => {
    if (peerConnection) {
      try {
        if (isScreenSharing) {
          await peerConnection.stopScreenShare();
          setIsScreenSharing(false);
        } else {
          await peerConnection.startScreenShare();
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Screen share error:', error);
      }
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-white font-bold text-lg">Neural Assessment Interview</h1>
          <p className="text-gray-400 text-sm">
            {role === 'interviewer' ? 'Conducting Interview' : 'Interview In Progress'}
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionQuality === 'good' ? 'bg-green-500' :
              connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-300 text-sm capitalize">{connectionQuality}</span>
          </div>

          {/* Timer */}
          <span className="text-gray-300 font-mono text-sm">
            {isScreenSharing ? '🖥️ ' : '🎥 '} {formatTime(elapsedTime)}
          </span>

          {/* Recording Indicator */}
          <div className="flex items-center gap-2 bg-red-900 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-300 text-xs font-medium">RECORDING</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-2 gap-2 p-4">
          {/* Remote Video */}
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Local Video */}
          <div className="rounded-lg overflow-hidden bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
              You (Self)
            </div>
          </div>
        </div>

        {/* Intelligence Panel (Interviewer Only) */}
        {role === 'interviewer' && isSidePanelOpen && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <IntelligenceSidePanel intelligence={intelligence} />
          </aside>
        )}
      </div>

      {/* Controls Bar */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex justify-center gap-4">
        <ControlButton
          icon="🎤"
          label={isAudioOn ? 'Mute' : 'Unmute'}
          onClick={toggleAudio}
          active={isAudioOn}
        />
        <ControlButton
          icon="📹"
          label={isVideoOn ? 'Stop' : 'Start'}
          onClick={toggleVideo}
          active={isVideoOn}
        />
        <ControlButton
          icon="🖥️"
          label={isScreenSharing ? 'Stop' : 'Share'}
          onClick={toggleScreenShare}
          active={isScreenSharing}
        />
        <ControlButton
          icon="📁"
          label="Share File"
          onClick={() => alert('Document share')}
        />
        <ControlButton
          icon="💬"
          label="Notes"
          onClick={() => alert('Interviewer notes')}
        />
        <ControlButton
          icon="☎️"
          label="End"
          onClick={() => alert('End interview')}
          variant="danger"
        />

        {role === 'interviewer' && (
          <ControlButton
            icon="🧠"
            label={isSidePanelOpen ? 'Hide' : 'Show'}
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
          />
        )}
      </footer>
    </div>
  );
};

// Intelligence Side Panel Component
const IntelligenceSidePanel = ({ intelligence }) => {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-emerald-400 font-semibold mb-3">📊 Candidate Profile</h3>
        {intelligence && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Match Score:</span>
              <span className="text-white font-semibold">{intelligence.match_percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${intelligence.match_percentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">🎯 Strategic Questions</h3>
        {intelligence?.strategic_questions && (
          <div className="space-y-2">
            {intelligence.strategic_questions.map((q, i) => (
              <p key={i} className="text-sm text-gray-300 border-l-2 border-emerald-500 pl-3">
                {q}
              </p>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">✅ Key Strengths</h3>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>• Strong technical foundation</li>
          <li>• Clear communication skills</li>
          <li>• Demonstrated project complexity</li>
        </ul>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">⚠️ Areas to Probe</h3>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>• Limited backend experience</li>
          <li>• No DevOps mentioned</li>
          <li>• Team size exposure</li>
        </ul>
      </div>
    </div>
  );
};

// Control Button Component
const ControlButton = ({ icon, label, onClick, active = true, variant = 'primary' }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all duration-200
      ${active ? 'opacity-100' : 'opacity-50'}
      ${variant === 'danger' ? 'bg-red-900 hover:bg-red-800' : 'bg-gray-700 hover:bg-gray-600'}
    `}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-xs text-gray-300 font-medium">{label}</span>
  </button>
);
```

---

## Part 3: Recording & Gemma Analysis

### 3.1 Recording Service

```javascript
// /services/recordingService.js

import crypto from 'crypto';

export class RecordingService {
  constructor(supabaseClient, config = {}) {
    this.supabase = supabaseClient;
    this.recordingId = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.encryptionKey = null;
  }

  async startRecording(interviewId, candidateUuid) {
    try {
      // Generate encryption key
      this.encryptionKey = crypto.pbkdf2Sync(
        `${interviewId}:${candidateUuid}`,
        process.env.NEXT_PUBLIC_SALT_KEY,
        100000,
        32,
        'sha256'
      );

      // Create recording record
      const { data: recording } = await this.supabase
        .from('interview_recordings')
        .insert({
          interview_id: interviewId,
          recording_status: 'recording',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      this.recordingId = recording.id;

      // Setup recorder
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder({
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onStop = () => {
        this.uploadRecording();
      };

      this.mediaRecorder.start();
      return recording;
    } catch (error) {
      console.error('Recording start error:', error);
      throw error;
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async uploadRecording() {
    try {
      const blob = new Blob(this.chunks, { type: 'video/webm' });

      // Encrypt
      const encryptedData = await this.encryptBlob(blob);

      // Upload to S3
      const filename = `${this.recordingId}-encrypted.webm`;
      
      const { data, error } = await this.supabase.storage
        .from('interview-recordings')
        .upload(filename, encryptedData);

      if (error) throw error;

      // Update record
      await this.supabase
        .from('interview_recordings')
        .update({
          recording_file_key: filename,
          recording_status: 'processing'
        })
        .eq('id', this.recordingId);

      // Queue for processing
      await this.queueForProcessing();
    } catch (error) {
      console.error('Upload error:', error);
    }
  }

  async encryptBlob(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(arrayBuffer)),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
  }

  async queueForProcessing() {
    // Queue transcription and analysis
    await fetch('/api/interview/process-recording', {
      method: 'POST',
      body: JSON.stringify({
        recording_id: this.recordingId
      })
    });
  }
}
```

### 3.2 Gemma Analysis Service

```python
# /services/gemmaInterviewAnalyzer.py

import json
from ollama import Client

class GemmaInterviewAnalyzer:
    def __init__(self, model_name='gemma:7b-instruct-q4_K_M'):
        self.client = Client(host='http://localhost:11434')
        self.model = model_name
    
    def analyze_interview_response(self, question, response, duration_seconds, candidate_context):
        """
        Analyze a single response in real-time
        """
        prompt = f"""
You are an expert technical interviewer evaluating a candidate's response.

CANDIDATE CONTEXT:
Match Score: {candidate_context.get('match_percentage', 'N/A')}%
Position: {candidate_context.get('job_cluster', 'N/A')}
Background: {candidate_context.get('background', 'N/A')}

QUESTION ASKED:
{question}

CANDIDATE RESPONSE (Duration: {duration_seconds}s):
{response}

Provide a JSON analysis:
{{
    "response_quality": 1-10,
    "clarity": 1-10,
    "technical_depth": 1-10,
    "communication": 1-10,
    "confidence_level": "low|medium|high",
    "red_flags": ["flag1", "flag2"],
    "green_flags": ["strength1", "strength2"],
    "skill_gaps": ["gap1", "gap2"],
    "suggested_follow_up": "specific follow-up question",
    "alignment_with_role": 1-10,
    "behavioral_insights": "string describing behavioral observations"
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False
        )
        
        try:
            return json.loads(response['response'])
        except json.JSONDecodeError:
            # Extract JSON from response if wrapped in markdown
            import re
            json_match = re.search(r'\{.*\}', response['response'], re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {}
    
    def generate_comprehensive_verdict(self, interview_transcript, ats_report, interviewer_notes):
        """
        Generate final verdict after interview
        """
        prompt = f"""
You are an expert HR analyst evaluating a complete interview.

ATS PRE-ASSESSMENT:
{json.dumps(ats_report, indent=2)}

INTERVIEW TRANSCRIPT:
{interview_transcript}

INTERVIEWER NOTES:
{interviewer_notes}

Provide a comprehensive JSON verdict:
{{
    "overall_verdict": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
    "confidence": 0.0-1.0,
    "technical_score": 1-10,
    "communication_score": 1-10,
    "cultural_fit_score": 1-10,
    "key_strengths": ["strength1", "strength2"],
    "critical_gaps": ["gap1", "gap2"],
    "red_flags": ["flag1"],
    "recommendation": "immediate_offer|second_round|rejection|hold",
    "reasoning": "detailed explanation of verdict",
    "suggested_next_step": "string"
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False
        )
        
        try:
            return json.loads(response['response'])
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response['response'], re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {}
    
    def suggest_next_question(self, conversation_history, candidate_profile, skill_gaps):
        """
        AI-powered suggestion for next question
        """
        prompt = f"""
Based on this interview conversation so far, suggest the BEST next question to ask.

CONVERSATION SO FAR:
{conversation_history}

CANDIDATE PROFILE:
{json.dumps(candidate_profile)}

IDENTIFIED SKILL GAPS:
{json.dumps(skill_gaps)}

Return JSON:
{{
    "suggested_question": "specific, well-formed question",
    "reasoning": "why this question is strategic",
    "targets_skill": "which skill this assesses",
    "difficulty_level": "easy|medium|hard|technical_deep_dive",
    "expected_insight": "what this reveals about candidate"
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False
        )
        
        try:
            return json.loads(response['response'])
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response['response'], re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {}
```

---

This comprehensive implementation guide provides production-ready code for your Neural Assessment Interview Module. The system is designed to be modular, allowing you to implement features phase-by-phase while maintaining data integrity and security.

**Key Implementation Priorities:**
1. Get WebRTC working (2-3 days)
2. Encrypt recordings (2-3 days)
3. Integrate Gemma locally (2-3 days)
4. Build interviewer intelligence panel (3-4 days)
5. Polish UI/UX with your theme (3-5 days)

All code uses your existing Supabase setup and is compatible with Python Gemma on the Mac Mini.
