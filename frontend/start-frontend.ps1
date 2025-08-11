# PowerShell script to start React development server with enhanced memory management

Write-Host "🚀 Starting React Development Server with Enhanced Memory Settings..." -ForegroundColor Green

# Set Node.js memory limit
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# Set React environment variables for better performance
$env:GENERATE_SOURCEMAP = "false"
$env:CHOKIDAR_USEPOLLING = "true"
$env:FAST_REFRESH = "false"
$env:WATCHPACK_POLLING = "true"

# Clear cache if it exists
if (Test-Path "node_modules\.cache") {
    Write-Host "🧹 Clearing cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
}

# Clear npm cache if needed
Write-Host "🧹 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    npm install
}

# Start the development server
Write-Host "🌐 Starting development server..." -ForegroundColor Green
try {
    npm start
} catch {
    Write-Host "❌ Error starting development server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running: npm install && npm start" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
