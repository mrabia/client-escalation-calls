/**
 * Email Services
 * Exports email delivery and tracking services
 */

export {
  EmailDeliveryService,
  getEmailDeliveryService,
  DeliveryStatus,
  BounceType
} from './EmailDeliveryService';

export type {
  EmailDeliveryRecord,
  BounceRecord,
  EmailThread
} from './EmailDeliveryService';
