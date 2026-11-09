import os
import logging
from pathlib import Path
from typing import Literal, Dict, Any
from contextlib import asynccontextmanager

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("credit_risk")

# ---------------------------------------------------------------------------
# Base directory & artifact paths (relative to application root)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "credit_risk_model.pkl"
THRESHOLD_PATH = BASE_DIR / "best_threshold.pkl"
STATIC_DIR = BASE_DIR / "static"

# Shared storage for loaded ML artifacts
ml_artifacts: Dict[str, Any] = {}

EXPECTED_FEATURES = [
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
    "cb_person_cred_hist_length",
]


# ---------------------------------------------------------------------------
# Lifespan context manager for safe startup & shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load and validate ML artifacts on startup; cleanup on shutdown."""
    logger.info("Initializing Credit Risk Management service...")

    if not MODEL_PATH.is_file():
        err = f"Model artifact missing: {MODEL_PATH}"
        logger.critical(err)
        raise RuntimeError(err)

    if not THRESHOLD_PATH.is_file():
        err = f"Threshold artifact missing: {THRESHOLD_PATH}"
        logger.critical(err)
        raise RuntimeError(err)

    try:
        model = joblib.load(MODEL_PATH)
        threshold_raw = joblib.load(THRESHOLD_PATH)
        threshold = float(threshold_raw)

        ml_artifacts["model"] = model
        ml_artifacts["threshold"] = threshold
        ml_artifacts["model_name"] = type(model).__name__

        logger.info(
            f"Successfully loaded model '{ml_artifacts['model_name']}' "
            f"and decision threshold ({threshold:.4f})"
        )
    except Exception as exc:
        logger.critical(f"Failed to load ML artifacts: {exc}", exc_info=True)
        raise RuntimeError(f"Corrupted or invalid ML artifacts: {exc}") from exc

    yield

    ml_artifacts.clear()
    logger.info("Credit Risk Management service shutdown complete.")


# ---------------------------------------------------------------------------
# FastAPI application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Credit Risk Management API",
    description="Production-ready underwriting risk assessment service using Calibrated XGBoost.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Input & Output Schemas
# ---------------------------------------------------------------------------
class LoanApplication(BaseModel):
    """Strict schema for loan application evaluation with validation bounds."""
    model_config = ConfigDict(extra="forbid")

    person_age: int = Field(
        ..., ge=18, le=120, description="Applicant age in years (18-120)"
    )
    person_income: float = Field(
        ..., ge=0.0, le=100_000_000.0, description="Applicant annual income in currency units"
    )
    person_home_ownership: Literal["RENT", "MORTGAGE", "OWN", "OTHER"] = Field(
        ..., description="Home ownership category"
    )
    person_emp_length: float = Field(
        ..., ge=0.0, le=70.0, description="Employment duration in years"
    )
    loan_intent: Literal[
        "PERSONAL", "EDUCATION", "MEDICAL", "VENTURE", "HOMEIMPROVEMENT", "DEBTCONSOLIDATION"
    ] = Field(..., description="Purpose / intent of the loan")
    loan_grade: Literal["A", "B", "C", "D", "E", "F", "G"] = Field(
        ..., description="Assigned credit risk tier (A is prime, G is highest risk)"
    )
    loan_amnt: float = Field(
        ..., ge=100.0, le=10_000_000.0, description="Requested loan amount"
    )
    loan_int_rate: float = Field(
        ..., ge=0.0, le=50.0, description="Annual interest rate percentage"
    )
    loan_percent_income: float = Field(
        ..., ge=0.0, le=2.5, description="Loan amount relative to annual income (ratio)"
    )
    cb_person_default_on_file: Literal["Y", "N"] = Field(
        ..., description="Historical credit bureau default indicator (Y=Yes, N=No)"
    )
    cb_person_cred_hist_length: int = Field(
        ..., ge=0, le=60, description="Credit history length in years"
    )


class PredictionResponse(BaseModel):
    """Prediction output schema preserving existing contract."""
    default_probability: float
    default_prediction: int
    threshold: float
    Result: str


# ---------------------------------------------------------------------------
# Health & Status Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Monitoring"])
def health_check():
    """Health check endpoint for Render, load balancers, and monitoring."""
    model_ready = "model" in ml_artifacts and ml_artifacts["model"] is not None
    threshold_ready = "threshold" in ml_artifacts and ml_artifacts["threshold"] is not None

    is_healthy = model_ready and threshold_ready

    payload = {
        "status": "healthy" if is_healthy else "unhealthy",
        "model_loaded": model_ready,
        "threshold_loaded": threshold_ready,
        "threshold": ml_artifacts.get("threshold"),
        "version": "1.0.0",
    }

    if not is_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    return payload


@app.get("/api/info", tags=["Monitoring"])
def model_info():
    """Returns verified model metadata and feature specifications."""
    if "model" not in ml_artifacts:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not currently loaded",
        )

    return {
        "service": "Credit Risk Management",
        "model_name": "Calibrated XGBoost Classifier",
        "model_class": ml_artifacts.get("model_name"),
        "threshold": ml_artifacts.get("threshold"),
        "features_count": len(EXPECTED_FEATURES),
        "features": EXPECTED_FEATURES,
        "target": "loan_status (0=Non-Default, 1=Default)",
    }


# ---------------------------------------------------------------------------
# Prediction Endpoint
# ---------------------------------------------------------------------------
@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
def predict(data: LoanApplication):
    """
    Evaluates loan applicant risk.
    Computes default probability using Calibrated XGBoost and compares
    against the optimal decision threshold to classify Risk Level.
    """
    if "model" not in ml_artifacts or "threshold" not in ml_artifacts:
        logger.error("Predict called while model or threshold is not loaded.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction model is currently initializing or unavailable.",
        )

    try:
        # Construct DataFrame with the exact feature order expected by the model pipeline
        input_data = data.model_dump()
        input_df = pd.DataFrame([input_data])[EXPECTED_FEATURES]

        model = ml_artifacts["model"]
        threshold = ml_artifacts["threshold"]

        # Generate calibrated default probability
        probabilities = model.predict_proba(input_df)
        probability = float(probabilities[:, 1][0])

        # Apply classification threshold
        prediction = int(probability >= threshold)

        result_label = "High Risk" if prediction == 1 else "Low Risk"

        return {
            "default_probability": probability,
            "default_prediction": prediction,
            "threshold": threshold,
            "Result": result_label,
        }

    except Exception as exc:
        logger.error(f"Inference error during prediction: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while evaluating the credit risk application.",
        )


# ---------------------------------------------------------------------------
# Static assets serving (serves modern frontend dashboard)
# ---------------------------------------------------------------------------
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
else:
    logger.warning(f"Static directory not found at {STATIC_DIR}")


# ---------------------------------------------------------------------------
# Direct execution entry point (supports Render PORT environment variable)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)
