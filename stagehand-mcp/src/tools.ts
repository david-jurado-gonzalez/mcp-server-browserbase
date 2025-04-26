import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import config from "./config.js";

// Define las herramientas de Stagehand
export const TOOLS: Tool[] = [
  {
    name: "stagehand_navigate",
    description:
      "Navega a una URL en el navegador. Usa esta herramienta solo con URLs de las que estés seguro que funcionarán y se mantendrán actualizadas. De lo contrario, usa https://google.com como punto de partida.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "La URL a la que navegar" },
      },
      required: ["url"],
    },
  },
  {
    name: "stagehand_act",
    description: `Realiza una acción sobre un elemento de la página web. Las acciones 'act' deben ser lo más atómicas y 
      específicas posible, por ejemplo, "Haz clic en el botón de iniciar sesión" o "Escribe 'hola' en el campo de búsqueda". 
      EVITA acciones que impliquen más de un paso, por ejemplo, "Pídeme una pizza" o "Envía un correo electrónico a Paul 
      pidiéndole que me llame". La instrucción debe ser tan específica como sea posible, y tener una fuerte correlación con el texto de la página. Si no estás seguro, usa 'observe' antes de usar 'act'.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: `La acción a realizar. Debe ser lo más atómica y específica posible, 
          por ejemplo, 'Haz clic en el botón de iniciar sesión' o 'Escribe 'hola' en el campo de búsqueda'. EVITA acciones que impliquen más de un 
          paso, por ejemplo, 'Pídeme una pizza' o 'Envía un correo electrónico a Paul pidiéndole que me llame'. La instrucción debe ser tan específica como sea posible, 
          y tener una fuerte correlación con el texto de la página. Si no estás seguro, usa 'observe' antes de usar 'act'.`,
        },
        variables: {
          type: "object",
          additionalProperties: true,
          description: `Variables usadas en la plantilla de acción. SOLO usa variables si estás tratando 
            con datos sensibles o contenido dinámico. Por ejemplo, si estás iniciando sesión en un sitio web, 
            puedes usar una variable para la contraseña. Al usar variables, DEBES tener la clave de la variable
            en la plantilla de acción. Por ejemplo: {"action": "Fill in the password", "variables": {"password": "123456"}}`,
        },
      },
      required: ["action"],
    },
  },
  {
    name: "stagehand_extract",
    description: `Extrae todo el texto de la página actual.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "stagehand_observe",
    description:
      "Observa elementos en la página web. Usa esta herramienta para observar elementos que podrás usar más tarde en una acción. Usa 'observe' en lugar de 'extract' cuando trates con elementos accionables (interactuables) en lugar de texto. La mayoría de las veces, querrás usar 'extract' en lugar de 'observe' cuando se trate de scraping o extracción de texto estructurado.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "Instrucción para la observación (por ejemplo, 'encuentra el botón de inicio de sesión'). Esta instrucción debe ser extremadamente específica.",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "screenshot",
    description:
      "Toma una captura de pantalla de la página actual. Usa esta herramienta para saber dónde te encuentras en la página cuando controlas el navegador con Stagehand. Usa esta herramienta solo cuando las otras herramientas no sean suficientes para obtener la información que necesitas.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

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