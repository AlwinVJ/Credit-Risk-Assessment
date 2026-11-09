/**
 * Credit Risk Management — Frontend Controller
 * Implements theme switching (Light/Dark), dynamic LTI calculation,
 * semicircular gauge animation, modal navigation, and FastAPI /predict integration.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // DOM Elements
  // ---------------------------------------------------------------------------
  // Form elements
  const loanForm = document.getElementById("loanForm");
  const assessBtn = document.getElementById("assessBtn");
  const formErrorAlert = document.getElementById("formErrorAlert");
  const formErrorMessage = document.getElementById("formErrorMessage");

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

  // Constants
  const GAUGE_LENGTH = 235.62; // pi * 75
  let activeThreshold = 0.4328;

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
  // 4. Currency Formatting & Loan-to-Income (LTI) Auto-Calculation
  // ---------------------------------------------------------------------------
  function parseCurrency(str) {
    if (typeof str === "number") return str;
    return parseFloat(String(str).replace(/[^0-9.-]+/g, "")) || 0;
  }

  function formatWithCommas(num) {
    if (isNaN(num)) return "0";
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
  }

  function calculateLTI() {
    const income = parseCurrency(incomeInput.value);
    const amount = parseCurrency(loanAmntInput.value);

    if (income > 0) {
      const exactRatio = amount / income;
      // Display with 4 decimal places (e.g. 0.1667)
      ltiBadgeDisplay.textContent = exactRatio.toFixed(4);
      // Backend expects float with 2 decimal places (e.g. 0.17)
      loanPercentIncomeInput.value = parseFloat(exactRatio.toFixed(2));
    } else {
      ltiBadgeDisplay.textContent = "0.0000";
      loanPercentIncomeInput.value = 0.0;
    }
  }

  // Format on blur, clean on focus
  incomeInput.addEventListener("blur", () => {
    const val = parseCurrency(incomeInput.value);
    incomeInput.value = formatWithCommas(val);
    calculateLTI();
  });

  incomeInput.addEventListener("input", calculateLTI);

  loanAmntInput.addEventListener("blur", () => {
    const val = parseCurrency(loanAmntInput.value);
    loanAmntInput.value = formatWithCommas(val);
    calculateLTI();
  });

  loanAmntInput.addEventListener("input", calculateLTI);

  calculateLTI();

  // ---------------------------------------------------------------------------
  // 5. Gauge & Results Rendering
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
    const threshold = Number(data.threshold) || activeThreshold;
    const isHighRisk = data.default_prediction === 1;

    const probPct = probability * 100;
    const threshFormatted = threshold.toFixed(2);

    // Update Banner
    if (isHighRisk) {
      riskBanner.className = "risk-classification-banner risk-high";
      riskStatusTitle.textContent = "High Risk";
      riskStatusDesc.textContent = "The applicant has a high probability of default on the loan.";
      riskBannerIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
        </svg>
      `;
    } else {
      riskBanner.className = "risk-classification-banner risk-low";
      riskStatusTitle.textContent = "Low Risk";
      riskStatusDesc.textContent = "The applicant is unlikely to default on the loan.";
      riskBannerIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
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

    // Animate Number
    animateNumberTicker(gaugeProbNumber, 0, probPct);

    // Threshold pill
    thresholdDisplayPill.textContent = threshFormatted;
    if (isHighRisk) {
      thresholdDisplayPill.style.backgroundColor = "var(--risk-high-pill-bg)";
      thresholdDisplayPill.style.borderColor = "var(--risk-high-pill-border)";
      thresholdDisplayPill.style.color = "var(--risk-high-ink)";
    } else {
      thresholdDisplayPill.style.backgroundColor = "var(--risk-low-pill-bg)";
      thresholdDisplayPill.style.borderColor = "var(--risk-low-pill-border)";
      thresholdDisplayPill.style.color = "var(--risk-low-ink)";
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Form Submission & Real Backend Integration
  // ---------------------------------------------------------------------------
  function showError(msg) {
    formErrorMessage.textContent = msg;
    formErrorAlert.hidden = false;
  }

  function clearError() {
    formErrorAlert.hidden = true;
    formErrorMessage.textContent = "";
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

    const age = parseInt(ageInput.value, 10);
    const income = parseCurrency(incomeInput.value);
    const empLength = parseFloat(empLengthInput.value);
    const amount = parseCurrency(loanAmntInput.value);
    const rate = parseFloat(loanIntRateInput.value);
    const percentIncome = parseFloat(loanPercentIncomeInput.value);
    const credHist = parseInt(credHistLengthInput.value, 10);

    if (isNaN(age) || age < 18 || age > 100) {
      showError("Please enter a valid age between 18 and 100.");
      ageInput.focus();
      return;
    }

    if (isNaN(income) || income <= 0) {
      showError("Please enter a valid annual income greater than 0.");
      incomeInput.focus();
      return;
    }

    if (isNaN(amount) || amount < 100) {
      showError("Requested loan amount must be at least ₹100.");
      loanAmntInput.focus();
      return;
    }

    if (isNaN(rate) || rate < 0 || rate > 40) {
      showError("Interest rate must be between 0.0% and 40.0%.");
      loanIntRateInput.focus();
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
      showError(`Assessment failed: ${err.message || "Could not reach prediction service."}`);
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  }

  loanForm.addEventListener("submit", (e) => {
    e.preventDefault();
    performAssessment();
  });

  // Perform initial prediction on page load so the dashboard is immediately populated
  setTimeout(() => {
    performAssessment();
  }, 400);

})();
