import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getServerInstance, operationLogs } from "./logging.js";
import path from "path";
import config from "./config.js";
import { screenshots } from "./resources.js";
import { drawObserveOverlay, clearOverlays } from "./utils.js";
import { getStagehandInstance, initializeStagehand } from "./stagehandManager.js";

// Define the Stagehand tools
export const TOOLS: Tool[] = [
  {
    name: "stagehand_navigate",
    description:
      "Navigate to a URL in the browser. Only use this tool with URLs you're confident will work and stay up to date. Otheriwse use https://www.google.com as the starting point. The first time you access a website do observe `stagehand_observe` if there are popups with options to be clicked before launching actions (i.e.: Accpet cookies, Login screen, Disclaimer...). This can also happen after certain actions such as those that lead to another page.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to" },
      },
      required: ["url"],
    },
  },
  {
    name: "stagehand_act",
    description: `Performs an action on a web page element. Act actions should be as atomic and 
      specific as possible, i.e. "Click the sign in button" or "Type 'hello' into the search input" or
      "Scroll to the bottom of the page" or "Fill in the username field with 'john_doe'" or "Scroll the modal to the next chunk". 
      AVOID actions that are more than one step, i.e. "Order me pizza" or "Send an email to Paul 
      asking him to call me". Only use act when you are sure that the action is going to be successful.
      If you are not sure, observe first to see if the action is going to be successful.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: `The action to perform. Should be as atomic and specific as possible, 
          i.e. 'Click the sign in button' or 'Type 'hello' into the search input'. AVOID actions that are more than one 
          step, i.e. 'Order me pizza' or 'Send an email to Paul asking him to call me'. The instruction should be just as specific as possible, 
          and have a strong correlation to the text on the page. If unsure, use observe before using act."`,
        },
        variables: {
          type: "object",
          additionalProperties: true,
          description: `Variables used in the action template. ONLY use variables if you're dealing 
            with sensitive data or dynamic content. For example, if you're logging in to a website, 
            you can use a variable for the password. When using variables, you MUST have the variable
            key in the action template. For example: {"action": "Fill in the %username% into the username field", "variables": {"username": "dave_jury"}}`,
        },
      },
      required: ["action"],
    },
  },
  {
    name: "stagehand_cachedact",
    description: `Performs a action on a web page element previously observed (cached).`,
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: `References the UI element the cached action will use. For example: "The quickstart link" or "textbox: Username" or "button: Submit" or "link: Sign in".`,
        },
        method: {
          type: "string",
          description: 
            `click: To click on an item.
            type: To type text in an input field.
            hover: To hover over an element.
            scroll: To navigate to an element.
            select: To select an option from a drop-down menu.`,
        },
        selector: {
          type: "string",
          description: `The path returned from an observation. For example: /html/body/div[1]/div[1]/a`,
        },
      },
      required: ["selector", "method", "description"],
    },
  },
  {
    name: "stagehand_extract",
    description: `Extracts information from the current page based on an optional instruction and schema. If no instruction or schema is provided, it extracts all text from the page body.`,
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "An optional instruction describing what to extract (e.g., 'extract the price of the item')."
        },
        schema: {
          type: "string",
          description: "An optional string representing the Zod schema code for the expected output (e.g., 'z.object({ price: z.number() })'). This string will be evaluated as JavaScript code on the server side. WARNING: Evaluating user-provided code is dangerous and requires a secure implementation."
        }
      },
      // instruction and schema are optional
    },
  },
  {
    name: "stagehand_observe",
    description:
      "Observe lets you preview an action before taking it. If you are satisfied with the action preview, you can run it using the cached action with the apropriate selector and description. Use observe instead of extract when dealing with actionable (interactable) elements rather than text. More often than not, you'll want to use extract instead of observe when dealing with scraping or extracting structured text.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "Instruction for observation (e.g., 'Click the quickstart link'). This instruction must be extremely specific.",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "screenshot",
    description:
      "Takes a screenshot of the current page. Use this tool to learn where you are on the page when controlling the browser with Stagehand. Only use this tool when the other tools are not sufficient to get the information you need.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Handle tool calls
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  // Eliminamos el parámetro stagehand ya que lo obtendremos del manager
  // stagehand: Stagehand
): Promise<CallToolResult> {
  let stagehand = getStagehandInstance();

  // Si Stagehand no está inicializado y la herramienta no es stagehand_navigate,
  // informamos al usuario que debe navegar primero.
  if (!stagehand && name !== "stagehand_navigate") {
    return {
      content: [{ type: "text", text: `Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page.` }],
      _meta: {},
      isError: true
    };
  }

  // Si Stagehand no está inicializado y la herramienta es stagehand_navigate, lo inicializamos.
  if (!stagehand && name === "stagehand_navigate") {
    try {
      stagehand = await initializeStagehand();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
       return {
          content: [{ type: "text", text: `Failed to initialize Stagehand: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
    }
  }

  // Si Stagehand se inicializó correctamente (o ya existía), procedemos con la llamada a la herramienta.
  // Si la inicialización falló, el bloque anterior ya habría retornado un error.
  if (!stagehand) {
       return {
          content: [{ type: "text", text: `An unexpected error occurred: Stagehand instance is null after initialization attempt.` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
  }


  switch (name) {
    case "stagehand_navigate":
      try {
        await stagehand.page.goto(args.url as string);
        return {
          content: [{ type: "text", text: `Navigating to: ${args.url}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Navigation error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_act":
      try {
        const action = args.action as string;
        const variables = args.variables as Record<string, string> | undefined;
        
        const result = await stagehand.page.act({
          action,
          variables
        });
        const text = (result.success ? `Success action "${result.action}": ` : `Failure action "${result.action}": `) + result.message;
        return {
          content: [{ type: "text", text}],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Action error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_cachedact":
      try {
        const method = args.method as string;
        //const action = args.action as string;
        const description = args.description as string;
        const selector = args.selector as string;
        await clearOverlays(stagehand.page); // Remove the highlight before acting
        const result = await stagehand.page.act({
          description,
          selector,
          method
        });
        const text = (result.success ? `Success action "${result.action}": ` : `Failure action "${result.action}": `) + result.message;
        return {
          content: [{ type: "text", text}], // `Action performed: ${description} on ${selector}`
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Action error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
      }

    case "stagehand_extract":
      try {
        const instruction = args.instruction as string | undefined;
        const schemaString = args.schema as string | undefined;

        let extractedContent;

        if (instruction || schemaString) {
            let schema = undefined;
            if (schemaString) {
                // WARNING: Evaluating user-provided strings as code is dangerous.
                // A production system requires a secure method to handle schema definitions.
                // This is a simplified example for demonstration.
                // Requires 'import { z } from "zod";' at the top of the file.
                try {
                    // Assuming 'z' is imported and available in the scope for eval.
                    // This is a security risk and should be replaced with a safer parsing mechanism.
                    schema = eval(schemaString);
                } catch (e) {
                    throw new Error(`Failed to evaluate schema string: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            extractedContent = await stagehand.page.extract({
                instruction: instruction,
                schema: schema
            });

            // stagehand.page.extract returns an object or null/undefined.
            // We should return this as JSON or a string representation.
            // If it's an object, stringify it. If it's null/undefined, return an empty string or a message.
            const content = extractedContent !== undefined && extractedContent !== null
                ? JSON.stringify(extractedContent, null, 2)
                : "Extraction returned no content.";

             return {
               content: [{ type: "text", text: content }],
               _meta: {}
             };

        } else {
            // Fallback to old behavior if no instruction or schema is provided
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
                  line.includes("@keyframes") || // Remove CSS animations
                  line.match(/^\.[a-zA-Z0-9_-]+\s*{/) || // Remove CSS lines starting with .className {
                  line.match(/^[a-zA-Z-]+:[a-zA-Z0-9%\s\(\)\.,-]+;$/) // Remove lines like "color: blue;" or "margin: 10px;"
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
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Content extraction error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
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

        await drawObserveOverlay(stagehand.page, observations); // Highlight the search box
        return {
          content: [{ type: "text", text: `Observations: ${JSON.stringify(observations)}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Observation error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
      }

    case "screenshot":
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `screenshot-${timestamp}.png`;
        const filepath = path.join(config.screenshotsDir, filename);
        
        const screenshotBuffer = await stagehand.page.screenshot({
          path: filepath,
          fullPage: false,
        });

        // Convert buffer to base64 string and store in memory
        const screenshotBase64 = screenshotBuffer.toString("base64");
        screenshots.set(filename, screenshotBase64);

        // Notify the client that the resources changed
        const serverInstance = getServerInstance();
        if (serverInstance) {
          serverInstance.notification({
            method: "notifications/resources/list_changed",
          });
        }

        return {
          content: [{
            type: "text",
            text: `Screenshot taken with name: ${filename}`,
          },
          {
            type: "text",
            text: `Screenshot saved to: ${filepath}`
          },
          {
            type: "image",
            data: screenshotBase64,
            mimeType: "image/png",
          }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Screenshot error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
      }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
        _meta: {},
        isError: true
      };
  }
}