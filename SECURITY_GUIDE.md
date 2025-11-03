# Security Guide - USSD Data Manager

Comprehensive security guidelines for the USSD Data Manager application and API integration.

---

## 🔒 Security Overview

The USSD Data Manager implements multiple layers of security to protect data integrity while enabling safe API access for MCP servers and other integrations.

### Security Principles
- ✅ **Read-Only API Access** - External systems can only read data, never modify
- ✅ **Role-Based Permissions** - Different access levels for different user types
- ✅ **Data Validation** - All inputs are sanitized and validated
- ✅ **Secure Defaults** - Production-safe configurations by default

---

## 🛡️ API Security Levels

### Level 1: Read-Only Server (Production Recommended)
```bash
npm run server:readonly
```

**Features:**
- ✅ Only `GET` requests allowed
- ✅ All write operations (`POST/PUT/DELETE`) blocked
- ✅ Safe for MCP server access
- ✅ Perfect for production deployment

**Use Cases:**
- Production MCP server integration
- Public API access
- External system integration

### Level 2: Secure Server (Development)
```bash
# Read-only by default
npm run server:secure

# Enable writes with explicit permission
ENABLE_WRITE_OPERATIONS=true npm run server:secure

# Add API key protection
ENABLE_WRITE_OPERATIONS=true API_KEY=your-secret-key npm run server:secure
```

**Features:**
- ✅ Write operations disabled by default
- ✅ Optional API key authentication
- ✅ Environment variable controls
- ✅ Configurable security levels

**Use Cases:**
- Development and testing
- Controlled write access
- API key-protected operations

### Level 3: Full Server (Local Development Only)
```bash
npm run server
```

**Features:**
- ⚠️ All operations allowed
- ⚠️ No authentication required
- ⚠️ Only for local development

**Use Cases:**
- Local development only
- Never deploy to production

---

## 🔐 Authentication & Authorization

### Role-Based Access Control (React App)
```typescript
// User roles with different permissions
type Role = 'admin' | 'mtn' | 'telecel' | 'airteltigo' | 'glo';

// Admin permissions
- Full CRUD operations on all data
- Approve/reject change requests
- Export complete datasets
- Manage user sessions

// Telco representative permissions  
- Edit own network data only
- Submit change requests
- Export own network data
- View-only access to other networks
```

### API Key Protection (Optional)
```bash
# Generate secure API key
API_KEY=$(openssl rand -hex 32)

# Use in server configuration
ENABLE_WRITE_OPERATIONS=true API_KEY=$API_KEY npm run server:secure
```

```javascript
// API key validation in server
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}
```

---

## 🌐 Production Security

### Deployment Security Checklist
- [ ] Use `server:readonly` for MCP access
- [ ] Enable HTTPS (automatic with Netlify/Vercel)
- [ ] Set secure environment variables
- [ ] Configure CORS properly
- [ ] Enable rate limiting (optional)
- [ ] Monitor API usage

### Environment Variables
```bash
# Production environment variables
USSD_API_BASE_URL=https://your-app.netlify.app/api
ENABLE_WRITE_OPERATIONS=false
NODE_ENV=production
API_KEY=your-secret-key  # Only if needed
```

### CORS Configuration
```javascript
// Secure CORS setup
app.use(cors({
  origin: [
    'https://your-app.netlify.app',
    'https://your-app.vercel.app'
  ],
  methods: ['GET'],  // Read-only for production
  credentials: false
}));
```

---

## 🔍 Input Validation & Sanitization

### Data Validation
```typescript
// Service ID validation
function validateServiceId(id: string): boolean {
  return /^[a-z0-9_]+$/.test(id) && id.length <= 50;
}

// USSD code validation
function validateUssdCode(code: string): boolean {
  return /^\*\d+(\*\d+)*#?$/.test(code) && code.length <= 20;
}

// Network validation
function validateNetwork(network: string): boolean {
  return ['mtn', 'telecel', 'airteltigo', 'glo'].includes(network);
}
```

### SQL Injection Prevention
```javascript
// Use parameterized queries (if using database)
const query = 'SELECT * FROM services WHERE network = ? AND service_id = ?';
db.query(query, [network, serviceId], callback);

// Avoid string concatenation
// BAD: `SELECT * FROM services WHERE id = '${id}'`
// GOOD: Use parameterized queries or ORM
```

### XSS Prevention
```javascript
// Sanitize HTML content
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}
```

---

## 🚨 Rate Limiting & DDoS Protection

### Basic Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Stricter limits for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 write operations per 15 minutes
  skip: (req) => req.method === 'GET'
});

app.use('/api/', apiLimiter);
app.use('/api/data', writeLimiter);
```

### Advanced Protection
```javascript
// Helmet for security headers
import helmet from 'helmet';
app.use(helmet());

// Request size limiting
app.use(express.json({ limit: '10mb' }));

// Slow down repeated requests
import slowDown from 'express-slow-down';
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500
});
app.use('/api/', speedLimiter);
```

---

## 🔒 Data Protection

### Sensitive Data Handling
```javascript
// Never log sensitive data
app.use((req, res, next) => {
  const sanitizedBody = { ...req.body };
  delete sanitizedBody.password;
  delete sanitizedBody.apiKey;
  console.log('Request:', req.method, req.path, sanitizedBody);
  next();
});
```

### Data Encryption (If Needed)
```javascript
import crypto from 'crypto';

// Encrypt sensitive data before storage
function encrypt(text: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt when retrieving
function decrypt(encryptedText: string, key: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 🔍 Security Monitoring

### Logging & Monitoring
```javascript
// Security event logging
function logSecurityEvent(event: string, details: any) {
  console.log(`[SECURITY] ${new Date().toISOString()} - ${event}:`, details);
  
  // In production, send to monitoring service
  // sendToMonitoringService({ event, details, timestamp: new Date() });
}

// Monitor failed authentication attempts
app.use('/api/', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent('AUTH_FAILURE', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
    }
    originalSend.call(this, data);
  };
  next();
});
```

### Health Monitoring
```javascript
// API health endpoint with security info
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    security: {
      writeOperationsEnabled: process.env.ENABLE_WRITE_OPERATIONS === 'true',
      apiKeyRequired: !!process.env.API_KEY,
      corsEnabled: true,
      rateLimitingEnabled: true
    }
  });
});
```

---

## 🚨 Incident Response

### Security Incident Checklist
1. **Identify the Issue**
   - Monitor logs for unusual activity
   - Check for failed authentication attempts
   - Look for suspicious API usage patterns

2. **Immediate Response**
   - Block suspicious IP addresses
   - Rotate API keys if compromised
   - Switch to read-only mode if needed

3. **Investigation**
   - Analyze logs and access patterns
   - Check for data integrity issues
   - Document the incident

4. **Recovery**
   - Restore from backups if needed
   - Update security measures
   - Communicate with stakeholders

### Emergency Commands
```bash
# Switch to read-only mode immediately
export ENABLE_WRITE_OPERATIONS=false
npm run server:readonly

# Rotate API key
export API_KEY=$(openssl rand -hex 32)

# Check recent access logs
tail -f /var/log/api-access.log | grep -E "(401|403|429)"
```

---

## ✅ Security Best Practices

### Development
- ✅ Use HTTPS in all environments
- ✅ Validate all inputs on both client and server
- ✅ Use environment variables for secrets
- ✅ Never commit API keys or passwords
- ✅ Implement proper error handling
- ✅ Use security linting tools

### Production
- ✅ Use read-only API for external access
- ✅ Enable rate limiting and monitoring
- ✅ Set up proper CORS policies
- ✅ Use secure headers (Helmet.js)
- ✅ Monitor for security events
- ✅ Keep dependencies updated

### Deployment
- ✅ Use secure deployment pipelines
- ✅ Implement proper secrets management
- ✅ Enable automatic security updates
- ✅ Set up monitoring and alerting
- ✅ Regular security audits
- ✅ Backup and recovery procedures

---

## 📊 Security Compliance

### Data Privacy
- ✅ No personal data stored or transmitted
- ✅ Only public USSD codes and explanations
- ✅ No user tracking or analytics by default
- ✅ GDPR compliant (no personal data)

### Security Standards
- ✅ OWASP Top 10 compliance
- ✅ Secure coding practices
- ✅ Regular dependency updates
- ✅ Security testing integration

---

**Your USSD Data Manager is secure by design. Follow these guidelines to maintain security in all environments! 🔒**