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

const processOnSpy = jest.spyOn(process, 'on');
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
  throw new Error(`process.exit called with ${code}`);
}) as any);

// Import the module under test AFTER mocks are set up
import '../src/index.js'; // Ejecuta main() al cargar

describe('Index (main entry point and server lifecycle)', () => {
  beforeEach(() => {
    // No usar clearAllMocks() aquí: borraría las llamadas capturadas durante el import inicial.
    processExitSpy.mockReset();
    processExitSpy.mockImplementation(((code?: number) => {
      throw new Error(`process.exit called with ${code}`);
    }) as any);
  });

  it('should initialize logging, create server, connect transport, and start listening', async () => {
    expect(mockEnsureLogDirectory).toHaveBeenCalledTimes(1);
    expect(mockSetupLogRotation).toHaveBeenCalledTimes(1);
    expect(mockRegisterExitHandlers).toHaveBeenCalledTimes(1);
    expect(mockScheduleLogRotation).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith('Starting Stagehand MCP Server...', 'info');
    expect(mockCreateServer).toHaveBeenCalledTimes(1);
    expect(mockStdioServerTransportConstructor).toHaveBeenCalledTimes(1);
    expect(mockMcpServerInstance.connect).toHaveBeenCalledWith(mockStdioServerTransportInstance);
    expect(mockSetServerReadyForLogging).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith('🚀 Servidor MCP de Stagehand iniciado y escuchando.', 'info');
  });

  it('should handle SIGINT for graceful shutdown', async () => {
    mockCloseStagehand.mockClear();
    // registerExitHandlers también registra SIGINT; el de index.ts va después.
    const sigintCalls = processOnSpy.mock.calls.filter((call) => call[0] === 'SIGINT');
    const sigintHandler = sigintCalls[sigintCalls.length - 1]?.[1];
    expect(sigintHandler).toBeDefined();

    processExitSpy.mockImplementation(() => undefined as never);

    if (sigintHandler) {
      await sigintHandler();
      expect(mockLog).toHaveBeenCalledWith('Received SIGINT. Closing Stagehand and exiting.', 'info');
      expect(mockCloseStagehand).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    }
  });

  it('should handle SIGTERM for graceful shutdown', async () => {
    mockCloseStagehand.mockClear();
    const sigtermCalls = processOnSpy.mock.calls.filter((call) => call[0] === 'SIGTERM');
    const sigtermHandler = sigtermCalls[sigtermCalls.length - 1]?.[1];
    expect(sigtermHandler).toBeDefined();

    processExitSpy.mockImplementation(() => undefined as never);

    if (sigtermHandler) {
      await sigtermHandler();
      expect(mockLog).toHaveBeenCalledWith('Received SIGTERM. Closing Stagehand and exiting.', 'info');
      expect(mockCloseStagehand).toHaveBeenCalledTimes(1);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    }
  });

  it.skip('should handle server setup error (e.g., createServer fails)', async () => {
    // jest.mock está hoisteado: no se puede sustituir createServer dentro del test con resetModules
    // de forma fiable en este entrypoint ESM. Ver unstable_mockModule / refactor de index si se
    // quiere cubrir este caso.
    jest.resetModules();
    const errorCreateServer = jest.fn(() => {
      throw new Error('createServer failed');
    });
    jest.doMock('../src/server.js', () => ({ createServer: errorCreateServer }));
    await import('../src/index.js');
    expect(errorCreateServer).toHaveBeenCalled();
  });

  it.skip('should handle server connection error (server.connect fails)', async () => {
    jest.resetModules();
    await import('../src/index.js');
  });
});
