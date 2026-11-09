# Docker Deployment & Containerization Guide

This document provides a comprehensive, beginner-friendly guide to understanding, building, running, and troubleshooting the Docker container for the **Credit Risk Management** application.

---

## 1. What Docker Does in This Project

In a traditional setup, running a Python Machine Learning application on different machines often leads to the *"it works on my machine"* problem due to differences in:
- Operating system architectures (Windows vs. macOS vs. Linux).
- Installed Python minor versions and system C-libraries.
- OpenMP thread libraries required by XGBoost and Scikit-learn.
- File system path conventions (backslashes on Windows vs. forward slashes on Linux).

**Docker solves this by packaging the application into a standalone, reproducible container.**

```text
┌─────────────────────────────────────────────────────────────┐
│                       Docker Container                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Application Code & ML Artifacts                    │   │
│   │  - main.py (FastAPI ASGI Service)                   │   │
│   │  - credit_risk_model.pkl (Calibrated XGBoost)       │   │
│   │  - best_threshold.pkl (0.4328 Cutoff)               │   │
│   │  - static/ (HTML, CSS, JS Dashboard)                │   │
│   └─────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Python 3.12 Runtime & Pinned Packages              │   │
│   │  - fastapi, uvicorn, pydantic, scikit-learn, etc.   │   │
│   └─────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Debian Linux OS Layer (Slim)                       │   │
│   │  - libgomp1 (OpenMP), curl (Healthcheck)            │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
               Runs identically on any machine
            (Local Windows / macOS / Linux / Render)
```

Inside this container, the exact same operating system, Python version, dependencies, and model files exist regardless of where the container is executed.

---

## 2. Dockerfile Deep-Dive

The `Dockerfile` is a recipe that describes how to assemble the container image step-by-step.

```dockerfile
# 1. Base Image
FROM python:3.12-slim-bookworm
```
- **Why this image?** We use the official Python 3.12 slim Debian (Bookworm) image. It provides a minimal Linux environment (~150MB) without bloated development tools, reducing attack surface and build time.

```dockerfile
# 2. Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000
```
- `PYTHONDONTWRITEBYTECODE=1`: Stops Python from creating `.pyc` cache files on the container filesystem.
- `PYTHONUNBUFFERED=1`: Ensures logs are flushed to standard output immediately without buffering. This allows `docker logs` to stream real-time logs.
- `PORT=8000`: Sets the default HTTP port (used locally and overridable in production).

```dockerfile
# 3. Working Directory
WORKDIR /app
```
- All subsequent instructions (`COPY`, `RUN`, `CMD`) execute inside `/app` inside the container.

```dockerfile
# 4. System-Level Dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        curl && \
    rm -rf /var/lib/apt/lists/*
```
- `libgomp1`: OpenMP runtime library. **Essential for XGBoost and Scikit-learn** to perform parallel mathematical computations. Without this library, XGBoost will fail with `libgomp.so.1: cannot open shared object file`.
- `curl`: Used by the Docker `HEALTHCHECK` probe.
- `rm -rf /var/lib/apt/lists/*`: Deletes downloaded package indexes after installation to keep the final image as lean as possible.

```dockerfile
# 5. Dependency Layer Caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
```
- **Why copy requirements.txt separately?** Docker caches each step as a layer. By installing dependencies before copying your source code, changing a single line in `main.py` will **not** trigger a re-installation of heavy packages like Scikit-learn or XGBoost. Builds will finish in seconds.
- `--no-cache-dir`: Disables pip's internal cache to save disk space.

```dockerfile
# 6. Copy Application & Model Artifacts
COPY main.py .
COPY credit_risk_model.pkl .
COPY best_threshold.pkl .
COPY static/ ./static/
```
- Copies only the files required at runtime. The raw dataset (`credit_risk_dataset.csv`, 1.8MB) and development notebooks are omitted to keep the image slim.

```dockerfile
# 7. Security Hardening (Non-Root User)
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/bash -m appuser && \
    chown -R appuser:appgroup /app

USER appuser
```
- By default, Docker containers run as the root user. If an application vulnerability is compromised, the attacker has root privileges. Creating and switching to `appuser` enforces the principle of least privilege.

```dockerfile
# 8. Network Port & Healthcheck
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1
```
- Informs Docker and cloud platforms that port 8000 is open.
- The `HEALTHCHECK` periodically pings `/health`. If the model fails or crashes, Docker marks the container as `unhealthy`.

```dockerfile
# 9. Startup Command
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```
- `sh -c`: Evaluates `${PORT:-8000}`, allowing cloud platforms like Render to inject custom dynamic ports while defaulting to 8000 locally.
- `exec`: Replaces the shell process with Uvicorn, making Uvicorn PID 1. This ensures UNIX termination signals (`SIGTERM`, `SIGINT`) are received directly by Uvicorn for graceful shutdown.

---

## 3. Purpose of `.dockerignore`

When you run `docker build`, Docker copies all files in the current directory into the "build context" sent to the Docker daemon.

The `.dockerignore` file prevents unneeded files from inflating the build context:

| Category | Excluded Paths | Reason |
|---|---|---|
| **Version Control** | `.git/`, `.gitignore` | History and repo metadata are not needed at runtime. |
| **Virtual Environments** | `.venv/`, `venv/`, `env/` | Host-OS Python binaries will conflict with Linux binaries. |
| **Python Caches** | `__pycache__/`, `*.pyc` | Prevents stale bytecode from host machine being copied. |
| **Testing Caches** | `.pytest_cache/`, `test_app.py` | Unit tests are run pre-deployment, not inside production. |
| **Notebooks & Raw Data** | `*.ipynb`, `credit_risk_dataset.csv` | Model is already trained; dataset (~1.8MB) is not needed. |
| **Local Configs** | `render.yaml`, `runtime.txt`, `environment.yml` | Used for native Render builds, not needed in Docker. |

### Critical Inclusion Verification
The following files are **explicitly preserved** and copied into the image:
- `main.py` (FastAPI app)
- `credit_risk_model.pkl` (Trained pipeline)
- `best_threshold.pkl` (Classification threshold)
- `static/` (HTML, CSS, JavaScript assets)
- `requirements.txt` (Pinned dependencies)

---

## 4. How to Build the Docker Image

Run this command in the directory containing the `Dockerfile`:

```bash
docker build -t credit-risk-management:latest .
```

### Command breakdown:
- `docker build`: Compiles a container image from instructions in a Dockerfile.
- `-t credit-risk-management:latest`: Assigns a name (`credit-risk-management`) and a tag (`latest`) to the resulting image.
- `.`: Specifies the current directory as the build context.

---

## 5. How to Run the Container Locally

### Standard Run (Port 8000)

```bash
docker run -d --rm -p 8000:8000 --name credit-risk-app credit-risk-management:latest
```

### Command breakdown:
- `docker run`: Creates and starts a container from an image.
- `-d`: **Detached mode**. Runs the container in the background and prints the container ID.
- `--rm`: Automatically removes the container when it stops, keeping your system clean.
- `-p 8000:8000`: **Port mapping**. Maps port 8000 on your host machine to port 8000 inside the container (`host_port:container_port`).
- `--name credit-risk-app`: Assigns a readable name to the running container.
- `credit-risk-management:latest`: The image to run.

### Testing Custom Port (Simulating Render's Dynamic `$PORT`)

Render dynamically passes a `PORT` environment variable (e.g. `PORT=9000`). To test this locally:

```bash
docker run -d --rm -e PORT=9000 -p 9000:9000 --name credit-risk-app-custom credit-risk-management:latest
```
*(Now accessible at `http://localhost:9000`)*.

---

## 6. Managing the Running Container

### 1. View Running Containers
```bash
docker ps
```
Displays container ID, image, command, status (e.g., `Up 2 minutes (healthy)`), and mapped ports.

### 2. View Real-Time Logs
```bash
# View all logs so far:
docker logs credit-risk-app

# Follow logs in real-time (press Ctrl+C to exit):
docker logs -f credit-risk-app
```

Expected log output:
```text
2026-11-09 08:30:00 [INFO] credit_risk: Initializing Credit Risk Management service...
2026-11-09 08:30:03 [INFO] credit_risk: Successfully loaded model 'CalibratedClassifierCV' and decision threshold (0.4328)
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 3. Stop the Container
```bash
docker stop credit-risk-app
```
*(Because we used `--rm`, stopping the container automatically removes it).*

---

## 7. Accessing the Application

Once running, open your web browser or API client:

| Resource | URL | Description |
|---|---|---|
| **Underwriting Dashboard** | `http://localhost:8000/` | Full interactive frontend dashboard |
| **Interactive Swagger Docs** | `http://localhost:8000/docs` | OpenAPI documentation and test console |
| **ReDoc Documentation** | `http://localhost:8000/redoc` | Alternative API reference |
| **Health Check Endpoint** | `http://localhost:8000/health` | Service and model status probe |
| **Model Info Endpoint** | `http://localhost:8000/api/info` | Feature list & metadata |

---

## 8. Common Docker Issues & Troubleshooting

### Issue 1: Port Already in Use
**Error:** `bind: address already in use` or `Ports are not available`.  
**Cause:** Another application (like a local Uvicorn instance or another container) is already using port 8000.  
**Solution:** Either stop the other service, or map the container to a different host port:
```bash
docker run -d --rm -p 8080:8000 --name credit-risk-app credit-risk-management:latest
```
*(Then open `http://localhost:8080`)*.

---

### Issue 2: Docker Daemon Not Running
**Error:** `error during connect: ... open //./pipe/docker_engine: The system cannot find the file specified`  
**Cause:** Docker Desktop is closed or starting up.  
**Solution:** Launch Docker Desktop from the Start menu and wait until the status shows "Docker Engine is running".

---

### Issue 3: Missing Shared Library (`libgomp.so.1`)
**Error:** `ImportError: libgomp.so.1: cannot open shared object file: No such file or directory`  
**Cause:** XGBoost requires the GNU OpenMP library which is not included in minimal Linux slim images by default.  
**Solution:** Our `Dockerfile` already resolves this by installing `libgomp1` via `apt-get install -y --no-install-recommends libgomp1`.

---

### Issue 4: Permissions Error When Writing Inside Container
**Error:** `PermissionDenied: [Errno 13] Permission denied`  
**Cause:** Running as non-root user `appuser` without proper ownership of `/app`.  
**Solution:** Our `Dockerfile` runs `chown -R appuser:appgroup /app` before switching to `USER appuser`, ensuring full read/write access to the application directory.

---

## 9. Render Cloud Deployment with Docker

When deploying to Render:

1. **Automatic Detection:** Render automatically detects the `Dockerfile` at the root of the repository when you select **Docker** as the environment.
2. **Dynamic Port Injection:** Render automatically assigns a random port by injecting the `PORT` environment variable (e.g. `PORT=10000`). Our start command `uvicorn ... --port ${PORT:-8000}` automatically binds to Render's port.
3. **Health Checks:** Set Render's **Health Check Path** to `/health`. Render will ensure the container responds with HTTP 200 before routing live traffic.
4. **Zero Local File Dependencies:** Model paths in `main.py` use `BASE_DIR = Path(__file__).resolve().parent`, ensuring identical path resolution in container environments.
