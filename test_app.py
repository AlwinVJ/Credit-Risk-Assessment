"""
Comprehensive test suite for Credit Risk Management application.
Tests model integrity, API contracts, input validation, threshold logic, and static serving.
"""

import pytest
from fastapi.testclient import TestClient
from main import app, ml_artifacts, EXPECTED_FEATURES


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    """Verify /health returns 200 with healthy state and loaded model."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["threshold_loaded"] is True
    assert isinstance(data["threshold"], float)
    assert 0.0 < data["threshold"] < 1.0


def test_api_info(client):
    """Verify /api/info returns verified model metadata and feature list."""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Credit Risk Management"
    assert data["features_count"] == 11
    assert data["features"] == EXPECTED_FEATURES
    assert isinstance(data["threshold"], float)


def test_predict_low_risk_applicant(client):
    """Verify /predict returns Low Risk for prime applicant profile."""
    payload = {
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
        "cb_person_cred_hist_length": 6,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "default_probability" in data
    assert "default_prediction" in data
    assert "threshold" in data
    assert "Result" in data

    assert 0.0 <= data["default_probability"] <= 1.0
    assert data["default_prediction"] == 0
    assert data["Result"] == "Low Risk"
    assert data["default_prediction"] == int(data["default_probability"] >= data["threshold"])


def test_predict_high_risk_applicant(client):
    """Verify /predict returns High Risk for subprime applicant profile."""
    payload = {
        "person_age": 23,
        "person_income": 22000.0,
        "person_home_ownership": "RENT",
        "person_emp_length": 1.0,
        "loan_intent": "DEBTCONSOLIDATION",
        "loan_grade": "E",
        "loan_amnt": 15000.0,
        "loan_int_rate": 18.5,
        "loan_percent_income": 0.68,
        "cb_person_default_on_file": "Y",
        "cb_person_cred_hist_length": 2,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["default_probability"] <= 1.0
    assert data["default_prediction"] == 1
    assert data["Result"] == "High Risk"
    assert data["default_prediction"] == int(data["default_probability"] >= data["threshold"])


def test_validation_underage(client):
    """Verify input validation rejects applicants younger than 18."""
    payload = {
        "person_age": 16,
        "person_income": 50000.0,
        "person_home_ownership": "RENT",
        "person_emp_length": 2.0,
        "loan_intent": "PERSONAL",
        "loan_grade": "A",
        "loan_amnt": 5000.0,
        "loan_int_rate": 7.5,
        "loan_percent_income": 0.1,
        "cb_person_default_on_file": "N",
        "cb_person_cred_hist_length": 2,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_validation_invalid_categorical(client):
    """Verify input validation rejects unseen categorical values."""
    payload = {
        "person_age": 28,
        "person_income": 50000.0,
        "person_home_ownership": "CONDO_INVALID",
        "person_emp_length": 3.0,
        "loan_intent": "PERSONAL",
        "loan_grade": "A",
        "loan_amnt": 5000.0,
        "loan_int_rate": 7.5,
        "loan_percent_income": 0.1,
        "cb_person_default_on_file": "N",
        "cb_person_cred_hist_length": 4,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_validation_extra_fields_forbidden(client):
    """Verify extra payload fields are rejected."""
    payload = {
        "person_age": 28,
        "person_income": 50000.0,
        "person_home_ownership": "RENT",
        "person_emp_length": 3.0,
        "loan_intent": "PERSONAL",
        "loan_grade": "A",
        "loan_amnt": 5000.0,
        "loan_int_rate": 7.5,
        "loan_percent_income": 0.1,
        "cb_person_default_on_file": "N",
        "cb_person_cred_hist_length": 4,
        "unexpected_field": "disallowed",
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_static_frontend_served(client):
    """Verify index.html is served from root URL."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Credit Risk Management" in response.text
    assert "loanForm" in response.text
