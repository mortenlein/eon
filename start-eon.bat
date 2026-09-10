@echo off
REM eon primetime launcher - double-click. Own console window; full server log
REM (including [anim] playback telemetry) persisted to tmp\eon-<ts>.log.
title eon
cd /d C:\dev\repos\active\eon
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set TS=%%i
echo [launcher] log: tmp\eon-%TS%.log
powershell -NoProfile -Command "node . 2>&1 | Tee-Object -FilePath 'tmp\eon-%TS%.log'"
echo.
echo [launcher] eon exited - log kept at tmp\eon-%TS%.log
pause
