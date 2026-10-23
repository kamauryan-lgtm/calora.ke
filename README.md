# CALORA — Nutrition & Calorie Tracking Platform 🇰🇪

> **"Accuracy over assumptions."**

CALORA is an uncertainty-aware, Kenya-first nutrition, fitness, and wellness platform designed primarily for sustainable calorie deficits and healthy living.

---

## 🌟 Core Pillars

1. **Accuracy Over False Precision**: Never fabricates exact precision when data is uncertain. Provides confidence ratings, uncertainty tags, and realistic ranges (e.g., Ugali + Beef Stew: `680–820 kcal`, Confidence: `MEDIUM`).
2. **Transparent Calculations**: Explains every calorie estimate ("Ugali: 325 kcal, Beef stew: 404 kcal, Cooking oil: 1 tbsp ~120 kcal").
3. **Kenya-First Database**: Built around the Kenya Food Composition Tables (KFCT 2018) alongside international USDA items.
4. **Custom Recipe Builder**: Calculates total calories and macronutrients with automatic per-serving breakdown and persistent saving.
5. **Photo & Barcode Scanning**: Visual food recognition with bounding boxes, plus instant barcode lookup for Kenyan staple products (Brookside, Farmer's Choice, Weetabix, Dairyland).
6. **Dark Mode & PWA**: Mobile-first progressive web app with offline caching and light/dark theme persistence.
7. **Conversational AI Nutrition Agent**: Context-aware assistant grounded in client daily budgets, remaining macros, and non-extreme deficit guidelines.
8. **Gym Partner & Revenue Management**: Multi-tenant gym workspaces, coach assignments, consent-based progress reports, and M-Pesa STK Push payment flow with 0% pilot commission.

---

## 🚀 Quick Start (Local Run)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start CALORA server
python run.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🌐 Production Deployment

### Option A: Render (Recommended Blueprint)
1. Push this repository to GitHub.
2. In Render Dashboard, click **New +** -> **Blueprint**.
3. Select your repository. Render automatically reads `render.yaml` and provisions the web service.

### Option B: Railway / Fly.io / Docker
Deploy using the provided `Dockerfile`:
```bash
docker build -t calora .
docker run -p 8000:8000 calora
```

### Option C: Heroku / Python Host
The project includes a `Procfile` configured with:
```
web: python run.py
```

---

## 🔑 Demo Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| **Client** | `ryan@calora.app` | `calora123` | Diary, Recipes, Steps, Sleep, Workouts, AI Agent |
| **Gym Owner** | `gym.owner@nairobihub.co.ke` | `owner123` | Gym Manager Workspace, Consent Reports, Invoices |
| **Coach** | `coach.brian@calora.app` | `coach123` | Client Progress, Workout Plans |
| **Admin** | `admin@calora.app` | `admin123` | SaaS MRR Overview, Discrepancies, Audits |

---

## 🧪 Testing

```bash
# Unit calculation tests
python -m unittest discover tests

# Full E2E user journey verification
python tests/test_e2e.py

# Platform upgrade verification (Recipes, Wellness, Gym Partner, M-Pesa)
python tests/test_gym_wellness_e2e.py
```
