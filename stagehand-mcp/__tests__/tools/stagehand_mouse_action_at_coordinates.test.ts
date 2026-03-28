import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';

// Mocks setup
const mockMouseClick = jest.fn();
const mockMouseDblclick = jest.fn();
const mockMouseMove = jest.fn(); // For hover
const mockMouseWheel = jest.fn(); // For scroll

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    mouse: {
      click: mockMouseClick,
      dblclick: mockMouseDblclick,
      move: mockMouseMove,
      wheel: mockMouseWheel,
    },
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

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
    },
}));

describe('Tool: stagehand_mouse_action_at_coordinates', () => {
  const mouseActionToolName = 'stagehand_mouse_action_at_coordinates';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all mouse method mocks
    mockMouseClick.mockClear().mockResolvedValue(undefined);
    mockMouseDblclick.mockClear().mockResolvedValue(undefined);
    mockMouseMove.mockClear().mockResolvedValue(undefined);
    mockMouseWheel.mockClear().mockResolvedValue(undefined);
    
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callMouseActionTool(args: any) {
    return tools.handleToolCall(mouseActionToolName, args);
  }

  // Test cases for each action type
  const pointActions = ['click', 'dblclick', 'rightclick', 'middleclick', 'hover'];
  pointActions.forEach(action => {
    it(`should perform '${action}' at specified coordinates`, async () => {
      const args = { action, x: 100, y: 150, alias: `mouse${action}` };
      const result = await callMouseActionTool(args);

      expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
      if (action === 'click') expect(mockMouseClick).toHaveBeenCalledWith(args.x, args.y);
      else if (action === 'dblclick') expect(mockMouseDblclick).toHaveBeenCalledWith(args.x, args.y);
      else if (action === 'rightclick') expect(mockMouseClick).toHaveBeenCalledWith(args.x, args.y, { button: 'right' });
      else if (action === 'middleclick') expect(mockMouseClick).toHaveBeenCalledWith(args.x, args.y, { button: 'middle' });
      else if (action === 'hover') expect(mockMouseMove).toHaveBeenCalledWith(args.x, args.y);
      
      expect(result).toEqual({
        content: [{ type: "text", text: `Successfully performed '${action}' at (${args.x}, ${args.y}).` }],
        _meta: {},
      });
    });

    it(`should return error if x or y are missing for '${action}'`, async () => {
      const argsNoX = { action, y: 150, alias: `mouse${action}NoX` };
      let result = await callMouseActionTool(argsNoX);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Coordinates 'x' and 'y' must be provided as numbers for action '${action}'.`);

      const argsNoY = { action, x: 100, alias: `mouse${action}NoY` };
      result = await callMouseActionTool(argsNoY);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Coordinates 'x' and 'y' must be provided as numbers for action '${action}'.`);
    });
  });

  it('should perform "scroll" with specified deltaX and deltaY', async () => {
    const args = { action: 'scroll', deltaX: 10, deltaY: -20, alias: 'mouseScroll' };
    const result = await callMouseActionTool(args);

    expect(mockMouseWheel).toHaveBeenCalledWith(args.deltaX, args.deltaY);
    expect(result.content[0].text).toBe(`Successfully scrolled viewport by deltaX: ${args.deltaX}, deltaY: ${args.deltaY}.`);
  });
  
  it('should perform "scroll" with only deltaX (deltaY defaults to 0)', async () => {
    const args = { action: 'scroll', deltaX: 10, alias: 'mouseScrollX' };
    const result = await callMouseActionTool(args);
    expect(mockMouseWheel).toHaveBeenCalledWith(10, 0);
    expect(result.content[0].text).toBe(`Successfully scrolled viewport by deltaX: 10, deltaY: 0.`);
  });

  it('should perform "scroll" with only deltaY (deltaX defaults to 0)', async () => {
    const args = { action: 'scroll', deltaY: -20, alias: 'mouseScrollY' };
    const result = await callMouseActionTool(args);
    expect(mockMouseWheel).toHaveBeenCalledWith(0, -20);
    expect(result.content[0].text).toBe(`Successfully scrolled viewport by deltaX: 0, deltaY: -20.`);
  });
  
  it('should return error if deltaX and deltaY are missing for "scroll"', async () => {
    const args = { action: 'scroll', alias: 'mouseScrollNoDelta' };
    const result = await callMouseActionTool(args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("For 'scroll' action, provide 'deltaX' and/or 'deltaY'.");
  });


  it('should return an error for an invalid action type', async () => {
    const args = { action: 'invalid_mouse_action', x: 10, y: 10 };
    const result = await callMouseActionTool(args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid action type: 'invalid_mouse_action'.");
  });
  
  it('should return an error if action argument is missing', async () => {
    const args = { x: 10, y: 10 }; // Missing action
    const result = await callMouseActionTool(args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Missing required argument 'action'.");
  });


  it('should return an error if a mouse method throws', async () => {
    const args = { action: 'click', x: 10, y: 10 };
    const clickError = new Error('Mouse click failed');
    mockMouseClick.mockRejectedValueOnce(clickError);
    operationLogs.push("Previous log for mouse fail");

    const result = await callMouseActionTool(args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(`Mouse action error for {"action":"click","x":10,"y":10}: ${clickError.message}`);
    expect(result.content[1].text).toContain("Operation logs:\nPrevious log for mouse fail");
  });

  it('should return an error if Stagehand instance is not initialized', async () => {
    const args = { action: 'click', x: 10, y: 10 };
    mockGetStagehandInstance.mockReturnValue(undefined);
    mockCreateStagehandInstance.mockClear();

    const result = await callMouseActionTool(args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page.");
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = { action: 'hover', x: 5, y:5 };
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callMouseActionTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockMouseMove).toHaveBeenCalledWith(args.x, args.y);
  });
  
  it.skip('TODO: revisit whether non-navigate tools should auto-create a default Stagehand instance', async () => {
    const args = { action: 'scroll', deltaX: 0, deltaY: 10 };
    mockGetStagehandInstance.mockReturnValueOnce(undefined);

    await callMouseActionTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockMouseWheel).toHaveBeenCalledWith(0, 10);
  });
});