import path from 'path'; // For path.join assertions

// Evitar que `.env` del disco pise process.env durante los tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock fs/promises before importing config
const mockMkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  // Mock other fs/promises functions if config.ts uses them
}));

// Mock logging.js as it's imported by config.ts
jest.mock('../src/logging.js', () => ({
  logLineToString: jest.fn(message => JSON.stringify(message)), // Simple mock
}));

// Store original process.env
const ORIGINAL_ENV = { ...process.env };

describe('Configuration', () => {
  let configInstance: any; // To hold the imported config instance

  beforeEach(async () => {
    jest.resetModules(); // Clear module cache to re-import config with new env vars
    process.env = { ...ORIGINAL_ENV }; // Reset env for each test
    // Aislar de credenciales y timeouts del entorno de desarrollo del host
    delete process.env.STAGEHAND_MODEL_API_KEY;
    delete process.env.STAGEHAND_DOM_SETTLE_TIMEOUT;
    mockMkdir.mockClear(); // Clear fs mock calls

    // Dynamically import config after resetting modules and env
    const configModule = await import('../src/config.js');
    configInstance = configModule.default;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // Restore original environment
  });

  describe('Environment Variable Effects on Stagehand Config', () => {
    it('should use default STAGEHAND_MODEL_NAME if not set', () => {
      expect(configInstance.stagehand.modelName).toBe("gemini-2.0-flash");
    });

    it('should override STAGEHAND_MODEL_NAME from environment variable', async () => {
      process.env.STAGEHAND_MODEL_NAME = "test-model-from-env";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.modelName).toBe("test-model-from-env");
    });
    
    it('should use undefined for STAGEHAND_MODEL_API_KEY if not set', () => {
      expect(configInstance.stagehand.modelClientOptions.apiKey).toBeUndefined();
    });

    it('should override STAGEHAND_MODEL_API_KEY from environment variable', async () => {
      process.env.STAGEHAND_MODEL_API_KEY = "env-api-key";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.modelClientOptions!.apiKey).toBe("env-api-key");
    });

    it('should use default viewport width and height if not set', () => {
      expect(configInstance.stagehand.localBrowserLaunchOptions.viewport.width).toBe(1920);
      expect(configInstance.stagehand.localBrowserLaunchOptions.viewport.height).toBe(1080);
    });

    it('should override viewport width and height from environment variables', async () => {
      process.env.STAGEHAND_VIEWPORT_WIDTH = "800";
      process.env.STAGEHAND_VIEWPORT_HEIGHT = "600";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.localBrowserLaunchOptions!.viewport!.width).toBe(800);
      expect(newConfig.stagehand.localBrowserLaunchOptions!.viewport!.height).toBe(600);
    });
    
    it('should fall back to default viewport when width/height env values are invalid', async () => {
      process.env.STAGEHAND_VIEWPORT_WIDTH = "invalid";
      process.env.STAGEHAND_VIEWPORT_HEIGHT = "invalid";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      // parseIntegerEnv devuelve el fallback si parseInt no es finito
      expect(newConfig.stagehand.localBrowserLaunchOptions!.viewport!.width).toBe(1920);
      expect(newConfig.stagehand.localBrowserLaunchOptions!.viewport!.height).toBe(1080);
    });


    it('should use default STAGEHAND_ARGS (empty array) if not set', () => {
      expect(configInstance.stagehand.localBrowserLaunchOptions.args).toEqual([]);
    });

    it('should parse STAGEHAND_ARGS from environment variable (comma separated)', async () => {
      process.env.STAGEHAND_ARGS = "--no-sandbox,--disable-dev-shm-usage";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.localBrowserLaunchOptions!.args).toEqual(["--no-sandbox", "--disable-dev-shm-usage"]);
    });
    
    it('should parse STAGEHAND_ARGS from environment variable (space separated)', async () => {
      process.env.STAGEHAND_ARGS = "--no-sandbox --disable-dev-shm-usage";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.localBrowserLaunchOptions!.args).toEqual(["--no-sandbox", "--disable-dev-shm-usage"]);
    });

    it('should use default STAGEHAND_LOCALE if not set', () => {
      expect(configInstance.stagehand.localBrowserLaunchOptions.locale).toBe("es-ES");
    });

    it('should override STAGEHAND_LOCALE from environment variable', async () => {
      process.env.STAGEHAND_LOCALE = "en-US";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.localBrowserLaunchOptions!.locale).toBe("en-US");
    });
    
    it('should use default STAGEHAND_PERMISSIONS (empty array) if not set', () => {
      expect(configInstance.stagehand.localBrowserLaunchOptions.permissions).toEqual([]);
    });

    it('should parse STAGEHAND_PERMISSIONS from environment variable', async () => {
      process.env.STAGEHAND_PERMISSIONS = "geolocation,notifications";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.localBrowserLaunchOptions!.permissions).toEqual(["geolocation", "notifications"]);
    });

    it('should use default STAGEHAND_VERBOSE (1) if not set', () => {
      expect(configInstance.stagehand.verbose).toBe(1);
    });

    it('should override STAGEHAND_VERBOSE from environment variable', async () => {
      process.env.STAGEHAND_VERBOSE = "0"; // Test with 0 for false-like
      jest.resetModules();
      let newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.verbose).toBe(0);

      process.env.STAGEHAND_VERBOSE = "2"; // Test with another number
      jest.resetModules();
      newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.verbose).toBe(2);
    });
    
    it('should fall back to default STAGEHAND_VERBOSE when the env value is not a finite integer', async () => {
      process.env.STAGEHAND_VERBOSE = "true"; // no es un entero parseable
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.verbose).toBe(1);
    });


    it('should use default STAGEHAND_DOM_SETTLE_TIMEOUT if not set', () => {
      expect(configInstance.stagehand.domSettleTimeoutMs).toBe(30000);
    });

    it('should override STAGEHAND_DOM_SETTLE_TIMEOUT from environment variable', async () => {
      process.env.STAGEHAND_DOM_SETTLE_TIMEOUT = "15000";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      expect(newConfig.stagehand.domSettleTimeoutMs).toBe(15000);
    });

    it('should always set stagehand.env to "LOCAL"', () => {
      process.env.STAGEHAND_ENV = "BROWSERBASE"; // Try to override
      jest.resetModules(); // Re-import to apply env change attempt
      return import('../src/config.js').then(newConfigModule => {
        expect(newConfigModule.default.stagehand.env).toBe("LOCAL");
      });
    });
  });

  describe('Directory Configuration', () => {
    it('should use default downloads and screenshots directory names if not set', () => {
      const expectedDownloadsDir = path.join(process.cwd(), "downloads");
      const expectedScreenshotsDir = path.join(expectedDownloadsDir, "screenshots");
      expect(configInstance.downloadsDir).toBe(expectedDownloadsDir);
      expect(configInstance.screenshotsDir).toBe(expectedScreenshotsDir);
    });

    it('should override directory names from environment variables', async () => {
      process.env.STAGEHAND_DOWNLOADS_DIR_NAME = "my_downloads";
      process.env.STAGEHAND_SCREENSHOTS_DIR_NAME = "my_screenshots";
      jest.resetModules();
      const newConfig = (await import('../src/config.js')).default;
      
      const expectedDownloadsDir = path.join(process.cwd(), "my_downloads");
      const expectedScreenshotsDir = path.join(expectedDownloadsDir, "my_screenshots");
      expect(newConfig.downloadsDir).toBe(expectedDownloadsDir);
      expect(newConfig.screenshotsDir).toBe(expectedScreenshotsDir);
    });
  });

  describe('ensureDirectories', () => {
    it('should call fs.mkdir for downloads and screenshots directories', async () => {
      await configInstance.ensureDirectories();
      expect(mockMkdir).toHaveBeenCalledWith(configInstance.downloadsDir, { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith(configInstance.screenshotsDir, { recursive: true });
      expect(mockMkdir).toHaveBeenCalledTimes(2);
    });

    it('should propagate errors from fs.mkdir (e.g., if downloadsDir creation fails)', async () => {
      mockMkdir.mockImplementationOnce(() => Promise.reject(new Error("Failed to create downloads")));
      await expect(configInstance.ensureDirectories()).rejects.toThrow("Failed to create downloads");
      expect(mockMkdir).toHaveBeenCalledTimes(1); // Only first call attempted
    });
  });
});