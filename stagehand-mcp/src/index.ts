// cd /c/Users/David/Documents/MCP/mcp-server-browserbase/stagehand-mcp && npm run build

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Stagehand } from "@browserbasehq/stagehand";
import config from "./config.js";
import {
  log,
  ensureLogDirectory,
  registerExitHandlers,
  scheduleLogRotation,
  setupLogRotation,
  setServerReadyForLogging, // Import the new function
} from "./logging.js";
// Import createServer and setStagehandInstance from the new server module
import { createServer, setStagehandInstance } from "./server.js";

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
    // Crear el servidor MCP usando la función del módulo server.ts
    const server = createServer();

    // Pasar la instancia de Stagehand al módulo server.ts
    setStagehandInstance(stagehand);

    // Las herramientas y handlers estándar ahora se registran dentro de createServer en server.ts

    // Configurar el cierre limpio (ya estaba, mantener)
    process.on("SIGINT", async () => {
      log("Received SIGINT. Closing Stagehand and exiting.", "info");
      await stagehand.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log("Received SIGTERM. Closing Stagehand and exiting.", "info");
      await stagehand.close();
      process.exit(0);
    });

    // Conectar e iniciar el servidor
    log("Connecting transport and starting server...", "info");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Set the flag indicating the server is ready for logging messages to client
    setServerReadyForLogging();

    // Log server creation AFTER connection is established
    //log("MCP Server instance created.", "info");

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