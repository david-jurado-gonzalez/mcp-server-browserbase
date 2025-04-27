// cd /c/Users/David/Documents/MCP/mcp-server-browserbase/stagehand-mcp && npm run build

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Remove non-exported types
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";
import { TOOLS, handleToolCall } from "./tools.js";
import config from "./config.js";
import {
  log,
  logRequest,
  logResponse,
  setServerInstance,
  ensureLogDirectory,
  registerExitHandlers,
  scheduleLogRotation,
  setupLogRotation,
} from "./logging.js";
import { PROMPTS, getPrompt } from "./prompts.js";
import {
  listResources,
  listResourceTemplates,
  readResource,
} from "./resources.js";

// Remove type alias as types are not exported
// type ToolHandlerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

async function main() {
  // Setup logging first
  ensureLogDirectory();
  setupLogRotation(); // Initial rotation check
  registerExitHandlers(); // Register handlers for graceful exit
  scheduleLogRotation(); // Schedule periodic rotation

  log("Starting Stagehand MCP Server...", "info");

  // Inicializar Stagehand
  let stagehand: Stagehand;
  try {
    stagehand = new Stagehand(config.stagehand);
    await stagehand.init();
    log("Stagehand initialized successfully.", "info");
  } catch (error) {
     const errorMsg = error instanceof Error ? error.message : String(error);
     log(`Failed to initialize Stagehand: ${errorMsg}`, "error");
     console.error(`Failed to initialize Stagehand: ${errorMsg}`);
     process.exit(1); // Exit if Stagehand fails to init
  }


  try {
    // Crear el servidor MCP
    const server = new McpServer({
      name: "Stagehand MCP",
      version: "1.0.0"
    });

    // Pass server instance to logging module
    setServerInstance(server);

    // --- Registrar Herramientas de Stagehand ---
    log("Registering Stagehand tools...", "info");
    // Remove type annotation for extra
    server.tool("stagehand_navigate", { url: z.string() },
      async (args, extra) => handleToolCall("stagehand_navigate", args, stagehand)
    );

    server.tool("stagehand_act", {
      action: z.string(),
      variables: z.record(z.string()).optional()
    }, async (args, extra) => handleToolCall("stagehand_act", args, stagehand));

    server.tool("stagehand_extract", {},
      async (args, extra) => handleToolCall("stagehand_extract", args, stagehand)
    );

    server.tool("stagehand_observe", { instruction: z.string() },
      async (args, extra) => handleToolCall("stagehand_observe", args, stagehand)
    );

    server.tool("screenshot", {},
      async (args, extra) => handleToolCall("screenshot", args, stagehand)
    );
    log("Stagehand tools registered.", "info");

    // --- Registrar Métodos Estándar MCP como Herramientas ---
    log("Registering standard MCP methods as tools...", "info");

    // mcp_list_tools
    server.tool("mcp_list_tools", {}, async (args, extra) => {
      logRequest("mcp_list_tools", args);
      try {
        const result = { tools: TOOLS };
        logResponse("mcp_list_tools", result);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_list_tools: ${errorMsg}`, "error");
        throw new Error(`Internal error handling mcp_list_tools: ${errorMsg}`);
      }
    });

    // mcp_list_resources
    server.tool("mcp_list_resources", {}, async (args, extra) => {
      logRequest("mcp_list_resources", args);
      try {
        const result = listResources();
        logResponse("mcp_list_resources", result);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_list_resources: ${errorMsg}`, "error");
        throw new Error(`Internal error handling mcp_list_resources: ${errorMsg}`);
      }
    });

    // mcp_list_resource_templates
    server.tool("mcp_list_resource_templates", {}, async (args, extra) => {
      logRequest("mcp_list_resource_templates", args);
      try {
        const result = listResourceTemplates();
        logResponse("mcp_list_resource_templates", result);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_list_resource_templates: ${errorMsg}`, "error");
        throw new Error(`Internal error handling mcp_list_resource_templates: ${errorMsg}`);
      }
    });

    // mcp_read_resource
    server.tool("mcp_read_resource", { uri: z.string() }, async (args, extra) => {
      logRequest("mcp_read_resource", args);
      try {
        const result = readResource(args.uri);
        logResponse("mcp_read_resource", result);
        // Revert to returning JSON string as ReadResourceResult ({contents: ...})
        // does not match expected {content: ...}
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_read_resource for URI ${args.uri}: ${errorMsg}`, "error");
        throw new Error(`Error reading resource ${args.uri}: ${errorMsg}`);
      }
    });

    // mcp_list_prompts
    server.tool("mcp_list_prompts", {}, async (args, extra) => {
      logRequest("mcp_list_prompts", args);
      try {
        const result = { prompts: PROMPTS };
        logResponse("mcp_list_prompts", result);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_list_prompts: ${errorMsg}`, "error");
        throw new Error(`Internal error handling mcp_list_prompts: ${errorMsg}`);
      }
    });

    // mcp_get_prompt
    server.tool("mcp_get_prompt", { name: z.string() }, async (args, extra) => {
      logRequest("mcp_get_prompt", args);
      try {
        const result = getPrompt(args.name);
        logResponse("mcp_get_prompt", result);
        // Format result into expected { content: [...] } structure
        const responseText = `Description: ${result.description}\n\nMessages:\n${JSON.stringify(result.messages, null, 2)}`;
        return { content: [{ type: "text", text: responseText }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error in mcp_get_prompt for name ${args.name}: ${errorMsg}`, "error");
        throw new Error(`Error getting prompt ${args.name}: ${errorMsg}`);
      }
    });
    log("Standard MCP methods registered.", "info");


    // Configurar el cierre limpio
    process.on("SIGINT", async () => {
      log("Received SIGINT. Closing Stagehand and exiting.", "info");
      await stagehand.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log("Received SIGTERM. Closing Stagehand and exiting.", "info");
      await stagehand.close();
      process.exit(0); // Use 0 for graceful exit on SIGTERM too, unless specific code needed
    });

    // Conectar e iniciar el servidor
    log("Connecting transport and starting server...", "info");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    log("🚀 Servidor MCP de Stagehand iniciado y escuchando.", "info");

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Error during server setup or connection: ${errorMsg}`, "error");
    console.error("Error during server setup or connection:", error);
    // Attempt to close stagehand even if server setup failed after its init
    if (stagehand) {
        await stagehand.close().catch(closeErr => console.error("Error closing stagehand during shutdown:", closeErr));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  log(`Unhandled error in main function: ${errorMsg}`, "error");
  console.error("Unhandled error in main function:", error);
  process.exit(1);
});