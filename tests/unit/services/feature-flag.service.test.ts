import { FeatureFlagService, getFeatureFlagService, isFeatureEnabled } from '../../../src/services/features/FeatureFlagService';

// Mock the config
jest.mock('../../../src/config', () => ({
  config: {
    features: {
      emailAgent: true,
      phoneAgent: true,
      smsAgent: false,
      researchAgent: false,
      aiGeneration: false,
      vectorMemory: true
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as any;

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeatureFlagService(mockLogger);
  });

  describe('constructor', () => {
    it('should load feature flags from config', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Feature flags loaded', expect.any(Object));
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled features', () => {
      expect(service.isEnabled('emailAgent')).toBe(true);
      expect(service.isEnabled('phoneAgent')).toBe(true);
      expect(service.isEnabled('vectorMemory')).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(service.isEnabled('smsAgent')).toBe(false);
      expect(service.isEnabled('researchAgent')).toBe(false);
      expect(service.isEnabled('aiGeneration')).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('isEmailAgentEnabled should return correct value', () => {
      expect(service.isEmailAgentEnabled()).toBe(true);
    });

    it('isPhoneAgentEnabled should return correct value', () => {
      expect(service.isPhoneAgentEnabled()).toBe(true);
    });

    it('isSmsAgentEnabled should return correct value', () => {
      expect(service.isSmsAgentEnabled()).toBe(false);
    });

    it('isResearchAgentEnabled should return correct value', () => {
      expect(service.isResearchAgentEnabled()).toBe(false);
    });

    it('isAiGenerationEnabled should return correct value', () => {
      expect(service.isAiGenerationEnabled()).toBe(false);
    });

    it('isVectorMemoryEnabled should return correct value', () => {
      expect(service.isVectorMemoryEnabled()).toBe(true);
    });
  });

  describe('getAllFlags', () => {
    it('should return all feature flag statuses', () => {
      const flags = service.getAllFlags();
      
      expect(flags).toEqual({
        emailAgent: true,
        phoneAgent: true,
        smsAgent: false,
        researchAgent: false,
        aiGeneration: false,
        vectorMemory: true
      });
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return list of enabled features', () => {
      const enabled = service.getEnabledFeatures();
      
      expect(enabled).toContain('emailAgent');
      expect(enabled).toContain('phoneAgent');
      expect(enabled).toContain('vectorMemory');
      expect(enabled).not.toContain('smsAgent');
      expect(enabled).not.toContain('researchAgent');
    });
  });

  describe('getDisabledFeatures', () => {
    it('should return list of disabled features', () => {
      const disabled = service.getDisabledFeatures();
      
      expect(disabled).toContain('smsAgent');
      expect(disabled).toContain('researchAgent');
      expect(disabled).toContain('aiGeneration');
      expect(disabled).not.toContain('emailAgent');
    });
  });

  describe('hasAnyAgentEnabled', () => {
    it('should return true if any agent is enabled', () => {
      expect(service.hasAnyAgentEnabled()).toBe(true);
    });
  });

  describe('executeIfEnabled', () => {
    it('should execute function if feature is enabled', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      
      const result = await service.executeIfEnabled('emailAgent', mockFn);
      
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should return undefined if feature is disabled', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      
      const result = await service.executeIfEnabled('smsAgent', mockFn);
      
      expect(mockFn).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('requireFeature', () => {
    it('should not throw if feature is enabled', () => {
      expect(() => service.requireFeature('emailAgent')).not.toThrow();
    });

    it('should throw if feature is disabled', () => {
      expect(() => service.requireFeature('smsAgent')).toThrow("Feature 'smsAgent' is not enabled");
    });
  });
});

describe('isFeatureEnabled utility', () => {
  beforeEach(() => {
    // Initialize the singleton
    getFeatureFlagService(mockLogger);
  });

  it('should return correct value for enabled features', () => {
    expect(isFeatureEnabled('emailAgent')).toBe(true);
  });

  it('should return correct value for disabled features', () => {
    expect(isFeatureEnabled('smsAgent')).toBe(false);
  });
});
