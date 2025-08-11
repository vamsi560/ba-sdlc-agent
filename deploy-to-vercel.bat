@echo off
REM BA Agent Vercel Deployment Script for Windows
REM This script helps deploy the application to Vercel

echo 🚀 Starting BA Agent Vercel Deployment...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Vercel...
    vercel login
)

REM Deploy Backend
echo 📦 Deploying Backend...
cd backend

REM Check if vercel.json exists
if not exist "vercel.json" (
    echo ❌ vercel.json not found in backend directory
    exit /b 1
)

REM Deploy backend
echo 🔄 Deploying backend to Vercel...
vercel --yes

REM Deploy Frontend
echo 📦 Deploying Frontend...
cd ..\frontend

REM Check if vercel.json exists
if not exist "vercel.json" (
    echo ❌ vercel.json not found in frontend directory
    exit /b 1
)

REM Deploy frontend
echo 🔄 Deploying frontend to Vercel...
vercel --yes

echo.
echo 🎉 Deployment Complete!
echo.
echo ⚠️  Don't forget to:
echo 1. Set environment variables in Vercel dashboard
echo 2. Configure your database
echo 3. Set up Qdrant vector database
echo 4. Configure email service
echo.
echo 📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions
pause 