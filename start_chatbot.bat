@echo off
title Chatbot Auto Starter

echo ===============================
echo Starting Chatbot Environment...
echo ===============================

REM ---- STEP 1 : START OLLAMA SERVER ----
echo Starting Ollama server...
start cmd /k "ollama serve"

REM Wait for Ollama to start
timeout /t 5 /nobreak >nul

echo Loading granite3.3:2b model...
start cmd /k "ollama run granite3.3:2b"

REM ---- STEP 2 : START PYTHON BACKEND ----
echo Starting Python backend...

cd /d "C:\Users\keert\OneDrive\Desktop\chat projects\chatbot"

start cmd /k "python server.py"

REM Wait for backend server to start
timeout /t 5 /nobreak >nul

REM ---- STEP 3 : OPEN WEB APP URL ----
echo Opening Chatbot in browser...
start "" "http://172.19.183.73:5000"

echo ===============================
echo Chatbot Started Successfully!
echo ===============================

pause
