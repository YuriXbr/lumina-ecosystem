@echo off

start cmd /k "title Lumina API && cd lumina-api && npm run dev"
@REM Wait 10s until the API is ready before starting the bot and dashboard
timeout /t 10 /nobreak > NUL
start cmd /k "title Lumina Dashboard && cd lumina-dashboard && npm run dev"
start cmd /k "title Lumina Bot && cd lumina-bot && npm run dev"