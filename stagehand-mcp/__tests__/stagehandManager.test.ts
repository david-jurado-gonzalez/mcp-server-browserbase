import * as stagehandManager from '../src/stagehandManager.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log as mockLog } from '../src/logging.js';
import config from '../src/config.js';

// Mock the Stagehand class from @browserbasehq/stagehand
jest.mock('@browserbasehq/stagehand', () => {
  return {
    Stagehand: jest.fn().mockImplementation(() => {
      return {
        init: jest.fn().mockResolvedValue(undefined), // Changed from launch to init
        close: jest.fn().mockResolvedValue(undefined),
        // Add other methods that might be called
      };
    }),
  };
});

// Mock the logger from ../src/logging.js
jest.mock('../src/logging.js', () => ({
  log: jest.fn(),
  // Mock other exported functions from logging.js if they are used by stagehandManager.ts
  // For now, only 'log' is directly used by the functions we are testing.
}));

// Mock config
jest.mock('../src/config.js', () => ({
  __esModule: true, // This is important for ES modules
  default: {
    stagehand: {
      // Default mock config for Stagehand
      apiKey: 'test-api-key',
      // Add other necessary Stagehand config properties
    },
    // Add other config properties if needed by stagehandManager
  },
}));


describe('Stagehand Manager Functions', () => {
  // Typed mock for Stagehand constructor
  const MockedStagehand = Stagehand as jest.MockedClass<typeof Stagehand>;

  /** El mock devuelve un objeto plano; `mock.instances` es la instancia "clase", no ese objeto. */
  function stagehandMockFromConstruction(index: number): { init: jest.Mock; close: jest.Mock } {
    const entry = MockedStagehand.mock.results[index];
    if (!entry || entry.type !== 'return') {
      throw new Error(`No construction result at index ${index}`);
    }
    return entry.value as { init: jest.Mock; close: jest.Mock };
  }

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    // Reset the internal state of stagehandManager by clearing the map and counters.
    // This requires exposing them or a reset function, or re-importing the module.
    // For simplicity, we'll rely on jest.resetModules() if needed or manage state carefully.
    // Or, if stagehandManager.ts uses a Map directly, we might need to spy/mock its methods.
    // For now, we assume each test starts with a clean slate of instances due to `closeStagehand()`
    // being called in afterEach, which should clear the internal `stagehandInstances` map.
    // We also need to reset the internal `stagehandInstances` map and `lastCreatedAlias`, `instanceCounter`
    // A simple way is to use jest.resetModules() before each test that needs a fresh module state.
    // However, this can be slow. Let's try to manage state by ensuring cleanup.
    // The `stagehandInstances` map is not directly exported, so we test its effects.
  });

  afterEach(async () => {
    // Shutdown all instances after each test using the actual closeStagehand function
    // This will also clear the internal map in stagehandManager.js
    await stagehandManager.closeStagehand(); // Call without alias to close all
  });

  describe('createStagehandInstance', () => {
    it('should create a new Stagehand instance with a given alias', async () => {
      const alias = 'testInstance1';
      const instance = await stagehandManager.createStagehandInstance(alias);
      expect(instance).toBeDefined();
      expect(MockedStagehand).toHaveBeenCalledTimes(1);
      expect(MockedStagehand).toHaveBeenCalledWith(config.stagehand);
      const stagehandMockInstance = stagehandMockFromConstruction(0);
      expect(stagehandMockInstance.init).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Creating and initializing Stagehand instance with alias "${alias}"`), "info");
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "${alias}" initialized successfully.`), "info");

      // Verify it's stored
      const retrievedInstance = stagehandManager.getStagehandInstance(alias);
      expect(retrievedInstance).toBe(instance);
    });

    it('should create a new Stagehand instance with a generated alias if none is provided', async () => {
      const instance = await stagehandManager.createStagehandInstance();
      expect(instance).toBeDefined();
      expect(MockedStagehand).toHaveBeenCalledTimes(1);
      const stagehandMockInstance = stagehandMockFromConstruction(0);
      expect(stagehandMockInstance.init).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("No alias provided, generating default alias:"), "info");
      // Alias is generated, e.g., "1"
      const generatedAlias = (mockLog as jest.Mock).mock.calls.find(call => call[0].includes("generating default alias"))[0].match(/default alias: (\S+)/)[1];
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "${generatedAlias}" initialized successfully.`), "info");

      const retrievedInstance = stagehandManager.getStagehandInstance(generatedAlias);
      expect(retrievedInstance).toBe(instance);
      // also check default retrieval if lastCreatedAlias logic is correct
      const defaultRetrieved = stagehandManager.getStagehandInstance();
      expect(defaultRetrieved).toBe(instance);
    });

    it('should return an existing Stagehand instance if one exists for the given alias', async () => {
      const alias = 'testInstance2';
      const instance1 = await stagehandManager.createStagehandInstance(alias);
      const instance2 = await stagehandManager.createStagehandInstance(alias);
      expect(instance1).toBe(instance2);
      expect(MockedStagehand).toHaveBeenCalledTimes(1); // Constructor only called once
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "${alias}" already exists. Returning existing instance.`), "info");
    });

    it('should create independent instances for different aliases', async () => {
      const alias1 = 'aliasA';
      const alias2 = 'aliasB';
      const instanceA = await stagehandManager.createStagehandInstance(alias1);
      const instanceB = await stagehandManager.createStagehandInstance(alias2);
      expect(instanceA).toBeDefined();
      expect(instanceB).toBeDefined();
      expect(instanceA).not.toBe(instanceB);
      expect(MockedStagehand).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during Stagehand instance init', async () => {
      const initError = new Error('Init failed');
      MockedStagehand.mockImplementationOnce(() => ({
        init: jest.fn().mockRejectedValue(initError),
        close: jest.fn().mockResolvedValue(undefined),
      } as any)); // Cast to any to satisfy Stagehand type if methods are missing

      const alias = 'failInit';
      await expect(stagehandManager.createStagehandInstance(alias)).rejects.toThrow(`Failed to initialize Stagehand instance with alias "${alias}": ${initError.message}`);
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Failed to initialize Stagehand instance with alias "${alias}": ${initError.message}`), "error");
    });
  });

  describe('getStagehandInstance', () => {
    it('should return an instance if one exists for the alias', async () => {
      const alias = 'existingAlias';
      const createdInstance = await stagehandManager.createStagehandInstance(alias);
      const retrievedInstance = stagehandManager.getStagehandInstance(alias);
      expect(retrievedInstance).toBe(createdInstance);
    });

    it('should return undefined if no instance exists for the alias', () => {
      const retrievedInstance = stagehandManager.getStagehandInstance('nonExistentAlias');
      expect(retrievedInstance).toBeUndefined();
    });

    it('should return the last created instance if no alias is provided and one exists', async () => {
      await stagehandManager.createStagehandInstance('first');
      const lastInstance = await stagehandManager.createStagehandInstance('lastOne');
      const retrievedInstance = stagehandManager.getStagehandInstance();
      expect(retrievedInstance).toBe(lastInstance);
    });

     it('should return undefined if no alias is provided and no instances were ever created', () => {
      // Ensure map is clear (afterEach should handle this, but good to be explicit if needed for a specific test)
      const retrievedInstance = stagehandManager.getStagehandInstance();
      expect(retrievedInstance).toBeUndefined();
    });
  });

  describe('closeStagehand', () => {
    it('should close a specific Stagehand instance by alias and remove it', async () => {
      const alias = 'toShutdown';
      await stagehandManager.createStagehandInstance(alias);
      const stagehandMockInstance = stagehandMockFromConstruction(0);

      await stagehandManager.closeStagehand(alias);
      expect(stagehandMockInstance.close).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Closing Stagehand instance with alias "${alias}"...`), "info");
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "${alias}" closed successfully.`), "info");
      expect(stagehandManager.getStagehandInstance(alias)).toBeUndefined();
    });

    it('should log if trying to close a non-existent alias', async () => {
      const alias = 'nonExistentClose';
      await stagehandManager.closeStagehand(alias);
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`No Stagehand instance found with alias "${alias}".`), "info");
    });

    it('should close all Stagehand instances if no alias is provided', async () => {
      await stagehandManager.createStagehandInstance('alias1');
      await stagehandManager.createStagehandInstance('alias2');
      const mockInstance1 = stagehandMockFromConstruction(0);
      const mockInstance2 = stagehandMockFromConstruction(1);

      await stagehandManager.closeStagehand(); // No alias, close all
      expect(mockInstance1.close).toHaveBeenCalledTimes(1);
      expect(mockInstance2.close).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith("Closing all Stagehand instances...", "info");
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "alias1" closed successfully.`), "info");
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Stagehand instance with alias "alias2" closed successfully.`), "info");
      expect(mockLog).toHaveBeenCalledWith("All Stagehand instances closed.", "info");
      expect(stagehandManager.getStagehandInstance('alias1')).toBeUndefined();
      expect(stagehandManager.getStagehandInstance('alias2')).toBeUndefined();
      expect(stagehandManager.getStagehandInstance()).toBeUndefined(); // Last created should also be gone
    });

     it('should handle errors during Stagehand instance close', async () => {
      const closeError = new Error('Close failed');
      MockedStagehand.mockImplementationOnce(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockRejectedValue(closeError),
      } as any));

      const alias = 'failClose';
      await stagehandManager.createStagehandInstance(alias);
      await stagehandManager.closeStagehand(alias); // Should not throw, but log error

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(`Error closing Stagehand instance with alias "${alias}": ${closeError.message}`), "error");
      // Instance should still be removed from the map
      expect(stagehandManager.getStagehandInstance(alias)).toBeUndefined();
    });
  });
});