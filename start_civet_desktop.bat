@echo off
title CIVET DASHBOARDS - Desktop Application
echo ========================================================
echo  CIVET PROJECTS PRIVATE LIMITED - MANAGEMENT MIS
echo  Launching Electron Desktop MIS Application...
echo ========================================================
cd /d "%~dp0\desktop"
cmd.exe /c "npx electron ."
pause
