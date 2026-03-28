import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';
import * as utils from '../../src/utils.js';

// Mocks are similar to stagehand_navigate.test.ts
const mockPageGoto = jest.fn();
const mockPageObserve = jest.fn();
// ... other page methods if needed by other tools, but observe primarily uses observe

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    goto: mockPageGoto,
    observe: mockPageObserve,
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
  operationLogs: [], // Mutable for testing error messages
}));

jest.mock('../../src/utils.js', () => ({
  drawObserveOverlay: jest.fn().mockResolvedValue(undefined),
  clearOverlays: jest.fn().mockResolvedValue(undefined), // Though not directly used by observe tool
  sanitizeMessage: jest.fn((msg) => JSON.stringify(msg)), // If any part of observe tool uses it
}));

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
    },
}));

describe('Tool: stagehand_observe', () => {
  const observeToolName = 'stagehand_observe';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageObserve.mockClear().mockResolvedValue([{ description: 'Observed element', selector: '/html/body/div', method: 'click' }]); // Default success
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0; // Clear operation logs
  });

  async function callObserveTool(args: any) {
    return tools.handleToolCall(observeToolName, args);
  }

  it('should observe with a simple instruction and call drawObserveOverlay', async () => {
    const args = { instruction: 'Observe the main button', alias: 'observeTest1' };
    const mockObservations = [{ description: 'Main Button', selector: '//button', method: 'click' }];
    mockPageObserve.mockResolvedValueOnce(mockObservations);

    const result = await callObserveTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockPageObserve).toHaveBeenCalledWith({ instruction: args.instruction, returnAction: false });
    expect(utils.drawObserveOverlay).toHaveBeenCalledWith(mockStagehandInstance.page, mockObservations);
    expect(result).toEqual({
      content: [{ type: "text", text: `Observations: ${JSON.stringify(mockObservations)}` }],
      _meta: {},
    });
  });

  it('should handle no content found (empty observations array)', async () => {
    const args = { instruction: 'Observe something not there', alias: 'observeEmpty' };
    const mockEmptyObservations: any[] = [];
    mockPageObserve.mockResolvedValueOnce(mockEmptyObservations);

    const result = await callObserveTool(args);

    expect(mockPageObserve).toHaveBeenCalledWith({ instruction: args.instruction, returnAction: false });
    expect(utils.drawObserveOverlay).toHaveBeenCalledWith(mockStagehandInstance.page, mockEmptyObservations);
    expect(result).toEqual({
      content: [{ type: "text", text: `Observations: ${JSON.stringify(mockEmptyObservations)}` }],
      _meta: {},
    });
  });

  it('should use default alias if none is provided', async () => {
    const args = { instruction: 'Observe with default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance); // Simulate existing default
    mockCreateStagehandInstance.mockClear();


    await callObserveTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageObserve).toHaveBeenCalledWith({ instruction: args.instruction, returnAction: false });
  });
  
  it.skip('TODO: revisit whether non-navigate tools should auto-create a default Stagehand instance', async () => {
    const args = { instruction: 'Observe with new default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(undefined); // Simulate no existing default

    await callObserveTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageObserve).toHaveBeenCalledWith({ instruction: args.instruction, returnAction: false });
  });


  it('should return an error if stagehand.page.observe throws an exception', async () => {
    const args = { instruction: 'Observe causing error', alias: 'observeError' };
    const observeError = new Error('Underlying observe failed');
    mockPageObserve.mockRejectedValueOnce(observeError);
    operationLogs.push("Previous log entry");


    const result = await callObserveTool(args);

    expect(mockPageObserve).toHaveBeenCalledWith({ instruction: args.instruction, returnAction: false });
    expect(utils.drawObserveOverlay).not.toHaveBeenCalled(); // Should not be called if observe fails
    expect(result).toEqual({
      content: [
        { type: "text", text: `Observation error: ${observeError.message}` },
        { type: "text", text: `Operation logs:\nPrevious log entry` }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should return an error if Stagehand instance is not initialized (and tool is not navigate)', async () => {
    const args = { instruction: 'Observe without instance' };
    mockGetStagehandInstance.mockReturnValue(undefined);
    // For a non-navigate tool, createStagehandInstance is not called by handleToolCall if getStagehandInstance is undefined.
    // Instead, it returns a specific error.
    mockCreateStagehandInstance.mockClear();


    const result = await callObserveTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageObserve).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: `Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page.` }],
      _meta: {},
      isError: true,
    });
  });
});