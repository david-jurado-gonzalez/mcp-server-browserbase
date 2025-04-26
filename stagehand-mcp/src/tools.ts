import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import config from "./config.js";

// Manejar las llamadas a las herramientas
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  stagehand: Stagehand
): Promise<CallToolResult> {
  switch (name) {
    case "stagehand_navigate":
      try {
        await stagehand.page.goto(args.url as string);
        return {
          content: [{ type: "text", text: `Navegando a: ${args.url}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error al navegar: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_act":
      try {
        const action = args.action as string;
        const variables = args.variables as Record<string, string> | undefined;
        
        await stagehand.page.act({
          action,
          variables
        });
        return {
          content: [{ type: "text", text: `Acción realizada: ${action}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error al realizar la acción: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_extract":
      try {
        const bodyText = await stagehand.page.evaluate(
          () => document.body.innerText
        );
        const content = bodyText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => {
            if (!line) return false;
            if (
              (line.includes("{") && line.includes("}")) ||
              line.includes("@keyframes") ||
              line.match(/^\.[a-zA-Z0-9_-]+\s*{/) ||
              line.match(/^[a-zA-Z-]+:[a-zA-Z0-9%\s\(\)\.,-]+;$/)
            ) {
              return false;
            }
            return true;
          })
          .map((line) => {
            return line.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            );
          });

        return {
          content: [{ type: "text", text: content.join("\n") }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error al extraer contenido: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_observe":
      try {
        const observations = await stagehand.page.observe({
          instruction: args.instruction as string,
          returnAction: false,
        });
        return {
          content: [{ type: "text", text: `Observaciones: ${JSON.stringify(observations)}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error al observar: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    case "screenshot":
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `screenshot-${timestamp}.png`;
        const filepath = path.join(config.screenshotsDir, filename);
        
        await stagehand.page.screenshot({
          path: filepath,
          fullPage: false,
        });

        return {
          content: [{ type: "text", text: `Captura de pantalla guardada en: ${filepath}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error al tomar captura de pantalla: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    default:
      return {
        content: [{ type: "text", text: `Herramienta desconocida: ${name}` }],
        _meta: {},
        isError: true
      };
  }
}