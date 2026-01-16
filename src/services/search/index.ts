/**
 * Search Services
 * Exports Elasticsearch and search-related services
 */

export {
  ElasticsearchService,
  getElasticsearchService
} from './ElasticsearchService';

export type {
  LogEntry,
  CommunicationRecord,
  SearchOptions,
  SearchResult
} from './ElasticsearchService';
