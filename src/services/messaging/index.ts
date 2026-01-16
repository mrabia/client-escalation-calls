/**
 * Messaging Services
 * Exports Kafka event streaming service
 */

export {
  KafkaService,
  getKafkaService,
  EventType
} from './KafkaService';

export type {
  BaseEvent,
  CustomerEvent,
  TaskEvent,
  CommunicationEvent,
  PaymentEvent,
  EventHandler,
  TopicConfig
} from './KafkaService';
