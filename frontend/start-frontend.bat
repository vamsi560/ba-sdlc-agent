@echo off
echo Starting React Development Server with Enhanced Memory Settings...

REM Set Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=4096

REM Set React environment variables
set GENERATE_SOURCEMAP=false
set CHOKIDAR_USEPOLLING=true
set FAST_REFRESH=false

REM Clear cache if needed
if exist "node_modules\.cache" (
    echo Clearing cache...
    rmdir /s /q "node_modules\.cache"
)

REM Start the development server using npx
echo Starting development server...
npx react-scripts start

pause
