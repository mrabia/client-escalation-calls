/**
 * Agents Module
 * 
 * Exports all agent types and the AgentFactory for creating agents.
 */

// Agent Factory
export { AgentFactory, getAgentFactory } from './AgentFactory';

// Email Agents
export { EmailAgent, EmailConfig, EmailTemplate, createEmailConfigFromEnv, isEmailConfigValid } from './email/EmailAgent';
export { EmailAgentEnhanced } from './email/EmailAgentEnhanced';

// SMS Agents
export { SmsAgent, SmsConfig, SmsTemplate } from './sms/SmsAgent';
export { SMSAgentEnhanced } from './sms/SMSAgentEnhanced';

// Phone Agents
export { PhoneAgentEnhanced } from './phone/PhoneAgentEnhanced';

// Coordinator
export { AgentCoordinator, CoordinatorConfig, AgentRegistration } from './coordinator/AgentCoordinator';
