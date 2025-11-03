// Netlify serverless function for API endpoints
import fs from 'fs';
import path from 'path';

// Sample data - in production, you'd use a database
let USSD_DATA = {
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

// Main handler
export const handler = async (event, context) => {
  const { httpMethod, path: requestPath, queryStringParameters } = event;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse the path to determine the endpoint
    const pathParts = requestPath.replace('/.netlify/functions/api', '').split('/').filter(Boolean);
    
    // Health check
    if (pathParts.length === 0 || pathParts[0] === 'health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          mode: 'read-only',
          platform: 'netlify'
        })
      };
    }

    // Only allow GET requests for security
    if (httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          error: 'Only GET requests allowed. This is a read-only API for MCP server access.',
          allowedMethods: ['GET']
        })
      };
    }

    // Route handling
    if (pathParts[0] === 'lookup' && pathParts.length === 3) {
      // /api/lookup/:service/:network
      const [, service, network] = pathParts;
      return handleLookup(service, network, headers);
    }
    
    if (pathParts[0] === 'services') {
      // /api/services?network=optional
      const network = queryStringParameters?.network;
      return handleListServices(network, headers);
    }
    
    if (pathParts[0] === 'compare' && pathParts.length === 2) {
      // /api/compare/:service
      const [, service] = pathParts;
      return handleCompare(service, headers);
    }

    // 404 for unknown endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

function handleLookup(service, network, headers) {
  const sKey = normalizeService(service);
  const nKey = normalizeNetwork(network);
  
  const serviceBlob = USSD_DATA[sKey];
  if (!serviceBlob) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: `Unknown service '${service}'. Valid services: ${Object.keys(USSD_DATA).join(', ')}`
      })
    };
  }
  
  if (!['mtn', 'telecel', 'airteltigo', 'glo'].includes(nKey)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `Unknown network '${network}'. Valid networks: mtn, telecel, airteltigo, glo`
      })
    };
  }
  
  const entry = serviceBlob[nKey];
  if (!entry) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: `No entry for network '${network}' under service '${service}'.`
      })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      code: entry.code,
      explanation: entry.explanation
    })
  };
}

function handleListServices(network, headers) {
  if (network) {
    const nKey = normalizeNetwork(network);
    const names = [];
    
    for (const [sKey, blob] of Object.entries(USSD_DATA)) {
      if (blob[nKey] && typeof blob.service_name === 'string') {
        names.push(blob.service_name);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(names.sort())
    };
  } else {
    const names = Object.values(USSD_DATA)
      .filter(blob => typeof blob.service_name === 'string')
      .map(blob => blob.service_name);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(names.sort())
    };
  }
}

function handleCompare(service, headers) {
  const sKey = normalizeService(service);
  const blob = USSD_DATA[sKey];
  
  if (!blob) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: `Unknown service '${service}'. Valid services: ${Object.keys(USSD_DATA).join(', ')}`
      })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      mtn: blob.mtn?.code || null,
      telecel: blob.telecel?.code || null,
      airteltigo: blob.airteltigo?.code || null,
      glo: blob.glo?.code || null
    })
  };
}