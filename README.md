# Credit Risk Assessment System

An end-to-end Machine Learning project focused on predicting credit risk using ensemble learning and boosting techniques. The project explores data preprocessing, model development, hyperparameter optimization, decision threshold optimization, and model deployment.

This project is developed as a hands-on learning initiative, following a tutorial as a reference while incorporating independent experimentation, implementation improvements, and additional learning along the way.

---

## Project Overview

Credit risk assessment is an important application of Machine Learning in the financial industry. Financial institutions need reliable methods to evaluate borrowers and identify applicants who may have a higher likelihood of defaulting on their loans.

The objective of this project is to develop a Machine Learning model that analyzes applicant and loan-related information to predict credit risk.

The project focuses on understanding the practical implementation of boosting algorithms and exploring how different techniques can improve classification performance.

Beyond model development, the project also explores the broader Machine Learning workflow, from data exploration to deploying a trained model.

## Project Objectives

- Understand the practical applications of boosting algorithms in credit risk assessment.
- Perform Exploratory Data Analysis (EDA) to understand the dataset.
- Implement appropriate data preprocessing and feature engineering techniques.
- Investigate and handle class imbalance.
- Develop and evaluate classification models.
- Explore XGBoost and its important hyperparameters.
- Perform hyperparameter optimization.
- Understand and implement decision threshold optimization.
- Explore probability calibration.
- Understand model predictions using SHAP explainability.
- Serialize trained models for reuse.
- Develop an application for making predictions using the trained model.

---

## Dataset

**Dataset:** Credit Risk Dataset

**Target Variable:** `loan_status`

The dataset contains information about loan applicants, including their financial background, employment details, credit history, and loan characteristics.

### Features

| Feature | Description |
|---|---|
| `person_age` | Age of the applicant |
| `person_income` | Annual income of the applicant |
| `person_home_ownership` | Home ownership status |
| `person_emp_length` | Employment length in years |
| `loan_intent` | Purpose of the loan |
| `loan_grade` | Assigned loan grade |
| `loan_amnt` | Loan amount |
| `loan_int_rate` | Loan interest rate |
| `loan_percent_income` | Loan amount as a percentage of income |
| `cb_person_default_on_file` | Historical default indicator |
| `cb_person_cred_hist_length` | Length of credit history |
| `loan_status` | Target variable |

**Note:** The meaning of the target variable's encoded classes should be verified before interpreting predictions as default risk or loan approval.

---

## Machine Learning Workflow

The project explores the following stages of the Machine Learning pipeline.

### 1. Exploratory Data Analysis

- Understanding dataset structure and distributions.
- Analyzing numerical and categorical features.
- Identifying missing values and duplicate records.
- Investigating outliers.
- Understanding relationships between features and the target variable.
- Examining class distribution.

### 2. Data Preprocessing

- Handling missing and invalid values.
- Removing duplicate records where appropriate.
- Encoding categorical variables.
- Scaling numerical features where required.
- Preparing data for model training.

### 3. Handling Class Imbalance

Exploring techniques to address imbalanced classification:

- SMOTE (Synthetic Minority Over-sampling Technique).
- Class weighting.
- Comparing model performance with different balancing strategies.

### 4. Baseline Model Development

Establishing baseline performance using traditional classification algorithms before exploring boosting techniques.

### 5. Boosting Algorithms

Exploring boosting methods, with a primary focus on:

- XGBoost Classifier.
- Sequential learning.
- Weak learners.
- Boosting iterations.
- Regularization and model complexity.

### 6. Hyperparameter Optimization

Exploring hyperparameter tuning techniques to improve model performance.

Important XGBoost hyperparameters include:

- `n_estimators`
- `max_depth`
- `learning_rate`
- `subsample`
- `colsample_bytree`
- `min_child_weight`
- `gamma`
- `reg_alpha`
- `reg_lambda`

### 7. Model Evaluation

Evaluating classification performance using:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix
- ROC-AUC
- Precision-Recall Curve

### 8. Decision Threshold Optimization

Exploring how different classification thresholds affect model predictions.

- Understanding the default classification threshold.
- Experimenting with different thresholds.
- Analyzing precision-recall trade-offs.
- Selecting an appropriate threshold based on evaluation criteria.

### 9. Probability Calibration

Exploring techniques to improve the reliability of predicted probabilities.

- Sigmoid Calibration (Platt Scaling).
- Isotonic Regression.

### 10. Model Explainability

Using SHAP (SHapley Additive exPlanations) to understand model predictions.

- Global feature importance.
- SHAP Summary Plot.
- Individual prediction explanations.
- Feature contributions to model predictions.

### 11. Model Serialization and Deployment

Saving trained model artifacts for reuse and integrating them into an application.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Programming Language | Python |
| Data Manipulation | NumPy, Pandas |
| Data Visualization | Matplotlib, Seaborn |
| Machine Learning | Scikit-learn |
| Boosting | XGBoost |
| Imbalanced Learning | Imbalanced-learn |
| Explainable AI | SHAP |
| Model Serialization | Joblib / Pickle |
| Development Environment | Jupyter Notebook |
| Application | Python |
| Deployment | Render |
| Version Control | Git and GitHub |

---

## Project Structure

```text
Credit-Risk-Assessment/
│
├── __pycache__/
│
├── static/
│   └── Application static assets
│
├── .gitignore
│
├── credit_risk_assessment.ipynb
│
├── best_threshold.pkl
│
├── credit_risk_dataset.csv
│
├── credit_risk_model.pkl
│
├── main.py
│
├── render.yaml
│
├── requirements.txt
│
└── runtime.txt
```

### File and Directory Description

| File / Directory | Purpose |
|---|---|
| `static/` | Contains static assets used by the application. |
| `.gitignore` | Specifies files and directories Git should ignore. |
| `credit_risk_assessment.ipynb` | Jupyter Notebook containing the Machine Learning workflow and experiments. |
| `best_threshold.pkl` | Stores the optimized classification threshold. |
| `credit_risk_dataset.csv` | Credit risk dataset used for model development. |
| `credit_risk_model.pkl` | Serialized trained Machine Learning model. |
| `main.py` | Main Python application entry point. |
| `render.yaml` | Render deployment configuration. |
| `requirements.txt` | Python project dependencies. |
| `runtime.txt` | Python runtime configuration. |

---

## Installation and Setup

### Prerequisites

- Python 3.12
- Conda
- Git

### 1. Clone the repository

```bash
git clone <your-github-repository-url>
```

### 2. Navigate to the project directory

```bash
cd Credit-Risk-Assessment
```

### 3. Create a Conda environment

```bash
conda create -n credit-risk-boosting python=3.12 -y
```

### 4. Activate the environment

```bash
conda activate credit-risk-boosting
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the application

```bash
python main.py
```

---

## Learning Approach and Independent Contributions

This project is not intended to be a direct reproduction of the tutorial.

The tutorial provides a learning reference for understanding the concepts and implementation workflow. Alongside following it, I am independently exploring the underlying mathematics, experimenting with alternative approaches, and improving the implementation.

My focus is on:

- Understanding the mathematical intuition behind Machine Learning algorithms.
- Experimenting with different preprocessing strategies.
- Comparing different classification models.
- Understanding the impact of hyperparameters on model performance.
- Evaluating models using appropriate metrics.
- Exploring techniques beyond the original tutorial.
- Improving code organization and maintainability.
- Following proper Git version control practices.
- Understanding the practical considerations involved in deploying Machine Learning models.

The primary goal is to develop a deeper understanding of the complete Machine Learning lifecycle rather than simply achieving a good prediction score.

---

## Learning Resource and Credits

This project is inspired by the following YouTube tutorial:

**[Original YouTube Tutorial](https://www.youtube.com/watch?v=r_ViVO9uTdU&t=2512s)**

The tutorial serves as a reference for understanding the concepts, workflow, and practical implementation of a credit risk assessment system using Machine Learning and boosting techniques.

All credit for the original tutorial, its instructional content, and the concepts demonstrated belongs to the respective creator.

This repository represents my independent learning and implementation, with additional experimentation, modifications, and improvements.

**This is an independent educational project and is not an official repository of the original tutorial.**

---

## Project Status

**Status: In Progress**

The project is part of my continuous learning journey in Machine Learning and Data Science.

Further experiments, improvements, and documentation will be added as development progresses.

---

## Disclaimer

This project is developed strictly for educational and learning purposes.

The predictions generated by this model should not be used for actual financial, lending, or credit approval decisions.

Real-world credit risk assessment systems require extensive validation, fairness assessments, regulatory compliance, security measures, and continuous model monitoring.
