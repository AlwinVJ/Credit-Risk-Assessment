/**
 * Credit Risk Management — Frontend Controller
 * Implements theme switching (Light/Dark), dynamic LTI calculation,
 * semicircular gauge animation, modal navigation, form validation,
 * empty initial state, and FastAPI /predict integration.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------------------------
  // Form elements
  const loanForm = document.getElementById("loanForm");
  const assessBtn = document.getElementById("assessBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Inputs
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
  const ltiBadgeDisplay = document.getElementById("ltiBadgeDisplay");

  // Result card elements
  const riskBanner = document.getElementById("riskBanner");
  const riskBannerIcon = document.getElementById("riskBannerIcon");
  const riskStatusTitle = document.getElementById("riskStatusTitle");
  const riskStatusDesc = document.getElementById("riskStatusDesc");

  const gaugeTrackFill = document.getElementById("gaugeTrackFill");
  const gaugeProbNumber = document.getElementById("gaugeProbNumber");
  const gaugeCaptionLabel = document.getElementById("gaugeCaptionLabel");
  const thresholdDisplayPill = document.getElementById("thresholdDisplayPill");
  const modalThresholdVal = document.getElementById("modalThresholdVal");

  // Navigation & Theme
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeText = document.getElementById("themeText");
  const apiStatusPill = document.getElementById("apiStatusPill");
  const apiStatusIcon = document.getElementById("apiStatusIcon");
  const apiStatusText = document.getElementById("apiStatusText");

  const navAssessmentBtn = document.getElementById("navAssessmentBtn");
  const navAboutBtn = document.getElementById("navAboutBtn");
  const navHowItWorksBtn = document.getElementById("navHowItWorksBtn");

  const aboutModal = document.getElementById("aboutModal");
  const closeAboutModal = document.getElementById("closeAboutModal");
  const howItWorksModal = document.getElementById("howItWorksModal");
  const closeHowModal = document.getElementById("closeHowModal");

  // Constants & State
  const GAUGE_LENGTH = 235.62; // pi * 75
  let activeThreshold = 0.4328;
  let hasActivePrediction = false;

  // ---------------------------------------------------------------------------
  // 1. Theme Management (Light / Dark Mode)
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("crm_theme", theme);
    } catch (e) {}

    if (themeText) {
      themeText.textContent = theme === "dark" ? "Dark" : "Light";
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
  }

  themeToggleBtn.addEventListener("click", toggleTheme);

  // Sync initial button text
  const initialTheme = document.documentElement.getAttribute("data-theme") || "light";
  if (themeText) themeText.textContent = initialTheme === "dark" ? "Dark" : "Light";

  // Listen to OS theme changes if user hasn't explicitly set a preference
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("crm_theme")) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Modals & Navigation
  // ---------------------------------------------------------------------------
  function openModal(modal) {
    modal.hidden = false;
  }

  function closeModal(modal) {
    modal.hidden = true;
  }

  navAboutBtn.addEventListener("click", () => openModal(aboutModal));
  closeAboutModal.addEventListener("click", () => closeModal(aboutModal));
  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) closeModal(aboutModal);
  });

  navHowItWorksBtn.addEventListener("click", () => openModal(howItWorksModal));
  closeHowModal.addEventListener("click", () => closeModal(howItWorksModal));
  howItWorksModal.addEventListener("click", (e) => {
    if (e.target === howItWorksModal) closeModal(howItWorksModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(aboutModal);
      closeModal(howItWorksModal);
    }
  });

  navAssessmentBtn.addEventListener("click", () => {
    ageInput.focus();
    ageInput.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ---------------------------------------------------------------------------
  // 3. API Health Check
  // ---------------------------------------------------------------------------
  async function checkHealth() {
    try {
      const res = await fetch("/health", { method: "GET" });
      if (!res.ok) throw new Error("Unhealthy");
      const data = await res.json();

      if (data.status === "healthy") {
        apiStatusPill.className = "api-status-pill online";
        apiStatusIcon.textContent = "✔";
        apiStatusText.textContent = "API Online";

        if (typeof data.threshold === "number") {
          activeThreshold = data.threshold;
          const formattedCutoff = activeThreshold.toFixed(2);
          if (thresholdDisplayPill) thresholdDisplayPill.textContent = formattedCutoff;
          if (modalThresholdVal) modalThresholdVal.textContent = activeThreshold.toFixed(4);
        }
      } else {
        throw new Error("Degraded");
      }
    } catch (_) {
      apiStatusPill.className = "api-status-pill offline";
      apiStatusIcon.textContent = "✖";
      apiStatusText.textContent = "API Offline";
    }
  }

  checkHealth();
  setInterval(checkHealth, 30000);

  // ---------------------------------------------------------------------------
  // 4. Currency Formatting & Dynamic Loan-to-Income (LTI) Calculation
  // ---------------------------------------------------------------------------
  function parseCurrency(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.-]+/g, "")) || 0;
  }

  function formatWithCommas(num) {
    if (isNaN(num) || num <= 0) return "";
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
  }

  function calculateLTI() {
    const rawIncome = incomeInput.value.trim();
    const rawAmount = loanAmntInput.value.trim();

    if (!rawIncome || !rawAmount) {
      ltiBadgeDisplay.textContent = "—";
      loanPercentIncomeInput.value = "";
      return;
    }

    const income = parseCurrency(rawIncome);
    const amount = parseCurrency(rawAmount);

    if (income > 0 && amount > 0) {
      const exactRatio = amount / income;
      ltiBadgeDisplay.textContent = exactRatio.toFixed(4);
      loanPercentIncomeInput.value = parseFloat(exactRatio.toFixed(2));
    } else {
      ltiBadgeDisplay.textContent = "—";
      loanPercentIncomeInput.value = "";
    }
  }

  // Format on blur only if user has entered content
  incomeInput.addEventListener("blur", () => {
    if (!incomeInput.value.trim()) return;
    const val = parseCurrency(incomeInput.value);
    if (val > 0) {
      incomeInput.value = formatWithCommas(val);
    }
    calculateLTI();
  });

  incomeInput.addEventListener("input", calculateLTI);

  loanAmntInput.addEventListener("blur", () => {
    if (!loanAmntInput.value.trim()) return;
    const val = parseCurrency(loanAmntInput.value);
    if (val > 0) {
      loanAmntInput.value = formatWithCommas(val);
    }
    calculateLTI();
  });

  loanAmntInput.addEventListener("input", calculateLTI);

  // ---------------------------------------------------------------------------
  // 5. Invalidate Stale Prediction on Input Modification
  // ---------------------------------------------------------------------------
  function invalidatePrediction() {
    if (!hasActivePrediction) return;
    hasActivePrediction = false;

    // Reset banner to pending
    riskBanner.className = "risk-classification-banner risk-pending";
    riskStatusTitle.textContent = "Assessment Pending";
    riskStatusDesc.textContent = "Inputs modified. Click Assess Credit Risk to re-evaluate.";
    riskBannerIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    `;

    // Reset gauge to empty state
    gaugeTrackFill.style.strokeDashoffset = GAUGE_LENGTH;
    gaugeTrackFill.style.stroke = "var(--risk-pending-gauge)";
    gaugeProbNumber.textContent = "—";
    if (gaugeCaptionLabel) gaugeCaptionLabel.textContent = "Awaiting Assessment";
  }

  // Listen to input changes across all fields to invalidate stale predictions
  const allFormInputs = [
    ageInput, incomeInput, homeOwnershipInput, empLengthInput,
    loanIntentInput, loanGradeInput, loanAmntInput, loanIntRateInput,
    defaultOnFileInput, credHistLengthInput
  ];

  allFormInputs.forEach((el) => {
    if (el) {
      el.addEventListener("input", () => {
        el.setCustomValidity("");
        invalidatePrediction();
      });
      el.addEventListener("change", () => {
        el.setCustomValidity("");
        invalidatePrediction();
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Form Reset Functionality
  // ---------------------------------------------------------------------------
  function resetFormAndAssessment() {
    loanForm.reset();
    [ageInput, incomeInput, empLengthInput, loanAmntInput, loanIntRateInput, credHistLengthInput].forEach((el) => {
      if (el) el.value = "";
    });
    [homeOwnershipInput, loanIntentInput, loanGradeInput, defaultOnFileInput].forEach((el) => {
      if (el) el.selectedIndex = 0;
    });

    ltiBadgeDisplay.textContent = "—";
    loanPercentIncomeInput.value = "";
    clearError();

    hasActivePrediction = false;
    riskBanner.className = "risk-classification-banner risk-pending";
    riskStatusTitle.textContent = "Assessment Pending";
    riskStatusDesc.textContent = "Enter applicant and loan details, then click Assess Credit Risk to generate a prediction.";
    riskBannerIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    `;
    gaugeTrackFill.style.strokeDashoffset = GAUGE_LENGTH;
    gaugeTrackFill.style.stroke = "var(--risk-pending-gauge)";
    gaugeProbNumber.textContent = "—";
    if (gaugeCaptionLabel) gaugeCaptionLabel.textContent = "Awaiting Assessment";
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetFormAndAssessment);
  }

  // ---------------------------------------------------------------------------
  // 7. Gauge & Results Rendering
  // ---------------------------------------------------------------------------
  function animateNumberTicker(el, start, end, duration = 800) {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      el.textContent = `${current.toFixed(1)}%`;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = `${end.toFixed(1)}%`;
      }
    }
    requestAnimationFrame(tick);
  }

  function renderPredictionResult(data) {
    const probability = Number(data.default_probability) || 0;
    const isHighRisk = data.default_prediction === 1;
    const probPct = probability * 100;

    hasActivePrediction = true;

    // Update Banner
    if (isHighRisk) {
      riskBanner.className = "risk-classification-banner risk-high";
      riskStatusTitle.textContent = "High Risk";
      riskStatusDesc.textContent = "The applicant has a high probability of default on the loan.";
      riskBannerIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
        </svg>
      `;
    } else {
      riskBanner.className = "risk-classification-banner risk-low";
      riskStatusTitle.textContent = "Low Risk";
      riskStatusDesc.textContent = "The applicant is unlikely to default on the loan.";
      riskBannerIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14.5l-4-4 1.41-1.41L11 13.67l6.59-6.59L19 8.5l-8 8z" />
        </svg>
      `;
    }

    // Semicircular Gauge Animation
    const strokeOffset = GAUGE_LENGTH * (1 - Math.min(1, Math.max(0, probability)));
    gaugeTrackFill.style.stroke = isHighRisk ? "var(--risk-high-gauge)" : "var(--risk-low-gauge)";
    requestAnimationFrame(() => {
      gaugeTrackFill.style.strokeDashoffset = strokeOffset;
    });

    // Animate Number & Label
    if (gaugeCaptionLabel) gaugeCaptionLabel.textContent = "Default Probability";
    animateNumberTicker(gaugeProbNumber, 0, probPct);
  }

  // ---------------------------------------------------------------------------
  // 8. Strict Form Validation & Backend Prediction
  // ---------------------------------------------------------------------------
  function showError(msg, field) {
    if (field) {
      field.setCustomValidity(msg);
      field.reportValidity();
      field.focus();
    } else {
      console.warn("Assessment error:", msg);
    }
  }

  function clearError() {
    allFormInputs.forEach((el) => {
      if (el) el.setCustomValidity("");
    });
  }

  function setLoading(isLoading) {
    assessBtn.disabled = isLoading;
    assessBtn.classList.toggle("loading", isLoading);
    const label = assessBtn.querySelector(".submit-label");
    if (label) {
      label.textContent = isLoading ? "Evaluating..." : "Assess Credit Risk";
    }
  }

  async function performAssessment() {
    clearError();

    // 1. Age validation
    const rawAge = ageInput.value.trim();
    if (!rawAge) {
      showError("Please enter applicant age.", ageInput);
      return;
    }
    const age = parseInt(rawAge, 10);
    if (isNaN(age) || age < 18 || age > 100) {
      showError("Age must be between 18 and 100 years.", ageInput);
      return;
    }

    // 2. Annual Income validation
    const rawIncome = incomeInput.value.trim();
    if (!rawIncome) {
      showError("Please enter annual income.", incomeInput);
      return;
    }
    const income = parseCurrency(rawIncome);
    if (isNaN(income) || income <= 0) {
      showError("Annual income must be greater than ₹0.", incomeInput);
      return;
    }

    // 3. Home Ownership validation
    if (!homeOwnershipInput.value) {
      showError("Please select a home ownership status.", homeOwnershipInput);
      return;
    }

    // 4. Employment Length validation
    const rawEmp = empLengthInput.value.trim();
    if (!rawEmp) {
      showError("Please enter employment length.", empLengthInput);
      return;
    }
    const empLength = parseFloat(rawEmp);
    if (isNaN(empLength) || empLength < 0 || empLength > 60) {
      showError("Employment length must be between 0 and 60 years.", empLengthInput);
      return;
    }

    // 5. Loan Purpose validation
    if (!loanIntentInput.value) {
      showError("Please select a loan purpose.", loanIntentInput);
      return;
    }

    // 6. Loan Grade validation
    if (!loanGradeInput.value) {
      showError("Please select a loan grade.", loanGradeInput);
      return;
    }

    // 7. Loan Amount validation
    const rawAmnt = loanAmntInput.value.trim();
    if (!rawAmnt) {
      showError("Please enter requested loan amount.", loanAmntInput);
      return;
    }
    const amount = parseCurrency(rawAmnt);
    if (isNaN(amount) || amount < 100) {
      showError("Requested loan amount must be at least ₹100.", loanAmntInput);
      return;
    }

    // 8. Interest Rate validation
    const rawRate = loanIntRateInput.value.trim();
    if (!rawRate) {
      showError("Please enter interest rate.", loanIntRateInput);
      return;
    }
    const rate = parseFloat(rawRate);
    if (isNaN(rate) || rate < 0 || rate > 40) {
      showError("Interest rate must be between 0.0% and 40.0%.", loanIntRateInput);
      return;
    }

    // 9. Previous Default on File validation
    if (!defaultOnFileInput.value) {
      showError("Please select previous default on file option.", defaultOnFileInput);
      return;
    }

    // 10. Credit History Length validation
    const rawCred = credHistLengthInput.value.trim();
    if (!rawCred) {
      showError("Please enter credit history length.", credHistLengthInput);
      return;
    }
    const credHist = parseInt(rawCred, 10);
    if (isNaN(credHist) || credHist < 0 || credHist > 60) {
      showError("Credit history length must be between 0 and 60 years.", credHistLengthInput);
      return;
    }

    // Computed Loan-to-Income
    const percentIncome = parseFloat((amount / income).toFixed(2));
    loanPercentIncomeInput.value = percentIncome;
    ltiBadgeDisplay.textContent = (amount / income).toFixed(4);

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
        let errDetail = `Server returned HTTP ${res.status}`;
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
      renderPredictionResult(data);
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  }

  loanForm.addEventListener("submit", (e) => {
    e.preventDefault();
    performAssessment();
  });

  // Note: No automatic prediction on page load. Form and Assessment remain empty until user submits.

})();
