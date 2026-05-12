#!/usr/bin/env bash
# Start the FastAPI backend on macOS/Linux. Run from inside backend/:
#   chmod +x run.sh && ./run.sh
set -e
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
echo "Server starting at http://0.0.0.0:8000  (Ctrl+C to stop)"
echo "In another terminal:  ngrok http 8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
