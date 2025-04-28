// cd /c/Users/David/Documents/MCP/mcp-server-browserbase/stagehand-mcp && npm run build

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { closeStagehand } from "./stagehandManager.js";
import {
  log,
  ensureLogDirectory,
  registerExitHandlers,
  scheduleLogRotation,
  setupLogRotation,
  setServerReadyForLogging,
} from "./logging.js";

async function main() {
  // Setup logging first
  ensureLogDirectory();
  setupLogRotation(); // Initial rotation check
  registerExitHandlers(); // Register handlers for graceful exit
  scheduleLogRotation(); // Schedule periodic rotation

  log("Starting Stagehand MCP Server...", "info");

  try {
    // Crear el servidor MCP usando la función del módulo server.ts
    const server = createServer();

    // Pasar la instancia de Stagehand al módulo server.ts

    // Las herramientas y handlers estándar ahora se registran dentro de createServer en server.ts

    // Configurar el cierre limpio (ya estaba, mantener)
    process.on("SIGINT", async () => {
      log("Received SIGINT. Closing Stagehand and exiting.", "info");
      // await stagehand.close(); // Will be handled by stagehandManager
      await closeStagehand();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log("Received SIGTERM. Closing Stagehand and exiting.", "info");
      // await stagehand.close(); // Will be handled by stagehandManager
      await closeStagehand();
      process.exit(0);
    });

    // Conectar e iniciar el servidor
    log("Connecting transport and starting server...", "info");
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Set the flag indicating the server is ready for logging messages to client
    setServerReadyForLogging();

    log("🚀 Servidor MCP de Stagehand iniciado y escuchando.", "info");

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Error during server setup or connection: ${errorMsg}`, "error");
    console.error("Error during server setup or connection:", error);
    await closeStagehand();
    process.exit(1);
  }
}

main().catch((error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  log(`Unhandled error in main function: ${errorMsg}`, "error");
  console.error("Unhandled error in main function:", error);
  process.exit(1);
});