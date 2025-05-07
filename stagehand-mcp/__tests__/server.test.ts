import { createServer } from '../src/server.js';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import * as toolsModule from '../src/tools.js';
import * as utilsModule from '../src/utils.js';
import * as loggingModule from '../src/logging.js';
import * as promptsModule from '../src/prompts.js';
import * as resourcesModule from '../src/resources.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Mock MCP Server
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  // Mock the constructor and its methods
  const mockSetRequestHandler = jest.fn();
  const MockServer = jest.fn().mockImplementation(() => {
    return {
      setRequestHandler: mockSetRequestHandler,
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      sendLoggingMessage: jest.fn(),
      // Add other methods if they are called by createServer or its handlers
    };
  });
  // Store mockSetRequestHandler where it can be accessed in tests
  (MockServer as any).mockSetRequestHandler = mockSetRequestHandler;
  return { Server: MockServer };
});

// Mock local modules
jest.mock('../src/tools.js', () => ({
  TOOLS: [{ name: 'test_tool', description: 'A test tool', arguments: {} }],
  handleToolCall: jest.fn(),
}));

jest.mock('../src/utils.js', () => ({
  sanitizeMessage: jest.fn((msg) => JSON.stringify(msg)), // Simple pass-through stringify
}));

jest.mock('../src/logging.js', () => ({
  log: jest.fn(),
  logRequest: jest.fn(),
  logResponse: jest.fn(),
  operationLogs: [], // Mutable array for testing
  setServerInstance: jest.fn(),
  // formatLogResponse: jest.fn(logs => logs.join('\\n')), // If needed
}));

jest.mock('../src/prompts.js', () => ({
  PROMPTS: [{ name: 'test_prompt', content: 'A test prompt' }],
  getPrompt: jest.fn(),
}));

jest.mock('../src/resources.js', () => ({
  listResources: jest.fn(),
  listResourceTemplates: jest.fn(),
  readResource: jest.fn(),
}));

// Typed access to the mock constructor and its static mock property
const MockedMCPServer = MCPServer as jest.MockedClass<typeof MCPServer> & { mockSetRequestHandler: jest.Mock };


describe('createServer', () => {
  let serverInstance: ReturnType<typeof createServer>;
  // To store the handlers passed to setRequestHandler
  let requestHandlers: Map<any, (request: any) => Promise<any>>;


  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the shared mockSetRequestHandler's call history and implementation for each test
    MockedMCPServer.mockSetRequestHandler.mockReset();

    requestHandlers = new Map();
    // Capture handlers by overriding the mock implementation for setRequestHandler
    MockedMCPServer.mockSetRequestHandler.mockImplementation((schema: any, handler: (request: any) => Promise<any>) => {
        requestHandlers.set(schema, handler);
    });

    // Clear operationLogs before each test
    (loggingModule.operationLogs as string[]).length = 0;

    serverInstance = createServer();
  });

  it('should create an MCP Server instance with correct name and version', () => {
    expect(MockedMCPServer).toHaveBeenCalledTimes(1);
    expect(MockedMCPServer).toHaveBeenCalledWith(
      { name: "Stagehand MCP", version: "1.0.0" },
      { capabilities: { resources: {}, tools: {}, logging: {}, prompts: {} } }
    );
  });

  it('should call setServerInstance from logging module with the created server', () => {
    expect(loggingModule.setServerInstance).toHaveBeenCalledTimes(1);
    expect(loggingModule.setServerInstance).toHaveBeenCalledWith(MockedMCPServer.mock.instances[0]);
  });

  it('should log that standard MCP request handlers are set up', () => {
    // The log call is inside createServer, after all setRequestHandler calls
    expect(loggingModule.log).toHaveBeenCalledWith("Standard MCP request handlers set up.", "info");
  });


  // Test Suite for ListTools Handler
  describe('ListTools Handler', () => {
    let handler: (request: any) => Promise<any>;

    beforeEach(() => {
        handler = requestHandlers.get(ListToolsRequestSchema)!;
        expect(handler).toBeDefined();
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            ListToolsRequestSchema,
            expect.any(Function)
        );
    });

    it('should return the list of tools on success', async () => {
      const request = { params: {} }; // Example request
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("ListTools", request.params);
      expect(toolsModule.TOOLS).toBeDefined();
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith({ tools: toolsModule.TOOLS });
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual({ tools: toolsModule.TOOLS });
    });

    it('should return an error if sanitizeMessage fails', async () => {
      const request = { params: {} };
      const sanitizeError = new Error("Sanitize failed");
      (utilsModule.sanitizeMessage as jest.Mock).mockImplementationOnce(() => { throw sanitizeError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in ListTools handler: ${sanitizeError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling ListTools: ${sanitizeError.message}`),
        },
      });
    });
  });

  // Test Suite for CallTool Handler
  describe('CallTool Handler', () => {
    let handler: (request: any) => Promise<any>;
    const mockToolResult = { success: true, data: "Tool executed" };

    beforeEach(() => {
        handler = requestHandlers.get(CallToolRequestSchema)!;
        expect(handler).toBeDefined();
        (toolsModule.handleToolCall as jest.Mock).mockResolvedValue(mockToolResult);
        (loggingModule.operationLogs as string[]).length = 0; // Ensure clean logs
    });

     it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            CallToolRequestSchema,
            expect.any(Function)
        );
    });

    it('should call the correct tool handler and return its result', async () => {
      const toolName = 'test_tool';
      const toolArgs = { arg1: 'value1' };
      const request = { params: { name: toolName, arguments: toolArgs } };
      
      const response = await handler(request);

      expect(loggingModule.logRequest).toHaveBeenCalledWith("CallTool", request.params);
      expect(loggingModule.operationLogs.length).toBe(0); // Check it was cleared
      expect(toolsModule.handleToolCall).toHaveBeenCalledWith(toolName, toolArgs);
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith(mockToolResult);
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual(mockToolResult);
    });

    it('should return an error if tool name is invalid or not found', async () => {
      const request = { params: { name: 'invalid_tool', arguments: {} } };
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith("Invalid tool name: invalid_tool", "error");
      expect(response).toEqual({
        error: {
          code: -32601,
          message: "Invalid tool name: invalid_tool",
        },
      });
      expect(toolsModule.handleToolCall).not.toHaveBeenCalled();
    });

    it('should return an error if handleToolCall throws an error', async () => {
      const toolName = 'test_tool';
      const toolArgs = {};
      const request = { params: { name: toolName, arguments: toolArgs } };
      const toolError = new Error("Tool execution failed");
      (toolsModule.handleToolCall as jest.Mock).mockRejectedValueOnce(toolError);

      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in CallTool handler: ${toolError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling CallTool: ${toolError.message}`),
        },
      });
    });
  });

  // Test Suite for ListResources Handler
  describe('ListResources Handler', () => {
    let handler: (request: any) => Promise<any>;
    const mockResources = [{ uri: 'res1', name: 'Resource 1' }];

    beforeEach(() => {
        handler = requestHandlers.get(ListResourcesRequestSchema)!;
        expect(handler).toBeDefined();
        (resourcesModule.listResources as jest.Mock).mockReturnValue({ resources: mockResources });
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            ListResourcesRequestSchema,
            expect.any(Function)
        );
    });

    it('should return the list of resources', async () => {
      const request = { params: {} };
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("ListResources", request.params);
      expect(resourcesModule.listResources).toHaveBeenCalled();
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith({ resources: mockResources });
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual({ resources: mockResources });
    });

     it('should return an error if listResources throws', async () => {
      const request = { params: {} };
      const listError = new Error("Failed to list resources");
      (resourcesModule.listResources as jest.Mock).mockImplementationOnce(() => { throw listError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in ListResources handler: ${listError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling ListResources: ${listError.message}`),
        },
      });
    });
  });

  // Test Suite for ListResourceTemplates Handler
  describe('ListResourceTemplates Handler', () => {
    let handler: (request: any) => Promise<any>;
    const mockTemplates = [{ id: 'tpl1', name: 'Template 1' }];

    beforeEach(() => {
        handler = requestHandlers.get(ListResourceTemplatesRequestSchema)!;
        expect(handler).toBeDefined();
        (resourcesModule.listResourceTemplates as jest.Mock).mockReturnValue({ templates: mockTemplates });
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            ListResourceTemplatesRequestSchema,
            expect.any(Function)
        );
    });

    it('should return the list of resource templates', async () => {
      const request = { params: {} };
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("ListResourceTemplates", request.params);
      expect(resourcesModule.listResourceTemplates).toHaveBeenCalled();
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith({ templates: mockTemplates });
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual({ templates: mockTemplates });
    });

    it('should return an error if listResourceTemplates throws', async () => {
      const request = { params: {} };
      const listError = new Error("Failed to list templates");
      (resourcesModule.listResourceTemplates as jest.Mock).mockImplementationOnce(() => { throw listError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in ListResourceTemplates handler: ${listError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling ListResourceTemplates: ${listError.message}`),
        },
      });
    });
  });

  // Test Suite for ReadResource Handler
  describe('ReadResource Handler', () => {
    let handler: (request: any) => Promise<any>;
    const mockResourceContent = { content: "Resource data" };

    beforeEach(() => {
        handler = requestHandlers.get(ReadResourceRequestSchema)!;
        expect(handler).toBeDefined();
        (resourcesModule.readResource as jest.Mock).mockReturnValue(mockResourceContent);
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            ReadResourceRequestSchema,
            expect.any(Function)
        );
    });

    it('should read a resource and return its content', async () => {
      const uri = 'resource://test/uri';
      const request = { params: { uri } };
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("ReadResource", request.params);
      expect(resourcesModule.readResource).toHaveBeenCalledWith(uri);
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith(mockResourceContent);
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual(mockResourceContent);
    });

    it('should return an error if readResource throws', async () => {
      const uri = 'resource://failing/uri';
      const request = { params: { uri } };
      const readError = new Error("Failed to read resource");
      (resourcesModule.readResource as jest.Mock).mockImplementationOnce(() => { throw readError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in ReadResource handler for URI ${uri}: ${readError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Error reading resource ${uri}: ${readError.message}`),
        },
      });
    });
  });

  // Test Suite for ListPrompts Handler
  describe('ListPrompts Handler', () => {
    let handler: (request: any) => Promise<any>;

    beforeEach(() => {
        handler = requestHandlers.get(ListPromptsRequestSchema)!;
        expect(handler).toBeDefined();
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            ListPromptsRequestSchema,
            expect.any(Function)
        );
    });

    it('should return the list of prompts', async () => {
      const request = { params: {} };
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("ListPrompts", request.params);
      expect(promptsModule.PROMPTS).toBeDefined();
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith({ prompts: promptsModule.PROMPTS });
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual({ prompts: promptsModule.PROMPTS });
    });

    it('should return an error if sanitizeMessage fails', async () => {
      const request = { params: {} };
      const sanitizeError = new Error("Sanitize failed for prompts");
      (utilsModule.sanitizeMessage as jest.Mock).mockImplementationOnce(() => { throw sanitizeError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in ListPrompts handler: ${sanitizeError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling ListPrompts: ${sanitizeError.message}`),
        },
      });
    });
  });

  // Test Suite for GetPrompt Handler
  describe('GetPrompt Handler', () => {
    let handler: (request: any) => Promise<any>;
    const mockPromptContent = { name: 'test_prompt', content: "Prompt content here" };

    beforeEach(() => {
        handler = requestHandlers.get(GetPromptRequestSchema)!;
        expect(handler).toBeDefined();
        (promptsModule.getPrompt as jest.Mock).mockReturnValue(mockPromptContent);
    });

    it('should be registered', () => {
        expect(MockedMCPServer.mockSetRequestHandler).toHaveBeenCalledWith(
            GetPromptRequestSchema,
            expect.any(Function)
        );
    });

    it('should get a prompt and return its content', async () => {
      const promptName = 'test_prompt';
      const request = { params: { name: promptName } };
      const response = await handler(request);
      expect(loggingModule.logRequest).toHaveBeenCalledWith("GetPrompt", request.params);
      expect(promptsModule.getPrompt).toHaveBeenCalledWith(promptName);
      expect(utilsModule.sanitizeMessage).toHaveBeenCalledWith(mockPromptContent);
      expect(loggingModule.logResponse).toHaveBeenCalled();
      expect(response).toEqual(mockPromptContent);
    });

    it('should return an error if getPrompt throws', async () => {
      const promptName = 'failing_prompt';
      const request = { params: { name: promptName } };
      const getError = new Error("Failed to get prompt");
      (promptsModule.getPrompt as jest.Mock).mockImplementationOnce(() => { throw getError; });
      const response = await handler(request);
      expect(loggingModule.log).toHaveBeenCalledWith(expect.stringContaining(`Error in GetPrompt handler for name ${promptName}: ${getError.message}`), "error");
      expect(response).toEqual({
        error: {
          code: -32603,
          message: expect.stringContaining(`Internal error handling GetPrompt: ${getError.message}`),
        },
      });
    });
  });
});