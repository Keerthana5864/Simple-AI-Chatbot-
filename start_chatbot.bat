@echo off
setlocal
cd /d "%~dp0"

echo ---------------------------------------
echo   Smart Chatbot Automated Starter
echo ---------------------------------------

:: 1. Check if Ollama is already running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Ollama is already running.
) else (
    echo Starting Ollama...
    start /min "" ollama serve
    timeout /t 5 /nobreak >nul
)

:: 2. Ensure model is available
echo Ensuring AI model (granite3.3:2b) is ready...
start /min "" ollama run granite3.3:2b ""

:: 3. Start Python Backend (Minimized)
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Python backend might be running. Checking port 5000...
)
echo Starting Python backend...
start /min "" python server.py

:: 4. Wait for server
timeout /t 3 /nobreak >nul

:: 5. Open Web App
echo Opening Chatbot...
start "" "http://localhost:5000"

echo Done! You can close this window.
exit
