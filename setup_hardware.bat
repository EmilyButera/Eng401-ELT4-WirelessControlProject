@echo off
echo ==========================================
echo  Hardware Setup - Install Dependencies
echo ==========================================
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

echo Installing required packages...
pip install pyserial

echo.
echo ==========================================
echo  Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Connect your Raspberry Pi Pico via USB
echo 2. Run: python hardware_bridge.py
echo 3. In another terminal, run: python server.py
echo 4. Open the web interface in your browser
echo.
pause