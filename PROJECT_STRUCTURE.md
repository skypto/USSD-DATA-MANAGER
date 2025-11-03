# Project Structure - USSD Data Manager

Overview of the project organization and file structure.

---

## 📁 Root Directory Structure

```
ussd-data-manager/
├── 📁 src/                          # React application source code
├── 📁 Telco USSD Assist/           # MCP server implementation
├── 📁 api/                         # Vercel serverless functions
├── 📁 netlify/                     # Netlify serverless functions
├── 📁 deployment/                  # Deployment configuration files
├── 📁 sample/                      # Sample data files
├── 📄 README.md                    # Main project documentation
├── 📄 SETUP_GUIDE.md              # Complete setup instructions
├── 📄 API_REFERENCE.md            # API documentation
├── 📄 SECURITY_GUIDE.md           # Security guidelines
├── 📄 PROJECT_STRUCTURE.md        # This file
├── 📄 package.json                # Node.js dependencies and scripts
├── 📄 server.js                   # Express API server (development)
├── 📄 server_secure.js            # Secure API server (configurable)
├── 📄 server_readonly.js          # Read-only API server (production)
├── 📄 test_api.js                 # API testing script
├── 📄 deploy.sh                   # Deployment helper script
└── 📄 vite.config.ts              # Vite build configuration
```

---

## 🎯 Core Components

### React Application (`src/`)

```
src/
├── 📄 App.tsx                     # Main React application component
├── 📄 ApiPanel.tsx               # API integration panel component
├── 📄 api.ts                     # API client utilities
├── 📄 types.ts                   # TypeScript type definitions
├── 📄 utils.ts                   # Utility functions
├── 📄 index.css                  # Global styles
└── 📄 main.tsx                   # React application entry point
```

### MCP Server (`Telco USSD Assist/`)

```
Telco USSD Assist/
├── 📄 main.py                    # Static data MCP server
├── 📄 main_api.py               # API-integrated MCP server
├── 📄 core_functions.py         # Shared MCP server utilities
├── 📄 demo.py                   # Interactive demonstration script
├── 📄 ussd_data.json           # Static USSD data
├── 📄 requirements.txt          # Python dependencies
├── 📄 README.md                 # MCP server documentation
├── 📄 SETUP_GUIDE.md           # MCP server setup guide
├── 📄 API_INTEGRATION.md       # API integration guide

└── 📁 tests/                   # Unit tests
    ├── 📄 __init__.py
    ├── 📄 conftest.py
    └── 📄 test_lookup.py
```

### API Servers

```
# Development API servers
server.js                         # Full-featured API server
server_secure.js                  # Configurable security API server
server_readonly.js                # Read-only API server (production)

# Serverless functions
api/index.js                      # Vercel serverless function
netlify/functions/api.js          # Netlify serverless function
```

### Configuration Files

```
# Build and development
vite.config.ts                   # Vite build configuration
tsconfig.json                    # TypeScript configuration
tailwind.config.js               # Tailwind CSS configuration
postcss.config.js                # PostCSS configuration

# Deployment
deployment/netlify.toml          # Netlify configuration
deployment/vercel.json           # Vercel configuration
deploy.sh                        # Deployment helper script

# Package management
package.json                     # Node.js dependencies and scripts
package-lock.json               # Locked dependency versions
```

---

## 🔧 Key Files Explained

### Application Core

#### `src/App.tsx`

- **Purpose**: Main React application component
- **Features**: Role-based UI, service management, change requests
- **Dependencies**: React, TypeScript, Tailwind CSS
- **Key Functions**: User authentication, data management, API integration

#### `src/types.ts`

- **Purpose**: TypeScript type definitions
- **Contents**: Service data structures, user roles, API responses
- **Usage**: Ensures type safety across the application

#### `src/utils.ts`

- **Purpose**: Utility functions and helpers
- **Features**: Data transformation, localStorage management, export/import
- **Key Functions**: `toOriginalSchema()`, `normalizeImported()`, `saveSession()`

### API Integration

#### `server.js` (Development)

- **Purpose**: Full-featured Express API server
- **Features**: All CRUD operations, CORS, error handling
- **Usage**: Local development and testing
- **Security**: ⚠️ Not recommended for production

#### `server_readonly.js` (Production)

- **Purpose**: Read-only Express API server
- **Features**: Only GET requests, blocks write operations
- **Usage**: Production MCP server integration
- **Security**: ✅ Safe for public deployment

#### `api/index.js` & `netlify/functions/api.js`

- **Purpose**: Serverless function implementations
- **Features**: Same API endpoints as Express servers
- **Usage**: Cloud deployment (Vercel/Netlify)
- **Benefits**: Auto-scaling, no server management

### MCP Server

#### `Telco USSD Assist/main.py`

- **Purpose**: Traditional MCP server with static data
- **Data Source**: `ussd_data.json` file
- **Usage**: Local development, offline use
- **Benefits**: Fast, reliable, no external dependencies

#### `Telco USSD Assist/main_api.py`

- **Purpose**: API-integrated MCP server
- **Data Source**: Live API endpoints
- **Usage**: Real-time data integration
- **Benefits**: Always up-to-date, centralized data management

### Data Files

#### `sample/ussd_data.json`

- **Purpose**: Sample USSD service data
- **Format**: Original MCP server format
- **Usage**: Initial data, testing, development
- **Structure**: Service-based with network-specific codes

#### `src/` (localStorage)

- **Keys**: `ussd_data_v1`, `ussd_versions_v1`, `ussd_session_v1`
- **Purpose**: Browser-based data persistence
- **Benefits**: No server required, instant access
- **Limitations**: Browser-specific, not shared

---

## 🚀 Build Process

### Development Build

```bash
npm run dev                       # Start React dev server
npm run server                    # Start API server
npm run dev:full                  # Start both React and API
```

**Process:**

1. Vite starts development server on port 5173
2. Express API server starts on port 3001
3. Hot module replacement enabled
4. TypeScript compilation on-the-fly

### Production Build

```bash
npm run build                     # Build for production
npm run preview                   # Preview production build
```

**Process:**

1. TypeScript compilation (`tsc -b`)
2. Vite production build
3. Asset optimization and minification
4. Output to `dist/` directory

### Deployment Build

```bash
# Netlify/Vercel automatic build
npm install                       # Install dependencies
npm run build                     # Build application
# Deploy dist/ folder + serverless functions
```

---

## 📊 Data Flow

### React Application Data Flow

```
User Input → Component State → Utils Functions → localStorage → Export/Import
     ↓              ↓              ↓              ↓              ↓
UI Updates ← State Updates ← Data Transform ← Persistence ← File Operations
```

### API Integration Data Flow

```
React App → API Client → Express Server → JSON File → MCP Server → Claude Desktop
    ↓           ↓            ↓             ↓           ↓            ↓
Browser ← HTTP Response ← API Endpoint ← File System ← HTTP Request ← AI Assistant
```

### MCP Server Data Flow

```
Static Version:
Claude Desktop → MCP Server → ussd_data.json → Response

API Version:
Claude Desktop → MCP Server → HTTP Request → API Server → JSON File → Response
```

---

## 🔒 Security Architecture

### Frontend Security

- **Role-based UI**: Different interfaces for different user types
- **Input validation**: Client-side validation for user inputs
- **XSS protection**: React's built-in XSS protection
- **HTTPS**: Secure communication in production

### API Security

- **Read-only endpoints**: Production API only allows GET requests
- **CORS configuration**: Controlled cross-origin access
- **Input sanitization**: Server-side input validation
- **Rate limiting**: Optional request rate limiting

### Data Security

- **No sensitive data**: Only public USSD codes stored
- **Local storage**: Data stays in user's browser
- **No authentication**: Public data doesn't require auth
- **Audit trail**: Change tracking and version history

---

## 🧪 Testing Structure

### Manual Testing

- **React App**: Role-based functionality testing
- **API Endpoints**: HTTP request/response testing
- **MCP Integration**: Claude Desktop integration testing
- **Cross-browser**: Multiple browser compatibility

### Automated Testing

- **API Tests**: `test_api.js` - Endpoint functionality
- **Unit Tests**: Future implementation for components
- **Integration Tests**: Future implementation for workflows
- **E2E Tests**: Future implementation for user journeys

### Testing Scripts

```bash
npm run test:api                  # Test API endpoints
node test_api.js                  # Direct API testing
curl http://localhost:3001/health # Manual health check
```

---

## 📈 Performance Considerations

### Frontend Performance

- **Vite**: Fast development and build times
- **Code splitting**: Automatic chunk splitting
- **Tree shaking**: Unused code elimination
- **Asset optimization**: Image and CSS optimization

### API Performance

- **Lightweight**: Minimal dependencies
- **Caching**: Optional response caching
- **Compression**: Automatic gzip compression
- **CDN**: Static asset delivery via CDN

### Data Performance

- **localStorage**: Fast local data access
- **JSON format**: Lightweight data structure
- **Lazy loading**: Components load on demand
- **Efficient updates**: Only changed data re-rendered

---

## 🔄 Version Control

### Git Structure

```
.git/
├── 📁 hooks/                    # Git hooks
├── 📁 objects/                  # Git objects
├── 📄 .gitignore               # Ignored files
└── 📄 README.md                # Project documentation
```

### Ignored Files (`.gitignore`)

```
node_modules/                    # Dependencies
dist/                           # Build output
.env                           # Environment variables
*.log                          # Log files
.DS_Store                      # macOS system files
```

### Branch Strategy

- **main**: Production-ready code
- **develop**: Development integration
- **feature/\***: Feature development
- **hotfix/\***: Production fixes

---

## 📚 Documentation Structure

### User Documentation

- **README.md**: Project overview and quick start
- **SETUP_GUIDE.md**: Complete setup and deployment instructions

### Technical Documentation

- **API_REFERENCE.md**: Complete API documentation
- **SECURITY_GUIDE.md**: Security guidelines
- **PROJECT_STRUCTURE.md**: This file

### Developer Documentation

- **Code comments**: Inline documentation
- **Type definitions**: TypeScript interfaces
- **Function documentation**: JSDoc comments

---

**This structure provides a solid foundation for a scalable, maintainable USSD data management system! 🏗️**
