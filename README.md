# Credit Risk Management — AI Underwriting & Risk Assessment System

A production-ready, full-stack Machine Learning application for consumer credit risk assessment. The system evaluates loan applicant profiles and predicts default probability using a calibrated gradient boosting model (XGBoost with Platt Scaling) served via high-throughput FastAPI and an interactive, modern financial technology underwriting dashboard.

---

## 1. Project Overview

Credit risk management is a core function in modern financial institutions, enabling lenders to evaluate the probability of debt default prior to credit origination. This project provides an end-to-end implementation of an automated risk scoring engine:

- **Machine Learning Core:** Gradient boosted decision trees (XGBoost) trained on demographic, financial, credit bureau, and loan structure features, calibrated via `CalibratedClassifierCV` (Platt Scaling) and evaluated against an F1/Recall-optimized decision threshold ($0.4328$).
- **API Backend:** Production ASGI service built with **FastAPI** featuring strict Pydantic v2 input schema validation, lifespan-managed artifact lifecycle, structured logging, dynamic `/health` and `/api/info` endpoints, and graceful error handling.
- **Frontend Dashboard:** A modern, professional fintech dashboard (Inter & JetBrains Mono typography, responsive 2-column workspace, circular SVG default probability gauge, linear risk spectrum bar, dynamic loan-to-income ratio calculator with override detection, and 1-click test scenario presets).
- **Deployment-Ready:** Native Render web service configuration supporting dynamic `$PORT` binding, predictable directory structures, clean UTF-8 dependency specifications, and ASGI execution.

> [!IMPORTANT]
> **Regulatory & Model Risk Notice:**  
> This system generates statistical risk estimates for educational, evaluation, and underwriting assistance purposes. It does not make binding credit decisions, issue adverse action notices, or substitute for comprehensive financial compliance. The underlying model is not certified for production financial lending without institutional audit, fairness verification, and continuous drift monitoring.

---

## 2. Key Features

### Frontend UI/UX
- **Fintech Dashboard Aesthetic:** Minimal, clean layout engineered for credit underwriters and risk analysts.
- **Dynamic LTI Auto-Calculation:** Automatically calculates the Loan-to-Income ratio ($\frac{\text{Loan Amount}}{\text{Annual Income}}$) in real time while supporting manual overrides with clear badge indicators and a one-click reset to auto.
- **Underwriting Presets:** Instant 1-click test scenarios (Prime Profile $\approx 3.8\%$ risk, Borderline Profile $\approx 37.4\%$ risk, Subprime Profile $\approx 99.1\%$ risk).
- **Interactive Risk Gauge & Spectrum Bar:** Dual visualization illustrating both the exact default probability percentage and applicant positioning relative to the optimal $43.28\%$ decision boundary.
- **Accessible & Responsive:** Semantic HTML5, ARIA live regions, responsive layout across desktop, tablet, and mobile, with support for reduced motion preferences.
- **Zero Framework Bloat:** Served directly as high-performance static assets by FastAPI without requiring separate Node.js or frontend hosting.

### Backend & Model Serving
- **FastAPI Lifespan Management:** Artifacts (`credit_risk_model.pkl` and `best_threshold.pkl`) are loaded once during application startup with path-independent resolution based on `BASE_DIR`.
- **Strict Pydantic Input Validation:** Rejects out-of-bounds numerical inputs, unseen categorical values, and unexpected payload attributes with descriptive HTTP 422 errors.
- **Automated Health Monitoring:** Dedicated `GET /health` endpoint for Render health checks and container probes, returning HTTP 200 when healthy and HTTP 503 when degraded.
- **Introspection Endpoint:** `GET /api/info` surfaces model metadata, verified feature names, and decision threshold.
- **Error Handling & Security:** Internal exceptions and tracebacks are shielded from end-users; errors are logged with standard timestamps and contextual loggers.

---

## 3. Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3 (Custom Properties & Grid), JavaScript (ES6+) | Modern fintech underwriting dashboard |
| **Backend API** | FastAPI, Starlette, Pydantic v2, Uvicorn | High-throughput asynchronous ASGI microservice |
| **Machine Learning** | Scikit-learn (`CalibratedClassifierCV`, `Pipeline`), XGBoost | Pipeline preprocessing & calibrated default prediction |
| **Data Processing** | Pandas, NumPy, Scipy, Joblib | Feature manipulation & artifact serialization |
| **Cloud Deployment** | Render (Python Web Service), ASGI | Production cloud execution |
| **Testing** | Pytest, HTTPX, FastAPI TestClient | Automated integration & validation test suite |

---

## 4. Project Directory Structure

```text
Credit-Risk-Management/
├── main.py                         # FastAPI application entry point, lifespan, routes & validation
├── test_app.py                     # Automated test suite (health, predict, validation, static)
├── credit_risk_model.pkl           # Serialized model pipeline (Pipeline + XGBoost + Calibration)
├── best_threshold.pkl              # Optimized decision cutoff threshold (0.4328)
├── credit_risk_dataset.csv         # Benchmark credit dataset used for training & verification
├── credit_risk_assessment.ipynb    # Jupyter Notebook detailing EDA, modeling & threshold tuning
├── requirements.txt                # Lean, pinned production dependencies (UTF-8 encoded)
├── environment.yml                 # Conda environment definition
├── render.yaml                     # Render Blueprint infrastructure-as-code configuration
├── runtime.txt                     # Target Python runtime specification (python-3.12.8)
├── .python-version                 # Environment Python version hint (3.12.8)
├── README.md                       # Complete technical documentation
│
└── static/                         # Frontend application assets (served by FastAPI)
    ├── index.html                  # Semantic dashboard structure & layout
    ├── style.css                   # Modern fintech stylesheet (dark slate palette & responsive grid)
    └── script.js                   # Client-side controller, LTI calculations & API integration
```

---

## 5. Model Architecture & Prediction Workflow

### Input Feature Specification

The serialized pipeline expects a DataFrame containing the exact 11 features listed below:

| Feature Name | Type | Allowed Range / Categories | Description |
|---|---|---|---|
| `person_age` | Integer | $18 \le \text{age} \le 120$ | Applicant age in years |
| `person_income` | Float | $\ge 0.0$ | Annual gross income |
| `person_home_ownership` | String | `RENT`, `MORTGAGE`, `OWN`, `OTHER` | Residential housing status |
| `person_emp_length` | Float | $0.0 \le \text{emp} \le 70.0$ | Continuous employment duration (years) |
| `loan_intent` | String | `PERSONAL`, `EDUCATION`, `MEDICAL`, `VENTURE`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION` | Stated loan purpose |
| `loan_grade` | String | `A`, `B`, `C`, `D`, `E`, `F`, `G` | Risk grading tier ($A$ is lowest risk) |
| `loan_amnt` | Float | $100.0 \le \text{amnt} \le 10,000,000.0$ | Requested principal loan amount |
| `loan_int_rate` | Float | $0.0 \le \text{rate} \le 50.0$ | Contract annual interest rate ($\%$) |
| `loan_percent_income` | Float | $0.0 \le \text{ratio} \le 2.5$ | Loan amount divided by annual income |
| `cb_person_default_on_file`| String | `Y`, `N` | Historical delinquency / default record |
| `cb_person_cred_hist_length` | Integer | $0 \le \text{hist} \le 60$ | Length of credit bureau history (years) |

### End-to-End Prediction Flow

```
[ User Input / Client Dashboard ]
              │
              ▼  (JSON POST /predict)
[ Pydantic v2 LoanApplication Schema Validation ]
              │
              ▼  (Validated pd.DataFrame)
[ Scikit-learn Pipeline (ColumnTransformer) ]
   ├── Numerical: SimpleImputer(strategy='median')
   └── Categorical: SimpleImputer + OneHotEncoder(drop='first', handle_unknown='ignore')
              │
              ▼
[ XGBoost Classifier + CalibratedClassifierCV ]
   └── Generates Calibrated Default Probability P(Default)
              │
              ▼
[ Decision Threshold Comparison ]
   ├── If P(Default) >= 0.4328 ──► Class 1 ("High Risk")
   └── If P(Default) <  0.4328 ──► Class 0 ("Low Risk")
              │
              ▼  (JSON Response)
[ Interactive Frontend Rendering & Gauge Animation ]
```

---

## 6. Local Installation & Environment Setup

### Prerequisites
- Python 3.12 (recommended: Python 3.12.8)
- Conda or virtualenv
- Git

### Option A: Using Conda (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd Credit-Risk-Management

# 2. Create and activate Conda environment
conda create -n credit-risk-assess python=3.12 -y
conda activate credit-risk-assess

# 3. Install pinned dependencies
pip install -r requirements.txt
```

### Option B: Using Standard Python Virtual Environment

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# 3. Install pinned dependencies
pip install -r requirements.txt
```

---

## 7. Running the Application Locally

### Using the Direct Python Entry Point

```bash
python main.py
```
*The application starts on `http://0.0.0.0:8000` (or the port specified by the `PORT` environment variable).*

### Using Uvicorn Directly

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser to:
- **Web Dashboard:** `http://localhost:8000/`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`
- **Service Health Check:** `http://localhost:8000/health`

---

## 8. API Specification & Endpoints

### 1. `GET /health`
Probes service health, artifact status, and decision threshold.

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "threshold_loaded": true,
  "threshold": 0.4328407049179077,
  "version": "1.0.0"
}
```

### 2. `GET /api/info`
Surfaces model metadata and expected feature schema.

**Response (`200 OK`):**
```json
{
  "service": "Credit Risk Management",
  "model_name": "Calibrated XGBoost Classifier",
  "model_class": "CalibratedClassifierCV",
  "threshold": 0.4328407049179077,
  "features_count": 11,
  "features": [
    "person_age",
    "person_income",
    "person_home_ownership",
    "person_emp_length",
    "loan_intent",
    "loan_grade",
    "loan_amnt",
    "loan_int_rate",
    "loan_percent_income",
    "cb_person_default_on_file",
    "cb_person_cred_hist_length"
  ],
  "target": "loan_status (0=Non-Default, 1=Default)"
}
```

### 3. `POST /predict`
Evaluates applicant credit risk and returns default probability and classification.

**Request Payload:**
```json
{
  "person_age": 30,
  "person_income": 65000.0,
  "person_home_ownership": "RENT",
  "person_emp_length": 6.0,
  "loan_intent": "EDUCATION",
  "loan_grade": "B",
  "loan_amnt": 8000.0,
  "loan_int_rate": 9.5,
  "loan_percent_income": 0.12,
  "cb_person_default_on_file": "N",
  "cb_person_cred_hist_length": 6
}
```

**Response (`200 OK`):**
```json
{
  "default_probability": 0.04061716509098045,
  "default_prediction": 0,
  "threshold": 0.4328407049179077,
  "Result": "Low Risk"
}
```

**Validation Error (`422 Unprocessable Entity`):**
If any feature is out-of-bounds (e.g., `person_age: 16`), an unseen category is provided, or unexpected keys are included, a structured 422 error is returned detailing the validation violation.

---

## 9. Render Deployment Guide

The application is pre-configured for automated or manual deployment on Render as a Python Web Service.

### Deployment Configuration Summary

- **Runtime:** Python 3.12
- **Build Command:**
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command:**
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```
- **Health Check Path:**
  ```text
  /health
  ```
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.12.8`

### Step-by-Step Render Deployment Instructions

1. Push this repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Web Service**.
4. Connect your Git repository.
5. Configure the service settings:
   - **Name:** `credit-risk-management`
   - **Region:** Choose the region closest to your users.
   - **Branch:** `main` (or your default branch)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Under **Advanced Settings**:
   - Set **Health Check Path** to `/health`.
   - Add Environment Variable:
     - Key: `PYTHON_VERSION`
     - Value: `3.12.8`
7. Click **Create Web Service**. Render will install dependencies, load the serialized model artifacts, run health checks, and serve the dashboard.

*(Alternatively, if using Render Blueprints, Render will automatically detect `render.yaml` located at the root of the repository).*

---

## 10. Automated Testing & Verification

A comprehensive Pytest test suite is included in `test_app.py` covering health endpoints, model inference, prediction thresholds, validation rules, and static asset serving.

Run the test suite locally:

```bash
pytest test_app.py -v
```

Expected output:
```text
test_app.py::test_health_check PASSED                                    [ 12%]
test_app.py::test_api_info PASSED                                        [ 25%]
test_app.py::test_predict_low_risk_applicant PASSED                      [ 37%]
test_app.py::test_predict_high_risk_applicant PASSED                     [ 50%]
test_app.py::test_validation_underage PASSED                             [ 62%]
test_app.py::test_validation_invalid_categorical PASSED                  [ 75%]
test_app.py::test_validation_extra_fields_forbidden PASSED               [ 87%]
test_app.py::test_static_frontend_served PASSED                          [100%]
======================== 8 passed in ~5s =========================
```

---

## 11. Known Limitations & Model Considerations

1. **Non-Decision Engine:** The application predicts statistical default risk based on historical correlations. It is not an automated loan approval engine and must not be used as the sole basis for adverse credit decisions.
2. **Feature Coverage:** The model assumes the 11 input features are available and verified. Missing bureau history or unverified income should not be filled arbitrarily.
3. **Distribution Shift:** Model performance may degrade if macroeconomic conditions (such as interest rate shocks or regulatory lending criteria) diverge substantially from the distribution represented in `credit_risk_dataset.csv`.
4. **Explainability Scope:** Global calibration and threshold tuning are implemented; individual local feature attributions (e.g. SHAP values) are documented in `credit_risk_assessment.ipynb` for offline research rather than calculated per-request to preserve low-latency API response times.

---

## 12. Learning Resources & Attribution

This project was developed as a hands-on Machine Learning engineering project inspired by consumer credit risk assessment methodologies.

- **Dataset:** Credit Risk Benchmark Dataset (`credit_risk_dataset.csv`)
- **Tutorial Reference:** Inspired by foundational credit scoring tutorials, with independent architectural redesign, probability calibration, threshold optimization, production API hardening, and UI/UX modernization.
- **License:** Educational and demonstration use.
