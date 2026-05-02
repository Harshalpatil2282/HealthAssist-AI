@echo off
title HealthMaster-AI — Backend Server
echo.
echo  ======================================
echo   HealthMaster-AI Backend (FastAPI)
echo   http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo  ======================================
echo.
cd /d "%~dp0server"
call .venv\Scripts\activate.bat 2>nul || (
    echo [ERROR] Python virtual environment not found.
    echo Run: python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    pause & exit /b 1
)
.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
