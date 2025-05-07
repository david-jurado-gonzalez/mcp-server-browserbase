// Mock dependencies before importing the module under test (index.ts)
const mockStdioServerTransportInstance = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
};
const mockStdioServerTransportConstructor = jest.fn(() => mockStdioServerTransportInstance);
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: mockStdioServerTransportConstructor,
}));

const mockMcpServerInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  // Add other methods if main() calls them on server instance
};
const mockCreateServer = jest.fn(() => mockMcpServerInstance);
jest.mock('../src/server.js', () => ({
  createServer: mockCreateServer,
}));

const mockCloseStagehand = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/stagehandManager.js', () => ({
  closeStagehand: mockCloseStagehand,
}));

const mockLog = jest.fn();
const mockEnsureLogDirectory = jest.fn();
const mockSetupLogRotation = jest.fn();
const mockRegisterExitHandlers = jest.fn();
const mockScheduleLogRotation = jest.fn();
const mockSetServerReadyForLogging = jest.fn();
jest.mock('../src/logging.js', () => ({
  log: mockLog,
  ensureLogDirectory: mockEnsureLogDirectory,
  setupLogRotation: mockSetupLogRotation,
  registerExitHandlers: mockRegisterExitHandlers,
  scheduleLogRotation: mockScheduleLogRotation,
  setServerReadyForLogging: mockSetServerReadyForLogging,
}));

// Mock process events and exit
const mockProcessOn = jest.fn();
const mockProcessExit = jest.fn().mockImplementation((code?: number) => {
  throw new Error(`process.exit called with ${code}`); // Make tests fail if exit is called unexpectedly
});

global.process.on = mockProcessOn as any;
global.process.exit = mockProcessExit as any;


// Import the module under test AFTER mocks are set up
import '../src/index.js'; // This will execute main() due to its direct invocation

describe('Index (main entry point and server lifecycle)', () => {

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Restore process.exit to a non-throwing mock for tests that expect it to be called
    global.process.exit = jest.fn() as any; 
  });

  afterEach(() => {
     // Restore original process.exit if modified by a test, or ensure it's reset
    global.process.exit = jest.fn().mockImplementation((code?: number) => {
        throw new Error(`process.exit called with ${code} outside of test expectation`);
    }) as any;
  });


  it('should initialize logging, create server, connect transport, and start listening', async () => {
    // main() is called on import. We need to re-import or structure test to call it.
    // For simplicity, assuming the import '../src/index.js' at the top runs main().
    // If main() needs to be called per test, the import should be inside test or a helper.
    // Let's adjust to call main if it's exported, or re-evaluate how to test its single execution.

    // Re-importing or calling main() directly is tricky with top-level execution.
    // A common pattern is to export main and call it. Assuming index.ts is refactored to export main:
    // await main(); // If main were exported and could be called.

    // Given the current structure (main() runs on import), these assertions check the first run.
    expect(mockEnsureLogDirectory).toHaveBeenCalledTimes(1);
    expect(mockSetupLogRotation).toHaveBeenCalledTimes(1);
    expect(mockRegisterExitHandlers).toHaveBeenCalledTimes(1);
    expect(mockScheduleLogRotation).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Starting Stagehand MCP Server...", "info");
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    expect(mockStdioServerTransportConstructor).toHaveBeenCalledTimes(1);
    expect(mockMcpServerInstance.connect).toHaveBeenCalledWith(mockStdioServerTransportInstance);
    expect(mockSetServerReadyForLogging).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("🚀 Servidor MCP de Stagehand iniciado y escuchando.", "info");
  });

  it('should handle SIGINT for graceful shutdown', async () => {
    // Find the SIGINT handler
    const sigintHandler = mockProcessOn.mock.calls.find(call => call[0] === 'SIGINT')?.[1];
    expect(sigintHandler).toBeDefined();

    if (sigintHandler) {
      await sigintHandler(); // Call the SIGINT handler
      expect(mockLog).toHaveBeenCalledWith("Received SIGINT. Closing Stagehand and exiting.", "info");
      expect(mockCloseStagehand).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(0);
    }
  });

  it('should handle SIGTERM for graceful shutdown', async () => {
    const sigtermHandler = mockProcessOn.mock.calls.find(call => call[0] === 'SIGTERM')?.[1];
    expect(sigtermHandler).toBeDefined();

    if (sigtermHandler) {
      await sigtermHandler(); // Call the SIGTERM handler
      expect(mockLog).toHaveBeenCalledWith("Received SIGTERM. Closing Stagehand and exiting.", "info");
      expect(mockCloseStagehand).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(0); // As per current index.ts logic
    }
  });

  it('should handle server setup error (e.g., createServer fails)', async () => {
    // This requires re-running main() with a modified mock.
    // This is complex if main() is not exported and runs on initial import.
    // One way is to use jest.resetModules() and re-import.
    jest.resetModules();
    // Redefine mocks for this specific test case
    const errorCreateServer = jest.fn(() => { throw new Error("createServer failed"); });
    jest.mock('../src/server.js', () => ({ createServer: errorCreateServer }));
    jest.mock('../src/stagehandManager.js', () => ({ closeStagehand: mockCloseStagehand })); // Keep other mocks
    jest.mock('../src/logging.js', () => ({ // Keep logging mocks
        log: mockLog,
        ensureLogDirectory: mockEnsureLogDirectory,
        setupLogRotation: mockSetupLogRotation,
        registerExitHandlers: mockRegisterExitHandlers,
        scheduleLogRotation: mockScheduleLogRotation,
        setServerReadyForLogging: mockSetServerReadyForLogging,
    }));
    global.process.exit = jest.fn() as any; // Ensure exit is a simple mock for this re-import

    await import('../src/index.js'); // Re-runs main with new mock

    expect(errorCreateServer).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith("Error during server setup or connection: createServer failed", "error");
    expect(mockCloseStagehand).toHaveBeenCalledTimes(1); // Should attempt cleanup
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle server connection error (server.connect fails)', async () => {
    jest.resetModules();
    const errorConnect = jest.fn().mockRejectedValue(new Error("connect failed"));
    const mcpServerInstanceWithError = { connect: errorConnect };
    const createServerReturningErrorInstance = jest.fn(() => mcpServerInstanceWithError);
    jest.mock('../src/server.js', () => ({ createServer: createServerReturningErrorInstance }));
    jest.mock('../src/stagehandManager.js', () => ({ closeStagehand: mockCloseStagehand }));
    jest.mock('../src/logging.js', () => ({
        log: mockLog,
        ensureLogDirectory: mockEnsureLogDirectory,
        setupLogRotation: mockSetupLogRotation,
        registerExitHandlers: mockRegisterExitHandlers,
        scheduleLogRotation: mockScheduleLogRotation,
        setServerReadyForLogging: mockSetServerReadyForLogging,
    }));
    global.process.exit = jest.fn() as any;

    await import('../src/index.js');

    expect(createServerReturningErrorInstance).toHaveBeenCalled();
    expect(errorConnect).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith("Error during server setup or connection: connect failed", "error");
    expect(mockCloseStagehand).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  
  // Note: Testing unhandled errors in main().catch() is harder with the current top-level execution.
  // It would typically involve main being async and awaiting its promise in the test.
});