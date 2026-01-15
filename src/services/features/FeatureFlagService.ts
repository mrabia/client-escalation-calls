import { Logger } from 'winston';
import { config } from '@/config';

/**
 * Feature Flag Names
 */
export type FeatureFlag = 
  | 'emailAgent'
  | 'phoneAgent'
  | 'smsAgent'
  | 'researchAgent'
  | 'aiGeneration'
  | 'vectorMemory';

/**
 * Feature Flag Service
 * 
 * Provides centralized feature flag management using environment variables.
 * Supports runtime checking of enabled features for graceful degradation.
 */
export class FeatureFlagService {
  private readonly logger: Logger;
  private readonly flags: Map<FeatureFlag, boolean>;
  
  constructor(logger: Logger) {
    this.logger = logger;
    this.flags = new Map();
    
    // Load all feature flags from config
    this.flags.set('emailAgent', config.features.emailAgent);
    this.flags.set('phoneAgent', config.features.phoneAgent);
    this.flags.set('smsAgent', config.features.smsAgent);
    this.flags.set('researchAgent', config.features.researchAgent);
    this.flags.set('aiGeneration', config.features.aiGeneration);
    this.flags.set('vectorMemory', config.features.vectorMemory);
    
    this.logger.info('Feature flags loaded', {
      emailAgent: this.flags.get('emailAgent'),
      phoneAgent: this.flags.get('phoneAgent'),
      smsAgent: this.flags.get('smsAgent'),
      researchAgent: this.flags.get('researchAgent'),
      aiGeneration: this.flags.get('aiGeneration'),
      vectorMemory: this.flags.get('vectorMemory')
    });
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags.get(flag) ?? false;
  }
  
  /**
   * Check if email agent is enabled
   */
  isEmailAgentEnabled(): boolean {
    return this.isEnabled('emailAgent');
  }
  
  /**
   * Check if phone agent is enabled
   */
  isPhoneAgentEnabled(): boolean {
    return this.isEnabled('phoneAgent');
  }
  
  /**
   * Check if SMS agent is enabled
   */
  isSmsAgentEnabled(): boolean {
    return this.isEnabled('smsAgent');
  }
  
  /**
   * Check if research agent is enabled
   */
  isResearchAgentEnabled(): boolean {
    return this.isEnabled('researchAgent');
  }
  
  /**
   * Check if AI generation is enabled
   */
  isAiGenerationEnabled(): boolean {
    return this.isEnabled('aiGeneration');
  }
  
  /**
   * Check if vector memory is enabled
   */
  isVectorMemoryEnabled(): boolean {
    return this.isEnabled('vectorMemory');
  }
  
  /**
   * Get all feature flag statuses
   */
  getAllFlags(): Record<FeatureFlag, boolean> {
    const result: Record<string, boolean> = {};
    this.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result as Record<FeatureFlag, boolean>;
  }
  
  /**
   * Get enabled features list
   */
  getEnabledFeatures(): FeatureFlag[] {
    const enabled: FeatureFlag[] = [];
    this.flags.forEach((value, key) => {
      if (value) {
        enabled.push(key);
      }
    });
    return enabled;
  }
  
  /**
   * Get disabled features list
   */
  getDisabledFeatures(): FeatureFlag[] {
    const disabled: FeatureFlag[] = [];
    this.flags.forEach((value, key) => {
      if (!value) {
        disabled.push(key);
      }
    });
    return disabled;
  }
  
  /**
   * Check if any agent is enabled
   */
  hasAnyAgentEnabled(): boolean {
    return this.isEmailAgentEnabled() || 
           this.isPhoneAgentEnabled() || 
           this.isSmsAgentEnabled() ||
           this.isResearchAgentEnabled();
  }
  
  /**
   * Execute function only if feature is enabled
   * Returns undefined if feature is disabled
   */
  async executeIfEnabled<T>(
    flag: FeatureFlag,
    fn: () => Promise<T>
  ): Promise<T | undefined> {
    if (!this.isEnabled(flag)) {
      this.logger.debug(`Feature ${flag} is disabled, skipping execution`);
      return undefined;
    }
    return fn();
  }
  
  /**
   * Guard decorator - throws if feature is disabled
   */
  requireFeature(flag: FeatureFlag): void {
    if (!this.isEnabled(flag)) {
      throw new Error(`Feature '${flag}' is not enabled`);
    }
  }
}

/**
 * Singleton instance for global access
 */
let featureFlagServiceInstance: FeatureFlagService | null = null;

/**
 * Get or create the singleton FeatureFlagService instance
 */
export function getFeatureFlagService(logger?: Logger): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    if (!logger) {
      throw new Error('Logger required for initial FeatureFlagService creation');
    }
    featureFlagServiceInstance = new FeatureFlagService(logger);
  }
  return featureFlagServiceInstance;
}

/**
 * Quick check if a feature is enabled (uses singleton)
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (!featureFlagServiceInstance) {
    // Fall back to config if service not initialized
    return config.features[flag] ?? false;
  }
  return featureFlagServiceInstance.isEnabled(flag);
}
