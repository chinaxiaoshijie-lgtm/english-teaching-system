@echo off
chcp 65001 >nul
echo ========================================
echo   English Teaching System
echo ========================================
echo.
echo Starting server...
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not detected, please install Node.js first
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] First run, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependency installation failed
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed
    echo.
)

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "uploads\lessons" mkdir uploads\lessons
if not exist "uploads\submissions" mkdir uploads\submissions
if not exist "backups" mkdir backups

echo [INFO] Server starting...
echo.
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start, please check error messages
    pause
)
