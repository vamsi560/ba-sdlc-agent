# Vercel Deployment Guide for BA Agent

This guide will help you deploy the BA Agent application to Vercel. Since this is a full-stack application, we'll deploy the frontend and backend separately.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Environment Variables**: You'll need API keys and configuration

## Required Environment Variables

### Backend Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key
- `ACS_CONNECTION_STRING`: Azure Communication Services connection string
- `ACS_SENDER_ADDRESS`: Your sender email address
- `APPROVAL_RECIPIENT_EMAIL`: Email for approval notifications
- `DATABASE_URL`: PostgreSQL database URL (for production)
- `QDRANT_HOST`: Qdrant vector database host
- `QDRANT_PORT`: Qdrant vector database port

### Frontend Environment Variables
- `REACT_APP_API_URL`: URL of your deployed backend

## Step 1: Deploy Backend

### 1.1 Prepare Backend for Deployment

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Ensure you have the required files**:
   - `main.py` (Flask application)
   - `requirements.txt` (Python dependencies)
   - `vercel.json` (Vercel configuration)
   - `config.py` (Configuration settings)

3. **Update CORS settings** in `main.py` to allow your frontend domain:
   ```python
   CORS(app, origins=["https://your-frontend-domain.vercel.app"])
   ```

### 1.2 Deploy Backend to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy the backend**:
   ```bash
   cd backend
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add ACS_CONNECTION_STRING
   vercel env add ACS_SENDER_ADDRESS
   vercel env add APPROVAL_RECIPIENT_EMAIL
   vercel env add DATABASE_URL
   vercel env add QDRANT_HOST
   vercel env add QDRANT_PORT
   ```

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### 1.3 Get Backend URL

After deployment, note your backend URL (e.g., `https://your-backend.vercel.app`).

## Step 2: Deploy Frontend

### 2.1 Prepare Frontend for Deployment

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Update the API URL** in `vercel.json`:
   ```json
   {
     "env": {
       "REACT_APP_API_URL": "https://your-backend-url.vercel.app"
     }
   }
   ```

3. **Ensure you have the required files**:
   - `package.json` (Node.js dependencies)
   - `vercel.json` (Vercel configuration)
   - `src/App.js` (React application)

### 2.2 Deploy Frontend to Vercel

1. **Deploy the frontend**:
   ```bash
   cd frontend
   vercel
   ```

2. **Set the API URL environment variable**:
   ```bash
   vercel env add REACT_APP_API_URL
   # Enter: https://your-backend-url.vercel.app
   ```

3. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

## Step 3: Configure Database and Services

### 3.1 Database Setup

For production, you'll need a PostgreSQL database. Options include:
- **Supabase**: Free tier available
- **Neon**: Free tier available
- **Railway**: Free tier available

### 3.2 Qdrant Vector Database

For the vector database, you can:
- **Use a cloud-hosted Qdrant**: Set up on a cloud provider
- **Disable Qdrant**: Set `QDRANT_ENABLED=false` in environment variables

### 3.3 Email Service

For email notifications, you'll need:
- **Azure Communication Services**: Set up an account
- **Or disable email**: Remove email functionality

## Step 4: Test Deployment

1. **Test Backend API**:
   ```bash
   curl https://your-backend-url.vercel.app/api/test_gemini
   ```

2. **Test Frontend**:
   - Visit your frontend URL
   - Try uploading a document
   - Check if API calls work

## Step 5: Custom Domain (Optional)

1. **Add custom domain** in Vercel dashboard
2. **Update CORS settings** in backend
3. **Update environment variables** with new URLs

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Update CORS origins in backend
   - Check frontend API URL

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names (case-sensitive)

3. **Database Connection**:
   - Verify DATABASE_URL format
   - Check database accessibility

4. **API Key Issues**:
   - Verify GEMINI_API_KEY is valid
   - Check API quotas and limits

### Debugging

1. **Check Vercel logs**:
   ```bash
   vercel logs
   ```

2. **Test locally** with production environment:
   ```bash
   vercel dev
   ```

## File Structure for Deployment

```
ba_agent/
├── backend/
│   ├── main.py              # Flask application
│   ├── requirements.txt     # Python dependencies
│   ├── vercel.json         # Vercel configuration
│   ├── config.py           # Configuration
│   └── database.py         # Database models
├── frontend/
│   ├── src/
│   │   └── App.js          # React application
│   ├── package.json        # Node.js dependencies
│   └── vercel.json         # Vercel configuration
└── VERCEL_DEPLOYMENT_GUIDE.md
```

## Production Considerations

1. **Security**:
   - Use HTTPS only
   - Validate file uploads
   - Rate limiting

2. **Performance**:
   - Enable caching
   - Optimize bundle size
   - Use CDN for static assets

3. **Monitoring**:
   - Set up error tracking
   - Monitor API usage
   - Track performance metrics

## Support

If you encounter issues:
1. Check Vercel documentation
2. Review application logs
3. Test components individually
4. Verify environment variables 