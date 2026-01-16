/**
 * CRM Services
 * Exports CRM integration services
 */

export {
  CRMService,
  getCRMService,
  initializeCRMFromEnv,
  CRMProvider
} from './CRMService';

export type {
  CRMConfig,
  CRMContact,
  CRMAccount,
  CRMActivity,
  CRMDeal
} from './CRMService';
