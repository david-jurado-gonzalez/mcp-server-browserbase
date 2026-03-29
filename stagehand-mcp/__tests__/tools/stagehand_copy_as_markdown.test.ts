import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';
import TurndownService from 'turndown';

// Mocks setup
const mockPageEvaluate = jest.fn();

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    evaluate: mockPageEvaluate,
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

// Mock TurndownService
const mockTurndown = jest.fn();
jest.mock('turndown', () => {
  return jest.fn().mockImplementation(() => {
    return {
      turndown: (...args: any[]) => mockTurndown(...args),
    };
  });
});


describe('Tool: stagehand_copy_as_markdown', () => {
  const copyMarkdownToolName = 'stagehand_copy_as_markdown';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageEvaluate.mockClear();
    mockTurndown.mockClear().mockImplementation((html) => `Markdown: ${html}`); // Default mock
    
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callCopyMarkdownTool(args: any) {
    return tools.handleToolCall(copyMarkdownToolName, args);
  }

  it('should copy selection as markdown', async () => {
    const args = { sourceType: 'selection', alias: 'copyMdSelection' };
    const mockSelectedHtml = "<p>Selected <b>text</b></p>";
    mockPageEvaluate.mockResolvedValueOnce(mockSelectedHtml); // For window.getSelection()
    mockTurndown.mockReturnValueOnce("Markdown: Selected **text**");

    const result = await callCopyMarkdownTool(args);

    expect(mockPageEvaluate).toHaveBeenCalledTimes(1);
    expect(mockTurndown).toHaveBeenCalledWith(mockSelectedHtml);
    expect(result).toEqual({
      content: [{ type: "text", text: "Markdown: Selected **text**" }],
      _meta: {},
    });
  });

  it('should copy visible page as markdown', async () => {
    const args = { sourceType: 'visiblePage', alias: 'copyMdVisible' };
    const mockBodyHtml = "<body>Visible page content</body>";
    mockPageEvaluate.mockResolvedValueOnce(mockBodyHtml); // For document.body.outerHTML
    mockTurndown.mockReturnValueOnce("Markdown: Visible page content");


    const result = await callCopyMarkdownTool(args);

    expect(mockPageEvaluate).toHaveBeenCalledTimes(1);
    expect(mockTurndown).toHaveBeenCalledWith(mockBodyHtml);
    expect(result.content[0].text).toBe("Markdown: Visible page content");
  });

  it('should copy element by selector as markdown', async () => {
    const selector = "#myElement";
    const args = { sourceType: 'element', selector, alias: 'copyMdElement' };
    const mockElementHtml = "<div>Element content</div>";
    mockPageEvaluate.mockResolvedValueOnce(mockElementHtml); // For document.querySelector().outerHTML
    mockTurndown.mockReturnValueOnce("Markdown: Element content");

    const result = await callCopyMarkdownTool(args);

    expect(mockPageEvaluate).toHaveBeenCalledWith(expect.any(Function), selector);
    expect(mockTurndown).toHaveBeenCalledWith(mockElementHtml);
    expect(result.content[0].text).toBe("Markdown: Element content");
  });

  it('should return an error if sourceType is "element" but selector is missing', async () => {
    const args = { sourceType: 'element', alias: 'copyMdNoSelector' }; // Missing selector
    const result = await callCopyMarkdownTool(args);

    expect(mockPageEvaluate).not.toHaveBeenCalled();
    expect(mockTurndown).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Missing required argument 'selector' when 'sourceType' is 'element'." }],
      _meta: {},
      isError: true,
    });
  });
  
  it('should return an error if sourceType is invalid', async () => {
    const args = { sourceType: 'invalidType', alias: 'copyMdInvalidType' };
    const result = await callCopyMarkdownTool(args);

    expect(mockPageEvaluate).not.toHaveBeenCalled();
    expect(mockTurndown).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Invalid sourceType: invalidType" }],
      _meta: {},
      isError: true,
    });
  });


  it('should handle empty HTML content gracefully', async () => {
    const args = { sourceType: 'selection', alias: 'copyMdEmptyHtml' };
    mockPageEvaluate.mockResolvedValueOnce(""); // Simulate empty selection

    const result = await callCopyMarkdownTool(args);

    expect(mockTurndown).not.toHaveBeenCalled(); // Turndown shouldn't be called if HTML is empty
    expect(result).toEqual({
      content: [{ type: "text", text: "No HTML content found to convert." }],
      _meta: {},
    });
  });

  it('should return an error if page.evaluate throws', async () => {
    const args = { sourceType: 'visiblePage', alias: 'copyMdEvalError' };
    const evalError = new Error('Failed to evaluate script');
    mockPageEvaluate.mockRejectedValueOnce(evalError);
    operationLogs.push("Previous log for eval error");

    const result = await callCopyMarkdownTool(args);

    expect(mockTurndown).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [
        { type: "text", text: `Copy as Markdown error: ${evalError.message}` },
        { type: "text", text: "Operation logs:\nPrevious log for eval error" }
      ],
      _meta: {},
      isError: true,
    });
  });

  it('should auto-create Stagehand when no instance exists', async () => {
    const args = { sourceType: 'selection' };
    mockGetStagehandInstance.mockReturnValue(undefined);
    mockCreateStagehandInstance.mockClear();
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockPageEvaluate.mockResolvedValueOnce('<div>sel</div>');

    const result = await callCopyMarkdownTool(args);

    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageEvaluate).toHaveBeenCalled();
    expect(result.isError).not.toBe(true);
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = { sourceType: 'visiblePage' };
    mockPageEvaluate.mockResolvedValueOnce("<body>Default alias content</body>");
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callCopyMarkdownTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageEvaluate).toHaveBeenCalled();
  });
  
});