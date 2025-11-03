import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the data file
const DATA_FILE = './sample/ussd_data.json';

// Helper function to read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return {};
  }
}

// Normalize inputs (same as MCP server)
function normalizeNetwork(n) {
  return (n || '').trim().toLowerCase();
}

function normalizeService(s) {
  return (s || '').trim().toLowerCase();
}

// ============================================================================
// READ-ONLY ENDPOINTS ONLY (100% Safe for MCP server access)
// ============================================================================

// 1. lookup_ussd(service: str, network: str) -> dict
app.get('/api/lookup/:service/:network', (req, res) => {
  const { service, network } = req.params;
  const data = readData();
  
  const sKey = normalizeService(service);
  const nKey = normalizeNetwork(network);
  
  const serviceBlob = data[sKey];
  if (!serviceBlob) {
    return res.status(404).json({
      error: `Unknown service '${service}'. Valid services: ${Object.keys(data).join(', ')}`
    });
  }
  
  if (!['mtn', 'telecel', 'airteltigo', 'glo'].includes(nKey)) {
    return res.status(400).json({
      error: `Unknown network '${network}'. Valid networks: mtn, telecel, airteltigo, glo`
    });
  }
  
  const entry = serviceBlob[nKey];
  if (!entry) {
    return res.status(404).json({
      error: `No entry for network '${network}' under service '${service}'.`
    });
  }
  
  res.json({
    code: entry.code,
    explanation: entry.explanation
  });
});

// 2. list_services(network: str | None = None) -> list[str]
app.get('/api/services', (req, res) => {
  const { network } = req.query;
  const data = readData();
  
  if (network) {
    const nKey = normalizeNetwork(network);
    const names = [];
    
    for (const [sKey, blob] of Object.entries(data)) {
      // Include only if that network appears in the record
      if (blob[nKey]) {
        if (typeof blob.service_name === 'string') {
          names.push(blob.service_name);
        }
      }
    }
    
    return res.json(names.sort());
  } else {
    // Return all service names
    const names = Object.values(data)
      .filter(blob => typeof blob.service_name === 'string')
      .map(blob => blob.service_name);
    
    res.json(names.sort());
  }
});

// 3. compare_codes(service: str) -> dict
app.get('/api/compare/:service', (req, res) => {
  const { service } = req.params;
  const data = readData();
  
  const sKey = normalizeService(service);
  const blob = data[sKey];
  
  if (!blob) {
    return res.status(404).json({
      error: `Unknown service '${service}'. Valid services: ${Object.keys(data).join(', ')}`
    });
  }
  
  res.json({
    mtn: blob.mtn?.code || null,
    telecel: blob.telecel?.code || null,
    airteltigo: blob.airteltigo?.code || null,
    glo: blob.glo?.code || null
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'read-only',
    security: 'MCP-safe'
  });
});

// Reject all write operations with clear security message
const rejectWrite = (req, res) => {
  res.status(405).json({
    error: 'Write operations not allowed. This is a read-only API for MCP server access.',
    allowedMethods: ['GET'],
    securityNote: 'Data modifications must be done through the React app interface.'
  });
};

app.post('*', rejectWrite);
app.put('*', rejectWrite);
app.delete('*', rejectWrite);
app.patch('*', rejectWrite);

app.listen(PORT, () => {
  console.log(`🚀 USSD READ-ONLY API Server running on http://localhost:${PORT}`);
  console.log(`📊 Data file: ${DATA_FILE}`);
  console.log(`🔒 Security: READ-ONLY mode (100% safe for MCP access)`);
  console.log(`🔗 Available endpoints:`);
  console.log(`   GET  /api/lookup/:service/:network`);
  console.log(`   GET  /api/services?network=<optional>`);
  console.log(`   GET  /api/compare/:service`);
  console.log(`   GET  /health`);
  console.log(`❌ All write operations (POST/PUT/DELETE) are blocked`);
});