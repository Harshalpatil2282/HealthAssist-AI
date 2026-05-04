# HealthAssist — AI Healthcare Navigator for India

> Know your hospital. Know your cost. Before you go.

AI-powered healthcare navigation platform with hospital discovery, transparent cost estimation,
PMJAY eligibility checking, drug comparison, and multilingual support (8 Indian languages).

---

## 📁 Monorepo Structure

```
HealthMaster-AI/
├── client/          → React 19 + Vite frontend (HealthAssist UI)
└── server/          → FastAPI backend (REST API + NLP + Cost Engine)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for client)
- **Python** 3.11+ (for server)
- **Docker + Docker Compose** (optional, for full stack)

---

### Option A — Run Frontend Only (Mock Data)

```bash
cd client
npm install
npm run dev
```
Frontend opens at **http://localhost:5173**

---

### Option B — Run Backend Only (API)

```bash
cd server

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# Edit .env and add your API keys

# 4. Run with SQLite (no PostgreSQL needed for dev)
# In .env: set USE_SQLITE=true

# 5. Start server
uvicorn app.main:app --reload --port 8000
```
API available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

---

### Option C — Full Stack (Frontend + Backend)

**Terminal 1 — Backend:**
```bash
cd server
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # add USE_SQLITE=true for quick start
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
```

Frontend at `http://localhost:5173` → proxies `/api/*` → `http://localhost:8000`

---

### Option D — Docker Compose (Full Stack with PostgreSQL + Redis)

```bash
cd server
copy .env.example .env   # fill in real keys
docker compose up --build
```

Services started:
| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🔑 Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (PostgreSQL mode) | PostgreSQL connection string |
| `USE_SQLITE` | No | Set `true` for local dev without PostgreSQL |
| `OPENAI_API_KEY` | No* | GPT-4o for NLP intent extraction |
| `ANTHROPIC_API_KEY` | No* | Claude fallback |
| `GOOGLE_MAPS_API_KEY` | No | For geolocation features |
| `SECRET_KEY` | Yes | JWT signing key (change in production!) |

*Without LLM keys, the system falls back to rule-based ICD-10 extraction (still functional).

---

## 🌐 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/search` | POST | Main search (NLP → hospitals + cost) |
| `/api/v1/hospitals` | GET | List hospitals with filters |
| `/api/v1/hospitals/{id}` | GET | Hospital detail |
| `/api/v1/cost-estimate` | POST | Component-level cost estimate |
| `/api/v1/pmjay-check` | POST | PMJAY eligibility check |
| `/api/v1/drugs/compare` | GET | Brand vs generic drug comparison |
| `/api/v1/triage` | POST | Symptom urgency triage |

Full interactive docs: **http://localhost:8000/docs**

---

## 🧪 Running Tests

```bash
cd server
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt

# Run all tests with coverage
pytest tests/ -v

# Run specific test files
pytest tests/test_emergency.py -v
pytest tests/test_cost.py -v
pytest tests/test_security.py -v
pytest tests/test_pmjay.py -v
pytest tests/test_search.py -v
```

**Coverage target: > 80%**

---

## 🗄️ Database Migrations (Alembic)

```bash
cd server

# Create a new migration
alembic revision --autogenerate -m "add_hospitals_table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🏗️ Architecture

```
CLIENT (React + Vite @ :5173)
        │  /api/* proxy
        ▼
API Gateway (FastAPI @ :8000)
        │
   ┌────┴──────────────────────────┐
   │                               │
   ▼                               ▼
NLP Intent Engine          Core Business Logic
(LLM + ICD-10 Mapper)     (Scoring + Cost Engine)
   │                               │
   ▼                               ▼
Emergency Detector         Provider Ranking Engine
(Multilingual Keywords)   (4-signal weighted score)
                                   │
                          Cost Estimation Engine
                          (5-component + geo + risk)
                                   │
                     PostgreSQL + Redis (cache)
```

---

## 🛡️ Responsible AI Guardrails

- **No diagnosis**: System maps to procedures, never diagnoses conditions
- **Cost disclaimer**: Mandatory disclaimer on every cost estimate response
- **Emergency first**: Red-flag keyword detection runs before any LLM call
- **Multilingual emergency**: Detects emergencies in EN, HI, MR, TA, TE
- **PMJAY disclaimer**: Indicative only — always redirects to pmjay.gov.in
- **Rate limiting**: 10 requests/minute per IP on all AI endpoints
- **Input sanitization**: Strips prompt injection characters on all inputs
- **No PII storage**: Health queries stored as anonymized session hashes only

---

## 📋 Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | React frontend with mock data |
| Phase 2 | ✅ Complete | FastAPI backend, cost engine, PMJAY, drug compare |
| Phase 3 | 🔜 Planned | LLM NLP integration, multi-language, ranking ML |
| Phase 4 | 🔜 Planned | Telemedicine, drug loans, ASHA worker portal |

---
<img width="1366" height="603" alt="image" src="https://github.com/user-attachments/assets/d42221cd-2422-4dd1-a801-6860463e10f7" />
<img width="1361" height="607" alt="image" src="https://github.com/user-attachments/assets/d875c26f-f284-4b2a-95c6-206d97e44913" />

## 8 Language Support
<img width="1363" height="610" alt="image" src="https://github.com/user-attachments/assets/45a839b6-0c73-4af5-863b-8226868af035" />
<img width="1359" height="607" alt="image" src="https://github.com/user-attachments/assets/50c6e90b-63ac-45f6-b3ea-c46b6c87bf9e" />
<img width="1366" height="610" alt="image" src="https://github.com/user-attachments/assets/6fdb1e1f-2d48-4408-886c-46b5b32c31b5" />
<img width="1366" height="608" alt="image" src="https://github.com/user-attachments/assets/d09c08bd-0fb6-478e-a742-1b46532a9751" />
## Functionality
<img width="1289" height="607" alt="image" src="https://github.com/user-attachments/assets/423a6428-8144-4366-b498-25e974612b55" />
<img width="1118" height="598" alt="image" src="https://github.com/user-attachments/assets/8c8e45e7-1130-40d3-af28-1bb7bdca9eda" />
## Footer
<img width="1360" height="613" alt="image" src="https://github.com/user-attachments/assets/2640d018-3ccd-4c6a-ac9f-4decd0a621ab" />
## Search Hospitals And Cost
<img width="1109" height="609" alt="image" src="https://github.com/user-attachments/assets/1cc76fe4-ba7c-4af5-8625-b15336b9899c" />
## Apply Filter in search
<img width="1029" height="605" alt="image" src="https://github.com/user-attachments/assets/dae05c2c-dd7d-48d7-91e2-908ccf368f3e" />
## Search Result
<img width="1000" height="610" alt="image" src="https://github.com/user-attachments/assets/6090315d-7a26-4f74-b954-27da4f9d6cea" />
## Cost Estimation & Report Generation
<img width="1258" height="660" alt="image" src="https://github.com/user-attachments/assets/b25cbd4b-897b-4cd3-bcb5-519ab80e1be0" />
## Report 
<img width="1004" height="612" alt="image" src="https://github.com/user-attachments/assets/9bf91cfc-f8a3-4f1f-956d-794113666aa7" />
<img width="964" height="606" alt="image" src="https://github.com/user-attachments/assets/5de30950-6a23-40dc-820f-853d8c1339fe" />

<img width="750" height="608" alt="image" src="https://github.com/user-attachments/assets/78db2762-9342-4b77-b2b7-e47f247d088f" />
## PMJAY Eligibility Checker

<img width="920" height="610" alt="image" src="https://github.com/user-attachments/assets/551d7ed5-d9a0-463e-8a68-cd20eb9f2e82" />

<img width="913" height="607" alt="image" src="https://github.com/user-attachments/assets/1d5c81fb-08f4-4e00-93ae-7277f2905e6a" />

## Drug Comparator

<img width="1366" height="608" alt="image" src="https://github.com/user-attachments/assets/573c75f2-3a04-4cb2-9981-3c3075b71604" />

<img width="1133" height="611" alt="image" src="https://github.com/user-attachments/assets/946501f9-41c1-4909-ba15-9a751c0a1e75" />
## Telemediicine And Symptom Triage

<img width="1188" height="606" alt="image" src="https://github.com/user-attachments/assets/1f2b88c9-1a4a-44f9-bfbf-2da81f3861b9" />

<img width="1124" height="611" alt="image" src="https://github.com/user-attachments/assets/8c4b822d-d11f-46cc-8942-85b09eec8295" />

<img width="1122" height="612" alt="image" src="https://github.com/user-attachments/assets/04973d38-ac77-45c0-9cfb-77e800ef016b" />

<img width="1115" height="601" alt="image" src="https://github.com/user-attachments/assets/aaba85e6-bf4d-4ccb-8a51-dfbaf27c4875" />
****
<img width="667" height="610" alt="image" src="https://github.com/user-attachments/assets/5c50358f-8f7e-4aee-aec6-eec9d78bad6f" />
<img width="507" height="603" alt="image" src="https://github.com/user-attachments/assets/a3163934-1344-4f99-b2f8-af594d1186d4" />
<img width="558" height="628" alt="image" src="https://github.com/user-attachments/assets/cce18ccf-b4f7-4020-a06b-f71d1bf11552" />
<img width="1366" height="605" alt="image" src="https://github.com/user-attachments/assets/c8a11ca0-b6a5-4f82-bdc5-48664607ffcd" />
<img width="1297" height="608" alt="image" src="https://github.com/user-attachments/assets/81759945-6e82-4582-b7d2-a7aa5e922ae3" />
<img width="1366" height="605" alt="image" src="https://github.com/user-attachments/assets/2042f5b3-52db-4446-96eb-8f87f443976a" />
<img width="1366" height="609" alt="image" src="https://github.com/user-attachments/assets/da510a22-5f01-49ed-8174-562cc25d899b" />















## 📄 License

MIT License — HealthAssist 2026
