@echo off
title HealthMaster-AI — Frontend (Vite)
echo.
echo  ======================================
echo   HealthMaster-AI Frontend (React)
echo   http://localhost:5173
echo  ======================================
echo.
cd /d "%~dp0client"
if not exist node_modules (
    echo [INFO] Installing npm dependencies...
    npm install
)
npm run dev
