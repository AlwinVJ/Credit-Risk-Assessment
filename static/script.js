/**
 * Credit Risk Management — Underwriting Dashboard Controller
 * Modern fintech client for FastAPI / Calibrated XGBoost backend.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------------------------
  const form = document.getElementById("loanForm");
  const submitBtn = document.getElementById("submitBtn");
  const formError = document.getElementById("formError");
  const formErrorMessage = document.getElementById("formErrorMessage");

  // Status Elements
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const kpiThreshold = document.getElementById("kpiThreshold");

  // Form Inputs
  const ageInput = document.getElementById("person_age");
  const incomeInput = document.getElementById("person_income");
  const homeOwnershipInput = document.getElementById("person_home_ownership");
  const empLengthInput = document.getElementById("person_emp_length");
  const loanIntentInput = document.getElementById("loan_intent");
  const loanGradeInput = document.getElementById("loan_grade");
  const loanAmntInput = document.getElementById("loan_amnt");
  const loanIntRateInput = document.getElementById("loan_int_rate");
  const loanPercentIncomeInput = document.getElementById("loan_percent_income");
  const defaultOnFileInput = document.getElementById("cb_person_default_on_file");
  const credHistLengthInput = document.getElementById("cb_person_cred_hist_length");

  // LTI Dynamic Controls
  const ltiBadge = document.getElementById("ltiBadge");
  const ltiFormula = document.getElementById("ltiFormula");
  const btnResetLti = document.getElementById("btnResetLti");

  // Preset Buttons
  const btnPresetPrime = document.getElementById("btnPresetPrime");
  const btnPresetBorderline = document.getElementById("btnPresetBorderline");
  const btnPresetSubprime = document.getElementById("btnPresetSubprime");
  const btnResetForm = document.getElementById("btnResetForm");

  // Results & Visualizer
  const awaitingState = document.getElementById("awaitingState");
  const resultsPanel = document.getElementById("resultsPanel");
  const verdictBanner = document.getElementById("verdictBanner");
  const verdictIcon = document.getElementById("verdictIcon");
  const verdictHeadline = document.getElementById("verdictHeadline");
  const verdictSummary = document.getElementById("verdictSummary");

  const gaugeProgress = document.getElementById("gaugeProgress");
  const probValue = document.getElementById("probValue");
  const metaThreshold = document.getElementById("metaThreshold");
  const metaMargin = document.getElementById("metaMargin");
  const metaClass = document.getElementById("metaClass");

  const spectrumThresholdMarker = document.getElementById("spectrumThresholdMarker");
  const spectrumApplicantMarker = document.getElementById("spectrumApplicantMarker");
  const spectrumThreshLabel = document.getElementById("spectrumThreshLabel");

  const tableProb = document.getElementById("tableProb");
  const tableThreshold = document.getElementById("tableThreshold");
  const tableResult = document.getElementById("tableResult");
  const tableLti = document.getElementById("tableLti");
  const interpretationText = document.getElementById("interpretationText");

  // Constants
  const GAUGE_CIRCUMFERENCE = 515.22; // 2 * PI * 82
  let activeThreshold = 0.4328;
  let isLtiOverridden = false;

  // ---------------------------------------------------------------------------
  // 1. Service Health Check & Initialization
  // ---------------------------------------------------------------------------
  async function checkServiceHealth() {
    try {
      const res = await fetch("/health", { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === "healthy") {
        statusDot.className = "status-dot online";
        statusText.textContent = "System Online • API Ready";

        if (typeof data.threshold === "number") {
          activeThreshold = data.threshold;
          const threshPct = (activeThreshold * 100).toFixed(2);
          if (kpiThreshold) kpiThreshold.textContent = `${threshPct}%`;
          if (metaThreshold) metaThreshold.textContent = `${threshPct}%`;
          if (spectrumThreshLabel) spectrumThreshLabel.textContent = `Threshold: ${threshPct}%`;
          if (spectrumThresholdMarker) spectrumThresholdMarker.style.left = `${threshPct}%`;
        }
      } else {
        throw new Error("Service reported unhealthy status");
      }
    } catch (err) {
      statusDot.className = "status-dot offline";
      statusText.textContent = "Backend Offline";
      console.warn("Credit Risk API health check failed:", err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Loan-to-Income (LTI) Dynamic Ratio Calculation
  // ---------------------------------------------------------------------------
  function formatCurrency(val) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  function calculateLti() {
    const income = parseFloat(incomeInput.value) || 0;
    const amount = parseFloat(loanAmntInput.value) || 0;

    if (income > 0) {
      const ratio = amount / income;
      const formattedRatio = Math.min(2.0, Math.max(0, ratio)).toFixed(2);

      if (!isLtiOverridden) {
        loanPercentIncomeInput.value = formattedRatio;
      }

      ltiFormula.textContent = `Loan (${formatCurrency(amount)}) / Income (${formatCurrency(income)}) = ${(amount / income).toFixed(2)}`;
    } else {
      if (!isLtiOverridden) {
        loanPercentIncomeInput.value = "0.00";
      }
      ltiFormula.textContent = "Income must be greater than $0 to compute LTI.";
    }
  }

  // Manual override detection
  loanPercentIncomeInput.addEventListener("input", () => {
    isLtiOverridden = true;
    ltiBadge.textContent = "Manual Override";
    ltiBadge.classList.add("overridden");
    btnResetLti.hidden = false;
  });

  btnResetLti.addEventListener("click", () => {
    isLtiOverridden = false;
    ltiBadge.textContent = "Auto-calculated";
    ltiBadge.classList.remove("overridden");
    btnResetLti.hidden = true;
    calculateLti();
  });

  incomeInput.addEventListener("input", calculateLti);
  loanAmntInput.addEventListener("input", calculateLti);

  // ---------------------------------------------------------------------------
  // 3. Preset Scenario Profiles
  // ---------------------------------------------------------------------------
  const PRESETS = {
    prime: {
      person_age: 30,
      person_income: 65000,
      person_home_ownership: "RENT",
      person_emp_length: 6.0,
      loan_intent: "EDUCATION",
      loan_grade: "B",
      loan_amnt: 8000,
      loan_int_rate: 9.50,
      loan_percent_income: 0.12,
      cb_person_default_on_file: "N",
      cb_person_cred_hist_length: 6,
    },
    borderline: {
      person_age: 22,
      person_income: 12000,
      person_home_ownership: "MORTGAGE",
      person_emp_length: 7.0,
      loan_intent: "EDUCATION",
      loan_grade: "D",
      loan_amnt: 1500,
      loan_int_rate: 14.84,
      loan_percent_income: 0.13,
      cb_person_default_on_file: "Y",
      cb_person_cred_hist_length: 3,
    },
    subprime: {
      person_age: 23,
      person_income: 22000,
      person_home_ownership: "RENT",
      person_emp_length: 1.0,
      loan_intent: "DEBTCONSOLIDATION",
      loan_grade: "E",
      loan_amnt: 15000,
      loan_int_rate: 18.50,
      loan_percent_income: 0.68,
      cb_person_default_on_file: "Y",
      cb_person_cred_hist_length: 2,
    },
  };

  function applyPreset(preset) {
    ageInput.value = preset.person_age;
    incomeInput.value = preset.person_income;
    homeOwnershipInput.value = preset.person_home_ownership;
    empLengthInput.value = preset.person_emp_length;
    loanIntentInput.value = preset.loan_intent;
    loanGradeInput.value = preset.loan_grade;
    loanAmntInput.value = preset.loan_amnt;
    loanIntRateInput.value = preset.loan_int_rate;

    isLtiOverridden = false;
    ltiBadge.textContent = "Auto-calculated";
    ltiBadge.classList.remove("overridden");
    btnResetLti.hidden = true;
    loanPercentIncomeInput.value = preset.loan_percent_income;

    defaultOnFileInput.value = preset.cb_person_default_on_file;
    credHistLengthInput.value = preset.cb_person_cred_hist_length;

    calculateLti();
    clearError();
  }

  btnPresetPrime.addEventListener("click", () => applyPreset(PRESETS.prime));
  btnPresetBorderline.addEventListener("click", () => applyPreset(PRESETS.borderline));
  btnPresetSubprime.addEventListener("click", () => applyPreset(PRESETS.subprime));

  btnResetForm.addEventListener("click", () => {
    applyPreset(PRESETS.prime);
    if (resultsPanel) resultsPanel.hidden = true;
    if (awaitingState) awaitingState.hidden = false;
    clearError();
  });

  // ---------------------------------------------------------------------------
  // 4. UI State Helpers
  // ---------------------------------------------------------------------------
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
    const btnText = submitBtn.querySelector(".btn-text");
    if (btnText) {
      btnText.textContent = isLoading
        ? "Evaluating Credit Risk…"
        : "Assess Credit Risk";
    }
  }

  function showError(msg) {
    formErrorMessage.textContent = msg;
    formError.hidden = false;
  }

  function clearError() {
    formError.hidden = true;
    formErrorMessage.textContent = "";
  }

  // Smooth number ticker animation
  function animateTicker(el, fromVal, toVal, durationMs = 900) {
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromVal + (toVal - fromVal) * eased;
      el.textContent = current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = toVal.toFixed(1);
      }
    }
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // 5. Render Verdict & Visualizations
  // ---------------------------------------------------------------------------
  function renderVerdict(data) {
    const probability = Number(data.default_probability) || 0;
    const threshold = Number(data.threshold) || activeThreshold;
    const isHighRisk = data.default_prediction === 1;
    const probPct = probability * 100;
    const threshPct = threshold * 100;

    // Switch view from placeholder to results
    awaitingState.hidden = true;
    resultsPanel.hidden = false;

    // Update Verdict Banner
    verdictBanner.className = `verdict-banner ${isHighRisk ? "verdict--high" : "verdict--low"}`;

    if (isHighRisk) {
      verdictHeadline.textContent = "HIGH RISK — DEFAULT WARNING";
      verdictSummary.textContent = `Calibrated default probability of ${probPct.toFixed(1)}% exceeds the ${threshPct.toFixed(1)}% decision threshold.`;
      verdictIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `;
    } else {
      verdictHeadline.textContent = "LOW RISK — FAVORABLE PROFILE";
      verdictSummary.textContent = `Calibrated default probability of ${probPct.toFixed(1)}% is safely below the ${threshPct.toFixed(1)}% decision threshold.`;
      verdictIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      `;
    }

    // Circular Gauge Animation
    const strokeOffset = GAUGE_CIRCUMFERENCE * (1 - Math.min(1, probability));
    gaugeProgress.style.stroke = isHighRisk ? "var(--risk-high)" : "var(--risk-low)";
    requestAnimationFrame(() => {
      gaugeProgress.style.strokeDashoffset = strokeOffset;
    });

    // Probability readout ticker
    animateTicker(probValue, 0, probPct, 1000);

    // Meta stats
    const margin = probPct - threshPct;
    const marginSign = margin >= 0 ? "+" : "";
    metaThreshold.textContent = `${threshPct.toFixed(2)}%`;
    metaMargin.textContent = `${marginSign}${margin.toFixed(1)}%`;
    metaMargin.style.color = isHighRisk ? "var(--risk-high)" : "var(--risk-low)";
    metaClass.textContent = `${data.default_prediction} (${isHighRisk ? "Default Risk" : "Non-Default"})`;

    // Linear Spectrum Markers
    const markerLeft = Math.min(100, Math.max(0, probPct));
    spectrumApplicantMarker.style.left = `${markerLeft}%`;
    spectrumThresholdMarker.style.left = `${threshPct}%`;

    // Metrics Ledger Table
    tableProb.textContent = `${probPct.toFixed(2)}%`;
    tableProb.style.color = isHighRisk ? "var(--risk-high)" : "var(--risk-low)";
    tableThreshold.textContent = `${threshPct.toFixed(2)}%`;
    tableResult.textContent = data.Result || (isHighRisk ? "High Risk" : "Low Risk");
    tableResult.style.color = isHighRisk ? "var(--risk-high)" : "var(--risk-low)";

    const ltiVal = parseFloat(loanPercentIncomeInput.value) || 0;
    let ltiTier = "Conservative";
    if (ltiVal > 0.40) ltiTier = "Elevated Exposure";
    else if (ltiVal > 0.20) ltiTier = "Moderate Exposure";
    tableLti.textContent = `${(ltiVal * 100).toFixed(1)}% (${ltiTier})`;

    // Underwriting Interpretation Text
    if (isHighRisk) {
      interpretationText.innerHTML = `
        The applicant has been assigned a <strong>High Risk</strong> tier because the model-estimated default probability of <strong>${probPct.toFixed(1)}%</strong> surpasses the tuned decision threshold of <strong>${threshPct.toFixed(1)}%</strong>. 
        Contributing factors typically include higher leverage relative to earnings (LTI: ${(ltiVal * 100).toFixed(0)}%), risk grade classification, or previous delinquency markers in the bureau file.
      `;
    } else {
      interpretationText.innerHTML = `
        The applicant has been assigned a <strong>Low Risk</strong> tier because the estimated default probability of <strong>${probPct.toFixed(1)}%</strong> remains comfortably below the optimal cutoff of <strong>${threshPct.toFixed(1)}%</strong>. 
        This profile indicates healthy debt coverage (LTI: ${(ltiVal * 100).toFixed(0)}%), favorable credit tiering, and compliant bureau history.
      `;
    }

    // Smooth scroll into view on small screens
    if (window.innerWidth <= 1024) {
      resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Form Submission & API Request
  // ---------------------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    // Client-side validation checks
    const age = parseInt(ageInput.value, 10);
    const income = parseFloat(incomeInput.value);
    const empLength = parseFloat(empLengthInput.value);
    const amount = parseFloat(loanAmntInput.value);
    const rate = parseFloat(loanIntRateInput.value);
    const percentIncome = parseFloat(loanPercentIncomeInput.value);
    const credHist = parseInt(credHistLengthInput.value, 10);

    if (isNaN(age) || age < 18 || age > 120) {
      showError("Applicant age must be an integer between 18 and 120.");
      ageInput.focus();
      return;
    }

    if (isNaN(income) || income < 0) {
      showError("Annual income must be a valid positive number.");
      incomeInput.focus();
      return;
    }

    if (isNaN(amount) || amount < 100) {
      showError("Requested loan amount must be at least $100.");
      loanAmntInput.focus();
      return;
    }

    if (isNaN(rate) || rate < 0 || rate > 50) {
      showError("Interest rate must be between 0.0% and 50.0%.");
      loanIntRateInput.focus();
      return;
    }

    if (isNaN(percentIncome) || percentIncome < 0 || percentIncome > 2.5) {
      showError("Loan-to-income ratio must be between 0.0 and 2.5.");
      loanPercentIncomeInput.focus();
      return;
    }

    const payload = {
      person_age: age,
      person_income: income,
      person_home_ownership: homeOwnershipInput.value,
      person_emp_length: empLength,
      loan_intent: loanIntentInput.value,
      loan_grade: loanGradeInput.value,
      loan_amnt: amount,
      loan_int_rate: rate,
      loan_percent_income: percentIncome,
      cb_person_default_on_file: defaultOnFileInput.value,
      cb_person_cred_hist_length: credHist,
    };

    setLoading(true);

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errDetail = `Server responded with status ${res.status}`;
        try {
          const errorJson = await res.json();
          if (errorJson.detail) {
            errDetail = Array.isArray(errorJson.detail)
              ? errorJson.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
              : errorJson.detail;
          }
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await res.json();
      renderVerdict(data);
    } catch (err) {
      showError(`Assessment failed: ${err.message || "Unable to reach prediction service."}`);
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Initial Bootstrap
  // ---------------------------------------------------------------------------
  calculateLti();
  checkServiceHealth();

  // Periodic health ping every 30 seconds
  setInterval(checkServiceHealth, 30000);
})();
