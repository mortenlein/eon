@echo off
REM eon primetime launcher - double-click. Own console window; full server log
REM (including [anim] playback telemetry) persisted to tmp\eon-<ts>.log.
title eon
cd /d C:\dev\repos\active\eon
chcp 65001 >nul
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set TS=%%i
echo [launcher] log: tmp\eon-%TS%.log
REM pwsh (PS7), not powershell (PS5.1): 5.1 dresses every native stderr line
REM up as a NativeCommandError block; 7 prints it as plain text
pwsh -NoProfile -Command "node . 2>&1 | Tee-Object -FilePath 'tmp\eon-%TS%.log'"
echo.
echo [launcher] eon exited - log kept at tmp\eon-%TS%.log
pause
