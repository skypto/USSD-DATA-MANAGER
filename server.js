import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the data file (we'll use the sample data as starting point)
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

// Helper function to write data
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// Normalize inputs (same as MCP server)
function normalizeNetwork(n) {
  return (n || '').trim().toLowerCase();
}

function normalizeService(s) {
  return (s || '').trim().toLowerCase();
}

// API Routes matching MCP server functionality

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

// Additional endpoints for full CRUD operations

// Get all data (for admin)
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// Update specific service data
app.put('/api/data/:service', (req, res) => {
  const { service } = req.params;
  const updates = req.body;
  
  const data = readData();
  const sKey = normalizeService(service);
  
  if (!data[sKey]) {
    return res.status(404).json({
      error: `Service '${service}' not found`
    });
  }
  
  // Update the service data
  data[sKey] = { ...data[sKey], ...updates };
  
  if (writeData(data)) {
    res.json({ success: true, message: `Service '${service}' updated` });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Create new service
app.post('/api/data', (req, res) => {
  const { service_id, ...serviceData } = req.body;
  
  if (!service_id) {
    return res.status(400).json({ error: 'service_id is required' });
  }
  
  const data = readData();
  const sKey = normalizeService(service_id);
  
  if (data[sKey]) {
    return res.status(409).json({ error: `Service '${service_id}' already exists` });
  }
  
  data[sKey] = serviceData;
  
  if (writeData(data)) {
    res.json({ success: true, message: `Service '${service_id}' created` });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Delete service
app.delete('/api/data/:service', (req, res) => {
  const { service } = req.params;
  const data = readData();
  const sKey = normalizeService(service);
  
  if (!data[sKey]) {
    return res.status(404).json({ error: `Service '${service}' not found` });
  }
  
  delete data[sKey];
  
  if (writeData(data)) {
    res.json({ success: true, message: `Service '${service}' deleted` });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 USSD API Server running on http://localhost:${PORT}`);
  console.log(`📊 Data file: ${DATA_FILE}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   GET  /api/lookup/:service/:network`);
  console.log(`   GET  /api/services?network=<optional>`);
  console.log(`   GET  /api/compare/:service`);
  console.log(`   GET  /api/data (full dataset)`);
  console.log(`   POST /api/data (create service)`);
  console.log(`   PUT  /api/data/:service (update service)`);
  console.log(`   DELETE /api/data/:service (delete service)`);
});