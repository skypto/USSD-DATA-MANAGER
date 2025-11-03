// API client for syncing with the Express server
import type { ServiceMap } from './types';

const API_BASE = 'http://localhost:3001/api';

export class USSDApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(this.baseUrl.replace('/api', '/health'));
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  async getAllData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    return response.json();
  }

  async syncFromApp(services: ServiceMap, onlyActive: boolean = false): Promise<void> {
    // Filter services if onlyActive is true
    const servicesToSync = onlyActive 
      ? Object.fromEntries(Object.entries(services).filter(([_, service]) => service.active))
      : services;
    
    // Convert app format to API format
    const apiData = this.convertAppToApiFormat(servicesToSync);
    
    // Get existing services from API server
    let existingServices: Record<string, any> = {};
    try {
      existingServices = await this.getAllData();
    } catch (error) {
      console.warn('Could not fetch existing services, will create all as new:', error);
    }
    
    // Sync each service (create if new, update if exists)
    for (const [serviceId, serviceData] of Object.entries(apiData)) {
      try {
        if (existingServices[serviceId]) {
          // Service exists, update it
          await this.updateService(serviceId, serviceData);
          console.log(`✅ Updated service: ${serviceId}`);
        } else {
          // Service doesn't exist, create it
          await this.createService(serviceId, serviceData);
          console.log(`✅ Created service: ${serviceId}`);
        }
      } catch (error) {
        console.warn(`❌ Failed to sync service ${serviceId}:`, error);
      }
    }
  }

  async replaceAllData(services: ServiceMap, onlyActive: boolean = false): Promise<void> {
    // Filter services if onlyActive is true
    const servicesToSync = onlyActive 
      ? Object.fromEntries(Object.entries(services).filter(([_, service]) => service.active))
      : services;
    
    console.log(`🔄 Starting complete data replacement...`);
    
    // Step 1: Get all existing services
    let existingServices: Record<string, any> = {};
    try {
      existingServices = await this.getAllData();
      console.log(`📋 Found ${Object.keys(existingServices).length} existing services to remove`);
    } catch (error) {
      console.warn('Could not fetch existing services:', error);
    }
    
    // Step 2: Delete all existing services
    for (const serviceId of Object.keys(existingServices)) {
      try {
        await this.deleteService(serviceId);
        console.log(`🗑️ Deleted service: ${serviceId}`);
      } catch (error) {
        console.warn(`❌ Failed to delete service ${serviceId}:`, error);
      }
    }
    
    // Step 3: Create all new services
    const apiData = this.convertAppToApiFormat(servicesToSync);
    console.log(`📝 Creating ${Object.keys(apiData).length} new services...`);
    
    for (const [serviceId, serviceData] of Object.entries(apiData)) {
      try {
        await this.createService(serviceId, serviceData);
        console.log(`✅ Created service: ${serviceId}`);
      } catch (error) {
        console.warn(`❌ Failed to create service ${serviceId}:`, error);
      }
    }
    
    console.log(`🎉 Data replacement complete!`);
  }

  async updateService(serviceId: string, serviceData: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update service ${serviceId}: ${response.status}`);
    }
  }

  async createService(serviceId: string, serviceData: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ service_id: serviceId, ...serviceData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create service ${serviceId}: ${response.status}`);
    }
  }

  async deleteService(serviceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data/${serviceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete service ${serviceId}: ${response.status}`);
    }
  }

  // Test MCP endpoints
  async testLookup(service: string, network: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/lookup/${service}/${network}`);
    return response.json();
  }

  async testListServices(network?: string): Promise<string[]> {
    const url = network 
      ? `${this.baseUrl}/services?network=${network}`
      : `${this.baseUrl}/services`;
    const response = await fetch(url);
    return response.json();
  }

  async testCompare(service: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/compare/${service}`);
    return response.json();
  }

  private convertAppToApiFormat(services: ServiceMap): Record<string, any> {
    const apiData: Record<string, any> = {};
    
    for (const [serviceId, service] of Object.entries(services)) {
      apiData[serviceId] = {
        service_name: service.service_name,
        mtn: service.telcos.mtn,
        telecel: service.telcos.telecel,
        airteltigo: service.telcos.airteltigo,
        glo: service.telcos.glo,
      };
    }
    
    return apiData;
  }
}

export const apiClient = new USSDApiClient();