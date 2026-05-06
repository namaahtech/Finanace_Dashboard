# ATS RESUME ANALYZER - QUICK START GUIDE
## Mac Mini M4 - Get Running in 30 Minutes

---

## QUICK START (PART 1: SETUP - 10 minutes)

### 1.1 Install Homebrew & Python
```bash
# Install Homebrew (if not already)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Update Homebrew
brew update && brew upgrade

# Install Python 3.11
brew install python@3.11

# Create virtual environment
python3.11 -m venv ~/ats_env
source ~/ats_env/bin/activate

# Verify activation
which python
python --version
```

### 1.2 Install Tesseract OCR (2 minutes)
```bash
# Install Tesseract
brew install tesseract

# Install language data
brew install tesseract-lang

# Verify installation
tesseract --version

# Check language support
brew ls tesseract-lang
```

### 1.3 Install Ollama & Gemma (5 minutes)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama (in background)
ollama serve &

# In new terminal, pull Gemma 7B
source ~/ats_env/bin/activate
ollama pull gemma:7b

# Verify
ollama list
```

### 1.4 Install Python Dependencies (3 minutes)
```bash
source ~/ats_env/bin/activate

# Core ML/NLP
pip install torch==2.1.0 torchvision==0.16.0 torchaudio==0.16.0
pip install transformers==4.36.0
pip install accelerate

# OCR
pip install pytesseract==0.3.13
pip install pillow==10.0.0
pip install pdf2image==1.16.3
pip install opencv-python==4.8.0

# Data processing
pip install pandas==2.1.0
pip install numpy==1.24.3
pip install scikit-learn==1.3.1
pip install nltk==3.8.1

# NLP
pip install spacy==3.7.2
python -m spacy download en_core_web_sm

# API & Utilities
pip install fastapi==0.103.0
pip install uvicorn==0.23.2
pip install pydantic==2.3.0
pip install python-multipart==0.0.6
pip install requests

# Document processing
pip install python-docx==0.8.11
pip install pypdf==3.17.1

# Verify installations
pip list | grep -E "torch|transformers|tesseract|fastapi|pandas"
```

---

## QUICK START (PART 2: CORE CODE - 10 minutes)

### 2.1 Create Project Structure
```bash
# Create project directory
mkdir ~/ats_analyzer && cd ~/ats_analyzer

# Create subdirectories
mkdir -p {uploads,output,modules,tests,config}

# Create Python module files
touch modules/{__init__.py,ocr_processor.py,gemma_nlp_processor.py,resume_extractor.py}
touch modules/{job_cluster_matcher.py,match_score_calculator.py,analysis_report_generator.py}
touch ats_api_server.py
touch requirements.txt
```

### 2.2 Quick Implementation Files
Copy the modules from the comprehensive guide:
- `ocr_processor.py`
- `gemma_nlp_processor.py`
- `resume_extractor.py`
- `job_cluster_matcher.py`
- `match_score_calculator.py`
- `analysis_report_generator.py`

Into: `~/ats_analyzer/modules/`

### 2.3 Create Main API Server
```bash
# Create ats_api_server.py (from comprehensive guide)
# Copy FastAPI implementation

# Run server
source ~/ats_env/bin/activate
python ats_api_server.py

# Server starts at: http://localhost:8000
```

---

## QUICK START (PART 3: TEST - 5 minutes)

### 3.1 Test Single Resume Analysis
```bash
# In new terminal
curl -X POST "http://localhost:8000/api/analyze" \
  -F "file=@sample_resume.pdf" \
  -F "job_cluster={\"cluster_id\":\"AWS-DevOps\",\"company\":\"AWS\",\"job_titles\":[\"DevOps Engineer\"],\"ai_keywords\":[\"kubernetes\",\"docker\",\"aws\"],\"required_experience_years\":2,\"skills\":{\"required\":[\"kubernetes\",\"docker\"]}}"
```

### 3.2 Check Health
```bash
curl http://localhost:8000/api/health
```

### 3.3 View Results
```bash
# Check generated reports
ls -la ~/ats_analyzer/output/
cat ~/ats_analyzer/output/sample_resume.pdf_report.json
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Infrastructure (30 minutes)
- [ ] Python 3.11+ installed
- [ ] Virtual environment created & activated
- [ ] Tesseract OCR installed & verified
- [ ] Ollama service running
- [ ] Gemma 7B model pulled
- [ ] All pip packages installed
- [ ] Project directories created

### Phase 2: Core Modules (45 minutes)
- [ ] OCR processor implemented
- [ ] Tesseract integration tested
- [ ] Gemma API wrapper created
- [ ] Resume extractor module complete
- [ ] Job cluster matcher implemented
- [ ] Match score calculator done
- [ ] Pros/cons analyzer created
- [ ] Interview generator implemented
- [ ] Report generator complete

### Phase 3: API & Server (20 minutes)
- [ ] FastAPI server created
- [ ] Upload endpoint implemented
- [ ] Analysis endpoint working
- [ ] Batch processing endpoint added
- [ ] Health check endpoint active
- [ ] Error handling configured

### Phase 4: Testing (15 minutes)
- [ ] Single resume test passed
- [ ] Batch processing test passed
- [ ] PDF extraction verified
- [ ] Gemma response validation done
- [ ] Score calculation verified
- [ ] Report generation tested
- [ ] API response format correct

### Phase 5: Integration (20 minutes)
- [ ] Database configured (optional)
- [ ] File storage verified
- [ ] Report export formats working
- [ ] Logging configured
- [ ] Performance optimization done
- [ ] Security measures in place

---

## COMMON ISSUES & QUICK FIXES

### Issue: "Gemma not responding"
```bash
# Check if Ollama is running
lsof -i :11434

# If not running, start it
ollama serve &

# Check model
ollama list | grep gemma
```

### Issue: "Tesseract not found"
```bash
# Verify installation
which tesseract
tesseract --version

# If missing, reinstall
brew install tesseract
```

### Issue: "Python modules not found"
```bash
# Activate virtual environment
source ~/ats_env/bin/activate

# Reinstall packages
pip install --upgrade -r requirements.txt
```

### Issue: "Out of memory"
```bash
# For M4, use 7B model instead of 13B
ollama pull gemma:7b

# Allocate more RAM if available
export OLLAMA_MEMORY=20000  # 20GB
```

### Issue: "OCR accuracy too low"
```python
# In ocr_processor.py, increase DPI
images = pdf2image.convert_from_path(pdf_path, dpi=600)  # Was 300

# Or enable more preprocessing in _extract_from_image()
```

---

## PERFORMANCE BENCHMARKS

| Operation | Time (M4 with 16GB RAM) | Expected |
|-----------|------------------------|----------|
| Single resume OCR | 10-15 seconds | ✓ |
| Gemma text extraction | 15-20 seconds | ✓ |
| Skill matching | 5 seconds | ✓ |
| Full analysis | 40-60 seconds | ✓ |
| Report generation | 5 seconds | ✓ |
| **Total per resume** | **60-90 seconds** | ✓ |
| Batch (10 resumes) | 10-15 minutes | ✓ |

---

## FILE STRUCTURE

```
ats_analyzer/
├── modules/
│   ├── __init__.py
│   ├── ocr_processor.py
│   ├── gemma_nlp_processor.py
│   ├── resume_extractor.py
│   ├── job_cluster_matcher.py
│   ├── match_score_calculator.py
│   ├── pros_cons_analyzer.py
│   ├── interview_question_generator.py
│   └── analysis_report_generator.py
├── uploads/              # Incoming resume files
├── output/               # Generated reports
├── config/
│   ├── job_clusters.json # Job cluster definitions
│   └── config.yaml       # Configuration
├── ats_api_server.py     # FastAPI server
├── requirements.txt      # Python dependencies
└── test_api.sh          # Test script
```

---

## REQUIREMENTS.TXT

```
torch==2.1.0
transformers==4.36.0
pytesseract==0.3.13
pdf2image==1.16.3
pillow==10.0.0
opencv-python==4.8.0
pandas==2.1.0
numpy==1.24.3
scikit-learn==1.3.1
nltk==3.8.1
spacy==3.7.2
fastapi==0.103.0
uvicorn==0.23.2
pydantic==2.3.0
python-multipart==0.0.6
requests==2.31.0
python-docx==0.8.11
pypdf==3.17.1
```

---

## NEXT STEPS AFTER SETUP

1. **Customize Job Clusters**
   - Define your specific job roles
   - Set skill requirements
   - Configure experience thresholds

2. **Add Sample Resumes**
   - Test with 5-10 real resumes
   - Validate accuracy
   - Adjust weights if needed

3. **Create Frontend** (Optional)
   - Web UI for resume upload
   - Results visualization
   - Dashboard for reports

4. **Integrate with HR System**
   - Connect to your ATS database
   - Sync candidate profiles
   - Export results to your system

5. **Monitor Performance**
   - Track accuracy metrics
   - Collect feedback
   - Refine Gemma prompts

6. **Scale to Production**
   - Deploy on server
   - Set up monitoring
   - Configure security
   - Add authentication

---

## SUPPORT & TROUBLESHOOTING

### Enable Debug Logging
```python
# In ats_api_server.py
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Starting analysis...")
```

### Test Individual Components
```python
# Test OCR
from modules.ocr_processor import TesseractOCRProcessor
ocr = TesseractOCRProcessor()
text = ocr.extract_from_pdf("test.pdf")
print(text)

# Test Gemma
from modules.gemma_nlp_processor import Gemma4Processor
gemma = Gemma4Processor()
result = gemma.extract_resume_components(text)
print(result)
```

### Monitor Ollama
```bash
# Check Ollama logs
tail -f ~/.ollama/ollama.log

# Monitor resource usage
top -o MEM -s 5
```

---

## ESTIMATED TOTAL TIME

| Task | Time |
|------|------|
| Infrastructure setup | 10 min |
| Module implementation | 45 min |
| API server setup | 20 min |
| Testing | 15 min |
| **TOTAL** | **90 minutes** |

**You can have a working ATS resume analyzer in 1.5 hours!**

---

## QUICK TEST SCRIPT

```bash
#!/bin/bash
# test_ats.sh

echo "🚀 Starting ATS Resume Analyzer Tests..."

# Check Python
echo "✓ Python version:"
python --version

# Check Tesseract
echo "✓ Tesseract installed:"
tesseract --version | head -1

# Check Ollama
echo "✓ Checking Ollama..."
curl -s http://localhost:11434/api/generate -d '{"model":"gemma:7b","prompt":"test"}' > /dev/null && echo "✓ Ollama running" || echo "✗ Ollama NOT running"

# Check FastAPI server
echo "✓ Checking API server..."
curl -s http://localhost:8000/api/health | jq . && echo "✓ API healthy" || echo "✗ API not responding"

echo "✅ All checks complete!"
```

---

## PRODUCTION CHECKLIST

Before deploying to production:

- [ ] All tests passing
- [ ] Error handling complete
- [ ] Logging configured
- [ ] Security hardened
- [ ] Performance optimized
- [ ] Database backup strategy
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Team trained
- [ ] Fallback procedure documented

---

**Ready to implement? Follow the checklist above and you'll be running in 90 minutes!**
