/**
 * Punto de entrada del servidor MCP Stagehand (stdio).
 *
 * - Si `STAGEHAND_MCP_UNDER_TEST=1` (Jest lo define en `__tests__/jest.setup.cjs`), **no** se llama a
 *   {@link main} al cargar el módulo: los tests importan {@link main} y la ejecutan a mano.
 * - En `npm start` / producción esa variable no está definida y se arranca el servidor al final de este archivo.
 *
 * No usamos `import.meta.url` para detectar el entrypoint: el código compilado a CJS en tests rompería con `import.meta`.
 */
// cd /c/Users/David/Documents/MCP/mcp-server-browserbase/stagehand-mcp && npm run build

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer as createServerDefault } from "./server.js";
import { closeStagehand } from "./stagehandManager.js";
import {
  log,
  ensureLogDirectory,
  registerExitHandlers,
  scheduleLogRotation,
  setupLogRotation,
  setServerReadyForLogging,
} from "./logging.js";

/** Opciones inyectables en tests (evita `jest.mock` frágil en ESM). */
export type MainRuntimeOptions = {
  /** Sustituye el factory del servidor MCP (p. ej. para forzar fallos). */
  createServer?: () => Server;
};

/**
 * Arranca logging en disco, crea el servidor MCP, conecta stdio y marca listo el canal de logs MCP.
 *
 * @param runtime - Solo en tests: inyecta `createServer` alternativo.
 */
export async function main(runtime?: MainRuntimeOptions): Promise<void> {
  ensureLogDirectory();
  setupLogRotation();
  registerExitHandlers();
  scheduleLogRotation();

  log("Starting Stagehand MCP Server...", "info");

  const createServerFn = runtime?.createServer ?? createServerDefault;

  try {
    const server = createServerFn();

    process.on("SIGINT", async () => {
      log("Received SIGINT. Closing Stagehand and exiting.", "info");
      await closeStagehand();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log("Received SIGTERM. Closing Stagehand and exiting.", "info");
      await closeStagehand();
      process.exit(0);
    });

    log("Connecting transport and starting server...", "info");
    const transport = new StdioServerTransport();
    await server.connect(transport);

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

if (process.env.STAGEHAND_MCP_UNDER_TEST !== "1") {
  void main().catch((error) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Unhandled error in main function: ${errorMsg}`, "error");
    console.error("Unhandled error in main function:", error);
    process.exit(1);
  });
}
