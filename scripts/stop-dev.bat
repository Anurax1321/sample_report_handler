@echo off
REM ===================================================================
REM Sample Report Handler - Stop Development Servers
REM ===================================================================

echo Stopping Sample Report Handler servers...
echo.

REM Kill Node.js processes (frontend)
taskkill /FI "WINDOWTITLE eq Frontend - Sample Report Handler*" /F >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

REM Kill Python processes (backend)
taskkill /FI "WINDOWTITLE eq Backend - Sample Report Handler*" /F >nul 2>&1

REM More targeted - kill uvicorn process
for /f "tokens=2" %%a in ('tasklist ^| findstr /i "uvicorn"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo All servers stopped!
echo.
pause
