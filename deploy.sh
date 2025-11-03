#!/bin/bash

# Deployment script for USSD Data Manager

echo "🚀 USSD Data Manager - Cloud Deployment"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building React app..."
npm run build

echo "✅ Build complete!"
echo ""
echo "🌐 Next steps for cloud deployment:"
echo ""
echo "1️⃣  Deploy React App + API:"
echo "   Netlify: Drag & drop the 'dist' folder to netlify.com"
echo "   Vercel:  Run 'npx vercel --prod'"
echo ""
echo "2️⃣  Deploy MCP Server to FastMCP Cloud:"
echo "   - Push 'Telco USSD Assist' folder to GitHub"
echo "   - Connect repo at fastmcp.cloud"
echo "   - Set environment variable:"
echo "     USSD_API_BASE_URL=https://your-app-name.netlify.app/api"
echo ""
echo "3️⃣  Update Claude Desktop config:"
echo "   Use the FastMCP Cloud URL in your MCP configuration"
echo ""
echo "📚 See CLOUD_DEPLOYMENT.md for detailed instructions"

# Check if netlify CLI is available
if command -v netlify &> /dev/null; then
    echo ""
    echo "🔧 Netlify CLI detected. Deploy now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Netlify..."
        netlify deploy --prod --dir=dist
    fi
fi

# Check if vercel CLI is available
if command -v vercel &> /dev/null; then
    echo ""
    echo "🔧 Vercel CLI detected. Deploy now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Vercel..."
        vercel --prod
    fi
fi

echo ""
echo "✨ Deployment preparation complete!"