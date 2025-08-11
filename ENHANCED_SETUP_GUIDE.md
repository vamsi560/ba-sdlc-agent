# 🚀 Enhanced Business Analyst Agent Setup Guide

## Overview

This guide will help you set up and run the enhanced Business Analyst Agent with **LangChain AI Integration** and **OneDrive Collaboration** features.

## 🎯 **What's New**

### **LangChain Integration** 🤖
- **Advanced AI Chains**: Sequential processing with specialized agents
- **Memory Management**: Conversation history and context preservation
- **Custom Tools**: Requirements analyzer, document generator, backlog creator
- **Vector Store Integration**: Enhanced semantic search capabilities

### **OneDrive Integration** ☁️
- **Document Sync**: Seamless synchronization with Microsoft OneDrive
- **Cloud Storage**: Enterprise-grade document management
- **Collaboration**: Team-based document sharing and editing
- **Version Control**: Document versioning and history

## 📋 **Prerequisites**

### **System Requirements**
- Python 3.8+
- Node.js 16+ (for frontend)
- 4GB+ RAM (recommended)
- Internet connection for API access

### **Required Accounts**
- **Google AI Studio** (for Gemini API)
- **Microsoft Azure** (for OneDrive integration - optional)
- **OpenAI** (for LangChain - optional)

## 🛠️ **Installation Steps**

### **Step 1: Clone and Navigate**
```bash
cd ba_agent
```

### **Step 2: Install Backend Dependencies**
```bash
cd backend
pip install -r requirements-langchain.txt
```

### **Step 3: Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### **Step 4: Environment Configuration**

Create a `.env` file in the backend directory:

```env
# Core Configuration
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql+psycopg2://bauser:Valuemomentum123@baagent.postgres.database.azure.com:5432/ba_agent

# LangChain Configuration (Optional)
LANGCHAIN_ENABLED=true
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# OneDrive Configuration (Optional)
ONEDRIVE_ENABLED=false
ONEDRIVE_CLIENT_ID=your_client_id_here
ONEDRIVE_CLIENT_SECRET=your_client_secret_here
ONEDRIVE_TENANT_ID=your_tenant_id_here
ONEDRIVE_REDIRECT_URI=http://localhost:5000/api/onedrive/callback

# Performance Configuration
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=120
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Security Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Environment Configuration
ENVIRONMENT=development
DEBUG=true
```

## 🚀 **Quick Start**

### **Option 1: Enhanced Startup Script (Recommended)**
```bash
cd backend
python start_enhanced.py
```

This script will:
- ✅ Check all dependencies
- ✅ Validate environment configuration
- ✅ Verify required files
- ✅ Start the enhanced server

### **Option 2: Manual Start**
```bash
cd backend
python main_enhanced.py
```

### **Option 3: Frontend Start**
```bash
cd frontend
npm start
```

## 🔧 **Configuration Details**

### **LangChain Configuration**

#### **Required Setup:**
1. **Get OpenAI API Key** (optional but recommended):
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add to `.env`: `OPENAI_API_KEY=your_key_here`

#### **Features Available:**
- **Enhanced Document Analysis**: More intelligent requirement processing
- **Conversational AI**: Chat with memory and context
- **Custom Tools**: Specialized business analysis tools
- **Vector Search**: Semantic document search

### **OneDrive Configuration**

#### **Required Setup:**
1. **Register Azure Application**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "BA Agent OneDrive Integration"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `http://localhost:5000/api/onedrive/callback`

2. **Configure Permissions**:
   - Go to "API permissions"
   - Add permission: "Microsoft Graph" → "Delegated permissions"
   - Select: `Files.ReadWrite.All`, `Sites.ReadWrite.All`
   - Grant admin consent

3. **Get Credentials**:
   - Copy "Application (client) ID" → `ONEDRIVE_CLIENT_ID`
   - Go to "Certificates & secrets"
   - Create new client secret → `ONEDRIVE_CLIENT_SECRET`
   - Copy "Directory (tenant) ID" → `ONEDRIVE_TENANT_ID`

#### **Features Available:**
- **Document Sync**: Automatically sync generated documents
- **Cloud Storage**: Store documents in OneDrive
- **Team Collaboration**: Share documents with team members
- **Version Control**: Track document changes

## 🌐 **API Endpoints**

### **System Status**
```bash
GET /api/status
# Returns comprehensive system status
```

### **Feature Information**
```bash
GET /api/features
# Lists all available features
```

### **LangChain Endpoints**
```bash
GET /api/langchain/status
# Check LangChain integration status

POST /api/langchain/analyze
# Enhanced analysis using LangChain

POST /api/langchain/chat
# Conversational AI with memory

GET /api/langchain/tools
# List available AI tools
```

### **OneDrive Endpoints**
```bash
GET /api/onedrive/status
# Check OneDrive integration status

GET /api/onedrive/auth
# Get OneDrive authorization URL

GET /api/onedrive/callback
# Handle OAuth callback

POST /api/onedrive/sync/<analysis_id>
# Sync documents to OneDrive

POST /api/onedrive/import
# Import documents from OneDrive

GET /api/onedrive/drives
# List available drives

POST /api/onedrive/search
# Search OneDrive documents
```

### **Enhanced Generation**
```bash
POST /api/generate/enhanced
# Enhanced document generation with LangChain
```

## 🧪 **Testing the Setup**

### **1. Check System Status**
```bash
curl http://localhost:5000/api/status
```

Expected response:
```json
{
  "status": "healthy",
  "features": {
    "langchain": {"enabled": true, "available": true},
    "onedrive": {"enabled": false, "available": true},
    "database": {"connected": true},
    "gemini": {"enabled": true, "key_configured": true}
  }
}
```

### **2. Test LangChain Integration**
```bash
curl -X POST http://localhost:5000/api/langchain/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Create a user authentication system"}'
```

### **3. Test OneDrive Integration** (if configured)
```bash
curl http://localhost:5000/api/onedrive/status
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Import Errors**
```bash
# Solution: Install missing dependencies
pip install langchain langchain-core langchain-community msal azure-identity
```

#### **2. Environment Variables Not Found**
```bash
# Solution: Check .env file location and format
# Ensure .env is in the backend directory
# Check for typos in variable names
```

#### **3. OneDrive Authorization Fails**
```bash
# Solution: Verify Azure app registration
# Check redirect URI matches exactly
# Ensure admin consent is granted
```

#### **4. LangChain Not Working**
```bash
# Solution: Check OpenAI API key
# Verify API key has sufficient credits
# Check internet connection
```

### **Debug Mode**
Enable debug mode in `.env`:
```env
DEBUG=true
```

This will show detailed error messages and logs.

## 📊 **Performance Optimization**

### **Memory Management**
```env
# Increase memory for large documents
MAX_CONCURRENT_REQUESTS=5
CHUNK_SIZE=500
CHUNK_OVERLAP=100
```

### **Rate Limiting**
```env
# Adjust based on your needs
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_WINDOW=60
```

## 🔒 **Security Considerations**

### **Production Deployment**
1. **Change Default Secrets**:
   ```env
   JWT_SECRET_KEY=your-production-secret-key
   ```

2. **Disable Debug Mode**:
   ```env
   DEBUG=false
   ENVIRONMENT=production
   ```

3. **Configure CORS**:
   ```env
   CORS_ORIGINS=https://yourdomain.com
   ```

4. **Use HTTPS**:
   - Configure SSL certificates
   - Update redirect URIs to use HTTPS

## 📈 **Monitoring and Logs**

### **Token Usage Tracking**
Token consumption is automatically logged to `token_logs.json`:
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "stage": "document_generation",
  "tokens_used": 1500,
  "model_used": "gemini-pro"
}
```

### **System Health**
Monitor system health via:
```bash
curl http://localhost:5000/api/status
```

## 🎯 **Next Steps**

### **1. Explore Features**
- Try the enhanced document generation
- Test OneDrive sync functionality
- Experiment with LangChain tools

### **2. Customize Templates**
- Create industry-specific templates
- Customize document formats
- Add company branding

### **3. Integrate with Existing Systems**
- Connect to your Azure DevOps
- Set up email notifications
- Configure team collaboration

### **4. Scale for Production**
- Set up monitoring and logging
- Configure load balancing
- Implement backup strategies

## 📞 **Support**

### **Getting Help**
1. **Check the logs** for detailed error messages
2. **Verify configuration** using the status endpoints
3. **Test individual features** to isolate issues
4. **Review this guide** for common solutions

### **Useful Commands**
```bash
# Check system status
curl http://localhost:5000/api/status

# List all features
curl http://localhost:5000/api/features

# Test LangChain
curl http://localhost:5000/api/langchain/status

# Test OneDrive
curl http://localhost:5000/api/onedrive/status
```

---

## 🎉 **Congratulations!**

You've successfully set up the Enhanced Business Analyst Agent with:
- ✅ **LangChain AI Integration** for advanced document processing
- ✅ **OneDrive Integration** for cloud collaboration
- ✅ **Enhanced Configuration** for better performance
- ✅ **Comprehensive API** for all features

Your system is now ready for enterprise-grade business analysis and document generation!

---

*For additional support or questions, refer to the individual module documentation or contact the development team.*
