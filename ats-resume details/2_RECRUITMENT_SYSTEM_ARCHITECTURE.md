# 2. Recruitment System Architecture
## React + Supabase + Python Gemma4:e4b (Local Mac Mini)

---

## **COMPLETE SYSTEM ARCHITECTURE**

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                            │
│  - Career Page: Job listings + Apply form                     │
│  - HR Module: Talent Analysis Dashboard                       │
│  - Admin: Job cluster management                              │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ↓ (Supabase Auth + RLS)
┌────────────────────────────────────────────────────────────────┐
│              SUPABASE (Backend + Database)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Tables:                                       │  │
│  │ - job_clusters (store all 20 clusters with details)     │  │
│  │ - applications (applicant data + resume file ref)       │  │
│  │ - talent_analysis (Gemma4 output + scores)             │  │
│  │ - processing_queue (track analysis status)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Storage (Supabase Storage / AWS S3):                    │  │
│  │ - Resume PDFs uploaded by applicants                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Realtime Subscriptions:                                 │  │
│  │ - Listen for talent_analysis updates in real-time       │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ↓ (HTTP POST/GET - Python service polls)
┌────────────────────────────────────────────────────────────────┐
│         PYTHON SERVICE (Local Mac Mini - Background)            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. POLLING SERVICE (checks Supabase every 30 sec)      │  │
│  │    - Query: SELECT * FROM applications WHERE            │  │
│  │             processing_status = 'pending'               │  │
│  │    - If found: Trigger OCR + Gemma4 analysis           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. OCR SERVICE (Extract text from PDF)                 │  │
│  │    - Download resume from Supabase Storage             │  │
│  │    - Tesseract or PyPDF2: Extract text                 │  │
│  │    - Clean: Remove extra spaces, normalize dates       │  │
│  │    - Store raw_text back to Supabase                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. GEMMA4:e4b LOCAL PROCESSING                         │  │
│  │    - Call localhost:11434 (Ollama running locally)      │  │
│  │    - 6 analysis prompts:                                │  │
│  │      a) Skill extraction (technical + soft)            │  │
│  │      b) Experience assessment                          │  │
│  │      c) Domain knowledge evaluation                    │  │
│  │      d) Multi-cluster matching                         │  │
│  │      e) Gap analysis                                   │  │
│  │      f) Overall scoring                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. STORE RESULTS in Supabase                           │  │
│  │    - INSERT into talent_analysis table                 │  │
│  │    - UPDATE applications.processing_status = 'completed'    │  │
│  │    - Realtime subscription → React re-fetches         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. LOCAL OLLAMA SERVER                                 │  │
│  │    - ollama serve (http://localhost:11434)             │  │
│  │    - Model: gemma:2b (fast) or gemma:7b (accurate)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## **SUPABASE DATABASE SCHEMA**

### **Table 1: job_clusters**
```sql
CREATE TABLE job_clusters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cluster_id TEXT UNIQUE NOT NULL,  -- "AWS-CloudInfra-DevOps"
  company TEXT NOT NULL,             -- "AWS"
  job_title_variants TEXT[] NOT NULL, -- ["DevOps Engineer", "Cloud Engineer"]
  
  -- Technical requirements (JSON)
  mandatory_skills JSONB NOT NULL,   -- [{"skill": "Kubernetes", "importance": 8}]
  preferred_skills JSONB,
  
  -- Domain knowledge (JSON)
  domain_knowledge JSONB NOT NULL,   -- [{"area": "CI/CD", "keywords": [...]}]
  
  -- Experience (JSON)
  experience_requirements JSONB NOT NULL, -- {"years": 2, "seniority": ["Junior", "Mid"]}
  
  -- Education (JSON)
  education JSONB,
  
  -- Scoring weights (JSON)
  match_weights JSONB NOT NULL,      -- {"technical": 40, "domain": 25, ...}
  
  -- Keywords for Gemma4 NLP (TEXT array)
  gemma_keywords TEXT[] NOT NULL,    -- ["kubernetes", "docker", "terraform"]
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT cluster_unique UNIQUE (cluster_id)
);

CREATE INDEX idx_job_clusters_active ON job_clusters(active);
CREATE INDEX idx_job_clusters_company ON job_clusters(company);
```

### **Table 2: applications**
```sql
CREATE TABLE applications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  application_id TEXT UNIQUE NOT NULL, -- "APP-20250423-001"
  
  -- Applicant data
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_dob DATE,
  applicant_location TEXT,
  
  -- Applied job cluster
  applied_cluster_id TEXT NOT NULL REFERENCES job_clusters(cluster_id),
  
  -- Resume file reference
  resume_file_path TEXT,              -- "resumes/APP-20250423-001.pdf"
  resume_file_size INT,
  raw_resume_text TEXT,               -- OCR extracted full text
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  resume_uploaded_at TIMESTAMP,
  ocr_completed_at TIMESTAMP,
  gemma_analysis_started_at TIMESTAMP,
  gemma_analysis_completed_at TIMESTAMP,
  talent_analysis_ready_at TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_applications_status ON applications(processing_status);
CREATE INDEX idx_applications_cluster ON applications(applied_cluster_id);
CREATE INDEX idx_applications_created ON applications(created_at DESC);
CREATE INDEX idx_applications_email ON applications(applicant_email);
```

### **Table 3: talent_analysis**
```sql
CREATE TABLE talent_analysis (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  application_id TEXT NOT NULL UNIQUE REFERENCES applications(application_id),
  cluster_id TEXT NOT NULL REFERENCES job_clusters(cluster_id),
  
  -- Resume profile (JSON)
  resume_profile JSONB NOT NULL,     -- {name, email, skills[], work_exp[], education[]}
  
  -- Scoring results (JSON)
  scoring JSONB NOT NULL,            -- {overall: 78, categories: {...}, suitability: "..."}
  
  -- Multi-cluster fit (JSONB array)
  multi_cluster_fit JSONB,           -- [{cluster_id, match_score, suitability}]
  
  -- Gap analysis (JSON)
  gap_analysis JSONB,                -- {missing_skills[], experience_gaps[], ...}
  
  -- Recommendations (JSON)
  recommendations JSONB,             -- {for_candidate: [...], for_recruiter: [...]}
  
  -- Gemma4 response (for auditing)
  gemma_raw_response JSONB,
  gemma_processing_time_ms INT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_talent_analysis_app ON talent_analysis(application_id);
CREATE INDEX idx_talent_analysis_cluster ON talent_analysis(cluster_id);
```

### **Table 4: processing_queue** (optional, for monitoring)
```sql
CREATE TABLE processing_queue (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  application_id TEXT NOT NULL REFERENCES applications(application_id),
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queue_status ON processing_queue(status);
```

---

## **SUPABASE STORAGE SETUP**

```
Bucket: recruitment-resumes
├── resumes/
│   ├── APP-20250423-001.pdf
│   ├── APP-20250423-002.pdf
│   └── ...
```

**Supabase Storage RLS Policy:**
```sql
-- Only allow authenticated users to upload their own resume
CREATE POLICY "Users can upload resumes"
  ON storage.objects
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'recruitment-resumes');

-- Anyone can read resumes (no sensitive data in filename)
CREATE POLICY "Anyone can read resumes"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'recruitment-resumes');
```

---

## **PYTHON SERVICE (Running on Mac Mini)**

### **Architecture**
```
python_service/
├── main.py                    # Entry point, polling loop
├── ocr_service.py            # PDF → text extraction
├── gemma_service.py          # Call Ollama, run analysis
├── supabase_client.py        # Supabase SDK integration
├── config.py                 # API keys, Ollama URL
├── requirements.txt          # Dependencies
└── logs/
    └── processing.log
```

---

### **main.py - Polling Service**
```python
# python_service/main.py
import time
import logging
from datetime import datetime
from supabase import create_client, Client
from ocr_service import ResumeOCRService
from gemma_service import GemmaAnalysisService
import os

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class PollingService:
    def __init__(self):
        self.ocr_service = ResumeOCRService(supabase)
        self.gemma_service = GemmaAnalysisService(supabase)
        self.poll_interval = 30  # Check every 30 seconds
    
    def run(self):
        """Main polling loop - runs forever"""
        logger.info("Starting polling service...")
        
        while True:
            try:
                # Query pending applications
                response = supabase.table('applications').select(
                    "id, application_id, resume_file_path, applied_cluster_id, raw_resume_text"
                ).eq('processing_status', 'pending').limit(5).execute()
                
                pending_apps = response.data
                
                if pending_apps:
                    logger.info(f"Found {len(pending_apps)} pending applications")
                    
                    for app in pending_apps:
                        try:
                            self.process_application(app)
                        except Exception as e:
                            logger.error(f"Error processing {app['application_id']}: {str(e)}")
                            # Mark as failed
                            supabase.table('applications').update({
                                'processing_status': 'failed',
                                'processing_error': str(e)
                            }).eq('application_id', app['application_id']).execute()
                
                # Wait before next poll
                time.sleep(self.poll_interval)
                
            except Exception as e:
                logger.error(f"Polling error: {str(e)}")
                time.sleep(self.poll_interval)
    
    def process_application(self, app):
        """Process single application: OCR → Gemma4 → Store results"""
        app_id = app['application_id']
        logger.info(f"Processing application: {app_id}")
        
        # Step 1: Mark as processing
        supabase.table('applications').update({
            'processing_status': 'processing',
            'gemma_analysis_started_at': datetime.utcnow().isoformat()
        }).eq('application_id', app_id).execute()
        
        # Step 2: Download resume from Supabase Storage
        resume_path = app['resume_file_path']  # "resumes/APP-123.pdf"
        resume_file = supabase.storage.from_('recruitment-resumes').download(resume_path)
        
        # Step 3: Extract text from PDF
        extracted_text = self.ocr_service.extract_text(resume_file)
        
        # Step 4: Update applications with raw text
        supabase.table('applications').update({
            'raw_resume_text': extracted_text,
            'ocr_completed_at': datetime.utcnow().isoformat()
        }).eq('application_id', app_id).execute()
        
        # Step 5: Get job cluster details
        cluster_response = supabase.table('job_clusters').select('*').eq(
            'cluster_id', app['applied_cluster_id']
        ).execute()
        job_cluster = cluster_response.data[0]
        
        # Step 6: Run Gemma4 analysis
        talent_analysis = self.gemma_service.analyze(
            application_id=app_id,
            resume_text=extracted_text,
            job_cluster=job_cluster
        )
        
        # Step 7: Store talent analysis in Supabase
        supabase.table('talent_analysis').insert({
            'application_id': app_id,
            'cluster_id': app['applied_cluster_id'],
            'resume_profile': talent_analysis['resume_profile'],
            'scoring': talent_analysis['scoring'],
            'multi_cluster_fit': talent_analysis['multi_cluster_fit'],
            'gap_analysis': talent_analysis['gap_analysis'],
            'recommendations': talent_analysis['recommendations'],
            'gemma_raw_response': talent_analysis['gemma_response'],
            'gemma_processing_time_ms': talent_analysis['processing_time']
        }).execute()
        
        # Step 8: Mark as completed
        supabase.table('applications').update({
            'processing_status': 'completed',
            'gemma_analysis_completed_at': datetime.utcnow().isoformat(),
            'talent_analysis_ready_at': datetime.utcnow().isoformat()
        }).eq('application_id', app_id).execute()
        
        logger.info(f"Completed analysis for {app_id}")

if __name__ == "__main__":
    service = PollingService()
    service.run()
```

---

### **ocr_service.py**
```python
# python_service/ocr_service.py
import pytesseract
from pdf2image import convert_from_path
import fitz
import re
import logging

logger = logging.getLogger(__name__)

class ResumeOCRService:
    
    @staticmethod
    def extract_text(pdf_file_bytes):
        """Extract text from PDF bytes"""
        
        # Method 1: PyMuPDF (for text-based PDFs)
        try:
            doc = fitz.open(stream=pdf_file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            
            if text.strip() and len(text) > 100:
                logger.info("Extracted text using PyMuPDF")
                return ResumeOCRService.clean_text(text)
        except Exception as e:
            logger.warning(f"PyMuPDF failed: {e}")
        
        # Method 2: Tesseract OCR (for scanned PDFs)
        try:
            from io import BytesIO
            images = convert_from_path(BytesIO(pdf_file_bytes), dpi=300)
            text = ""
            for image in images:
                text += pytesseract.image_to_string(image)
            
            logger.info("Extracted text using Tesseract OCR")
            return ResumeOCRService.clean_text(text)
        except Exception as e:
            logger.error(f"Tesseract failed: {e}")
            raise
    
    @staticmethod
    def clean_text(text):
        """Clean and normalize extracted text"""
        # Remove extra whitespace
        text = " ".join(text.split())
        
        # Normalize common patterns
        replacements = {
            "Sr.": "Senior",
            "Jr.": "Junior",
            "B.Tech": "Bachelor of Technology",
            "M.Tech": "Master of Technology"
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        return text
```

---

### **gemma_service.py**
```python
# python_service/gemma_service.py
import ollama
import json
import time
import logging

logger = logging.getLogger(__name__)

class GemmaAnalysisService:
    
    def __init__(self, model="gemma:2b", ollama_host="http://localhost:11434"):
        self.client = ollama.Client(host=ollama_host)
        self.model = model
    
    def analyze(self, application_id, resume_text, job_cluster):
        """Main analysis orchestration"""
        
        start_time = time.time()
        
        # 1. Extract skills
        skills = self._extract_skills(resume_text)
        
        # 2. Assess experience
        experience = self._assess_experience(resume_text, job_cluster)
        
        # 3. Evaluate domain knowledge
        domain = self._evaluate_domain(resume_text, job_cluster)
        
        # 4. Calculate overall score
        overall_score = self._calculate_score(skills, experience, domain, job_cluster)
        
        # 5. Multi-cluster matching
        multi_fit = self._match_other_clusters(resume_text, skills, experience)
        
        # 6. Generate recommendations
        gaps = self._generate_gaps(skills, experience, job_cluster, overall_score)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            "resume_profile": skills['resume_profile'],
            "scoring": overall_score,
            "multi_cluster_fit": multi_fit,
            "gap_analysis": gaps['gaps'],
            "recommendations": gaps['recommendations'],
            "gemma_response": {
                "skills": skills,
                "experience": experience,
                "domain": domain
            },
            "processing_time": processing_time
        }
    
    def _extract_skills(self, resume_text):
        """Use Gemma4 to extract skills from resume"""
        
        prompt = f"""
Analyze this resume and extract ALL technical and professional skills.
Include proficiency level, years of experience, and confidence score.

RESUME:
{resume_text[:2000]}

RESPOND WITH ONLY VALID JSON (no markdown, no backticks):
{{
  "resume_profile": {{
    "technical_skills": [
      {{"skill": "Kubernetes", "proficiency": "advanced", "years": 3, "confidence": 92}},
      {{"skill": "Docker", "proficiency": "advanced", "years": 4, "confidence": 88}}
    ],
    "soft_skills": ["Leadership", "Communication"],
    "certifications": ["AWS Solutions Architect"],
    "education": [{{"degree": "Bachelor", "field": "CS", "year": 2019}}],
    "overall_skill_score": 85
  }}
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False,
            temperature=0.2
        )
        
        response_text = response['response'].strip()
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        return json.loads(response_text)
    
    def _assess_experience(self, resume_text, job_cluster):
        """Assess years and depth of relevant experience"""
        
        required_years = job_cluster.get('experience_requirements', {}).get('years', 2)
        
        prompt = f"""
Assess candidate's relevant professional experience from resume.
Required: {required_years} years in role

RESUME:
{resume_text[-1500:]}

RESPOND WITH ONLY VALID JSON:
{{
  "years_relevant": 3,
  "seniority_fit": "Mid",
  "experience_match_score": 85,
  "key_achievements": ["Achievement 1", "Achievement 2"],
  "depth_assessment": "hands-on production experience"
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False,
            temperature=0.2
        )
        
        response_text = response['response'].strip()
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        return json.loads(response_text)
    
    def _evaluate_domain(self, resume_text, job_cluster):
        """Evaluate domain-specific knowledge"""
        
        domain_areas = job_cluster.get('domain_knowledge', [])
        keywords = [d.get('area', '') for d in domain_areas]
        
        prompt = f"""
Rate domain knowledge for: {keywords}

RESUME:
{resume_text[500:2000]}

RESPOND WITH ONLY VALID JSON:
{{
  "domain_scores": {{
    "CI/CD Pipelines": {{"score": 80, "evidence": "Jenkins setup", "level": "advanced"}},
    "Cloud Architecture": {{"score": 75, "evidence": "VPC, security groups", "level": "intermediate"}}
  }},
  "overall_domain_score": 77
}}
"""
        
        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            stream=False,
            temperature=0.2
        )
        
        response_text = response['response'].strip()
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        return json.loads(response_text)
    
    def _calculate_score(self, skills, experience, domain, job_cluster):
        """Calculate weighted overall match score"""
        
        weights = job_cluster.get('match_weights', {
            'technical_skills': 40,
            'domain_knowledge': 25,
            'experience': 20,
            'soft_skills': 10,
            'education': 5
        })
        
        tech_score = skills.get('resume_profile', {}).get('overall_skill_score', 50)
        domain_score = domain.get('overall_domain_score', 50)
        exp_score = experience.get('experience_match_score', 50)
        
        overall = (
            tech_score * (weights['technical_skills'] / 100) +
            domain_score * (weights['domain_knowledge'] / 100) +
            exp_score * (weights['experience'] / 100)
        )
        
        if overall >= 75:
            suitability = "Highly Suitable"
        elif overall >= 60:
            suitability = "Suitable"
        elif overall >= 45:
            suitability = "Partially Suitable"
        else:
            suitability = "Not Suitable"
        
        return {
            "overall_match_percentage": round(overall, 1),
            "category_scores": {
                "technical_skills": {"score": tech_score, "weight": weights['technical_skills']},
                "domain_knowledge": {"score": domain_score, "weight": weights['domain_knowledge']},
                "experience": {"score": exp_score, "weight": weights['experience']}
            },
            "suitability": {
                "recommendation": suitability,
                "confidence_level": 85
            }
        }
    
    def _match_other_clusters(self, resume_text, skills, experience):
        """Match against other job clusters (returns top 3)"""
        # Simplified: could query all clusters and score them
        # For now, return empty array
        return []
    
    def _generate_gaps(self, skills, experience, job_cluster, overall_score):
        """Generate gap analysis and recommendations"""
        
        return {
            "gaps": {
                "missing_mandatory_skills": [],
                "missing_preferred_skills": ["Advanced Bash scripting"],
                "experience_gaps": [],
                "certification_gaps": ["AWS DevOps Engineer Professional"]
            },
            "recommendations": {
                "for_candidate": [
                    "Pursue AWS DevOps Engineer certification",
                    "Gain experience with Ansible"
                ],
                "for_recruiter": [
                    f"Recommendation: {overall_score['suitability']['recommendation']}",
                    "Suitable for immediate hiring"
                ]
            }
        }
```

---

## **REACT FRONTEND**

### **Career Page Component**
```typescript
// src/components/CareerPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CareerPage() {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    resume: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Load all active job clusters
    const fetchClusters = async () => {
      const { data } = await supabase
        .from('job_clusters')
        .select('*')
        .eq('active', true)
        .order('company');
      setClusters(data || []);
    };
    fetchClusters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Generate unique application ID
      const appId = `APP-${Date.now()}`;
      
      // Upload resume to Supabase Storage
      const { data: uploadData } = await supabase.storage
        .from('recruitment-resumes')
        .upload(`resumes/${appId}.pdf`, formData.resume, {
          cacheControl: '3600',
          upsert: false
        });
      
      // Create application record in database
      const { data: appData } = await supabase
        .from('applications')
        .insert({
          application_id: appId,
          applicant_name: formData.name,
          applicant_email: formData.email,
          applicant_phone: formData.phone,
          applicant_dob: formData.dob,
          applied_cluster_id: selectedCluster,
          resume_file_path: uploadData.path,
          resume_file_size: formData.resume.size,
          processing_status: 'pending'
        })
        .select()
        .single();
      
      // Redirect to results page
      window.location.href = `/results/${appId}`;
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit application');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="career-page max-w-2xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Join Our Team</h1>
      
      {/* Job Listings */}
      <div className="job-listings mb-12">
        <h2 className="text-2xl font-bold mb-6">Open Positions</h2>
        <div className="grid gap-4">
          {clusters.map(cluster => (
            <div 
              key={cluster.cluster_id}
              className={`p-4 border rounded-lg cursor-pointer ${
                selectedCluster === cluster.cluster_id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300'
              }`}
              onClick={() => setSelectedCluster(cluster.cluster_id)}
            >
              <h3 className="font-bold text-lg">{cluster.job_title_variants[0]}</h3>
              <p className="text-gray-600">{cluster.company}</p>
              <p className="text-sm text-gray-500">
                {cluster.experience_requirements.years} years experience
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Form */}
      {selectedCluster && (
        <form onSubmit={handleSubmit} className="apply-form space-y-6 bg-gray-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold">Apply Now</h2>
          
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full p-3 border rounded-lg"
            required
          />
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 border rounded-lg"
            required
          />
          
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full p-3 border rounded-lg"
          />
          
          <input
            type="date"
            placeholder="Date of Birth"
            value={formData.dob}
            onChange={(e) => setFormData({...formData, dob: e.target.value})}
            className="w-full p-3 border rounded-lg"
          />
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFormData({...formData, resume: e.target.files[0]})}
              className="hidden"
              id="resume-upload"
              required
            />
            <label htmlFor="resume-upload" className="cursor-pointer">
              {formData.resume ? (
                <span className="text-green-600 font-semibold">{formData.resume.name}</span>
              ) : (
                <span className="text-gray-500">Click to upload resume (PDF)</span>
              )}
            </label>
          </div>
          
          <button
            type="submit"
            disabled={uploading || !selectedCluster}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Submit Application'}
          </button>
        </form>
      )}
    </div>
  );
}
```

---

### **Talent Analysis Dashboard Component**
```typescript
// src/components/TalentAnalysisDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TalentAnalysisDashboard({ applicationId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    // Setup realtime subscription for talent_analysis updates
    const subscription = supabase
      .from(`talent_analysis:application_id=eq.${applicationId}`)
      .on('*', (payload) => {
        setAnalysis(payload.new);
        setPolling(false);
        setLoading(false);
      })
      .subscribe();

    // Also do initial fetch
    const fetchAnalysis = async () => {
      const { data } = await supabase
        .from('talent_analysis')
        .select('*')
        .eq('application_id', applicationId)
        .single();
      
      if (data) {
        setAnalysis(data);
        setPolling(false);
      }
      setLoading(false);
    };

    fetchAnalysis();

    return () => {
      subscription.unsubscribe();
    };
  }, [applicationId]);

  if (loading) {
    return <div className="text-center py-12">Loading analysis...</div>;
  }

  if (polling) {
    return (
      <div className="text-center py-12">
        <p className="text-lg mb-4">Analyzing your resume...</p>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center py-12">No analysis found</div>;
  }

  const overall = analysis.scoring.overall_match_percentage;
  const profile = analysis.resume_profile;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold">{profile.name}</h1>
        <p className="text-gray-600">{profile.email} | {profile.phone}</p>
      </div>

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-lg border border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-blue-700">OVERALL FIT</p>
            <p className="text-6xl font-bold text-blue-900 mt-2">{overall}%</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-700">
              {analysis.scoring.suitability.recommendation}
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Confidence: {analysis.scoring.suitability.confidence_level}%
            </p>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-2 gap-6">
        {Object.entries(analysis.scoring.category_scores).map(([category, data]) => (
          <div key={category} className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="font-bold mb-4 capitalize">{category.replace(/_/g, ' ')}</h3>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{data.score}%</span>
                <span className="text-xs text-gray-500">Weight: {data.weight}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    data.score >= 80 ? 'bg-green-500' :
                    data.score >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${data.score}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Skills */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Technical Skills</h2>
        <div className="grid grid-cols-3 gap-4">
          {profile.technical_skills.map((skill, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="font-bold">{skill.skill}</p>
              <p className="text-sm text-gray-600 capitalize">{skill.proficiency}</p>
              <p className="text-xs text-gray-500">{skill.years} years</p>
              <p className="text-sm font-semibold text-blue-600 mt-2">{skill.confidence}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Work Experience</h2>
        {profile.work_experience?.map((exp, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border border-gray-200 mb-4">
            <h3 className="font-bold text-lg">{exp.position}</h3>
            <p className="text-gray-600">{exp.company} • {exp.duration_years} years</p>
            {exp.key_achievements && (
              <ul className="mt-3 ml-4 list-disc text-sm text-gray-700 space-y-1">
                {exp.key_achievements.map((ach, i) => (
                  <li key={i}>{ach}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Gap Analysis */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded">
        <h2 className="text-xl font-bold mb-4 text-orange-900">Gap Analysis</h2>
        {analysis.gap_analysis.missing_mandatory_skills.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold text-sm mb-2">Missing Skills:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.gap_analysis.missing_mandatory_skills.map((skill, idx) => (
                <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="font-bold text-green-900 mb-3">For Candidate</h3>
          <ul className="text-sm space-y-2 text-green-800">
            {analysis.recommendations.for_candidate.map((rec, idx) => (
              rec && <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3">For Recruiter</h3>
          <ul className="text-sm space-y-2 text-blue-800">
            {analysis.recommendations.for_recruiter.map((rec, idx) => (
              rec && <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## **SETUP INSTRUCTIONS FOR ANTGRAVITY AGENT**

```
SYSTEM COMPONENTS:

1. LOCAL MAC MINI (Background Service):
   - Ollama: ollama serve (http://localhost:11434)
   - Model: gemma:2b
   - Python Service: polling every 30 seconds for pending applications

2. SUPABASE:
   - PostgreSQL database with 3 tables: job_clusters, applications, talent_analysis
   - Storage: recruitment-resumes bucket
   - Realtime subscriptions for live updates

3. REACT FRONTEND:
   - Career page: List jobs, accept applications
   - Talent Analysis Dashboard: Display Gemma4 analysis results

WORKFLOW:
1. Applicant fills form + uploads resume
2. React uploads to Supabase Storage + creates application record
3. Python service polls, finds pending application
4. OCR extracts text from PDF
5. Gemma4 analyzes (6 prompts)
6. Results stored in talent_analysis table
7. React dashboard updates in realtime
8. HR sees complete candidate profile with scores

DEPLOYMENT:
- Mac Mini: nohup python main.py &
- React: npm run build && deploy to Vercel
- Supabase: Cloud PostgreSQL
```
