@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Start dit bestand met rechtsklik: Als administrator uitvoeren.
  pause
  exit /b 1
)

netsh advfirewall firewall add rule name="HomeOverview Dashboard 8123" dir=in action=allow protocol=TCP localport=8123
echo Firewallregel toegevoegd voor HomeOverview op poort 8123.
pause
