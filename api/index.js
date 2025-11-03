// Vercel serverless function for API endpoints
// Same logic as Netlify but adapted for Vercel's API routes

// Sample data - in production, you'd use a database
const USSD_DATA = {
  "check_balance": {
    "service_name": "Check Airtime Balance",
    "mtn": { "code": "*124#", "explanation": "Checks your main airtime balance on MTN." },
    "telecel": { "code": "*124#", "explanation": "Checks your main airtime balance on Telecel." },
    "airteltigo": { "code": "*134#", "explanation": "Checks your main airtime balance on AirtelTigo." },
    "glo": { "code": "*124#", "explanation": "Checks your main airtime balance on Glo." }
  },
  "borrow_credit": {
    "service_name": "Borrow Credit / Airtime",
    "mtn": { "code": "*155#", "explanation": "Lends you airtime to be paid back on your next recharge." },
    "telecel": { "code": "*505#", "explanation": "Telecel's 'SOS Credit' service." },
    "airteltigo": { "code": "*130#", "explanation": "AirtelTigo's 'SOS Credit' service." },
    "glo": { "code": "*305#", "explanation": "Glo's 'Borrow Me Credit' service." }
  }
};

// Helper functions
function normalizeNetwork(n) {
  return (n || '').trim().toLowerCase();
}

function normalizeService(s) {
  return (s || '').trim().toLowerCase();
}

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for security
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Only GET requests allowed. This is a read-only API for MCP server access.',
      allowedMethods: ['GET']
    });
  }

  try {
    const { query } = req;
    const path = query.path || [];

    // Health check
    if (path.length === 0 || path[0] === 'health') {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mode: 'read-only',
        platform: 'vercel'
      });
    }

    // Route handling
    if (path[0] === 'lookup' && path.length === 3) {
      // /api/lookup/:service/:network
      const [, service, network] = path;
      return handleLookup(service, network, res);
    }
    
    if (path[0] === 'services') {
      // /api/services?network=optional
      const network = query.network;
      return handleListServices(network, res);
    }
    
    if (path[0] === 'compare' && path.length === 2) {
      // /api/compare/:service
      const [, service] = path;
      return handleCompare(service, res);
    }

    // 404 for unknown endpoints
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

function handleLookup(service, network, res) {
  const sKey = normalizeService(service);
  const nKey = normalizeNetwork(network);
  
  const serviceBlob = USSD_DATA[sKey];
  if (!serviceBlob) {
    return res.status(404).json({
      error: `Unknown service '${service}'. Valid services: ${Object.keys(USSD_DATA).join(', ')}`
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
  
  return res.status(200).json({
    code: entry.code,
    explanation: entry.explanation
  });
}

function handleListServices(network, res) {
  if (network) {
    const nKey = normalizeNetwork(network);
    const names = [];
    
    for (const [sKey, blob] of Object.entries(USSD_DATA)) {
      if (blob[nKey] && typeof blob.service_name === 'string') {
        names.push(blob.service_name);
      }
    }
    
    return res.status(200).json(names.sort());
  } else {
    const names = Object.values(USSD_DATA)
      .filter(blob => typeof blob.service_name === 'string')
      .map(blob => blob.service_name);
    
    return res.status(200).json(names.sort());
  }
}

function handleCompare(service, res) {
  const sKey = normalizeService(service);
  const blob = USSD_DATA[sKey];
  
  if (!blob) {
    return res.status(404).json({
      error: `Unknown service '${service}'. Valid services: ${Object.keys(USSD_DATA).join(', ')}`
    });
  }
  
  return res.status(200).json({
    mtn: blob.mtn?.code || null,
    telecel: blob.telecel?.code || null,
    airteltigo: blob.airteltigo?.code || null,
    glo: blob.glo?.code || null
  });
}