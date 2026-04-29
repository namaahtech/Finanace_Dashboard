# 3. Job Clusters JSON Templates for Supabase
## Ready-to-insert PostgreSQL data

---

## **HOW TO USE THIS FILE**

Save job cluster data as SQL INSERT statements or JSON format for bulk upload to Supabase.

Each cluster contains:
- Mandatory technical skills
- Preferred skills
- Domain knowledge areas with keywords
- Experience requirements
- Gemma4 NLP keywords
- Scoring weights

---

## **AWS DEVOPS ENGINEER - Complete Example**

```sql
INSERT INTO job_clusters (
  cluster_id,
  company,
  job_title_variants,
  mandatory_skills,
  preferred_skills,
  domain_knowledge,
  experience_requirements,
  education,
  match_weights,
  gemma_keywords,
  active
) VALUES (
  'AWS-CloudInfra-DevOps',
  'AWS',
  ARRAY['DevOps Engineer', 'Cloud Engineer', 'SRE', 'Infrastructure Engineer'],
  
  -- MANDATORY SKILLS (must be present)
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'AWS EC2',
      'category', 'compute',
      'importance', 9,
      'years_expected', 2,
      'keywords', ARRAY['instance management', 'auto-scaling', 'security groups', 'iam roles']
    ),
    jsonb_build_object(
      'skill', 'Docker',
      'category', 'containerization',
      'importance', 8,
      'years_expected', 1.5,
      'keywords', ARRAY['docker compose', 'image building', 'container registry', 'dockerfile']
    ),
    jsonb_build_object(
      'skill', 'Kubernetes',
      'category', 'orchestration',
      'importance', 8,
      'years_expected', 2,
      'keywords', ARRAY['deployments', 'services', 'helm', 'kubectl', 'eks']
    ),
    jsonb_build_object(
      'skill', 'Terraform',
      'category', 'iac',
      'importance', 8,
      'years_expected', 1.5,
      'keywords', ARRAY['hcl syntax', 'state management', 'modules', 'tfplan']
    ),
    jsonb_build_object(
      'skill', 'Linux System Administration',
      'category', 'operating_systems',
      'importance', 8,
      'years_expected', 2,
      'keywords', ARRAY['bash scripting', 'user management', 'package managers', 'system monitoring']
    ),
    jsonb_build_object(
      'skill', 'CI/CD Pipelines',
      'category', 'devops',
      'importance', 8,
      'years_expected', 1.5,
      'keywords', ARRAY['jenkins', 'github actions', 'gitlab ci', 'pipeline design']
    )
  ),
  
  -- PREFERRED SKILLS
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'Python',
      'importance', 6,
      'keywords', ARRAY['scripting', 'automation', 'boto3', 'aws sdk']
    ),
    jsonb_build_object(
      'skill', 'Bash/Shell Scripting',
      'importance', 6,
      'keywords', ARRAY['automation', 'system scripts']
    ),
    jsonb_build_object(
      'skill', 'Prometheus & Grafana',
      'importance', 5,
      'keywords', ARRAY['metrics', 'alerting', 'dashboards']
    )
  ),
  
  -- DOMAIN KNOWLEDGE (what Gemma4 should search for)
  jsonb_build_array(
    jsonb_build_object(
      'area', 'Infrastructure Automation',
      'importance', 9,
      'keywords', ARRAY['infrastructure as code', 'automation', 'provisioning', 'templating', 'idempotency', 'version control'],
      'assessment', ARRAY[
        'Can explain IaC benefits vs manual',
        'Experience with Terraform or CloudFormation',
        'Cost optimization through automation'
      ]
    ),
    jsonb_build_object(
      'area', 'Cloud Architecture & Design',
      'importance', 9,
      'keywords', ARRAY['multi-region', 'high availability', 'disaster recovery', 'failover', 'load balancing', 'vpc design'],
      'assessment', ARRAY[
        'Can design fault-tolerant system',
        'Understands RTO/RPO',
        'Multi-AZ deployment experience'
      ]
    ),
    jsonb_build_object(
      'area', 'Cost Optimization',
      'importance', 7,
      'keywords', ARRAY['cost analysis', 'reserved instances', 'spot instances', 'rightsizing', 'cost allocation tags'],
      'assessment', ARRAY[
        'Reduced infrastructure costs',
        'Understands pricing models',
        'Cost monitoring tools experience'
      ]
    ),
    jsonb_build_object(
      'area', 'Monitoring & Logging',
      'importance', 8,
      'keywords', ARRAY['cloudwatch', 'prometheus', 'elk stack', 'log aggregation', 'alerting', 'slo/sli'],
      'assessment', ARRAY[
        'Set up monitoring from scratch',
        'Created meaningful dashboards',
        'Implemented alerting'
      ]
    ),
    jsonb_build_object(
      'area', 'Security Best Practices',
      'importance', 8,
      'keywords', ARRAY['iam', 'least privilege', 'encryption', 'vpc isolation', 'ssl/tls', 'secrets management'],
      'assessment', ARRAY[
        'Implements least privilege',
        'Encryption at rest and transit',
        'Compliance requirements experience'
      ]
    )
  ),
  
  -- EXPERIENCE REQUIREMENTS
  jsonb_build_object(
    'years_required', 2,
    'preferred_years', 5,
    'seniority_levels', ARRAY['Junior', 'Mid', 'Senior'],
    'key_experience', ARRAY[
      'Production deployments at scale',
      'Multi-region AWS setup',
      'Disaster recovery implementation'
    ]
  ),
  
  -- EDUCATION
  jsonb_build_object(
    'required', 'High School Diploma or equivalent',
    'preferred', 'Bachelor''s in Computer Science or IT',
    'certifications', ARRAY[
      jsonb_build_object(
        'name', 'AWS Certified Solutions Architect Associate',
        'importance', 6,
        'required', false
      ),
      jsonb_build_object(
        'name', 'AWS Certified DevOps Engineer Professional',
        'importance', 7,
        'required', false
      )
    ]
  ),
  
  -- SCORING WEIGHTS (for Gemma4 analysis)
  jsonb_build_object(
    'technical_skills', 40,
    'domain_knowledge', 25,
    'experience_years', 15,
    'soft_skills', 10,
    'education_certifications', 10
  ),
  
  -- GEMMA4 NLP KEYWORDS (what to search for in resume text)
  ARRAY[
    'kubernetes', 'docker', 'terraform', 'aws', 'ec2', 's3', 'rds', 'lambda',
    'jenkins', 'github actions', 'gitlab ci', 'python', 'bash', 'shell',
    'linux', 'ci/cd', 'monitoring', 'prometheus', 'grafana', 'cloudwatch',
    'infrastructure as code', 'high availability', 'disaster recovery',
    'cost optimization', 'security groups', 'vpc', 'multi-region',
    'production deployment', 'kubernetes cluster', 'eks', 'ecs'
  ],
  
  true  -- active
);
```

---

## **GOOGLE ML ENGINEER**

```sql
INSERT INTO job_clusters (
  cluster_id, company, job_title_variants,
  mandatory_skills, preferred_skills, domain_knowledge,
  experience_requirements, education,
  match_weights, gemma_keywords, active
) VALUES (
  'Google-ML-Engineer',
  'Google',
  ARRAY['ML Engineer', 'Machine Learning Engineer', 'AI Engineer'],
  
  -- MANDATORY SKILLS
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'Deep Learning Frameworks',
      'importance', 9,
      'keywords', ARRAY['tensorflow', 'pytorch', 'jax', 'keras', 'model training', 'gradient descent']
    ),
    jsonb_build_object(
      'skill', 'Python',
      'importance', 9,
      'keywords', ARRAY['numpy', 'pandas', 'scikit-learn', 'matplotlib', 'jupyter']
    ),
    jsonb_build_object(
      'skill', 'NLP/LLM Knowledge',
      'importance', 8,
      'keywords', ARRAY['transformers', 'attention mechanism', 'embeddings', 'bert', 'gpt', 'seq2seq']
    ),
    jsonb_build_object(
      'skill', 'Model Deployment',
      'importance', 7,
      'keywords', ARRAY['tfserving', 'vertex ai', 'docker', 'kubernetes', 'inference optimization']
    ),
    jsonb_build_object(
      'skill', 'Data Analysis & Preprocessing',
      'importance', 8,
      'keywords', ARRAY['feature engineering', 'data cleaning', 'outlier detection', 'data augmentation']
    )
  ),
  
  -- PREFERRED SKILLS
  jsonb_build_array(
    jsonb_build_object('skill', 'Computer Vision', 'importance', 6),
    jsonb_build_object('skill', 'Reinforcement Learning', 'importance', 5),
    jsonb_build_object('skill', 'SQL & BigQuery', 'importance', 5)
  ),
  
  -- DOMAIN KNOWLEDGE
  jsonb_build_array(
    jsonb_build_object(
      'area', 'Deep Learning Architectures',
      'importance', 9,
      'keywords', ARRAY['cnns', 'rnns', 'transformers', 'attention', 'layer normalization', 'residual networks']
    ),
    jsonb_build_object(
      'area', 'NLP & Language Models',
      'importance', 9,
      'keywords', ARRAY['transformer', 'bert', 'gpt', 'fine-tuning', 'prompt engineering', 'embeddings']
    ),
    jsonb_build_object(
      'area', 'Model Optimization & Performance',
      'importance', 8,
      'keywords', ARRAY['quantization', 'pruning', 'knowledge distillation', 'inference latency', 'memory optimization']
    )
  ),
  
  -- EXPERIENCE REQUIREMENTS
  jsonb_build_object(
    'years_required', 2,
    'seniority_levels', ARRAY['Mid', 'Senior', 'Staff']
  ),
  
  -- EDUCATION
  jsonb_build_object(
    'required', 'Bachelor''s in CS/Math/Physics',
    'preferred', 'Master''s or PhD in ML'
  ),
  
  -- WEIGHTS
  jsonb_build_object(
    'technical_skills', 45,
    'domain_knowledge', 30,
    'experience_years', 15,
    'education_research', 10
  ),
  
  -- NLP KEYWORDS
  ARRAY[
    'tensorflow', 'pytorch', 'jax', 'keras', 'python', 'numpy', 'pandas',
    'deep learning', 'neural network', 'transformer', 'bert', 'gpt',
    'attention mechanism', 'nlp', 'language model', 'embeddings',
    'convolutional', 'cnn', 'rnn', 'lstm', 'seq2seq',
    'fine-tuning', 'transfer learning', 'model training', 'inference',
    'vertex ai', 'tfserving', 'quantization', 'pruning'
  ],
  
  true
);
```

---

## **JP MORGAN JAVA BACKEND**

```sql
INSERT INTO job_clusters (
  cluster_id, company, job_title_variants,
  mandatory_skills, preferred_skills, domain_knowledge,
  experience_requirements, education,
  match_weights, gemma_keywords, active
) VALUES (
  'JPMorgan-JavaBackend-FinTech',
  'JP Morgan',
  ARRAY['Java Backend Engineer', 'Senior Java Developer', 'Systems Engineer'],
  
  -- MANDATORY SKILLS
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'Java 11+',
      'importance', 10,
      'keywords', ARRAY['spring boot', 'multithreading', 'concurrency', 'jvm', 'design patterns', 'object-oriented']
    ),
    jsonb_build_object(
      'skill', 'Spring Boot & Spring Framework',
      'importance', 9,
      'keywords', ARRAY['dependency injection', 'aop', 'rest apis', 'spring data jpa', 'spring security']
    ),
    jsonb_build_object(
      'skill', 'SQL & Database Design',
      'importance', 9,
      'keywords', ARRAY['oracle', 'postgresql', 'complex queries', 'indexing', 'optimization', 'transactions', 'acid']
    ),
    jsonb_build_object(
      'skill', 'Multithreading & Concurrency',
      'importance', 9,
      'keywords', ARRAY['thread safety', 'locks', 'synchronized', 'concurrent collections', 'thread pools', 'volatile']
    ),
    jsonb_build_object(
      'skill', 'Microservices Architecture',
      'importance', 8,
      'keywords', ARRAY['service communication', 'api gateways', 'circuit breakers', 'service discovery', 'distributed tracing']
    ),
    jsonb_build_object(
      'skill', 'Message Queues & Async',
      'importance', 8,
      'keywords', ARRAY['kafka', 'rabbitmq', 'jms', 'event-driven', 'async patterns', 'event sourcing']
    )
  ),
  
  -- PREFERRED SKILLS
  jsonb_build_array(
    jsonb_build_object('skill', 'Python', 'importance', 5),
    jsonb_build_object('skill', 'AWS/GCP', 'importance', 5)
  ),
  
  -- DOMAIN KNOWLEDGE
  jsonb_build_array(
    jsonb_build_object(
      'area', 'Financial Systems & Payments',
      'importance', 10,
      'keywords', ARRAY['settlement', 'clearing', 't+2', 'trade lifecycle', 'payment processing', 'compliance', 'aml', 'regulatory']
    ),
    jsonb_build_object(
      'area', 'High Performance & Distributed Systems',
      'importance', 9,
      'keywords', ARRAY['low-latency', 'millisecond optimization', 'throughput', 'scalability', 'fault tolerance', 'resilience']
    ),
    jsonb_build_object(
      'area', 'Data Consistency & ACID',
      'importance', 9,
      'keywords', ARRAY['transactions', 'acid properties', 'locks', 'deadlock prevention', 'two-phase commit', 'isolation levels']
    ),
    jsonb_build_object(
      'area', 'Risk Management',
      'importance', 8,
      'keywords', ARRAY['var', 'stress testing', 'compliance', 'audit trails', 'dodd-frank', 'regulatory requirements']
    )
  ),
  
  -- EXPERIENCE REQUIREMENTS
  jsonb_build_object(
    'years_required', 2,
    'seniority_levels', ARRAY['Junior', 'Mid', 'Senior'],
    'key_experience', ARRAY[
      'Production Java systems at scale',
      'Microservices architecture',
      'High-frequency transaction processing',
      'Billion-transaction-daily systems'
    ]
  ),
  
  -- EDUCATION
  jsonb_build_object(
    'required', 'Bachelor''s in CS/Math/Finance',
    'preferred', 'Master''s in CS or Financial Engineering'
  ),
  
  -- WEIGHTS (domain knowledge heavily weighted for finance)
  jsonb_build_object(
    'technical_skills', 45,
    'domain_knowledge', 25,
    'experience_years', 20,
    'education', 10
  ),
  
  -- NLP KEYWORDS
  ARRAY[
    'java', 'spring boot', 'spring framework', 'multithreading', 'concurrency',
    'sql', 'oracle', 'postgresql', 'microservices', 'api gateway',
    'kafka', 'rabbitmq', 'jms', 'message queue', 'event-driven',
    'circuit breaker', 'resilience', 'transaction', 'acid', 'distributed',
    'settlement', 'clearing', 'trading', 'payment processing', 'compliance',
    'high-frequency', 'latency optimization', 'throughput'
  ],
  
  true
);
```

---

## **GOOGLE DATA ENGINEER**

```sql
INSERT INTO job_clusters (
  cluster_id, company, job_title_variants,
  mandatory_skills, preferred_skills, domain_knowledge,
  experience_requirements, education,
  match_weights, gemma_keywords, active
) VALUES (
  'Google-DataEngineer',
  'Google',
  ARRAY['Data Engineer', 'Big Data Engineer', 'Analytics Engineer'],
  
  -- MANDATORY SKILLS
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'Big Data Technologies',
      'importance', 9,
      'keywords', ARRAY['spark', 'hadoop', 'bigquery', 'data warehouse', 'distributed processing']
    ),
    jsonb_build_object(
      'skill', 'SQL',
      'importance', 9,
      'keywords', ARRAY['complex queries', 'optimization', 'aggregation', 'window functions', 'joins']
    ),
    jsonb_build_object(
      'skill', 'ETL/ELT Pipeline Design',
      'importance', 8,
      'keywords', ARRAY['data pipeline', 'transformation', 'scheduling', 'data flow', 'airflow', 'dataflow']
    ),
    jsonb_build_object(
      'skill', 'Python Data Tools',
      'importance', 8,
      'keywords', ARRAY['pandas', 'numpy', 'pyspark', 'dbt', 'data processing']
    )
  ),
  
  -- PREFERRED SKILLS
  jsonb_build_array(
    jsonb_build_object('skill', 'NoSQL Databases', 'importance', 6),
    jsonb_build_object('skill', 'Cloud Platforms', 'importance', 7, 'keywords', ARRAY['bigquery', 'dataflow', 'gcp'])
  ),
  
  -- DOMAIN KNOWLEDGE
  jsonb_build_array(
    jsonb_build_object(
      'area', 'Data Pipeline Architecture',
      'importance', 9,
      'keywords', ARRAY['etl', 'elt', 'data flow', 'transformations', 'scheduling', 'orchestration']
    ),
    jsonb_build_object(
      'area', 'Data Quality & Governance',
      'importance', 8,
      'keywords', ARRAY['data validation', 'schema management', 'data lineage', 'governance', 'metadata']
    )
  ),
  
  -- EXPERIENCE
  jsonb_build_object('years_required', 2),
  
  -- EDUCATION
  jsonb_build_object('required', 'Bachelor''s in CS/Math/Statistics'),
  
  -- WEIGHTS
  jsonb_build_object(
    'technical_skills', 40,
    'domain_knowledge', 30,
    'experience_years', 20,
    'education', 10
  ),
  
  -- NLP KEYWORDS
  ARRAY[
    'spark', 'hadoop', 'bigquery', 'sql', 'python', 'pandas',
    'etl', 'elt', 'data pipeline', 'airflow', 'dataflow',
    'data warehouse', 'big data', 'distributed', 'transformation',
    'schema', 'data quality', 'validation'
  ],
  
  true
);
```

---

## **MCKINSEY BUSINESS ANALYST**

```sql
INSERT INTO job_clusters (
  cluster_id, company, job_title_variants,
  mandatory_skills, preferred_skills, domain_knowledge,
  experience_requirements, education,
  match_weights, gemma_keywords, active
) VALUES (
  'McKinsey-BusinessAnalyst',
  'McKinsey',
  ARRAY['Business Analyst', 'Business Consultant', 'Analyst'],
  
  -- MANDATORY SKILLS
  jsonb_build_array(
    jsonb_build_object(
      'skill', 'Problem Decomposition',
      'importance', 9,
      'keywords', ARRAY['business problem', 'structure', 'framework', 'analysis', 'hypothesis']
    ),
    jsonb_build_object(
      'skill', 'Excel',
      'importance', 8,
      'keywords', ARRAY['spreadsheet', 'formulas', 'pivot tables', 'vlookup', 'data analysis', 'visualization']
    ),
    jsonb_build_object(
      'skill', 'Business Intelligence',
      'importance', 7,
      'keywords', ARRAY['tableau', 'power bi', 'dashboards', 'reporting', 'analytics']
    ),
    jsonb_build_object(
      'skill', 'Market Research',
      'importance', 7,
      'keywords', ARRAY['research', 'competitive analysis', 'market sizing', 'survey', 'data collection']
    )
  ),
  
  -- PREFERRED SKILLS
  jsonb_build_array(
    jsonb_build_object('skill', 'Financial Modeling', 'importance', 6),
    jsonb_build_object('skill', 'Statistics', 'importance', 5)
  ),
  
  -- DOMAIN KNOWLEDGE
  jsonb_build_array(
    jsonb_build_object(
      'area', 'Business Frameworks',
      'importance', 9,
      'keywords', ARRAY['swot', 'porter five forces', 'value chain', 'business model', 'strategy']
    ),
    jsonb_build_object(
      'area', 'Financial Analysis',
      'importance', 8,
      'keywords', ARRAY['profitability', 'margin', 'revenue', 'cost analysis', 'roi', 'npv', 'payback period']
    )
  ),
  
  -- EXPERIENCE
  jsonb_build_object('years_required', 0),
  
  -- EDUCATION
  jsonb_build_object(
    'required', 'Bachelor''s from target school (IIT, XLRI, ISB)',
    'preferred', 'MBA'
  ),
  
  -- WEIGHTS
  jsonb_build_object(
    'technical_skills', 25,
    'domain_knowledge', 35,
    'soft_skills', 30,
    'education', 10
  ),
  
  -- NLP KEYWORDS
  ARRAY[
    'excel', 'tableau', 'power bi', 'business analysis', 'market research',
    'case study', 'consulting', 'strategy', 'business problem', 'swot',
    'financial analysis', 'revenue', 'cost reduction', 'profitability'
  ],
  
  true
);
```

---

## **SQL SCRIPT TO INSERT ALL CLUSTERS AT ONCE**

```sql
-- Save this as import_clusters.sql and run:
-- psql -U postgres -d your_database -f import_clusters.sql

BEGIN TRANSACTION;

-- Truncate existing (optional)
TRUNCATE TABLE job_clusters CASCADE;

-- AWS DevOps
INSERT INTO job_clusters (...) VALUES (...);

-- Google ML Engineer
INSERT INTO job_clusters (...) VALUES (...);

-- JP Morgan Java
INSERT INTO job_clusters (...) VALUES (...);

-- Google Data Engineer
INSERT INTO job_clusters (...) VALUES (...);

-- McKinsey Business Analyst
INSERT INTO job_clusters (...) VALUES (...);

COMMIT;

-- Verify import
SELECT COUNT(*) as total_clusters FROM job_clusters;
SELECT cluster_id, company, active FROM job_clusters ORDER BY company;
```

---

## **SUPABASE IMPORT VIA PYTHON**

```python
# import_clusters.py
from supabase import create_client, Client
import json

SUPABASE_URL = "your_supabase_url"
SUPABASE_KEY = "your_service_role_key"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

clusters = [
    {
        "cluster_id": "AWS-CloudInfra-DevOps",
        "company": "AWS",
        "job_title_variants": ["DevOps Engineer", "Cloud Engineer", "SRE"],
        "mandatory_skills": [
            {"skill": "AWS EC2", "importance": 9},
            {"skill": "Docker", "importance": 8},
            # ... more skills
        ],
        "domain_knowledge": [
            {"area": "Infrastructure Automation", "importance": 9},
            # ... more domains
        ],
        # ... other fields
    },
    # ... more clusters
]

for cluster in clusters:
    supabase.table('job_clusters').insert(cluster).execute()
    print(f"Inserted {cluster['cluster_id']}")

print("All clusters imported!")
```

---

## **SAMPLE RESUME FOR TESTING**

```
JOHN DOE
john.doe@example.com | +91-9876543210 | Bengaluru

PROFESSIONAL SUMMARY
DevOps Engineer with 2.5+ years designing scalable AWS infrastructure.
Proficient in Kubernetes, Docker, Terraform, CI/CD automation.

TECHNICAL SKILLS
AWS: EC2, S3, RDS, Lambda, CloudFormation, VPC, Route53, CloudWatch, ECS, EKS
DevOps: Kubernetes (EKS), Docker, Terraform, Ansible, Jenkins, GitHub Actions
Programming: Python, Bash, Shell scripting
Databases: PostgreSQL, MySQL, DynamoDB
Monitoring: Prometheus, Grafana, CloudWatch
Certifications: AWS Solutions Architect Associate (2021)

PROFESSIONAL EXPERIENCE

Senior DevOps Engineer | Tech XYZ | Bengaluru (June 2022 - Present)
- Designed multi-region AWS infrastructure for 50K+ daily users
- Migration to Kubernetes (EKS) reduced costs by 35%
- Implemented Terraform modules, reducing deployment time by 80%
- Set up Prometheus + Grafana monitoring with 200+ metrics
- Mentored 2 junior engineers

DevOps Engineer | Tech ABC | Bengaluru (Jan 2021 - May 2022)
- Established CI/CD with GitHub Actions (50+ releases/week)
- Containerized monolith into microservices using Docker
- Managed AWS infrastructure via Terraform (99.95% uptime)
- Disaster recovery solution: RTO 4h, RPO 1h
- Reduced AWS costs 25% through Reserved Instances

EDUCATION
Bachelor's in Information Technology | Anna University | 2019
```

---

## **GEMMA4 TEST PROMPT**

```
Analyze resume for AWS-CloudInfra-DevOps cluster.

RESUME:
[Paste resume above]

RESPOND WITH ONLY JSON:
{
  "technical_match_score": 0-100,
  "found_mandatory_skills": [
    {"skill": "Kubernetes", "confidence": 92},
    {"skill": "Docker", "confidence": 90}
  ],
  "missing_mandatory_skills": [],
  "domain_knowledge_score": 0-100,
  "years_relevant": 2.5,
  "seniority_fit": "Mid",
  "overall_fit_percentage": 0-100,
  "recommendation": "Highly Suitable|Suitable|Partially Suitable|Not Suitable"
}
```

---

## **EXPECTED GEMMA4 OUTPUT**

```json
{
  "technical_match_score": 88,
  "found_mandatory_skills": [
    {"skill": "AWS EC2", "confidence": 92},
    {"skill": "Docker", "confidence": 90},
    {"skill": "Kubernetes", "confidence": 88},
    {"skill": "Terraform", "confidence": 85},
    {"skill": "Linux System Administration", "confidence": 82},
    {"skill": "CI/CD Pipelines", "confidence": 90}
  ],
  "missing_mandatory_skills": [],
  "domain_knowledge_score": 80,
  "years_relevant": 2.5,
  "seniority_fit": "Mid",
  "overall_fit_percentage": 84,
  "recommendation": "Highly Suitable"
}
```

---

## **KEY FIELDS EXPLANATION**

| Field | Purpose | Example |
|-------|---------|---------|
| `cluster_id` | Unique identifier | "AWS-CloudInfra-DevOps" |
| `mandatory_skills` | Must have (weight in score) | Kubernetes importance: 8 |
| `domain_knowledge` | Business context keywords | "Infrastructure Automation" |
| `gemma_keywords` | For NLP extraction | ["kubernetes", "docker", "terraform"] |
| `match_weights` | Scoring formula percentages | technical_skills: 40% |
| `importance` | Skill priority (1-10) | 9 = critical, 5 = nice-to-have |

