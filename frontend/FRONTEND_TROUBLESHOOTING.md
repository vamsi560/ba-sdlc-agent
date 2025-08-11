# Frontend Troubleshooting Guide

## 🚨 Memory Allocation Error Solutions

### **Error: Array buffer allocation failed**

This error occurs when the React development server runs out of memory. Here are multiple solutions:

## **Solution 1: Use Enhanced Start Script (Recommended)**

The `package.json` has been updated with increased memory allocation:

```bash
npm start
```

This now uses: `node --max-old-space-size=4096 node_modules/.bin/react-scripts start`

## **Solution 2: Use Windows Batch File**

Run the provided batch file:

```bash
start-frontend.bat
```

This script:
- Sets memory limit to 4GB
- Disables source maps for better performance
- Clears cache automatically
- Uses polling for file watching

## **Solution 3: Use PowerShell Script**

For more advanced users, run the PowerShell script:

```powershell
.\start-frontend.ps1
```

This script provides:
- Enhanced memory management
- Automatic cache clearing
- Dependency checking
- Error handling

## **Solution 4: Manual Commands**

If the above solutions don't work, try these manual steps:

### **Step 1: Clear All Caches**
```bash
# Clear npm cache
npm cache clean --force

# Clear React cache
rm -rf node_modules/.cache

# Clear browser cache (if using browser)
# Press Ctrl+Shift+Delete in your browser
```

### **Step 2: Reinstall Dependencies**
```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

### **Step 3: Start with Memory Limit**
```bash
# Set memory limit and start
set NODE_OPTIONS=--max-old-space-size=4096
npm start
```

## **Solution 5: Environment Variables**

Create a `.env` file in the frontend directory:

```env
# Memory and Performance Settings
GENERATE_SOURCEMAP=false
CHOKIDAR_USEPOLLING=true
FAST_REFRESH=false
WATCHPACK_POLLING=true

# Node.js Settings
NODE_OPTIONS=--max-old-space-size=4096
```

## **Solution 6: Alternative Start Methods**

### **Method A: Use Yarn Instead of NPM**
```bash
# Install yarn if not installed
npm install -g yarn

# Install dependencies with yarn
yarn install

# Start with yarn
yarn start
```

### **Method B: Use Vite Instead of Create React App**
```bash
# Install vite
npm install -g create-vite

# Create new project with vite
create-vite my-app --template react

# Start vite dev server
npm run dev
```

## **Solution 7: System-Level Fixes**

### **Windows Specific:**
1. **Increase Virtual Memory:**
   - Right-click on "This PC" → Properties
   - Advanced system settings → Performance → Settings
   - Advanced → Virtual memory → Change
   - Set custom size: Initial 4096 MB, Maximum 8192 MB

2. **Disable Antivirus Scanning:**
   - Temporarily disable real-time scanning for the project folder
   - Add project folder to antivirus exclusions

3. **Update Node.js:**
   - Download latest LTS version from nodejs.org
   - Uninstall current version and install new one

### **General System:**
1. **Close Other Applications:**
   - Close unnecessary browser tabs
   - Close other development servers
   - Close memory-intensive applications

2. **Restart Computer:**
   - Sometimes a simple restart can resolve memory issues

## **Solution 8: Development Server Alternatives**

### **Use Production Build for Development:**
```bash
# Build the project
npm run build

# Serve the build folder
npx serve -s build -l 3000
```

### **Use a Different Port:**
```bash
# Start on a different port
PORT=3001 npm start
```

## **Solution 9: Advanced Configuration**

### **Create a Custom Webpack Config:**
Create `craco.config.js` in the frontend directory:

```javascript
module.exports = {
  webpack: {
    configure: {
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      },
    },
  },
};
```

Then install CRACO:
```bash
npm install @craco/craco
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  }
}
```

## **Solution 10: Performance Monitoring**

### **Monitor Memory Usage:**
```bash
# Check Node.js memory usage
node --max-old-space-size=4096 -e "console.log(process.memoryUsage())"

# Monitor system memory
# Windows: Task Manager → Performance → Memory
# Linux/Mac: htop or top command
```

### **Use Memory Profiler:**
```bash
# Install memory profiler
npm install -g clinic

# Profile the application
clinic doctor -- node_modules/.bin/react-scripts start
```

## **Prevention Tips**

1. **Regular Maintenance:**
   - Clear cache weekly
   - Update dependencies monthly
   - Restart development server daily

2. **Optimize Development Environment:**
   - Use SSD for faster file operations
   - Ensure adequate RAM (8GB+ recommended)
   - Close unnecessary applications

3. **Code Optimization:**
   - Avoid large dependencies
   - Use code splitting
   - Implement lazy loading

## **Common Issues and Solutions**

### **Issue: "Cannot find module"**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### **Issue: "Port 3000 is already in use"**
```bash
# Solution: Use different port
PORT=3001 npm start

# Or kill the process using port 3000
# Windows: netstat -ano | findstr :3000
# Then: taskkill /PID <PID> /F
```

### **Issue: "Module not found"**
```bash
# Solution: Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **Issue: "SyntaxError: Unexpected token"**
```bash
# Solution: Check for syntax errors
npm run build

# Or use ESLint
npx eslint src/
```

## **Getting Help**

If none of the above solutions work:

1. **Check Node.js Version:**
   ```bash
   node --version
   # Should be 16.x or higher
   ```

2. **Check NPM Version:**
   ```bash
   npm --version
   # Should be 8.x or higher
   ```

3. **Check System Resources:**
   - Ensure at least 4GB RAM available
   - Ensure at least 2GB free disk space

4. **Contact Support:**
   - Create an issue with detailed error logs
   - Include system specifications
   - Include Node.js and NPM versions

## **Quick Fix Checklist**

- [ ] Clear npm cache: `npm cache clean --force`
- [ ] Clear React cache: `rm -rf node_modules/.cache`
- [ ] Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`
- [ ] Use memory limit: `set NODE_OPTIONS=--max-old-space-size=4096`
- [ ] Disable source maps: `set GENERATE_SOURCEMAP=false`
- [ ] Restart computer
- [ ] Try different port: `PORT=3001 npm start`
- [ ] Use batch file: `start-frontend.bat`
- [ ] Use PowerShell script: `.\start-frontend.ps1`

---

*This guide covers the most common issues. If you continue to experience problems, please check the official React documentation or create a support ticket.*
