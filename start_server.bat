@echo off
echo ========================================
echo  Wireless Control Project - Quick Start
echo ========================================
echo.
echo Starting local server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

REM Start the server
python server.py

pause