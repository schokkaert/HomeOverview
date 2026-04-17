@echo off
cd /d "%~dp0"
start "HomeOverview PHP server" cmd /k php -S 0.0.0.0:8123
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
start "" "http://127.0.0.1:8123/index.html"
