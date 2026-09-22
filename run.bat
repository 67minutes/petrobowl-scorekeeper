@echo off
title Petrobowl Scorekeeper
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve.ps1"
