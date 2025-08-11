# BA Agent - Production Deployment Guide
## Complete Step-by-Step Deployment Instructions

---

## 📋 Prerequisites

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (v2.40+)
- [Terraform](https://www.terraform.io/downloads) (v1.0+)
- [Docker](https://www.docker.com/products/docker-desktop) (v20.10+)
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.11+)
- [PowerShell](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell) (v7+)

### Required Azure Services
- Azure Subscription with sufficient quota
- Azure Active Directory (for authentication)
- Azure DevOps (for CI/CD)

### Required External Services
- Google Gemini API Key
- Azure DevOps Personal Access Token
- Azure Communication Services

---

## 🚀 Quick Start Deployment

### Option 1: Automated Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ba-agent.git
   cd ba-agent
   ```

2. **Run the deployment script**
   ```powershell
   cd azure-deployment/scripts
   .\deploy.ps1 -Environment prod -Location eastus2
   ```

3. **Follow the prompts**
   - Enter your Azure subscription ID
   - Provide the required API keys and secrets
   - Wait for deployment to complete

### Option 2: Manual Deployment

Follow the detailed steps below for manual deployment.

---

## 📋 Detailed Deployment Steps

### Phase 1: Azure Infrastructure Setup

#### 1.1 Azure Authentication
```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "your-subscription-id"

# Verify connection
az account show
```

#### 1.2 Create Resource Groups
```bash
# Create resource groups for different environments
az group create --name rg-ba-agent-prod --location eastus2 --tags Environment=prod Project=ba-agent
az group create --name rg-ba-agent-staging --location eastus2 --tags Environment=staging Project=ba-agent
az group create --name rg-ba-agent-dev --location eastus2 --tags Environment=dev Project=ba-agent
```

#### 1.3 Create Key Vault
```bash
# Create Key Vault for production
az keyvault create \
  --name kv-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --location eastus2 \
  --sku standard

# Set access policy for current user
az keyvault set-policy \
  --name kv-ba-agent-prod \
  --object-id $(az ad signed-in-user show --query objectId -o tsv) \
  --secret-permissions get list set delete
```

#### 1.4 Store Secrets
```bash
# Store API keys and secrets
az keyvault secret set --vault-name kv-ba-agent-prod --name GEMINI-API-KEY --value "your-gemini-api-key"
az keyvault secret set --vault-name kv-ba-agent-prod --name ADO-PAT --value "your-ado-pat"
az keyvault secret set --vault-name kv-ba-agent-prod --name ACS-CONNECTION-STRING --value "your-acs-connection-string"
```

### Phase 2: Database & Storage Setup

#### 2.1 Create SQL Database
```bash
# Create SQL Server
az sql server create \
  --name sql-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --location eastus2 \
  --admin-user sqladmin \
  --admin-password "SecurePassword123!"

# Create Database
az sql db create \
  --resource-group rg-ba-agent-prod \
  --server sql-ba-agent-prod \
  --name db-ba-agent \
  --service-objective S2 \
  --max-size 250GB
```

#### 2.2 Create Storage Account
```bash
# Create Storage Account
az storage account create \
  --name stbaagentprod \
  --resource-group rg-ba-agent-prod \
  --location eastus2 \
  --sku Standard_GRS \
  --kind StorageV2

# Create containers
az storage container create --name documents --account-name stbaagentprod
az storage container create --name temp --account-name stbaagentprod
az storage container create --name backups --account-name stbaagentprod
```

### Phase 3: Application Services Setup

#### 3.1 Create App Service Plan
```bash
# Create App Service Plan
az appservice plan create \
  --name asp-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --sku P1v3 \
  --is-linux
```

#### 3.2 Create App Service
```bash
# Create Web App
az webapp create \
  --resource-group rg-ba-agent-prod \
  --plan asp-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --runtime "PYTHON|3.11"

# Configure app settings
az webapp config appsettings set \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --settings \
    WEBSITES_PORT=5000 \
    PYTHON_VERSION=3.11 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    DATABASE_URL="postgresql://sqladmin:SecurePassword123!@sql-ba-agent-prod.database.windows.net:1433/db-ba-agent" \
    AZURE_STORAGE_CONNECTION_STRING="$(az storage account show-connection-string --name stbaagentprod --resource-group rg-ba-agent-prod --query connectionString -o tsv)" \
    GEMINI_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-ba-agent-prod.vault.azure.net/secrets/GEMINI-API-KEY/)" \
    ADO_PAT="@Microsoft.KeyVault(SecretUri=https://kv-ba-agent-prod.vault.azure.net/secrets/ADO-PAT/)" \
    ACS_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://kv-ba-agent-prod.vault.azure.net/secrets/ACS-CONNECTION-STRING/)"
```

#### 3.3 Create Search Service
```bash
# Create Azure Search Service
az search service create \
  --name search-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --sku standard \
  --replica-count 2 \
  --partition-count 1
```

#### 3.4 Create Application Insights
```bash
# Create Application Insights
az monitor app-insights component create \
  --app appi-ba-agent-prod \
  --location eastus2 \
  --resource-group rg-ba-agent-prod \
  --application-type web
```

### Phase 4: Frontend Deployment

#### 4.1 Create Static Web App
```bash
# Create Static Web App for frontend
az staticwebapp create \
  --name ba-agent-frontend-prod \
  --resource-group rg-ba-agent-prod \
  --source https://github.com/your-org/ba-agent \
  --branch main \
  --app-location "/frontend" \
  --api-location "/backend"
```

### Phase 5: Security & Monitoring

#### 5.1 Configure Front Door
```bash
# Create Azure Front Door
az network front-door create \
  --resource-group rg-ba-agent-prod \
  --name fd-ba-agent-prod \
  --backend-address app-ba-agent-api-prod.azurewebsites.net
```

#### 5.2 Configure Auto-scaling
```bash
# Create auto-scaling profile
az monitor autoscale create \
  --resource-group rg-ba-agent-prod \
  --name autoscale-ba-agent-prod \
  --resource app-ba-agent-api-prod \
  --resource-type Microsoft.Web/sites \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Add scaling rules
az monitor autoscale rule create \
  --resource-group rg-ba-agent-prod \
  --autoscale-name autoscale-ba-agent-prod \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1

az monitor autoscale rule create \
  --resource-group rg-ba-agent-prod \
  --autoscale-name autoscale-ba-agent-prod \
  --condition "Percentage CPU < 30 avg 5m" \
  --scale in 1
```

---

## 🔧 Application Deployment

### Backend Deployment

#### Option 1: Direct Deployment
```bash
# Deploy backend code
az webapp deployment source config-zip \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --src backend.zip
```

#### Option 2: Docker Deployment
```bash
# Build Docker image
cd backend
docker build -t ba-agent-api:latest .

# Push to Azure Container Registry (if using ACR)
docker tag ba-agent-api:latest your-acr.azurecr.io/ba-agent-api:latest
docker push your-acr.azurecr.io/ba-agent-api:latest

# Deploy to App Service
az webapp config container set \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --docker-custom-image-name your-acr.azurecr.io/ba-agent-api:latest
```

### Frontend Deployment

#### Option 1: Static Web Apps (Recommended)
```bash
# Deploy to Azure Static Web Apps
az staticwebapp create \
  --name ba-agent-frontend-prod \
  --resource-group rg-ba-agent-prod \
  --source https://github.com/your-org/ba-agent \
  --branch main \
  --app-location "/frontend"
```

#### Option 2: Manual Build and Deploy
```bash
# Build frontend
cd frontend
npm install
npm run build

# Deploy to Azure Storage (if using Blob Storage)
az storage blob upload-batch \
  --account-name stbaagentprod \
  --source build \
  --destination '$web'
```

---

## 🔒 Security Configuration

### 1. Network Security
```bash
# Create Virtual Network
az network vnet create \
  --resource-group rg-ba-agent-prod \
  --name vnet-ba-agent \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-app 10.0.1.0/24 \
  --subnet-name snet-db 10.0.2.0/24

# Configure Network Security Groups
az network nsg create \
  --resource-group rg-ba-agent-prod \
  --name nsg-app

az network nsg rule create \
  --resource-group rg-ba-agent-prod \
  --nsg-name nsg-app \
  --name allow-https \
  --protocol tcp \
  --priority 100 \
  --destination-port-range 443
```

### 2. SSL/TLS Configuration
```bash
# Upload SSL certificate
az webapp config ssl upload \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --certificate-file your-cert.pfx \
  --certificate-password "your-password"

# Bind SSL certificate
az webapp config ssl bind \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --certificate-thumbprint "your-thumbprint" \
  --ssl-type SNI
```

### 3. Custom Domain Configuration
```bash
# Add custom domain
az webapp config hostname add \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --hostname api.yourdomain.com
```

---

## 📊 Monitoring Setup

### 1. Application Insights Configuration
```bash
# Get Application Insights instrumentation key
az monitor app-insights component show \
  --app appi-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --query instrumentationKey -o tsv
```

### 2. Alert Rules
```bash
# Create alert for high CPU usage
az monitor metrics alert create \
  --name "High CPU Alert" \
  --resource-group rg-ba-agent-prod \
  --scopes "/subscriptions/your-subscription/resourceGroups/rg-ba-agent-prod/providers/Microsoft.Web/sites/app-ba-agent-api-prod" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### 3. Log Analytics
```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-ba-agent-prod \
  --workspace-name law-ba-agent-prod
```

---

## 🔄 CI/CD Pipeline Setup

### 1. Azure DevOps Configuration

1. **Create Azure DevOps Project**
   - Go to Azure DevOps portal
   - Create new project: "BA-Agent"
   - Choose Git as version control

2. **Import Repository**
   ```bash
   git remote add origin https://dev.azure.com/your-org/BA-Agent/_git/ba-agent
   git push -u origin main
   ```

3. **Configure Pipeline**
   - Go to Pipelines > New Pipeline
   - Choose Azure Repos Git
   - Select your repository
   - Use the `azure-pipelines.yml` file

### 2. Environment Configuration

1. **Create Environments**
   - Go to Pipelines > Environments
   - Create: "staging", "production"

2. **Configure Approvals**
   - Add approval gates for production
   - Configure required reviewers

### 3. Service Connections

1. **Azure Resource Manager**
   - Go to Project Settings > Service Connections
   - Create new Azure Resource Manager connection
   - Grant access to subscription

2. **Azure Container Registry** (if using ACR)
   - Create ACR service connection
   - Configure authentication

---

## 🧪 Testing Deployment

### 1. Health Check
```bash
# Test health endpoint
curl -X GET https://app-ba-agent-api-prod.azurewebsites.net/health
```

### 2. API Testing
```bash
# Test document upload
curl -X POST https://app-ba-agent-api-prod.azurewebsites.net/api/generate \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-document.pdf"
```

### 3. Performance Testing
```bash
# Load test with Apache Bench
ab -n 100 -c 10 https://app-ba-agent-api-prod.azurewebsites.net/health
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. App Service Not Starting
```bash
# Check app service logs
az webapp log tail --name app-ba-agent-api-prod --resource-group rg-ba-agent-prod

# Check application settings
az webapp config appsettings list --name app-ba-agent-api-prod --resource-group rg-ba-agent-prod
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
az sql db show --name db-ba-agent --server sql-ba-agent-prod --resource-group rg-ba-agent-prod

# Check firewall rules
az sql server firewall-rule list --server sql-ba-agent-prod --resource-group rg-ba-agent-prod
```

#### 3. Key Vault Access Issues
```bash
# Check Key Vault access policies
az keyvault show --name kv-ba-agent-prod --resource-group rg-ba-agent-prod --query properties.accessPolicies

# Add managed identity access
az keyvault set-policy --name kv-ba-agent-prod --object-id "managed-identity-object-id" --secret-permissions get list
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Enable query store
ALTER DATABASE [db-ba-agent] SET QUERY_STORE = ON;

-- Create indexes for common queries
CREATE INDEX IX_analyses_created_at ON analyses(created_at);
CREATE INDEX IX_analyses_filename ON analyses(filename);
```

#### 2. App Service Optimization
```bash
# Configure connection pooling
az webapp config appsettings set \
  --resource-group rg-ba-agent-prod \
  --name app-ba-agent-api-prod \
  --settings \
    WEBSITE_HTTPLOGGING_RETENTION_DAYS=7 \
    WEBSITE_ENABLE_APP_SERVICE_STORAGE=true
```

---

## 📈 Scaling Strategy

### Horizontal Scaling
```bash
# Configure auto-scaling rules
az monitor autoscale rule create \
  --resource-group rg-ba-agent-prod \
  --autoscale-name autoscale-ba-agent-prod \
  --condition "Percentage Memory > 80 avg 5m" \
  --scale out 1

az monitor autoscale rule create \
  --resource-group rg-ba-agent-prod \
  --autoscale-name autoscale-ba-agent-prod \
  --condition "Response Time > 2s avg 5m" \
  --scale out 1
```

### Vertical Scaling
```bash
# Scale up App Service Plan
az appservice plan update \
  --name asp-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --sku P2v3

# Scale up SQL Database
az sql db update \
  --name db-ba-agent \
  --server sql-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --service-objective S3
```

---

## 🔄 Backup & Recovery

### Database Backup
```bash
# Configure backup policy
az sql db update \
  --name db-ba-agent \
  --server sql-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --backup-storage-redundancy Geo

# Create manual backup
az sql db export \
  --name db-ba-agent \
  --server sql-ba-agent-prod \
  --resource-group rg-ba-agent-prod \
  --storage-uri "https://stbaagentprod.blob.core.windows.net/backups/db-backup.bacpac"
```

### Application Backup
```bash
# Backup app settings
az webapp config appsettings list \
  --name app-ba-agent-api-prod \
  --resource-group rg-ba-agent-prod \
  --output json > app-settings-backup.json

# Backup Key Vault secrets
az keyvault secret list \
  --vault-name kv-ba-agent-prod \
  --output table > keyvault-secrets-backup.txt
```

---

## 📞 Support & Maintenance

### Monitoring Dashboard
1. **Azure Monitor Dashboard**
   - Create custom dashboard
   - Add key metrics: CPU, Memory, Response Time
   - Configure alerts

2. **Application Insights**
   - Monitor application performance
   - Track user behavior
   - Analyze errors and exceptions

### Maintenance Windows
```bash
# Schedule maintenance window
az monitor activity-log alert create \
  --name "Maintenance Window" \
  --resource-group rg-ba-agent-prod \
  --condition category=Administrative \
  --action webhook https://your-webhook-url
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Azure subscription with sufficient quota
- [ ] All required API keys and secrets
- [ ] Network connectivity configured
- [ ] SSL certificates obtained
- [ ] Custom domain configured

### Deployment
- [ ] Resource groups created
- [ ] Key Vault configured with secrets
- [ ] Database deployed and configured
- [ ] Storage accounts created
- [ ] App Service deployed
- [ ] Frontend deployed
- [ ] Search service configured
- [ ] Monitoring tools set up

### Post-Deployment
- [ ] SSL certificates configured
- [ ] Custom domain working
- [ ] Health checks passing
- [ ] Performance tests completed
- [ ] Backup policies enabled
- [ ] Security policies applied
- [ ] CI/CD pipeline configured
- [ ] Team access granted

---

## 🎯 Success Metrics

### Performance Targets
- **Response Time**: < 2 seconds (95th percentile)
- **Uptime**: 99.9% SLA
- **Throughput**: 1000+ concurrent users
- **Error Rate**: < 1%

### Business Metrics
- **User Adoption**: 80% of target users
- **Feature Usage**: 70% of available features
- **User Satisfaction**: 4.5/5 rating
- **Cost Efficiency**: 20% reduction in manual processes

---

This deployment guide provides comprehensive instructions for deploying the BA Agent system to Azure production environment with enterprise-grade reliability, security, and scalability. 