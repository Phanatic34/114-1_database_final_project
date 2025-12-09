@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   Starting Services
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend (Flask)...
start "Backend" cmd /k "cd .backend && python app.py"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (HTTP Server)...
start "Frontend" cmd /k "cd .frontend && python server.py"

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:8000
echo.
echo   Press any key to exit this window...
pause >nul




