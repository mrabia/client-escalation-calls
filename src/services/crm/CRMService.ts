/**
 * CRM Integration Service
 * Unified interface for multiple CRM providers (Salesforce, HubSpot, Zoho, Dynamics)
 */

import { createLogger, Logger } from '@/utils/logger';

/**
 * Supported CRM providers
 */
export enum CRMProvider {
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  ZOHO = 'zoho',
  DYNAMICS = 'dynamics'
}

/**
 * CRM Contact record
 */
export interface CRMContact {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  title?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * CRM Account/Company record
 */
export interface CRMAccount {
  id: string;
  externalId?: string;
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  annualRevenue?: number;
  employeeCount?: number;
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * CRM Activity/Task record
 */
export interface CRMActivity {
  id: string;
  externalId?: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  contactId?: string;
  accountId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  dueDate?: Date;
  completedAt?: Date;
  outcome?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

/**
 * CRM Deal/Opportunity record
 */
export interface CRMDeal {
  id: string;
  externalId?: string;
  name: string;
  amount: number;
  currency?: string;
  stage: string;
  probability?: number;
  contactId?: string;
  accountId?: string;
  closeDate?: Date;
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * CRM Provider configuration
 */
export interface CRMConfig {
  provider: CRMProvider;
  credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    instanceUrl?: string;
  };
  options?: {
    sandbox?: boolean;
    apiVersion?: string;
  };
}

/**
 * CRM Provider interface
 */
interface ICRMProvider {
  initialize(): Promise<void>;
  getContact(id: string): Promise<CRMContact | null>;
  searchContacts(query: string): Promise<CRMContact[]>;
  createContact(contact: Partial<CRMContact>): Promise<CRMContact>;
  updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact>;
  getAccount(id: string): Promise<CRMAccount | null>;
  searchAccounts(query: string): Promise<CRMAccount[]>;
  createActivity(activity: Partial<CRMActivity>): Promise<CRMActivity>;
  getActivities(contactId: string): Promise<CRMActivity[]>;
  syncContact(localContact: CRMContact): Promise<CRMContact>;
}

/**
 * Base CRM Provider with shared functionality
 */
abstract class BaseCRMProvider implements ICRMProvider {
  abstract initialize(): Promise<void>;
  abstract getContact(id: string): Promise<CRMContact | null>;
  abstract searchContacts(query: string): Promise<CRMContact[]>;
  abstract createContact(contact: Partial<CRMContact>): Promise<CRMContact>;
  abstract updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact>;
  abstract getAccount(id: string): Promise<CRMAccount | null>;
  abstract searchAccounts(query: string): Promise<CRMAccount[]>;
  abstract createActivity(activity: Partial<CRMActivity>): Promise<CRMActivity>;
  abstract getActivities(contactId: string): Promise<CRMActivity[]>;

  /**
   * Sync a local contact with the CRM - creates if new, updates if existing
   */
  async syncContact(localContact: CRMContact): Promise<CRMContact> {
    if (localContact.externalId) {
      return this.updateContact(localContact.externalId, localContact);
    }
    return this.createContact(localContact);
  }
}

/**
 * Salesforce Provider
 */
class SalesforceProvider extends BaseCRMProvider {
  private readonly logger: Logger;
  private readonly config: CRMConfig;
  private accessToken: string | null = null;
  private readonly instanceUrl: string;

  constructor(config: CRMConfig) {
    super();
    this.config = config;
    this.logger = createLogger('SalesforceProvider');
    this.instanceUrl = config.credentials.instanceUrl || 'https://login.salesforce.com';
  }

  async initialize(): Promise<void> {
    // OAuth2 flow would go here
    this.accessToken = this.config.credentials.accessToken || null;
    this.logger.info('Salesforce provider initialized');
  }

  async getContact(id: string): Promise<CRMContact | null> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Contact/${id}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return this.mapSalesforceContact(data);
    } catch (error) {
      this.logger.error('Failed to get Salesforce contact', { error, id });
      return null;
    }
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const soql = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, Title, Account.Name 
                    FROM Contact WHERE Name LIKE '%${query}%' OR Email LIKE '%${query}%' LIMIT 50`;
      
      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const data = await response.json() as { records?: any[] };
      return (data.records || []).map((r: any) => this.mapSalesforceContact(r));
    } catch (error) {
      this.logger.error('Failed to search Salesforce contacts', { error, query });
      return [];
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    const sfContact = {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Phone: contact.phone,
      MobilePhone: contact.mobile,
      Title: contact.title
    };

    const response = await fetch(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Contact`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfContact)
      }
    );

    const result = await response.json() as { id: string };
    return { ...contact, id: result.id, externalId: result.id } as CRMContact;
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    const sfUpdates: Record<string, unknown> = {};
    if (updates.firstName) sfUpdates.FirstName = updates.firstName;
    if (updates.lastName) sfUpdates.LastName = updates.lastName;
    if (updates.email) sfUpdates.Email = updates.email;
    if (updates.phone) sfUpdates.Phone = updates.phone;

    await fetch(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Contact/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfUpdates)
      }
    );

    const updated = await this.getContact(id);
    return updated!;
  }

  async getAccount(id: string): Promise<CRMAccount | null> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Account/${id}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return this.mapSalesforceAccount(data);
    } catch (error) {
      this.logger.error('Failed to get Salesforce account', { error, id });
      return null;
    }
  }

  async searchAccounts(query: string): Promise<CRMAccount[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const soql = `SELECT Id, Name, Website, Industry, Phone, AnnualRevenue 
                    FROM Account WHERE Name LIKE '%${query}%' LIMIT 50`;
      
      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const data = await response.json() as { records?: any[] };
      return (data.records || []).map((r: any) => this.mapSalesforceAccount(r));
    } catch (error) {
      this.logger.error('Failed to search Salesforce accounts', { error, query });
      return [];
    }
  }

  async createActivity(activity: Partial<CRMActivity>): Promise<CRMActivity> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    const sfTask = {
      Subject: activity.subject,
      Description: activity.description,
      WhoId: activity.contactId,
      WhatId: activity.accountId,
      Status: activity.status === 'completed' ? 'Completed' : 'Not Started',
      ActivityDate: activity.dueDate?.toISOString().split('T')[0]
    };

    const response = await fetch(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Task`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfTask)
      }
    );

    const result = await response.json() as { id: string };
    return { ...activity, id: result.id, externalId: result.id } as CRMActivity;
  }

  async getActivities(contactId: string): Promise<CRMActivity[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const soql = `SELECT Id, Subject, Description, Status, ActivityDate 
                    FROM Task WHERE WhoId = '${contactId}' ORDER BY ActivityDate DESC LIMIT 50`;
      
      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const data = await response.json() as { records?: any[] };
      return (data.records || []).map((r: any) => this.mapSalesforceActivity(r));
    } catch (error) {
      this.logger.error('Failed to get Salesforce activities', { error, contactId });
      return [];
    }
  }

  private mapSalesforceContact(data: any): CRMContact {
    return {
      id: data.Id,
      externalId: data.Id,
      firstName: data.FirstName || '',
      lastName: data.LastName || '',
      email: data.Email || '',
      phone: data.Phone,
      mobile: data.MobilePhone,
      company: data.Account?.Name,
      title: data.Title,
      createdAt: data.CreatedDate ? new Date(data.CreatedDate) : undefined,
      updatedAt: data.LastModifiedDate ? new Date(data.LastModifiedDate) : undefined
    };
  }

  private mapSalesforceAccount(data: any): CRMAccount {
    return {
      id: data.Id,
      externalId: data.Id,
      name: data.Name,
      website: data.Website,
      industry: data.Industry,
      phone: data.Phone,
      annualRevenue: data.AnnualRevenue,
      createdAt: data.CreatedDate ? new Date(data.CreatedDate) : undefined,
      updatedAt: data.LastModifiedDate ? new Date(data.LastModifiedDate) : undefined
    };
  }

  private mapSalesforceActivity(data: any): CRMActivity {
    return {
      id: data.Id,
      externalId: data.Id,
      type: 'task',
      subject: data.Subject || '',
      description: data.Description,
      status: data.Status === 'Completed' ? 'completed' : 'pending',
      dueDate: data.ActivityDate ? new Date(data.ActivityDate) : undefined
    };
  }
}

/**
 * HubSpot Provider
 */
class HubSpotProvider extends BaseCRMProvider {
  private readonly logger: Logger;
  private readonly config: CRMConfig;
  private accessToken: string | null = null;
  private readonly baseUrl = 'https://api.hubapi.com';

  constructor(config: CRMConfig) {
    super();
    this.config = config;
    this.logger = createLogger('HubSpotProvider');
  }

  async initialize(): Promise<void> {
    this.accessToken = this.config.credentials.accessToken || this.config.credentials.apiKey || null;
    this.logger.info('HubSpot provider initialized');
  }

  async getContact(id: string): Promise<CRMContact | null> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${id}?properties=firstname,lastname,email,phone,mobilephone,company,jobtitle`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return this.mapHubSpotContact(data);
    } catch (error) {
      this.logger.error('Failed to get HubSpot contact', { error, id });
      return null;
    }
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            limit: 50,
            properties: ['firstname', 'lastname', 'email', 'phone', 'company']
          })
        }
      );
      
      const data = await response.json() as { results?: any[] };
      return (data.results || []).map((r: any) => this.mapHubSpotContact(r));
    } catch (error) {
      this.logger.error('Failed to search HubSpot contacts', { error, query });
      return [];
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    const response = await fetch(
      `${this.baseUrl}/crm/v3/objects/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            firstname: contact.firstName,
            lastname: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            mobilephone: contact.mobile,
            company: contact.company,
            jobtitle: contact.title
          }
        })
      }
    );

    const result = await response.json() as { id: string };
    return { ...contact, id: result.id, externalId: result.id } as CRMContact;
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    const properties: Record<string, string> = {};
    if (updates.firstName) properties.firstname = updates.firstName;
    if (updates.lastName) properties.lastname = updates.lastName;
    if (updates.email) properties.email = updates.email;
    if (updates.phone) properties.phone = updates.phone;

    await fetch(
      `${this.baseUrl}/crm/v3/objects/contacts/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
      }
    );

    const updated = await this.getContact(id);
    return updated!;
  }

  async getAccount(id: string): Promise<CRMAccount | null> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/companies/${id}?properties=name,website,industry,phone,annualrevenue`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return this.mapHubSpotAccount(data);
    } catch (error) {
      this.logger.error('Failed to get HubSpot company', { error, id });
      return null;
    }
  }

  async searchAccounts(query: string): Promise<CRMAccount[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/companies/search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            limit: 50,
            properties: ['name', 'website', 'industry', 'phone']
          })
        }
      );
      
      const data = await response.json() as { results?: any[] };
      return (data.results || []).map((r: any) => this.mapHubSpotAccount(r));
    } catch (error) {
      this.logger.error('Failed to search HubSpot companies', { error, query });
      return [];
    }
  }

  async createActivity(activity: Partial<CRMActivity>): Promise<CRMActivity> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `${this.baseUrl}/crm/v3/objects/notes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: `${activity.subject}\n\n${activity.description || ''}`,
            hs_timestamp: Date.now()
          }
        })
      }
    );

    const result = await response.json() as { id: string };
    return { ...activity, id: result.id, externalId: result.id } as CRMActivity;
  }

  async getActivities(contactId: string): Promise<CRMActivity[]> {
    if (!this.accessToken) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${contactId}/associations/notes`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const data = await response.json() as { results?: any[] };
      // Would need additional calls to get note details
      const activities = data.results?.map((r: any) => this.mapHubSpotActivity(r)) || [];
      return activities;
    } catch (error) {
      this.logger.error('Failed to get HubSpot activities', { error, contactId });
      return [];
    }
  }

  private mapHubSpotContact(data: any): CRMContact {
    const props = data.properties || {};
    return {
      id: data.id,
      externalId: data.id,
      firstName: props.firstname || '',
      lastName: props.lastname || '',
      email: props.email || '',
      phone: props.phone,
      mobile: props.mobilephone,
      company: props.company,
      title: props.jobtitle,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    };
  }

  private mapHubSpotAccount(data: any): CRMAccount {
    const props = data.properties || {};
    return {
      id: data.id,
      externalId: data.id,
      name: props.name || '',
      website: props.website,
      industry: props.industry,
      phone: props.phone,
      annualRevenue: props.annualrevenue ? Number(props.annualrevenue) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    };
  }

  private mapHubSpotActivity(data: any): CRMActivity {
    const props = data.properties || {};
    return {
      id: data.id,
      externalId: data.id,
      type: 'note',
      subject: props.hs_note_body?.substring(0, 100) || '',
      description: props.hs_note_body,
      status: 'completed',
      createdAt: props.hs_timestamp ? new Date(Number(props.hs_timestamp)) : undefined
    };
  }
}

/**
 * CRM Service - Unified interface
 */
export class CRMService {
  private static instance: CRMService | null = null;
  
  private readonly providers: Map<CRMProvider, ICRMProvider> = new Map();
  private activeProvider: ICRMProvider | null = null;
  private activeProviderType: CRMProvider | null = null;
  private readonly logger: Logger;

  private constructor() {
    this.logger = createLogger('CRMService');
  }

  static getInstance(): CRMService {
    CRMService.instance ??= new CRMService();
    return CRMService.instance;
  }

  /**
   * Initialize a CRM provider
   */
  async initializeProvider(config: CRMConfig): Promise<void> {
    let provider: ICRMProvider;

    switch (config.provider) {
      case CRMProvider.SALESFORCE:
        provider = new SalesforceProvider(config);
        break;
      case CRMProvider.HUBSPOT:
        provider = new HubSpotProvider(config);
        break;
      case CRMProvider.ZOHO:
      case CRMProvider.DYNAMICS:
        // Placeholder - would implement similar to above
        throw new Error(`Provider ${config.provider} not yet implemented`);
      default:
        throw new Error(`Unknown CRM provider: ${config.provider}`);
    }

    await provider.initialize();
    this.providers.set(config.provider, provider);
    
    // Set as active if first provider
    if (!this.activeProvider) {
      this.activeProvider = provider;
      this.activeProviderType = config.provider;
    }

    this.logger.info('CRM provider initialized', { provider: config.provider });
  }

  /**
   * Set active provider
   */
  setActiveProvider(provider: CRMProvider): void {
    const p = this.providers.get(provider);
    if (!p) {
      throw new Error(`Provider ${provider} not initialized`);
    }
    this.activeProvider = p;
    this.activeProviderType = provider;
  }

  /**
   * Get active provider type
   */
  getActiveProviderType(): CRMProvider | null {
    return this.activeProviderType;
  }

  // Delegate methods to active provider
  async getContact(id: string): Promise<CRMContact | null> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.getContact(id);
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.searchContacts(query);
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.createContact(contact);
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.updateContact(id, updates);
  }

  async getAccount(id: string): Promise<CRMAccount | null> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.getAccount(id);
  }

  async searchAccounts(query: string): Promise<CRMAccount[]> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.searchAccounts(query);
  }

  async createActivity(activity: Partial<CRMActivity>): Promise<CRMActivity> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.createActivity(activity);
  }

  async getActivities(contactId: string): Promise<CRMActivity[]> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.getActivities(contactId);
  }

  async syncContact(localContact: CRMContact): Promise<CRMContact> {
    if (!this.activeProvider) throw new Error('No CRM provider configured');
    return this.activeProvider.syncContact(localContact);
  }

  /**
   * Log activity to CRM for a contact
   */
  async logContactActivity(
    contactId: string,
    type: CRMActivity['type'],
    subject: string,
    description?: string,
    outcome?: string
  ): Promise<CRMActivity> {
    return this.createActivity({
      type,
      subject,
      description,
      contactId,
      status: 'completed',
      completedAt: new Date(),
      outcome
    });
  }

  /**
   * Check if CRM is configured
   */
  isConfigured(): boolean {
    return this.activeProvider !== null;
  }
}

/**
 * Get singleton instance
 */
export function getCRMService(): CRMService {
  return CRMService.getInstance();
}

/**
 * Initialize CRM from environment variables
 */
export async function initializeCRMFromEnv(): Promise<void> {
  const service = getCRMService();

  // Check for Salesforce
  if (process.env.SALESFORCE_CLIENT_ID) {
    await service.initializeProvider({
      provider: CRMProvider.SALESFORCE,
      credentials: {
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
        refreshToken: process.env.SALESFORCE_REFRESH_TOKEN,
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL
      },
      options: {
        sandbox: process.env.SALESFORCE_SANDBOX === 'true'
      }
    });
  }

  // Check for HubSpot
  if (process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN) {
    await service.initializeProvider({
      provider: CRMProvider.HUBSPOT,
      credentials: {
        apiKey: process.env.HUBSPOT_API_KEY,
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN
      }
    });
  }
}
