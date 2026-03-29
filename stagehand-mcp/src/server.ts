/**
 * Servidor MCP (SDK `Server`): registra handlers para tools, resources y prompts.
 *
 * **CallTool** valida el nombre contra {@link TOOLS}, vacía {@link operationLogs} por operación y delega en
 * {@link handleToolCall}. La respuesta se serializa vía {@link sanitizeMessage} para evitar JSON no válido
 * en el transporte.
 *
 * **Errores JSON-RPC:** códigos `-32601` (tool inválido), `-32603` (fallo interno).
 */
// Import base Server class
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  // Import schemas for standard requests
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ReadResourceRequestSchema,
  // Import types for request parameters if needed
  ListToolsRequest,
  CallToolRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ReadResourceRequest,
  ListPromptsRequest,
  GetPromptRequest,
} from "@modelcontextprotocol/sdk/types.js";
// Import config, tools, utils, logging, prompts, resources
import { TOOLS, handleToolCall } from "./tools.js";
import { sanitizeMessage } from "./utils.js";
import {
  log,
  logRequest,
  logResponse,
  operationLogs,
  setServerInstance,
  // ensureLogDirectory, // Handled in index.ts startup
  // formatLogResponse, // Used in logging.ts
} from "./logging.js";
import { PROMPTS, getPrompt } from "./prompts.js";
import {
  listResources,
  listResourceTemplates,
  readResource,
  // screenshots // Access directly if needed in handlers
} from "./resources.js";

// Global state for Stagehand instance (will be initialized in index.ts and passed)

/**
 * Creates and configures the Server instance with standard MCP request handlers.
 * Using the base Server class which supports setRequestHandler.
 * @returns The configured Server instance.
 */
export function createServer(): Server { // Changed return type to Server
  // Create the Server instance
  const server = new Server( // Use base Server class
    {
      name: "Stagehand MCP", // Defined directly
      version: "1.0.0",    // Defined directly
    },
    // Include capabilities object as in the original Server usage
    {
      capabilities: {
        resources: {},
        tools: {},
        logging: {},
        prompts: {},
      },
    }
  );

  // Pass server instance to logging module
  // No casting needed if setServerInstance expects Server type (which it should now)
  setServerInstance(server); // Pass the Server instance

  // Removed: log("MCP Server instance created.", "info"); // Moved to index.ts after connection

  // --- Setup Standard MCP Request Handlers using setRequestHandler ---
  // Now using setRequestHandler on the base Server instance

  // ListTools Handler
  server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
    try {
      logRequest("ListTools", request.params);
      const response: any = { tools: TOOLS }; // Use 'any' or infer type
      const sanitizedResponse = sanitizeMessage(response);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("ListTools", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in ListTools handler: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling ListTools: ${errorMsg}`,
        },
      };
    }
  });

  // CallTool Handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    try {
      logRequest("CallTool", request.params);
      operationLogs.length = 0; // Clear logs for new operation

      // La lógica de inicialización y verificación de Stagehand ahora está en handleToolCall
      if (
        !request.params?.name ||
        !TOOLS.find((t) => t.name === request.params.name)
      ) {
        const errorMsg = `Invalid tool name: ${request.params?.name}`;
        log(errorMsg, "error");
        // Return error in standard JSON-RPC format for CallTool
        return {
            error: {
                code: -32601, // Method not found (or invalid tool name)
                message: errorMsg,
            },
        };
      }

      // Call the tool handler (ya no pasamos stagehandInstance)
      const result = await handleToolCall(
        request.params.name,
        request.params.arguments ?? {}
      );

      // Sanitization might be redundant, but keeping for consistency with original
      const sanitizedResult = sanitizeMessage(result);
      const parsedResult = JSON.parse(sanitizedResult);
      logResponse("CallTool", parsedResult);
      return parsedResult; // Return the result of the tool call
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in CallTool handler: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling CallTool: ${errorMsg}`,
        },
      };
    }
  });

  // ListResources Handler
  server.setRequestHandler(ListResourcesRequestSchema, async (request: ListResourcesRequest) => {
    try {
      logRequest("ListResources", request.params);
      const response = listResources(); // Use the imported function
      const sanitizedResponse = sanitizeMessage(response);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("ListResources", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in ListResources handler: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling ListResources: ${errorMsg}`,
        },
      };
    }
  });

  // ListResourceTemplates Handler
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request: ListResourceTemplatesRequest) => {
    try {
      logRequest("ListResourceTemplates", request.params);
      const response = listResourceTemplates(); // Use the imported function
      const sanitizedResponse = sanitizeMessage(response);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("ListResourceTemplates", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in ListResourceTemplates handler: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling ListResourceTemplates: ${errorMsg}`,
        },
      };
    }
  });

  // ReadResource Handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    try {
      logRequest("ReadResource", request.params);
      // Ensure uri is a string before passing to readResource
      const uri = typeof request.params?.uri === 'string' ? request.params.uri : String(request.params?.uri);
      const response = readResource(uri); // Use the imported function
      const sanitizedResponse = sanitizeMessage(response);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("ReadResource", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in ReadResource handler for URI ${request.params?.uri}: ${errorMsg}`, "error");
      // Return error in standard JSON-RPC format for ReadResource
      return {
          error: {
              code: -32603, // Internal error
              message: `Error reading resource ${request.params?.uri}: ${errorMsg}`,
          },
      };
    }
  });

  // ListPrompts Handler
  server.setRequestHandler(ListPromptsRequestSchema, async (request: ListPromptsRequest) => {
    try {
      logRequest("ListPrompts", request.params);
      const response: any = { prompts: PROMPTS }; // Use 'any' or infer type
      const sanitizedResponse = sanitizeMessage(response);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("ListPrompts", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in ListPrompts handler: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling ListPrompts: ${errorMsg}`,
        },
      };
    }
  });

  // GetPrompt Handler
  server.setRequestHandler(GetPromptRequestSchema, async (request: GetPromptRequest) => {
    try {
      logRequest("GetPrompt", request.params);
      // Ensure prompt name is a string
      const promptName = typeof request.params?.name === 'string' ? request.params.name : String(request.params?.name || "");
      const prompt = getPrompt(promptName); // Use the imported function
      const sanitizedResponse = sanitizeMessage(prompt);
      const parsedResponse = JSON.parse(sanitizedResponse);
      logResponse("GetPrompt", parsedResponse);
      return parsedResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error in GetPrompt handler for name ${request.params?.name}: ${errorMsg}`, "error");
      return {
        error: {
          code: -32603,
          message: `Internal error handling GetPrompt: ${errorMsg}`,
        },
      };
    }
  });


  log("Standard MCP request handlers set up.", "info");

  return server;
}

// Note: Stagehand initialization and server connection/startup will remain in index.ts
// index.ts will call createServer()