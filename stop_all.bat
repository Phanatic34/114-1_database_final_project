@echo off
echo ========================================
echo   Stopping Services
echo ========================================
echo.

taskkill /F /FI "WINDOWTITLE eq Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend*" >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *app.py*" >nul 2>&1
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *server.py*" >nul 2>&1

echo   Services stopped.
echo.
pause



