import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';

// Mocks setup
const mockAgentExecute = jest.fn();

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    // ... other page methods if needed by other tools
  },
  agent: jest.fn(() => ({ // Mock agent() to return an object with an execute method
    execute: mockAgentExecute,
  })),
  close: jest.fn().mockResolvedValue(undefined),
} as unknown as Stagehand;

const mockCreateStagehandInstance = jest.fn();
const mockGetStagehandInstance = jest.fn();

jest.mock('@browserbasehq/stagehand', () => {
  return {
    Stagehand: jest.fn().mockImplementation(() => mockStagehandInstance),
  };
});

jest.mock('../../src/stagehandManager', () => ({
  createStagehandInstance: (...args: any[]) => mockCreateStagehandInstance(...args),
  getStagehandInstance: (...args: any[]) => mockGetStagehandInstance(...args),
}));

jest.mock('../../src/logging.js', () => ({
  log: jest.fn(),
  operationLogs: [],
}));

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
    },
}));

describe('Tool: stagehand_agent_execute', () => {
  const agentExecuteToolName = 'stagehand_agent_execute';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the agent and its execute method
    (mockStagehandInstance.agent as jest.Mock).mockClear();
    mockAgentExecute.mockClear().mockResolvedValue({ message: 'Agent task completed.', actions: [] }); // Default success
    
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callAgentExecuteTool(args: any) {
    return tools.handleToolCall(agentExecuteToolName, args);
  }

  it('should execute a simple instruction via the agent', async () => {
    const args = { instruction: 'Book a flight to London', alias: 'agentExec1' };
    const mockAgentResponse = { message: 'Flight to London booked.', actions: [{ tool: 'some_tool', args: {} }] };
    mockAgentExecute.mockResolvedValueOnce(mockAgentResponse);

    const result = await callAgentExecuteTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockStagehandInstance.agent).toHaveBeenCalledTimes(1);
    expect(mockAgentExecute).toHaveBeenCalledWith(args.instruction);
    expect(result).toEqual({
      content: [{ type: "text", text: mockAgentResponse.message }],
      _meta: {}, // Assuming actions are not directly returned in content by this tool wrapper
    });
  });

  it('should execute a complex instruction via the agent', async () => {
    const args = { instruction: 'Find the best Italian restaurants near me and order a pizza.', alias: 'agentExecComplex' };
    const mockAgentResponse = { message: 'Found restaurants, pizza ordered.', actions: [/*...multiple actions...*/] };
    mockAgentExecute.mockResolvedValueOnce(mockAgentResponse);

    const result = await callAgentExecuteTool(args);

    expect(mockAgentExecute).toHaveBeenCalledWith(args.instruction);
    expect(result.content[0].text).toBe(mockAgentResponse.message);
  });

  it('should return an error if instruction is missing', async () => {
    const args = { alias: 'agentExecNoInstruction' }; // Missing instruction
    const result = await callAgentExecuteTool(args);

    expect(mockAgentExecute).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Missing required argument 'instruction' for stagehand_agent_execute." }],
      _meta: {},
      isError: true,
    });
  });

  it('should return an error if agent.execute throws an exception', async () => {
    const args = { instruction: 'Agent task that fails' };
    const agentError = new Error('Agent execution failed internally');
    mockAgentExecute.mockRejectedValueOnce(agentError);
    operationLogs.push("Previous log for agent fail");

    const result = await callAgentExecuteTool(args);

    expect(mockAgentExecute).toHaveBeenCalledWith(args.instruction);
    expect(result).toEqual({
      content: [
        { type: "text", text: `Stagehand agent execution error: ${agentError.message}` },
        { type: "text", text: "Operation logs:\nPrevious log for agent fail" }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should auto-create Stagehand when no instance exists', async () => {
    const args = { instruction: 'Agent execute without instance' };
    mockGetStagehandInstance.mockReturnValue(undefined);
    mockCreateStagehandInstance.mockClear();
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);

    const result = await callAgentExecuteTool(args);

    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockAgentExecute).toHaveBeenCalledWith(args.instruction);
    expect(result.isError).not.toBe(true);
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = { instruction: 'Agent execute with default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callAgentExecuteTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockAgentExecute).toHaveBeenCalledWith(args.instruction);
  });
  
});