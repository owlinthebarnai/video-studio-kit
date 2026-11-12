@echo off
cd /d "%~dp0"
netstat -ano | findstr ":4790 " | findstr LISTENING >nul && goto open
start "Video Studio" /min node video-studio/vs.mjs serve
timeout /t 2 /nobreak >nul
:open
start "" http://localhost:4790
