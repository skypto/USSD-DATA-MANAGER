#!/usr/bin/env node

/**
 * Test script for USSD API endpoints
 * Run with: node test_api.js
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === expectedStatus) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📄 Response:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`   ❌ Expected status ${expectedStatus}, got ${response.status}`);
      console.log(`   📄 Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting USSD API Tests');
  console.log('=' .repeat(50));
  
  // Health check
  await testEndpoint('Health Check', 'http://localhost:3001/health');
  
  // Core MCP endpoints
  await testEndpoint('Lookup USSD (MTN Balance)', `${API_BASE}/lookup/check_balance/mtn`);
  await testEndpoint('Lookup USSD (Invalid Service)', `${API_BASE}/lookup/invalid_service/mtn`, 404);
  await testEndpoint('Lookup USSD (Invalid Network)', `${API_BASE}/lookup/check_balance/invalid`, 400);
  
  await testEndpoint('List All Services', `${API_BASE}/services`);
  await testEndpoint('List MTN Services', `${API_BASE}/services?network=mtn`);
  
  await testEndpoint('Compare Balance Codes', `${API_BASE}/compare/check_balance`);
  await testEndpoint('Compare Invalid Service', `${API_BASE}/compare/invalid_service`, 404);
  
  // Full data endpoint
  await testEndpoint('Get All Data', `${API_BASE}/data`);
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
  console.log('\nIf you see connection errors, make sure to start the API server first:');
  console.log('   npm run server');
}

// Check if node-fetch is available
try {
  runTests();
} catch (error) {
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('❌ node-fetch not found. Installing...');
    console.log('Run: npm install node-fetch');
  } else {
    console.error('Error:', error);
  }
}