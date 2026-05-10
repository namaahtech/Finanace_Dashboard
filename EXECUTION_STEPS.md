# Namaah Nexus — Local Execution Guide

This document provides the exact commands to run in each PowerShell terminal to start the system.

---

## 🟢 Terminal 1: Frontend (Next.js Dashboard)
**Location**: Project Root
```powershell
PS D:\Finanace_Dashboard> npm run dev
```
- **Access**: [http://localhost:3000](http://localhost:3000)

---

## 🟠 Terminal 2: LiveKit Server (Real-time Video/Audio)
**Note**: You must run the executable from its specific folder.
```powershell
PS D:\Finanace_Dashboard> cd D:\livekit_1.11.0_windows_amd64\
PS D:\livekit_1.11.0_windows_amd64> .\livekit-server.exe --dev
```
- **Status**: Handles all video/audio calls. Keep this running.

---

## 🔵 Terminal 3: LiveKit Bridge (Ngrok Tunnel)
**Location**: Project Root
```powershell
PS D:\Finanace_Dashboard> npm run bridge
```
- **Purpose**: Connects your local server to the internet. Updates `.env.local` automatically.

---

## 🟡 Terminal 4: AI Intelligence Service (Resume Scanner)
**Location**: `python_service` folder
```powershell
PS D:\Finanace_Dashboard> cd python_service
PS D:\Finanace_Dashboard\python_service> ..\.venv\Scripts\activate
PS D:\Finanace_Dashboard\python_service> python main.py
```
- **Function**: Scans resumes using Gemma 4 model.

---

## 🧪 Terminal 5 (Optional): Seed Data
If you need to reset or add test users:
```powershell
PS D:\Finanace_Dashboard> npm run seed
```

---

## 📋 Summary of URLs
- **Main App**: `http://localhost:3000`
- **LiveKit Local**: `http://localhost:7880`
- **Ngrok Dashboard**: `http://127.0.0.1:4040` (to monitor the bridge)
