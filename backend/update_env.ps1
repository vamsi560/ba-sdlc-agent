# PowerShell script to update .env file with correct values

$envContent = @"
# BA Agent Environment Variables Template
# Copy this file to .env and fill in your actual values

# Backend Environment Variables
GEMINI_API_KEY=AIzaSyA5_KnR58T2MTG4oOvBeAqbd8idJCdOlRA
ACS_CONNECTION_STRING=endpoint=https://shashank-communication-service.india.communication.azure.com/;accesskey=BUWBUP5PpFKZywNMg94DJg7HGROomxyNbCdbYoBFL7ovl6Cvds1gJQQJ99BFACULyCpydQxwAAAAAZCSbulm
ACS_SENDER_ADDRESS=DoNotReply@88295e93-5cda-4535-921f-7241cc7d1612.azurecomm.net
APPROVAL_RECIPIENT_EMAIL=Raghavendra.Lakkamaraju@valuemomentum.com

# Database Configuration
DATABASE_URL=postgresql+psycopg2://bauser:Valuemomentum123@baagent.postgres.database.azure.com:5432/ba_agent

# Qdrant Vector Database
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_ENABLED=true

# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5000

# Azure DevOps Integration
ADO_PERSONAL_ACCESS_TOKEN=vQPELwS52xyQtwyhTZWPptUqk8QialINdKNCoHvXNkgk3M7BxaVzJQQJ99BHACAAAAAAhliiAAASAZDOWFRz
ADO_ORGANIZATION_URL=https://dev.azure.com/prayankagochipatula/
ADO_PROJECT_NAME=Backstage

# ============================================================================
# ENHANCED FEATURES CONFIGURATION
# ============================================================================

# LangChain Configuration (Optional)
LANGCHAIN_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4

# OneDrive Configuration (Optional)
ONEDRIVE_ENABLED=false
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_TENANT_ID=
ONEDRIVE_REDIRECT_URI=http://localhost:5000/api/onedrive/callback
ONEDRIVE_SCOPE=https://graph.microsoft.com/.default

# Performance Configuration
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=120
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Security Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Environment Configuration
ENVIRONMENT=development
DEBUG=true

# Optional: Disable features for development
# QDRANT_ENABLED=false
# EMAIL_ENABLED=false
# LANGCHAIN_ENABLED=false
# ONEDRIVE_ENABLED=false
"@

# Write the content to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host "📝 Updated with correct database URL and API keys" -ForegroundColor Yellow
