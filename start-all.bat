@echo off
title HealthMaster-AI — Full Stack
echo.
echo  ==========================================
echo   Starting HealthMaster-AI (Full Stack)
echo   Backend  → http://localhost:8000
echo   Frontend → http://localhost:5173
echo   API Docs → http://localhost:8000/docs
echo  ==========================================
echo.
echo [1/2] Starting FastAPI backend in a new window...
start "HealthMaster-AI Backend" cmd /k "cd /d "%~dp0server" && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React frontend in a new window...
start "HealthMaster-AI Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo  Both servers starting...
echo  Open http://localhost:5173 in your browser.
echo.
pause
