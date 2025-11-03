# Setup Guide - USSD Data Manager

Complete setup instructions for local development, testing, and cloud deployment.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Modern web browser** - Chrome, Firefox, Safari, or Edge
- **Git** - For cloning the repository

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ussd-data-manager

# Install dependencies
npm install
```

### Development Server

```bash
# Option 1: React app only (recommended for UI development)
npm run dev

# Option 2: React app + API server (for MCP integration testing)
npm run dev:full

# Option 3: API server only (for backend testing)
npm run server
```

**Access URLs:**
- **React App**: http://localhost:5173
- **API Server**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

---

## 🎯 Development Workflow

### 1. Basic App Development
```bash
# Start the React app
npm run dev

# Open browser to http://localhost:5173
# Login with any role to start testing
```

### 2. API Integration Development
```bash
# Start both React app and API server
npm run dev:full

# Test API endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/services
```

### 3. MCP Server Integration
```bash
# In terminal 1: Start the full system
npm run dev:full

# In terminal 2: Start MCP server (if you have it)
cd "Telco USSD Assist"
python main_api.py
```

---

## 🧪 Testing

### Manual Testing Checklist

#### React App Testing
- [ ] **Login Flow**: Test all user roles (Admin, MTN, Telecel, AirtelTigo, Glo)
- [ ] **Service Management**: Add, edit, delete services (Admin only)
- [ ] **Change Requests**: Create and approve/reject changes
- [ ] **Search & Filter**: Test service search functionality
- [ ] **Import/Export**: Test JSON import and export features
- [ ] **Version Control**: Save and restore data snapshots
- [ ] **Responsive Design**: Test on mobile, tablet, desktop

#### API Testing
```bash
# Test all core endpoints
npm run test:api

# Manual API testing
curl http://localhost:3001/api/health
curl http://localhost:3001/api/lookup/check_balance/mtn
curl http://localhost:3001/api/services
curl http://localhost:3001/api/services?network=mtn
curl http://localhost:3001/api/compare/check_balance
```

#### Security Testing
```bash
# Test read-only server (recommended for production)
npm run server:readonly

# Try write operations (should be blocked)
curl -X POST http://localhost:3001/api/data -d '{"test":"data"}' -H "Content-Type: application/json"
```

### Automated Testing
```bash
# Run API endpoint tests
npm run test:api

# Future: Add unit tests
npm test
```

---

## 🌐 Cloud Deployment

### Option 1: Netlify (Recommended)

#### Step 1: Prepare for Deployment
```bash
# Build the project
npm run build

# Verify build output
ls -la dist/
```

#### Step 2: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist
```

#### Step 3: Configure Serverless Functions
The `netlify/functions/api.js` file is automatically deployed as a serverless function.

**Your app will be available at**: `https://your-app-name.netlify.app`

#### Step 4: Test Deployed API
```bash
# Test the deployed API
curl https://your-app-name.netlify.app/api/health
curl https://your-app-name.netlify.app/api/services
```

### Option 2: Vercel

#### Step 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

#### Step 2: Configure API Routes
The `api/index.js` file is automatically deployed as a serverless function.

**Your app will be available at**: `https://your-app.vercel.app`

### Option 3: Manual Deployment

#### Step 1: Build Static Files
```bash
npm run build
```

#### Step 2: Deploy to Any Static Host
Upload the `dist/` folder to:
- **GitHub Pages**
- **AWS S3 + CloudFront**
- **Google Cloud Storage**
- **Azure Static Web Apps**

#### Step 3: Deploy API Separately
Deploy the API server to:
- **Heroku**
- **Railway**
- **DigitalOcean App Platform**
- **AWS Lambda**

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# API Configuration
USSD_API_BASE_URL=http://localhost:3001/api
PORT=3001

# Security (for production)
ENABLE_WRITE_OPERATIONS=false
API_KEY=your-secret-key

# Development
NODE_ENV=development
```

### Production Environment Variables

For cloud deployments, set these in your hosting platform:

```bash
# Netlify/Vercel Environment Variables
USSD_API_BASE_URL=https://your-app.netlify.app/api
ENABLE_WRITE_OPERATIONS=false
NODE_ENV=production
```

### Server Configuration Options

#### Read-Only Server (Production Recommended)
```bash
npm run server:readonly
```
- ✅ Only GET requests allowed
- ✅ All write operations blocked
- ✅ Safe for MCP server access

#### Secure Server (Development)
```bash
ENABLE_WRITE_OPERATIONS=true npm run server:secure
```
- ✅ Write operations require explicit enablement
- ✅ Optional API key protection
- ✅ Environment variable controls

#### Full Server (Local Development)
```bash
npm run server
```
- ⚠️ All operations allowed
- ⚠️ Only use for local development
- ⚠️ Never deploy to production without security

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Error: Port 5173 is already in use
# Solution: Kill the process or use a different port
lsof -ti:5173 | xargs kill -9
# Or
npm run dev -- --port 3000
```

#### 2. API Server Not Starting
```bash
# Error: Cannot start API server
# Check if port 3001 is available
lsof -ti:3001 | xargs kill -9

# Start with different port
PORT=3002 npm run server
```

#### 3. Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite
npm run build
```

#### 4. CORS Issues in Production
```javascript
// In your API server configuration
app.use(cors({
  origin: ['https://your-app.netlify.app', 'https://your-app.vercel.app'],
  credentials: true
}));
```

#### 5. MCP Server Connection Issues
```bash
# Check API endpoint
curl https://your-app.netlify.app/api/health

# Verify environment variable
echo $USSD_API_BASE_URL

# Test with local API
export USSD_API_BASE_URL="http://localhost:3001/api"
```

### Debug Mode

#### Enable Verbose Logging
```bash
# For API server
DEBUG=* npm run server

# For React app (in browser console)
localStorage.setItem('debug', 'ussd:*')
```

#### Check Network Requests
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Perform actions in the app
4. Check for failed requests or errors

---

## 📊 Performance Optimization

### Development Performance
```bash
# Use Vite's fast refresh for instant updates
npm run dev

# Enable source maps for debugging
# (automatically enabled in development)
```

### Production Performance
```bash
# Build with optimizations
npm run build

# Analyze bundle size
npm install -g vite-bundle-analyzer
npx vite-bundle-analyzer dist/
```

### API Performance
```bash
# Use read-only server for better performance
npm run server:readonly

# Enable compression (in production)
# Automatically handled by Netlify/Vercel
```

---

## 🔒 Security Best Practices

### Development Security
- ✅ Use HTTPS in production
- ✅ Validate all inputs
- ✅ Use read-only API for MCP access
- ✅ Never commit API keys to Git

### Production Security
```bash
# Use environment variables for secrets
export API_KEY="$(openssl rand -hex 32)"

# Enable HTTPS only
# (automatically handled by Netlify/Vercel)

# Use Content Security Policy
# Add to your HTML head:
# <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

### API Security
```bash
# Use read-only server for MCP access
npm run server:readonly

# Enable rate limiting (optional)
npm install express-rate-limit
```

---

## 📈 Monitoring & Analytics

### Basic Monitoring
```javascript
// Add to your API server
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

### Production Monitoring
- **Netlify**: Built-in analytics and function logs
- **Vercel**: Built-in analytics and serverless function monitoring
- **Custom**: Use services like LogRocket, Sentry, or DataDog

### Performance Monitoring
```javascript
// Add performance timing
console.time('api-request');
// ... your API logic
console.timeEnd('api-request');
```

---

## 🚀 Advanced Setup

### Custom Backend Integration
```javascript
// Example: Supabase integration
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// In your API routes
const { data, error } = await supabase
  .from('ussd_services')
  .select('*')
```

### Database Setup (Optional)
```sql
-- Example PostgreSQL schema
CREATE TABLE ussd_services (
  id SERIAL PRIMARY KEY,
  service_id VARCHAR(100) UNIQUE NOT NULL,
  service_name VARCHAR(200) NOT NULL,
  description TEXT,
  mtn_code VARCHAR(20),
  mtn_explanation TEXT,
  telecel_code VARCHAR(20),
  telecel_explanation TEXT,
  airteltigo_code VARCHAR(20),
  airteltigo_explanation TEXT,
  glo_code VARCHAR(20),
  glo_explanation TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### CI/CD Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 📞 Getting Help

### Documentation
- **README.md**: Overview and features
- **SETUP_GUIDE.md**: This comprehensive setup guide
- **SECURITY_GUIDE.md**: Security best practices and configurations

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community support and questions
- **Documentation**: In-code comments and examples

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

---

**Ready to get started? Follow the Quick Start section above and you'll be up and running in minutes! 🚀**