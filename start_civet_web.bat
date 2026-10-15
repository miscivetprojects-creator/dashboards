@echo off
title CIVET DASHBOARDS - Web Management MIS
echo ========================================================
echo  CIVET PROJECTS PRIVATE LIMITED - MANAGEMENT MIS
echo  Starting Application Server...
echo ========================================================
cd /d "%~dp0\backend"
node server.js
pause
