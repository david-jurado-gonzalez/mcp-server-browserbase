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

import { main } from '../src/index.js';

describe('Index (main entry point and server lifecycle)', () => {
  beforeAll(async () => {
    await main();
  });

  beforeEach(() => {
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
});

describe('main() error paths (injected createServer / connect)', () => {
  it('calls process.exit(1) when createServer throws', async () => {
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await main({
      createServer: () => {
        throw new Error('createServer failed');
      },
    });
    expect(mockLog).toHaveBeenCalledWith(
      'Error during server setup or connection: createServer failed',
      'error'
    );
    expect(mockCloseStagehand).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
    exitMock.mockRestore();
  });

  it('calls process.exit(1) when server.connect rejects', async () => {
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const failingServer = {
      connect: jest.fn().mockRejectedValue(new Error('connect failed')),
    };
    await main({
      createServer: () => failingServer as any,
    });
    expect(mockLog).toHaveBeenCalledWith(
      'Error during server setup or connection: connect failed',
      'error'
    );
    expect(mockCloseStagehand).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
    exitMock.mockRestore();
  });
});
