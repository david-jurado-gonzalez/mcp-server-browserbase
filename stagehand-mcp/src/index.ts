import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";
import { handleToolCall } from "./tools.js";
import config from "./config.js";

async function main() {
  // Asegurar que los directorios necesarios existen
  await config.ensureDirectories();

  // Inicializar Stagehand
  const stagehand = new Stagehand(config.stagehand);
  await stagehand.init();

  try {
    // Crear el servidor MCP
    const server = new McpServer({
      name: "Stagehand MCP",
      version: "1.0.0"
    });

    // Registrar las herramientas
    server.tool("stagehand_navigate", { url: z.string() }, 
      async (args) => handleToolCall("stagehand_navigate", args, stagehand)
    );

    server.tool("stagehand_act", { 
      action: z.string(),
      variables: z.record(z.string()).optional()
    }, async (args) => handleToolCall("stagehand_act", args, stagehand));

    server.tool("stagehand_extract", {}, 
      async (args) => handleToolCall("stagehand_extract", args, stagehand)
    );

    server.tool("stagehand_observe", { instruction: z.string() },
      async (args) => handleToolCall("stagehand_observe", args, stagehand)
    );

    server.tool("screenshot", {},
      async (args) => handleToolCall("screenshot", args, stagehand)
    );

    // Configurar el cierre limpio
    process.on("SIGINT", async () => {
      await stagehand.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await stagehand.close();
      process.exit(0);
    });

    // Conectar e iniciar el servidor
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.log("🚀 Servidor MCP de Stagehand iniciado");
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    await stagehand.close();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error no manejado:", error);
  process.exit(1);
});