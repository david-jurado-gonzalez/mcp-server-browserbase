import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';
import * as utils from '../../src/utils.js'; // For clearOverlays

// Mocks setup (similar to other tool tests)
const mockPageAct = jest.fn();
// ... other page methods if needed

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    act: mockPageAct,
    // ... other page methods
  },
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

jest.mock('../../src/utils.js', () => ({
  clearOverlays: jest.fn().mockResolvedValue(undefined), // Used before cached action
  // sanitizeMessage: jest.fn((msg) => JSON.stringify(msg)), // Not directly used by act tool's output formatting
}));

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
    },
}));

describe('Tool: stagehand_act', () => {
  const actToolName = 'stagehand_act';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageAct.mockClear().mockResolvedValue({ success: true, action: 'Performed action', message: 'Action completed successfully.' }); // Default success
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callActTool(args: any) {
    return tools.handleToolCall(actToolName, args);
  }

  describe('Natural Language Actions', () => {
    it('should perform an action based on natural language instruction', async () => {
      const args = { action: 'Click the login button', alias: 'actNL1' };
      const mockActResult = { success: true, action: args.action, message: 'Button clicked.' };
      mockPageAct.mockResolvedValueOnce(mockActResult);

      const result = await callActTool(args);

      expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
      expect(mockPageAct).toHaveBeenCalledWith({ action: args.action, variables: undefined });
      expect(result).toEqual({
        content: [{ type: "text", text: `Success action "${mockActResult.action}": ${mockActResult.message}` }],
        _meta: {},
      });
    });

    it('should perform an action with variables', async () => {
      const args = { action: 'Type %username% into username field', variables: { username: 'testuser' }, alias: 'actNLVars' };
      const mockActResult = { success: true, action: args.action, message: 'Typed username.' };
      mockPageAct.mockResolvedValueOnce(mockActResult);

      const result = await callActTool(args);

      expect(mockPageAct).toHaveBeenCalledWith({ action: args.action, variables: args.variables });
      expect(result.content[0].text).toContain(`Success action "${args.action}"`);
    });
  });

  describe('Cached Actions (Selector & Method)', () => {
    it('should perform a cached action using selector, method, and description', async () => {
      const args = { selector: '/html/body/button', method: 'click', description: 'Login Button', alias: 'actCached1' };
      const mockActResult = { success: true, action: args.description, message: 'Clicked cached button.' };
      mockPageAct.mockResolvedValueOnce(mockActResult);

      const result = await callActTool(args);

      expect(utils.clearOverlays).toHaveBeenCalledWith(mockStagehandInstance.page);
      expect(mockPageAct).toHaveBeenCalledWith({ selector: args.selector, method: args.method, description: args.description });
      expect(result.content[0].text).toContain(`Success action "${args.description}"`);
    });
  });

  describe('Error Handling and Invalid Arguments', () => {
    it('should return an error if neither natural language nor cached action params are provided', async () => {
      const args = { alias: 'actInvalidArgs' }; // Missing required fields
      const result = await callActTool(args);

      expect(mockPageAct).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid arguments for stagehand_act. Provide either 'action' or ('selector', 'method', and 'description')." }],
        _meta: {},
        isError: true,
      });
    });

    it('should return an error if stagehand.page.act fails', async () => {
      const args = { action: 'A failing action', alias: 'actFail' };
      const actError = new Error('Underlying act failed');
      mockPageAct.mockRejectedValueOnce(actError);
      operationLogs.push("Previous log for act fail");

      const result = await callActTool(args);

      expect(mockPageAct).toHaveBeenCalledWith({ action: args.action, variables: undefined });
      expect(result).toEqual({
        content: [
          { type: "text", text: `Action error: ${actError.message}` },
          { type: "text", text: "Operation logs:\nPrevious log for act fail" }
        ],
        _meta: {},
        isError: true,
      });
    });
    
    it('should return an error if stagehand.page.act returns success:false', async () => {
      const args = { action: 'An action that returns false', alias: 'actReturnsFalse' };
      const mockActResult = { success: false, action: args.action, message: 'Element not found.' };
      mockPageAct.mockResolvedValueOnce(mockActResult);

      const result = await callActTool(args);
      expect(result).toEqual({
        content: [{ type: "text", text: `Failure action "${mockActResult.action}": ${mockActResult.message}` }],
        _meta: {},
        // isError might be false here if the tool itself doesn't set it for failed actions,
        // but the content indicates failure. The plan implies correct MCP error responses.
        // The current tools.ts implementation for act returns the success/failure message directly.
      });
    });

    it('should auto-create Stagehand when no instance exists', async () => {
      const args = { action: 'Act without instance' };
      mockGetStagehandInstance.mockReturnValue(undefined);
      mockCreateStagehandInstance.mockClear();
      mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);

      const result = await callActTool(args);

      expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
      expect(mockPageAct).toHaveBeenCalledWith({ action: args.action, variables: undefined });
      expect(result.isError).not.toBe(true);
    });
  });

  // Test default alias behavior
  it('should use default alias if none is provided (natural language)', async () => {
    const args = { action: 'Click something with default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callActTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageAct).toHaveBeenCalledWith({ action: args.action, variables: undefined });
  });
  
});