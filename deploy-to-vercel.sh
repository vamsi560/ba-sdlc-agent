#!/bin/bash

# BA Agent Vercel Deployment Script
# This script helps deploy the application to Vercel

echo "🚀 Starting BA Agent Vercel Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Deploy Backend
echo "📦 Deploying Backend..."
cd backend

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found in backend directory"
    exit 1
fi

# Deploy backend
echo "🔄 Deploying backend to Vercel..."
vercel --yes

# Get the backend URL
BACKEND_URL=$(vercel ls | grep "ba-agent-backend" | awk '{print $2}')
echo "✅ Backend deployed at: $BACKEND_URL"

# Deploy Frontend
echo "📦 Deploying Frontend..."
cd ../frontend

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found in frontend directory"
    exit 1
fi

# Update the API URL in vercel.json
sed -i "s|https://your-backend-url.vercel.app|$BACKEND_URL|g" vercel.json

# Deploy frontend
echo "🔄 Deploying frontend to Vercel..."
vercel --yes

# Get the frontend URL
FRONTEND_URL=$(vercel ls | grep "ba-agent-frontend" | awk '{print $2}')
echo "✅ Frontend deployed at: $FRONTEND_URL"

echo ""
echo "🎉 Deployment Complete!"
echo "📱 Frontend: $FRONTEND_URL"
echo "🔧 Backend: $BACKEND_URL"
echo ""
echo "⚠️  Don't forget to:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Configure your database"
echo "3. Set up Qdrant vector database"
echo "4. Configure email service"
echo ""
echo "📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions" 