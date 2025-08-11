@echo off
echo ============================================================
echo 🚀 Enhanced Business Analyst Agent Startup
echo ============================================================

REM Set environment variables
set GEMINI_API_KEY=AIzaSyA5_KnR58T2MTG4oOvBeAqbd8idJCdOlRA
set DATABASE_URL=postgresql+psycopg2://bauser:Valuemomentum123@baagent.postgres.database.azure.com:5432/ba_agent
set LANGCHAIN_ENABLED=true
set ONEDRIVE_ENABLED=false
set ENVIRONMENT=development
set DEBUG=true

echo ✅ Environment variables set
echo.

REM Navigate to backend directory
cd backend

echo 📂 Starting enhanced server...
echo 🌐 Server will be available at: http://localhost:5000
echo 📊 API Status: http://localhost:5000/api/status
echo.

REM Start the enhanced server
python start_enhanced.py

pause
