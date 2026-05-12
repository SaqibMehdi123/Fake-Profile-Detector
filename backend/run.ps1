# Start the FastAPI backend (PowerShell). Run from inside the backend/ folder:
#   .\run.ps1
$ErrorActionPreference = "Stop"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtualenv..."
    python -m venv .venv
}

. .\.venv\Scripts\Activate.ps1

Write-Host "Installing dependencies (first run only takes ~2 min)..."
pip install -q -r requirements.txt

Write-Host ""
Write-Host "Starting server on http://0.0.0.0:8000  (Ctrl+C to stop)"
Write-Host "Open another terminal and run:  ngrok http 8000"
Write-Host ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
