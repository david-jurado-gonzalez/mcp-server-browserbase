import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';

// Mocks setup
const mockPageScreenshot = jest.fn();

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    screenshot: mockPageScreenshot,
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
  // getServerInstance: jest.fn().mockReturnValue({ notification: jest.fn() }), // Not used by stagehand_capture_screenshot directly
}));

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
        // screenshotsDir: '/mocked/screenshots/dir', // Not used by stagehand_capture_screenshot as it returns base64
    },
}));

describe('Tool: stagehand_capture_screenshot', () => {
  const captureScreenshotToolName = 'stagehand_capture_screenshot';
  const mockScreenshotBuffer = Buffer.from('mock capture screenshot');
  const mockScreenshotBase64 = mockScreenshotBuffer.toString('base64');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageScreenshot.mockClear().mockResolvedValue(mockScreenshotBuffer); // Default success
    
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callCaptureScreenshotTool(args: any) {
    return tools.handleToolCall(captureScreenshotToolName, args);
  }

  it('should capture full viewport screenshot and return base64', async () => {
    const args = { alias: 'captureFull' };
    const result = await callCaptureScreenshotTool(args);

    expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
    expect(mockPageScreenshot).toHaveBeenCalledWith({ fullPage: false }); // Default is viewport
    expect(result).toEqual({
      content: [
        { type: "text", text: "Screenshot captured successfully." },
        { type: "image", data: mockScreenshotBase64, mimeType: "image/png" },
      ],
      _meta: {},
    });
  });

  it('should capture a clipped region and return base64', async () => {
    const clipArgs = { x: 10, y: 20, width: 100, height: 150 };
    const args = { clip: clipArgs, alias: 'captureClip' };
    const result = await callCaptureScreenshotTool(args);

    expect(mockPageScreenshot).toHaveBeenCalledWith({ fullPage: false, clip: clipArgs });
    expect(result.content).toContainEqual(
      expect.objectContaining({ type: "image", data: mockScreenshotBase64 })
    );
  });

  it('should return an error if clip object is invalid (missing properties)', async () => {
    const args = { clip: { x: 10, y: 20 }, alias: 'captureInvalidClipMissing' }; // Missing width/height
    const result = await callCaptureScreenshotTool(args);

    expect(mockPageScreenshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Invalid 'clip' object. 'x', 'y', 'width', and 'height' must all be numbers." }],
      _meta: {},
      isError: true,
    });
  });
  
  it('should return an error if clip object properties are not numbers', async () => {
    const args = { clip: { x: 10, y: '20', width: 100, height: 150 }, alias: 'captureInvalidClipType' }; // y is string
    const result = await callCaptureScreenshotTool(args);

    expect(mockPageScreenshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Invalid 'clip' object. 'x', 'y', 'width', and 'height' must all be numbers." }],
      _meta: {},
      isError: true,
    });
  });


  it('should return an error if stagehand.page.screenshot throws', async () => {
    const args = { alias: 'captureError' };
    const screenshotError = new Error('Failed to take screenshot');
    mockPageScreenshot.mockRejectedValueOnce(screenshotError);
    operationLogs.push("Previous log for screenshot fail");

    const result = await callCaptureScreenshotTool(args);

    expect(mockPageScreenshot).toHaveBeenCalled();
    expect(result).toEqual({
      content: [
        { type: "text", text: `Screenshot capture error: ${screenshotError.message}` },
        { type: "text", text: "Operation logs:\nPrevious log for screenshot fail" }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should auto-create Stagehand when no instance exists', async () => {
    const args = {};
    mockGetStagehandInstance.mockReturnValue(undefined);
    mockCreateStagehandInstance.mockClear();
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);

    const result = await callCaptureScreenshotTool(args);

    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageScreenshot).toHaveBeenCalledWith({ fullPage: false });
    expect(result.isError).not.toBe(true);
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = {}; // No alias
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callCaptureScreenshotTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageScreenshot).toHaveBeenCalledWith({ fullPage: false });
  });
  
});