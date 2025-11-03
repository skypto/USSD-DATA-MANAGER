import React, { useState } from 'react';
import { apiClient } from './api';
import type { ServiceMap } from './types';

interface ApiPanelProps {
  services: ServiceMap;
  onSyncComplete: () => void;
}

export function ApiPanel({ services, onSyncComplete }: ApiPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'testing' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [testResults, setTestResults] = useState<any>(null);

  const handleReplaceSync = async (onlyActive: boolean = false) => {
    setStatus('syncing');
    const activeCount = Object.values(services).filter(s => s.active).length;
    const totalCount = Object.values(services).length;
    
    setMessage(onlyActive 
      ? `🔄 Replacing API data with ${activeCount} active services...`
      : `🔄 Replacing API data with all ${totalCount} services...`
    );
    
    try {
      await apiClient.replaceAllData(services, onlyActive);
      setMessage(onlyActive 
        ? `✅ API data replaced with ${activeCount} active services!`
        : `✅ API data replaced with all ${totalCount} services!`
      );
      onSyncComplete();
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Replace failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleHealthCheck = async () => {
    setStatus('testing');
    setMessage('Checking API server health...');
    
    try {
      const health = await apiClient.healthCheck();
      setMessage(`✅ API server is healthy (${health.status})`);
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(`❌ API server unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestMcpEndpoints = async () => {
    setStatus('testing');
    setMessage('Testing MCP endpoints...');
    setTestResults(null);
    
    try {
      const results = {
        lookup: await apiClient.testLookup('check_balance', 'mtn'),
        services: await apiClient.testListServices(),
        servicesFiltered: await apiClient.testListServices('mtn'),
        compare: await apiClient.testCompare('check_balance'),
      };
      
      setTestResults(results);
      setMessage('✅ MCP endpoints tested successfully!');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(`❌ MCP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-ghost relative"
        title="API Integration Panel"
      >
        🔗 API
        {status === 'syncing' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
        )}
        {status === 'error' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-xl z-40 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">API Integration</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Sync data with MCP server API
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Status Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              status === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200'
                : status === 'syncing' || status === 'testing'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Server Status</h3>
              <button
                onClick={handleHealthCheck}
                disabled={status !== 'idle'}
                className="w-full btn btn-ghost text-left"
              >
                {status === 'testing' ? '⏳ Checking...' : '🏥 Health Check'}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Data Sync</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleReplaceSync(false)}
                  disabled={status !== 'idle'}
                  className="w-full btn btn-primary"
                >
                  {status === 'syncing' ? '⏳ Syncing...' : '🔄 Sync All Services'}
                </button>
                <button
                  onClick={() => handleReplaceSync(true)}
                  disabled={status !== 'idle'}
                  className="w-full btn btn-primary"
                >
                  {status === 'syncing' ? '⏳ Syncing...' : '✅ Sync Active Services Only'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Complete replacement - syncs exactly what you select
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">MCP Testing</h3>
              <button
                onClick={handleTestMcpEndpoints}
                disabled={status !== 'idle'}
                className="w-full btn btn-ghost"
              >
                {status === 'testing' ? '⏳ Testing...' : '🧪 Test MCP Endpoints'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Test the same endpoints that MCP tools use
              </p>
            </div>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Test Results</h3>
              
              <div className="space-y-2">
                <details className="border rounded-lg">
                  <summary className="p-2 text-xs font-medium cursor-pointer hover:bg-gray-50">
                    lookup_ussd("check_balance", "mtn")
                  </summary>
                  <div className="p-2 border-t bg-gray-50">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResults.lookup, null, 2)}
                    </pre>
                  </div>
                </details>

                <details className="border rounded-lg">
                  <summary className="p-2 text-xs font-medium cursor-pointer hover:bg-gray-50">
                    list_services()
                  </summary>
                  <div className="p-2 border-t bg-gray-50">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResults.services, null, 2)}
                    </pre>
                  </div>
                </details>

                <details className="border rounded-lg">
                  <summary className="p-2 text-xs font-medium cursor-pointer hover:bg-gray-50">
                    list_services("mtn")
                  </summary>
                  <div className="p-2 border-t bg-gray-50">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResults.servicesFiltered, null, 2)}
                    </pre>
                  </div>
                </details>

                <details className="border rounded-lg">
                  <summary className="p-2 text-xs font-medium cursor-pointer hover:bg-gray-50">
                    compare_codes("check_balance")
                  </summary>
                  <div className="p-2 border-t bg-gray-50">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(testResults.compare, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Setup Instructions</h3>
            <div className="text-xs text-gray-600 space-y-2">
              <div>
                <strong>1. Start API Server:</strong>
                <code className="block bg-gray-100 p-1 rounded mt-1">npm run server</code>
              </div>
              <div>
                <strong>2. Update MCP Server:</strong>
                <code className="block bg-gray-100 p-1 rounded mt-1">python main_api.py</code>
              </div>
              <div>
                <strong>3. Configure Claude:</strong>
                <p className="mt-1">Use main_api.py in your MCP configuration</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}