@echo off
cd /d "D:\work\Engineering\projects\petri dish\backend"
python -m uvicorn api:app --reload --port 8000
pause
