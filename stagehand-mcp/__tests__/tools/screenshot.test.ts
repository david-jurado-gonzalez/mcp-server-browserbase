import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs, getServerInstance as mockGetServerInstance } from '../../src/logging.js';
import config from '../../src/config.js';
import { screenshots as inMemoryScreenshots } from '../../src/resources.js';
import path from 'path'; // For joining paths

// Mocks setup
const mockPageScreenshot = jest.fn();
const mockNotification = jest.fn();

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    screenshot: mockPageScreenshot,
  },
  close: jest.fn().mockResolvedValue(undefined),
} as unknown as Stagehand;

jest.mock('@browserbasehq/stagehand', () => {
  return {
    Stagehand: jest.fn().mockImplementation(() => mockStagehandInstance),
  };
});

jest.mock('../../src/stagehandManager.js', () => ({
  createStagehandInstance: jest.fn().mockResolvedValue(mockStagehandInstance),
  getStagehandInstance: jest.fn().mockReturnValue(mockStagehandInstance),
}));

jest.mock('../../src/logging.js', () => ({
  log: jest.fn(),
  operationLogs: [],
  getServerInstance: jest.fn(() => ({ notification: mockNotification })),
}));

// Mock config to provide screenshotsDir
jest.mock('../../src/config.js', () => ({
    __esModule: true, // Important for ES modules
    default: {
        stagehand: { apiKey: 'test-api-key' },
        screenshotsDir: '/tmp/mock_screenshots', // Mocked path
    },
}));

// Mock resources to control the in-memory screenshots map
jest.mock('../../src/resources.js', () => ({
    screenshots: new Map<string, string>(), // Use a real map for testing set/get
    // Mock other resource functions if they were to be accidentally called
    listResources: jest.fn(),
    listResourceTemplates: jest.fn(),
    readResource: jest.fn(),
}));


describe('Tool: screenshot (file saving variant)', () => {
  const screenshotToolName = 'screenshot';
  const mockScreenshotBase64 = "base64filescreenshot";
  const mockScreenshotBuffer = Buffer.from(mockScreenshotBase64, 'base64');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageScreenshot.mockClear().mockResolvedValue(mockScreenshotBuffer);
    mockNotification.mockClear();
    (inMemoryScreenshots as Map<string, string>).clear(); // Clear the map before each test
    
    (stagehandManager.createStagehandInstance as jest.Mock).mockResolvedValue(mockStagehandInstance);
    (stagehandManager.getStagehandInstance as jest.Mock).mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callScreenshotTool(args: any) {
    return tools.handleToolCall(screenshotToolName, args);
  }

  it('should capture a screenshot, save to file (mocked path), store in memory, and notify', async () => {
    const args = { alias: 'fileScreenshotTest' };
    const result = await callScreenshotTool(args);

    expect(stagehandManager.getStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockPageScreenshot).toHaveBeenCalledWith({
      path: expect.stringContaining(path.join(config.screenshotsDir, 'screenshot-')),
      fullPage: false,
    });

    // Check in-memory storage
    expect(inMemoryScreenshots.size).toBe(1);
    const filename = Array.from(inMemoryScreenshots.keys())[0];
    expect(inMemoryScreenshots.get(filename)).toBe(mockScreenshotBase64);

    // Check notification
    expect(mockGetServerInstance).toHaveBeenCalled();
    expect(mockNotification).toHaveBeenCalledWith({
      method: "notifications/resources/list_changed",
    });
    
    expect(result).toEqual({
      content: [
        { type: "text", text: `Screenshot taken with name: ${filename}` },
        { type: "text", text: `Screenshot saved to: ${path.join(config.screenshotsDir, filename)}` },
        { type: "image", data: mockScreenshotBase64, mimeType: "image/png" },
      ],
      _meta: {},
    });
  });

  it('should return an error if stagehand.page.screenshot throws', async () => {
    const args = { alias: 'fileScreenshotError' };
    const screenshotError = new Error('Failed to save screenshot to file');
    mockPageScreenshot.mockRejectedValueOnce(screenshotError);
    operationLogs.push("Previous log for file screenshot fail");

    const result = await callScreenshotTool(args);

    expect(mockPageScreenshot).toHaveBeenCalled();
    expect(inMemoryScreenshots.size).toBe(0); // Should not store if saving fails
    expect(mockNotification).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [
        { type: "text", text: `Screenshot error: ${screenshotError.message}` },
        { type: "text", text: "Operation logs:\nPrevious log for file screenshot fail" }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should return an error if Stagehand instance is not initialized', async () => {
    const args = {}; // No alias
    (stagehandManager.getStagehandInstance as jest.Mock).mockReturnValue(undefined);
    (stagehandManager.createStagehandInstance as jest.Mock).mockClear();

    const result = await callScreenshotTool(args);

    expect(mockPageScreenshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page." }],
      _meta: {},
      isError: true,
    });
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = {}; // No alias
    (stagehandManager.getStagehandInstance as jest.Mock).mockReturnValueOnce(mockStagehandInstance);
    (stagehandManager.createStagehandInstance as jest.Mock).mockClear();

    await callScreenshotTool(args);
    expect(stagehandManager.getStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(stagehandManager.createStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageScreenshot).toHaveBeenCalled();
  });
  
  it('should create instance if default alias does not exist', async () => {
    const args = {}; // No alias
    (stagehandManager.getStagehandInstance as jest.Mock).mockReturnValueOnce(undefined);

    await callScreenshotTool(args);
    expect(stagehandManager.getStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(stagehandManager.createStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageScreenshot).toHaveBeenCalled();
  });
});