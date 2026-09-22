@echo off
title Petrobowl Scorekeeper (dev)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required for development. Get it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install
if /i "%1"=="build" (call npm run build & pause & exit /b)
call npm run dev -- --open
