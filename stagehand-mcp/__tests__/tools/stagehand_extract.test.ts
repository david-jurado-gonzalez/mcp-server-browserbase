import * as stagehandManager from '../../src/stagehandManager.js';
import * as tools from '../../src/tools.js';
import { Stagehand } from '@browserbasehq/stagehand';
import { log, operationLogs } from '../../src/logging.js';
import { Ajv } from 'ajv'; // Imported for schema validation in the tool

// Mocks setup
const mockPageExtract = jest.fn();
const mockPageEvaluate = jest.fn(); // For fallback behavior

const mockStagehandInstance = {
  init: jest.fn().mockResolvedValue(undefined),
  page: {
    extract: mockPageExtract,
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

// Mock Ajv if its methods are called directly in tests, though usually we test its effect via the tool
// jest.mock('ajv');

jest.mock('../../src/config.js', () => ({
    __esModule: true,
    default: {
        stagehand: { apiKey: 'test-api-key' },
    },
}));

describe('Tool: stagehand_extract', () => {
  const extractToolName = 'stagehand_extract';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPageExtract.mockClear().mockResolvedValue({ data: 'Extracted text' }); // Default success
    mockPageEvaluate.mockClear().mockResolvedValue('Fallback body text'); // Default for fallback
    mockCreateStagehandInstance.mockResolvedValue(mockStagehandInstance);
    mockGetStagehandInstance.mockReturnValue(mockStagehandInstance);
    (operationLogs as string[]).length = 0;
  });

  async function callExtractTool(args: any) {
    return tools.handleToolCall(extractToolName, args);
  }

  describe('Extraction with Instruction and/or Schema', () => {
    it('should extract with a valid instruction', async () => {
      const args = { instruction: 'Extract the product title', alias: 'extractInst1' };
      const mockExtractedData = { title: 'Awesome Product' };
      mockPageExtract.mockResolvedValueOnce(mockExtractedData);

      const result = await callExtractTool(args);

      expect(mockGetStagehandInstance).toHaveBeenCalledWith(args.alias);
      expect(mockPageExtract).toHaveBeenCalledWith({ instruction: args.instruction, schema: undefined });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockExtractedData, null, 2) }],
        _meta: {},
      });
    });

    it('should extract with a valid JSON schema string', async () => {
      const schemaObj = { type: "object", properties: { price: { type: "number" } } };
      const args = { schema: JSON.stringify(schemaObj), alias: 'extractSchema1' };
      const mockExtractedData = { price: 99.99 };
      mockPageExtract.mockResolvedValueOnce(mockExtractedData);

      const result = await callExtractTool(args);

      expect(mockPageExtract).toHaveBeenCalledWith({ instruction: undefined, schema: schemaObj });
      expect(result.content[0].text).toEqual(JSON.stringify(mockExtractedData, null, 2));
    });

    it('should extract with both instruction and schema', async () => {
      const schemaObj = { type: "object", properties: { name: { type: "string" } } };
      const args = { instruction: 'Get user name', schema: JSON.stringify(schemaObj), alias: 'extractBoth1' };
      const mockExtractedData = { name: 'John Doe' };
      mockPageExtract.mockResolvedValueOnce(mockExtractedData);

      const result = await callExtractTool(args);

      expect(mockPageExtract).toHaveBeenCalledWith({ instruction: args.instruction, schema: schemaObj });
      expect(result.content[0].text).toEqual(JSON.stringify(mockExtractedData, null, 2));
    });

    it('should return an error for an invalid JSON schema string', async () => {
      const args = { schema: '{"type": "object", "properties": {price: {"type": "number}}}', alias: 'extractInvalidSchema' }; // Malformed JSON
      
      // No need to mock page.extract as it shouldn't be called if schema parsing fails.
      // The error comes from JSON.parse or Ajv within the tool.
      const result = await callExtractTool(args);

      expect(mockPageExtract).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Failed to process schema string|Invalid JSON Schema/i);
    });
    
    it('should return an error for a schema that is not a valid JSON Schema object', async () => {
      const args = { schema: JSON.stringify({ type: "invalid_type" }), alias: 'extractBadSchemaContent' };
      // This error would come from Ajv validation within the tool
      const result = await callExtractTool(args);

      expect(mockPageExtract).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Invalid JSON Schema/i);
    });


    it('should handle extraction returning no content (null/undefined)', async () => {
      const args = { instruction: 'Extract non-existent data' };
      mockPageExtract.mockResolvedValueOnce(null);

      const result = await callExtractTool(args);
      expect(mockPageExtract).toHaveBeenCalledWith({ instruction: args.instruction, schema: undefined });
      expect(result).toEqual({
        content: [{ type: "text", text: "Extraction returned no content." }],
        _meta: {},
      });
    });
  });

  describe('Fallback Extraction (No Instruction/Schema)', () => {
    it('should extract all body text if no instruction or schema is provided', async () => {
      const args = { alias: 'extractFallback1' };
      const mockBodyText = "Line 1\nLine 2 with {css-like}\n@keyframes anim\n.class { prop: val; }\ncolor: blue;";
      mockPageEvaluate.mockResolvedValueOnce(mockBodyText);

      const result = await callExtractTool(args);

      expect(mockPageEvaluate).toHaveBeenCalledWith(expect.any(Function)); // Checks if a function was passed
      expect(mockPageExtract).not.toHaveBeenCalled();
      // The result will be filtered text
      expect(result.content[0].text).toEqual("Line 1"); // Based on current filtering logic in tools.ts
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should return an error if stagehand.page.extract throws', async () => {
      const args = { instruction: 'Extract causing error' };
      const extractError = new Error('Underlying extract failed');
      mockPageExtract.mockRejectedValueOnce(extractError);
      operationLogs.push("Previous log for extract fail");

      const result = await callExtractTool(args);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Content extraction error: ${extractError.message}`);
      expect(result.content[1].text).toContain("Operation logs:\nPrevious log for extract fail");
    });

    it('should return an error if Stagehand instance is not initialized', async () => {
      const args = { instruction: 'Extract without instance' };
      mockGetStagehandInstance.mockReturnValue(undefined);
      mockCreateStagehandInstance.mockClear();


      const result = await callExtractTool(args);
      expect(mockPageExtract).not.toHaveBeenCalled();
      expect(mockPageEvaluate).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: "text", text: "Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page." }],
        _meta: {},
        isError: true,
      });
    });
  });
  
  // Test default alias behavior
  it('should use default alias if none is provided', async () => {
    const args = { instruction: 'Extract with default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(mockStagehandInstance);
    mockCreateStagehandInstance.mockClear();

    await callExtractTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).not.toHaveBeenCalled();
    expect(mockPageExtract).toHaveBeenCalledWith({ instruction: args.instruction, schema: undefined });
  });
  
  it.skip('TODO: revisit whether non-navigate tools should auto-create a default Stagehand instance', async () => {
    const args = { instruction: 'Extract with new default alias' };
    mockGetStagehandInstance.mockReturnValueOnce(undefined);

    await callExtractTool(args);
    expect(mockGetStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockCreateStagehandInstance).toHaveBeenCalledWith(undefined);
    expect(mockPageExtract).toHaveBeenCalledWith({ instruction: args.instruction, schema: undefined });
  });
});