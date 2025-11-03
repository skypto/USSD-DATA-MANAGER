# API Reference - USSD Data Manager

Complete API documentation for the USSD Data Manager REST API endpoints.

---

## 🌐 Base URL

### Local Development
```
http://localhost:3001
```

### Production (Example)
```
https://your-app.netlify.app
https://your-app.vercel.app
```

---

## 🔐 Authentication

### Public Endpoints (Read-Only)
Most endpoints are public and require no authentication for read operations:
- `/api/lookup/*` - USSD code lookup
- `/api/services` - Service listing
- `/api/compare/*` - Code comparison
- `/health` - Health check

### Protected Endpoints (Write Operations)
Write operations may require API key authentication:
```bash
# Include API key in request headers
curl -H "X-API-Key: your-api-key" -X POST /api/data
```

---

## 📋 Core API Endpoints

### Health Check

#### `GET /health`
Check API server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "mode": "read-only",
  "security": {
    "writeOperationsEnabled": false,
    "apiKeyRequired": false,
    "corsEnabled": true
  }
}
```

**Status Codes:**
- `200` - Server is healthy
- `500` - Server error

---

## 🔍 USSD Lookup Endpoints

### Lookup Specific USSD Code

#### `GET /api/lookup/:service/:network`
Get USSD code and explanation for a specific service and network.

**Parameters:**
- `service` (string) - Service identifier (e.g., "check_balance")
- `network` (string) - Network identifier ("mtn", "telecel", "airteltigo", "glo")

**Example Request:**
```bash
curl http://localhost:3001/api/lookup/check_balance/mtn
```

**Success Response (200):**
```json
{
  "code": "*124#",
  "explanation": "Checks your main airtime balance on MTN."
}
```

**Error Responses:**
```json
// Service not found (404)
{
  "error": "Unknown service 'invalid_service'. Valid services: check_balance, borrow_credit, ..."
}

// Network not found (400)
{
  "error": "Unknown network 'invalid_network'. Valid networks: mtn, telecel, airteltigo, glo"
}

// Service exists but no data for network (404)
{
  "error": "No entry for network 'glo' under service 'check_balance'."
}
```

---

### List Available Services

#### `GET /api/services`
List all available service names.

**Query Parameters:**
- `network` (optional) - Filter services by network

**Example Requests:**
```bash
# List all services
curl http://localhost:3001/api/services

# List services available on MTN
curl http://localhost:3001/api/services?network=mtn
```

**Success Response (200):**
```json
[
  "Check Airtime Balance",
  "Check Data Bundle Balance",
  "Borrow Credit / Airtime",
  "Buy Data Bundle",
  "Contact Customer Care"
]
```

---

### Compare Codes Across Networks

#### `GET /api/compare/:service`
Compare USSD codes for a service across all networks.

**Parameters:**
- `service` (string) - Service identifier

**Example Request:**
```bash
curl http://localhost:3001/api/compare/check_balance
```

**Success Response (200):**
```json
{
  "mtn": "*124#",
  "telecel": "*124#",
  "airteltigo": "*134#",
  "glo": "*124#"
}
```

**Error Response (404):**
```json
{
  "error": "Unknown service 'invalid_service'. Valid services: check_balance, borrow_credit, ..."
}
```

---

## 📊 Data Management Endpoints

### Get Complete Dataset

#### `GET /api/data`
Retrieve the complete USSD services dataset.

**Authentication:** May require API key (depending on server configuration)

**Example Request:**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/data
```

**Success Response (200):**
```json
{
  "check_balance": {
    "service_name": "Check Airtime Balance",
    "mtn": {
      "code": "*124#",
      "explanation": "Checks your main airtime balance on MTN."
    },
    "telecel": {
      "code": "*124#", 
      "explanation": "Checks your main airtime balance on Telecel."
    },
    "airteltigo": {
      "code": "*134#",
      "explanation": "Checks your main airtime balance on AirtelTigo."
    },
    "glo": {
      "code": "*124#",
      "explanation": "Checks your main airtime balance on Glo."
    }
  }
}
```

---

### Create New Service

#### `POST /api/data`
Create a new USSD service entry.

**Authentication:** Requires API key and write operations enabled

**Request Body:**
```json
{
  "service_id": "mobile_money",
  "service_name": "Mobile Money Services",
  "mtn": {
    "code": "*170#",
    "explanation": "Access MTN Mobile Money services."
  },
  "telecel": {
    "code": "*110#",
    "explanation": "Access Telecel Cash services."
  },
  "airteltigo": {
    "code": "*100#",
    "explanation": "Access AirtelTigo Money services."
  },
  "glo": {
    "code": "*805#",
    "explanation": "Access Glo Mobile Money services."
  }
}
```

**Example Request:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"service_id":"mobile_money","service_name":"Mobile Money Services",...}' \
  http://localhost:3001/api/data
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Service 'mobile_money' created"
}
```

**Error Responses:**
```json
// Missing service_id (400)
{
  "error": "service_id is required"
}

// Service already exists (409)
{
  "error": "Service 'mobile_money' already exists"
}

// Write operations disabled (403)
{
  "error": "Write operations are disabled. This API is read-only for MCP server access."
}
```

---

### Update Existing Service

#### `PUT /api/data/:service`
Update an existing USSD service.

**Authentication:** Requires API key and write operations enabled

**Parameters:**
- `service` (string) - Service identifier to update

**Request Body:** Partial or complete service data
```json
{
  "service_name": "Updated Service Name",
  "mtn": {
    "code": "*125#",
    "explanation": "Updated explanation for MTN."
  }
}
```

**Example Request:**
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"service_name":"Updated Service Name"}' \
  http://localhost:3001/api/data/check_balance
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Service 'check_balance' updated"
}
```

**Error Response (404):**
```json
{
  "error": "Service 'invalid_service' not found"
}
```

---

### Delete Service

#### `DELETE /api/data/:service`
Delete a USSD service.

**Authentication:** Requires API key and write operations enabled

**Parameters:**
- `service` (string) - Service identifier to delete

**Example Request:**
```bash
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  http://localhost:3001/api/data/old_service
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Service 'old_service' deleted"
}
```

**Error Response (404):**
```json
{
  "error": "Service 'old_service' not found"
}
```

---

## 📝 Data Formats

### Service Entry Format
```typescript
interface ServiceEntry {
  service_id: string;           // Unique identifier (snake_case)
  service_name: string;         // Human-readable name
  description?: string;         // Optional admin guidance
  mtn: NetworkEntry;           // MTN network data
  telecel: NetworkEntry;       // Telecel network data  
  airteltigo: NetworkEntry;    // AirtelTigo network data
  glo: NetworkEntry;           // Glo network data
}

interface NetworkEntry {
  code: string;                // USSD code (e.g., "*124#")
  explanation: string;         // Human-readable explanation
}
```

### Valid Service IDs
Service IDs should follow these conventions:
- Use lowercase letters, numbers, and underscores only
- Start with a letter
- Be descriptive but concise
- Examples: `check_balance`, `buy_data_bundle`, `mobile_money`

### Valid Network Identifiers
- `mtn` - MTN Ghana
- `telecel` - Telecel Ghana (formerly Vodafone)
- `airteltigo` - AirtelTigo Ghana
- `glo` - Glo Ghana

### USSD Code Format
USSD codes should follow standard format:
- Start with `*` (asterisk)
- Contain digits separated by `*`
- End with `#` (hash) for most codes
- Examples: `*124#`, `*138*1#`, `100` (for calls)

---

## 🚨 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (write operations disabled)
- `404` - Not Found (service/network not found)
- `409` - Conflict (service already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",           // Optional error code
  "details": {                    // Optional additional details
    "field": "validation error"
  }
}
```

### Common Error Messages
```json
// Invalid service
{
  "error": "Unknown service 'invalid'. Valid services: check_balance, borrow_credit, buy_data_bundle, customer_care"
}

// Invalid network
{
  "error": "Unknown network 'invalid'. Valid networks: mtn, telecel, airteltigo, glo"
}

// Write operations disabled
{
  "error": "Write operations are disabled. This API is read-only for MCP server access."
}

// Rate limited
{
  "error": "Too many requests from this IP. Please try again later."
}
```

---

## 🔧 Rate Limiting

### Default Limits
- **Read Operations**: 100 requests per 15 minutes per IP
- **Write Operations**: 10 requests per 15 minutes per IP
- **Health Check**: No limit

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699012345
```

### Rate Limit Response
```json
{
  "error": "Too many requests from this IP",
  "retryAfter": 900
}
```

---

## 🧪 Testing Examples

### Basic Functionality Test
```bash
#!/bin/bash

API_BASE="http://localhost:3001"

echo "Testing API endpoints..."

# Health check
echo "1. Health check:"
curl -s "$API_BASE/health" | jq .

# List services
echo "2. List all services:"
curl -s "$API_BASE/api/services" | jq .

# Lookup specific code
echo "3. Lookup MTN balance code:"
curl -s "$API_BASE/api/lookup/check_balance/mtn" | jq .

# Compare codes
echo "4. Compare balance codes:"
curl -s "$API_BASE/api/compare/check_balance" | jq .

echo "All tests completed!"
```

### Error Handling Test
```bash
#!/bin/bash

API_BASE="http://localhost:3001"

echo "Testing error handling..."

# Invalid service
echo "1. Invalid service:"
curl -s "$API_BASE/api/lookup/invalid_service/mtn" | jq .

# Invalid network
echo "2. Invalid network:"
curl -s "$API_BASE/api/lookup/check_balance/invalid" | jq .

# Write operation (should be blocked in read-only mode)
echo "3. Write operation test:"
curl -s -X POST "$API_BASE/api/data" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' | jq .

echo "Error handling tests completed!"
```

---

## 📚 Integration Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'http://localhost:3001';

// Lookup USSD code
async function lookupUssd(service, network) {
  const response = await fetch(`${API_BASE}/api/lookup/${service}/${network}`);
  return response.json();
}

// List services
async function listServices(network = null) {
  const url = network 
    ? `${API_BASE}/api/services?network=${network}`
    : `${API_BASE}/api/services`;
  const response = await fetch(url);
  return response.json();
}

// Usage
const mtnBalance = await lookupUssd('check_balance', 'mtn');
const allServices = await listServices();
```

### Python
```python
import requests

API_BASE = 'http://localhost:3001'

def lookup_ussd(service, network):
    """Lookup USSD code for service and network."""
    response = requests.get(f'{API_BASE}/api/lookup/{service}/{network}')
    return response.json()

def list_services(network=None):
    """List available services, optionally filtered by network."""
    params = {'network': network} if network else {}
    response = requests.get(f'{API_BASE}/api/services', params=params)
    return response.json()

# Usage
mtn_balance = lookup_ussd('check_balance', 'mtn')
all_services = list_services()
```

### cURL Examples
```bash
# Get MTN balance check code
curl http://localhost:3001/api/lookup/check_balance/mtn

# List all services
curl http://localhost:3001/api/services

# List MTN services only
curl "http://localhost:3001/api/services?network=mtn"

# Compare balance codes
curl http://localhost:3001/api/compare/check_balance

# Health check
curl http://localhost:3001/health
```

---

**Ready to integrate with the USSD Data Manager API? Use these endpoints to build powerful USSD code lookup tools! 🚀**