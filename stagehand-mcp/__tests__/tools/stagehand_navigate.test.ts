import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js'; // Assuming stagehand_navigate is handled here
import { Stagehand } from '@browserbasehq/stagehand';
import { log } from '../../src/logging.js';

// Mock Stagehand page methods that will be used by the tools
const mockPageGoto = jest.fn();
const mockPageObserve = jest.fn();
const mockPageScreenshot = jest.fn();
const mockPageAct = jest.fn();
const mockPageExtract = jest.fn();
const mockPageEvaluate = jest.fn();
const mockMouseClick = jest.fn();
const mockMouseDblclick = jest.fn();
const mockMouseMove = jest.fn();
const mockMouseWheel = jest.fn();

// This is the object that our mocked stagehandManager will return or that Stagehand constructor mock will produce
const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    goto: mockPageGoto,
    observe: mockPageObserve,
    screenshot: mockPageScreenshot,
    act: mockPageAct,
    extract: mockPageExtract,
    evaluate: mockPageEvaluate,
    mouse: {
        click: mockMouseClick,
        dblclick: mockMouseDblclick,
        move: mockMouseMove,
        wheel: mockMouseWheel,
    }
    // Add other page methods if used by tools
  },
  agent: jest.fn(() => ({ // Mock agent() to return an object with an execute method
    execute: jest.fn().mockResolvedValue({ message: 'Agent executed', actions: [] }),
  })),
  close: jest.fn().mockResolvedValue(undefined),
} as unknown as Stagehand; // Use 'as unknown as Stagehand' to satisfy type system with our mock shape

const mockCreateStagehandInstance = jest.fn();
const mockGetStagehandInstance = jest.fn();


// Mock Stagehand class from @browserbasehq/stagehand
jest.mock('@browserbasehq/stagehand', () => {
  return {
    Stagehand: jest.fn().mockImplementation(() => mockStagehandInstance),
  };
});

// Mock stagehandManager
jest.mock('../../src/stagehandManager', () => ({
  createStagehandInstance: (...args: any[]) => mockCreateStagehandInstance(...args),
  getStagehandInstance: (...args: any[]) => mockGetStagehandInstance(...args),
}));

// Mock logging
jest.mock('../../src/logging.js', () => ({
  log: jest.fn(),
  getServerInstance: jest.fn().mockReturnValue({ notification: jest.fn() }), // For screenshot tool
  operationLogs: [], // For error reporting
}));

// Mock config if tools.ts depends on it for Stagehand options or screenshot paths
jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key', /* other Stagehand constructor params if needed */ },
        screenshotsDir: '/mocked/screenshots/dir', // For screenshot tool
        // other config
    },
}));


describe('Tool: stagehand_navigate', () => {
  const navigateToolName = 'stagehand_navigate';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks on the shared mockStagehandInstance.page object
    mockPageGoto.mockClear().mockResolvedValue({ status: () => 200 }); // Default success for goto
    mockPageObserve.mockClear().mockResolvedValue({ output: 'Observed content' });
    // Ensure createStagehandInstance returns the consistent mock for tests expecting creation
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    // Ensure getStagehandInstance returns the consistent mock, or undefined to trigger creation path
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
  });

  async function callNavigateTool(args: any) {
    return tools.handleToolCall(navigateToolName, args);
  }

  it('should navigate to a valid URL using a new alias (instance created)', async () => {
    const args = { url: 'https://example.com', alias: 'navTest1' };
    mockGetStagehandInstance.mockReturnValueOnce(undefined); // Simulate new alias, so create is called

    const result = await callNavigateTool(args);

    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
    expect(result).toEqual({
      content: [{ type: "text", text: `Successful navigation to: ${args.url}` }],
      _meta: {},
    });
    // Log call is inside createStagehandInstance and handleToolCall, check specific relevant logs if needed
    // e.g. expect(log).toHaveBeenCalledWith(expect.stringContaining(`Navigating to ${args.url}`), 'info');
  });

  it('should navigate to a valid URL using an existing alias', async () => {
    const args = { url: 'https://anotherexample.com', alias: 'navTestExisting' };
    // getStagehandInstance is already mocked to return mockStagehandInstance by default in beforeEach
    mockCreateStagehandInstance.mockClear(); // Ensure it's not called

    const result = await callNavigateTool(args);

    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
    expect(result).toEqual({
      content: [{ type: "text", text: `Successful navigation to: ${args.url}` }],
      _meta: {},
    });
  });

  it('should navigate using the default alias if no alias is provided (instance created)', async () => {
    const args = { url: 'https://defaultalias.com' };
    mockGetStagehandInstance.mockReturnValueOnce(undefined); // Simulate no existing default

    await callNavigateTool(args);

    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined); // Default alias creation
    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
  });
  
  it('should navigate using the default alias if no alias is provided (existing default instance)', async () => {
    const args = { url: 'https://defaultalias.com' };
    // getStagehandInstance will return the mockStagehandInstance for the default case (undefined alias)
    mockCreateStagehandInstance.mockClear();

    await callNavigateTool(args);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
  });


  it('should return an error if navigation results in a >= 400 status code', async () => {
    const args = { url: 'https://errorpage.com', alias: 'navTestErrorStatus' };
    mockPageGoto.mockResolvedValueOnce({ status: () => 404 }); // Simulate a 404 error

    const result = await callNavigateTool(args);

    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
    expect(result).toEqual({
      content: [
        { type: "text", text: `Navigation error to ${args.url}: Status code 404` },
        { type: "text", text: expect.stringContaining("Operation logs:") }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should return an error if stagehand.page.goto throws an exception', async () => {
    const args = { url: 'https://exception.com', alias: 'navTestException' };
    const gotoError = new Error('Network timeout');
    mockPageGoto.mockRejectedValueOnce(gotoError);

    const result = await callNavigateTool(args);

    expect(mockPageGoto).toHaveBeenCalledWith(args.url);
    expect(result).toEqual({
      content: [
        { type: "text", text: `Navigation error: ${gotoError.message}` },
        { type: "text", text: expect.stringContaining("Operation logs:") }
      ],
      _meta: {},
      isError: true,
    });
  });


  it('should return an error if Stagehand instance cannot be created', async () => {
    const args = { url: 'https://example.com', alias: 'noInstanceCreation' };
    const instanceError = new Error("Failed to create Stagehand instance");
    mockGetStagehandInstance.mockReturnValue(undefined); // Ensure creation path
    mockCreateStagehandInstance.mockRejectedValueOnce(instanceError);

    const result = await callNavigateTool(args);
    expect(result).toEqual({
      content: [
        { type: "text", text: `Failed to initialize Stagehand: ${instanceError.message}` },
        { type: "text", text: expect.stringContaining("Operation logs:") }
      ],
      _meta: {},
      isError: true,
    });
  });

  // The "subsequent observe" is not part of stagehand_navigate tool itself.
  // It's a general instruction for the AI assistant.
  // So, a direct test for it within stagehand_navigate unit tests is not applicable
  // unless stagehand_navigate had an explicit parameter to trigger observe.
  // The plan says: "The first time you access a website do observe `stagehand_observe`..."
  // This implies two separate tool calls.
});