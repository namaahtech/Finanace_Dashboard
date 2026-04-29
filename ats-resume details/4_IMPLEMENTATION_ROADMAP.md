# 4. Implementation Roadmap
## React + Supabase + Python Gemma4:e4b (7-Day Plan)

---

## **OVERVIEW**

This is a complete 7-day plan to build and deploy a fully functional automated recruitment system.

**Tech Stack:**
- Frontend: React + TypeScript
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Local Processing: Python + Gemma4:e4b (Ollama on Mac Mini)
- Deployment: Vercel (React) + Cloud (Supabase)

---

## **DAY 1: SETUP & FOUNDATION**

### **Goal:** Get all tools running + database schema ready

---

### **1.1 Mac Mini Setup (Local Processing)**

```bash
# Install Ollama
# Download from: https://ollama.ai

# Pull Gemma4 model
ollama pull gemma:2b  # Fast (500ms per analysis), lightweight

# Start Ollama server
ollama serve
# Server runs on: http://localhost:11434

# Test it works
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "gemma:2b",
  "prompt": "Hello world",
  "stream": false
}'

# Install Python dependencies
pip install supabase python-dotenv pytesseract pdf2image ollama

# Create .env file for Python service
echo "SUPABASE_URL=your_url" > python_service/.env
echo "SUPABASE_SERVICE_ROLE_KEY=your_key" >> python_service/.env
```

---

### **1.2 Supabase Setup (Cloud Backend)**

```bash
# Go to: https://supabase.com
# Create new project (choose Singapore or us-east for latency)
# Copy URL and Service Role Key

# Create tables using SQL Editor in Supabase dashboard:
# Copy-paste the schema below
```

**Supabase SQL Schema:**

```sql
-- Create job_clusters table
CREATE TABLE job_clusters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cluster_id TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  job_title_variants TEXT[] NOT NULL,
  mandatory_skills JSONB NOT NULL,
  preferred_skills JSONB,
  domain_knowledge JSONB NOT NULL,
  experience_requirements JSONB NOT NULL,
  education JSONB,
  match_weights JSONB NOT NULL,
  gemma_keywords TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_clusters_active ON job_clusters(active);
CREATE INDEX idx_clusters_company ON job_clusters(company);

-- Create applications table
CREATE TABLE applications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  application_id TEXT UNIQUE NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_dob DATE,
  applicant_location TEXT,
  applied_cluster_id TEXT NOT NULL REFERENCES job_clusters(cluster_id),
  resume_file_path TEXT,
  resume_file_size INT,
  raw_resume_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resume_uploaded_at TIMESTAMP,
  ocr_completed_at TIMESTAMP,
  gemma_analysis_started_at TIMESTAMP,
  gemma_analysis_completed_at TIMESTAMP,
  talent_analysis_ready_at TIMESTAMP
);

CREATE INDEX idx_apps_status ON applications(processing_status);
CREATE INDEX idx_apps_cluster ON applications(applied_cluster_id);
CREATE INDEX idx_apps_created ON applications(created_at DESC);

-- Create talent_analysis table
CREATE TABLE talent_analysis (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  application_id TEXT NOT NULL UNIQUE REFERENCES applications(application_id),
  cluster_id TEXT NOT NULL REFERENCES job_clusters(cluster_id),
  resume_profile JSONB NOT NULL,
  scoring JSONB NOT NULL,
  multi_cluster_fit JSONB,
  gap_analysis JSONB,
  recommendations JSONB,
  gemma_raw_response JSONB,
  gemma_processing_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_talent_app ON talent_analysis(application_id);
CREATE INDEX idx_talent_cluster ON talent_analysis(cluster_id);

-- Create Storage bucket for resumes
-- (Do this in Supabase UI: Storage → Create New Bucket → "recruitment-resumes")
```

**Supabase Auth Setup:**
```sql
-- Enable RLS
ALTER TABLE job_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_analysis ENABLE ROW LEVEL SECURITY;

-- Public can view job_clusters
CREATE POLICY "Public can view job clusters"
  ON job_clusters
  FOR SELECT
  USING (active = true);

-- Authenticated users can insert applications
CREATE POLICY "Users can insert applications"
  ON applications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own talent analysis (optional)
CREATE POLICY "Users can view their talent analysis"
  ON talent_analysis
  FOR SELECT
  USING (TRUE);
```

---

### **1.3 React Project Setup**

```bash
# Create React project
npx create-react-app recruitment-system --template typescript
cd recruitment-system

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-ui-react axios

# Create folder structure
mkdir -p src/{components,pages,lib,hooks,types}
mkdir -p python_service

# Create Supabase client
touch src/lib/supabase.ts
```

**src/lib/supabase.ts:**
```typescript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

**.env file:**
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

**Milestone Check:** ✅ Ollama running, Supabase project created, React project setup

---

## **DAY 2: CORE BACKEND & PYTHON SERVICE**

### **Goal:** Python service working, can extract resumes, call Gemma4

---

### **2.1 Python Service Structure**

```bash
cd python_service
mkdir -p {services,utils}
touch main.py ocr_service.py gemma_service.py supabase_client.py config.py requirements.txt
```

**requirements.txt:**
```
supabase==2.0.0
python-dotenv==1.0.0
pytesseract==0.3.10
pdf2image==1.17.1
Pillow==10.0.0
PyPDF2==4.0.0
fitz==0.0.1.dev2
pymupdf==1.23.0
ollama==0.1.0
python-dateutil==2.8.2
```

---

### **2.2 Main Polling Service**

**python_service/main.py** (already in architecture doc - copy it)

---

### **2.3 OCR Service**

**python_service/ocr_service.py:**
```python
import pytesseract
from pdf2image import convert_from_path
import fitz
import io

class ResumeOCRService:
    @staticmethod
    def extract_text(pdf_bytes):
        """Extract text from PDF bytes"""
        
        # Try PyMuPDF first (faster for text PDFs)
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            
            if len(text) > 100:
                return ResumeOCRService.clean_text(text)
        except:
            pass
        
        # Fall back to Tesseract (for scanned PDFs)
        try:
            images = convert_from_path(io.BytesIO(pdf_bytes), dpi=300)
            text = ""
            for image in images:
                text += pytesseract.image_to_string(image)
            return ResumeOCRService.clean_text(text)
        except Exception as e:
            raise Exception(f"OCR failed: {str(e)}")
    
    @staticmethod
    def clean_text(text):
        text = " ".join(text.split())
        replacements = {
            "Sr.": "Senior", "Jr.": "Junior",
            "B.Tech": "Bachelor of Technology"
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text
```

---

### **2.4 Gemma Service**

**python_service/gemma_service.py:**
```python
import ollama
import json
import time

class GemmaAnalysisService:
    def __init__(self):
        self.client = ollama.Client(host="http://localhost:11434")
        self.model = "gemma:2b"
    
    def analyze(self, resume_text, job_cluster):
        """Main analysis: extract skills → experience → domain → score"""
        
        start = time.time()
        
        # Step 1: Extract skills
        skills = self._prompt_skills(resume_text)
        
        # Step 2: Assess experience
        experience = self._prompt_experience(resume_text, job_cluster)
        
        # Step 3: Domain knowledge
        domain = self._prompt_domain(resume_text, job_cluster)
        
        # Step 4: Overall score
        overall = self._calculate_score(skills, experience, domain, job_cluster)
        
        return {
            "resume_profile": skills.get("resume_profile", {}),
            "scoring": overall,
            "gap_analysis": {"missing_skills": []},
            "recommendations": {"for_candidate": [], "for_recruiter": []},
            "gemma_response": {"skills": skills, "experience": experience},
            "processing_time": int((time.time() - start) * 1000)
        }
    
    def _prompt_skills(self, text):
        """Extract skills using Gemma4"""
        prompt = f"""Extract all technical skills from resume:
{text[:2000]}

Return JSON only:
{{"resume_profile": {{"technical_skills": [{{"skill": "name", "proficiency": "level", "years": 1}}]}}}}
"""
        return self._call_gemma(prompt)
    
    def _prompt_experience(self, text, job_cluster):
        """Assess experience"""
        prompt = f"""Rate experience in this resume:
{text[-1500:]}

Return JSON: {{"years_relevant": 2, "experience_match_score": 75}}
"""
        return self._call_gemma(prompt)
    
    def _prompt_domain(self, text, job_cluster):
        """Evaluate domain knowledge"""
        prompt = f"""Rate domain knowledge:
{text[500:2000]}

Return JSON: {{"overall_domain_score": 75}}
"""
        return self._call_gemma(prompt)
    
    def _call_gemma(self, prompt):
        """Call Ollama Gemma4"""
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                stream=False,
                temperature=0.2  # Lower temp = consistent JSON
            )
            text = response['response'].strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            return json.loads(text)
        except Exception as e:
            return {"error": str(e)}
    
    def _calculate_score(self, skills, experience, domain, job_cluster):
        """Weighted scoring"""
        weights = job_cluster.get('match_weights', {
            'technical_skills': 40,
            'domain_knowledge': 25,
            'experience_years': 20,
            'soft_skills': 10,
            'education': 5
        })
        
        tech = skills.get('resume_profile', {}).get('overall_skill_score', 50)
        exp = experience.get('experience_match_score', 50)
        dom = domain.get('overall_domain_score', 50)
        
        overall = (tech * 0.40 + exp * 0.20 + dom * 0.25)
        
        if overall >= 75:
            suit = "Highly Suitable"
        elif overall >= 60:
            suit = "Suitable"
        else:
            suit = "Not Suitable"
        
        return {
            "overall_match_percentage": round(overall, 1),
            "category_scores": {
                "technical_skills": {"score": tech, "weight": 40},
                "experience": {"score": exp, "weight": 20},
                "domain_knowledge": {"score": dom, "weight": 25}
            },
            "suitability": {
                "recommendation": suit,
                "confidence_level": 85
            }
        }
```

---

### **2.5 Test Python Service**

```bash
cd python_service

# Create test file
python -c "
from gemma_service import GemmaAnalysisService
service = GemmaAnalysisService()
result = service.analyze('I know Python, Kubernetes, Docker', {})
print(result)
"

# Should return JSON with scores within 5 seconds
```

**Milestone Check:** ✅ Python service works, Gemma4 responds, OCR extracts text

---

## **DAY 3: FRONTEND - CAREER PAGE & APPLICATION**

### **Goal:** Users can see jobs + upload resume + get application ID

---

### **3.1 Create Career Page**

**src/pages/CareerPage.tsx** (from architecture doc)

Key features:
- Load job clusters from Supabase
- Display as list/cards
- Apply form: name, email, DOB, phone, resume upload
- POST to Supabase on submit

### **3.2 Create Results Page**

**src/pages/ResultsPage.tsx:**
```typescript
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function ResultsPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const [status, setStatus] = useState('analyzing')
  
  useEffect(() => {
    // Poll for completion
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('talent_analysis')
        .select('*')
        .eq('application_id', applicationId)
        .single()
      
      if (data) {
        setStatus('ready')
        clearInterval(interval)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [applicationId])
  
  if (status === 'analyzing') {
    return <div className="p-8">Analyzing your resume... ⏳</div>
  }
  
  return <div className="p-8">Results ready! Redirecting...</div>
}
```

### **3.3 Setup React Router**

**src/App.tsx:**
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CareerPage from '@/pages/CareerPage'
import ResultsPage from '@/pages/ResultsPage'
import TalentDashboard from '@/components/TalentAnalysisDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CareerPage />} />
        <Route path="/results/:applicationId" element={<ResultsPage />} />
        <Route path="/analysis/:applicationId" element={<TalentDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Milestone Check:** ✅ Career page works, apply form submits, applications stored in Supabase

---

## **DAY 4: LOAD JOB CLUSTERS + PYTHON POLLING**

### **Goal:** Job clusters in DB, Python service polling + processing

---

### **4.1 Load Job Clusters into Supabase**

**python_service/load_clusters.py:**
```python
from supabase import create_client
import json
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

clusters = [
    {
        "cluster_id": "AWS-CloudInfra-DevOps",
        "company": "AWS",
        "job_title_variants": ["DevOps Engineer", "Cloud Engineer"],
        "mandatory_skills": json.dumps([
            {"skill": "Kubernetes", "importance": 8},
            {"skill": "Docker", "importance": 8},
            {"skill": "AWS EC2", "importance": 9},
            {"skill": "Terraform", "importance": 8}
        ]),
        "domain_knowledge": json.dumps([
            {"area": "Infrastructure Automation", "keywords": ["iac", "automation"]}
        ]),
        "experience_requirements": json.dumps({"years_required": 2}),
        "match_weights": json.dumps({
            "technical_skills": 40,
            "domain_knowledge": 25,
            "experience_years": 20,
            "soft_skills": 10,
            "education": 5
        }),
        "gemma_keywords": ["kubernetes", "docker", "terraform", "aws", "ci/cd"],
        "active": True
    },
    # Add more clusters...
]

for cluster in clusters:
    supabase.table('job_clusters').insert(cluster).execute()
    print(f"✅ Loaded {cluster['cluster_id']}")

print("All clusters loaded!")
```

Run:
```bash
python load_clusters.py
```

### **4.2 Start Python Polling Service**

```bash
# In separate terminal
cd python_service
python main.py

# Should output:
# "Starting polling service..."
# "Checking for pending applications every 30 seconds..."
```

**Milestone Check:** ✅ Job clusters in DB, Python service running, polling for applications

---

## **DAY 5: TALENT ANALYSIS DASHBOARD**

### **Goal:** Display full analysis results with scores, skills, gaps

---

### **5.1 Build Talent Dashboard Component**

**src/components/TalentAnalysisDashboard.tsx** (from architecture doc)

Key sections:
- Overall match % (large display)
- Category scores (4 charts)
- Technical skills table
- Work experience timeline
- Gap analysis
- Recommendations

### **5.2 Setup Realtime Subscription**

```typescript
useEffect(() => {
  const subscription = supabase
    .from('talent_analysis')
    .on('INSERT', (payload) => {
      if (payload.new.application_id === applicationId) {
        setAnalysis(payload.new)
      }
    })
    .subscribe()
  
  return () => subscription.unsubscribe()
}, [applicationId])
```

**Milestone Check:** ✅ Dashboard displays analysis results in realtime

---

## **DAY 6: END-TO-END TESTING**

### **Goal:** Full pipeline works: apply → OCR → Gemma4 → dashboard

---

### **6.1 Test with Sample Resume**

```bash
# Go to http://localhost:3000
# Click "AWS DevOps Engineer"
# Upload sample resume (from job_clusters_templates.md)
# Click "Submit"
# Watch Python service process it
# Should appear in dashboard within 5 minutes
```

### **6.2 Monitor Processing**

```bash
# Watch Python logs
tail -f python_service.log

# Check Supabase tables
# Query: SELECT * FROM applications WHERE processing_status = 'completed'
```

### **6.3 Test Multiple Resumes**

- Test 5 different resumes
- Verify scores are different
- Check Gemma4 accuracy
- Adjust prompts if needed

**Milestone Check:** ✅ Full pipeline works end-to-end

---

## **DAY 7: OPTIMIZATION & DEPLOYMENT**

### **Goal:** Production-ready, deployed, scalable

---

### **7.1 Optimize Python Service**

```python
# Increase batch processing (currently 1 at a time)
pending_apps = response.data  # Already limit(5)

# Add caching for job_clusters
@functools.lru_cache(maxsize=20)
def get_job_cluster(cluster_id):
    # Query once per cluster

# Add retry logic for Gemma4 failures
max_retries = 3
for attempt in range(max_retries):
    try:
        result = gemma_service.analyze(...)
        break
    except:
        time.sleep(5)  # Wait before retry
```

### **7.2 Deploy React to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard:
# REACT_APP_SUPABASE_URL
# REACT_APP_SUPABASE_ANON_KEY
```

### **7.3 Deploy Python Service on Mac Mini (Keep Running)**

```bash
# Create systemd service or use nohup
nohup python main.py > python_service.log 2>&1 &

# Or use supervisor:
# [program:gemma_service]
# command=/usr/bin/python /path/to/main.py
# autostart=true
# autorestart=true
```

### **7.4 Monitor & Logging**

```python
# Add to main.py
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'python_service.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
logger.addHandler(handler)
```

### **7.5 Set Up Alerts**

```python
# Email on failed processing
import smtplib

def send_alert(app_id, error):
    # Send email to your inbox
    # "Application {app_id} failed: {error}"
```

**Milestone Check:** ✅ Live at your domain, running in production

---

## **COMPLETE CHECKLIST**

### **Day 1: Setup**
- [ ] Ollama installed, Gemma:2b running
- [ ] Supabase project created, tables created
- [ ] React project scaffolded
- [ ] .env files configured

### **Day 2: Backend**
- [ ] Python service: main.py, ocr_service.py, gemma_service.py
- [ ] OCR working (extract PDF text)
- [ ] Gemma4 responding to prompts
- [ ] JSON parsing working

### **Day 3: Frontend Basic**
- [ ] Career page shows job clusters
- [ ] Apply form submits
- [ ] Applications saved to Supabase
- [ ] Results page redirects properly

### **Day 4: Integration**
- [ ] Job clusters loaded to Supabase
- [ ] Python service polling running
- [ ] Can detect pending applications

### **Day 5: Display**
- [ ] Talent dashboard renders
- [ ] Realtime updates working
- [ ] All sections displaying (scores, skills, gaps)

### **Day 6: Testing**
- [ ] End-to-end: apply → OCR → Gemma4 → dashboard
- [ ] Processing time < 5 minutes
- [ ] 5+ test resumes processed successfully
- [ ] Scores validated

### **Day 7: Production**
- [ ] React deployed to Vercel
- [ ] Python service running permanently
- [ ] Logging & monitoring setup
- [ ] Custom domain configured

---

## **TROUBLESHOOTING QUICK REFERENCE**

| Problem | Solution |
|---------|----------|
| Gemma4 not responding | Check Ollama: `curl http://localhost:11434/api/tags` |
| Python service stuck | Check logs, restart: `pkill -f main.py` |
| Resume not extracted | Check PDF format, file size < 5MB |
| Supabase connection fails | Verify URL + API key in .env |
| React not updating | Check realtime subscription, browser console errors |
| Scores very low | Adjust Gemma4 temperature, test prompts individually |

---

## **METRICS TO TRACK**

- **Processing speed:** Resume → analysis (target: 3-5 min)
- **Gemma4 accuracy:** % of "Highly Suitable" who succeed
- **Uptime:** Python service availability
- **Error rate:** Failed applications
- **Recruiter feedback:** Are recommendations useful?

---

## **SUCCESS = READY FOR ANTGRAVITY**

When you reach Day 7:
✅ Full recruitment pipeline working
✅ Deployed and live
✅ Processing applications in background
✅ HR dashboard shows complete analysis

**This is production-ready. Pass to AntiGravity agent for fine-tuning & scaling.**

---

## **NEXT ITERATION (After Day 7)**

Once working:
1. Add more job clusters (expand to 20)
2. Improve Gemma4 prompts (A/B test accuracy)
3. Multi-cluster matching (suggest other suitable roles)
4. Resume parsing (extract structured data)
5. Email notifications (when analysis ready)
6. Admin dashboard (for HR team)
7. Candidate feedback form (improve model)

---

**You're building a SaaS recruitment platform. This is legitimate business. 🚀**
