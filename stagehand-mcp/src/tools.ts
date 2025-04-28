import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getServerInstance, operationLogs } from "./logging.js";
import path from "path";
import config from "./config.js";
import { screenshots } from "./resources.js";
import { drawObserveOverlay, clearOverlays } from "./utils.js";
import { getStagehandInstance, initializeStagehand } from "./stagehandManager.js";

import { Ajv } from 'ajv';

const ajv = new Ajv();

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
    description: `Performs an action on a web page element. This tool can perform an action based on a natural language instruction or based on a previously observed element's selector and method.
      If 'selector' and 'method' are provided, the action will be performed on the element identified by the selector using the specified method.
      If only 'action' and optionally 'variables' are provided, the action will be performed based on the natural language instruction.
      Act actions should be as atomic and specific as possible, i.e. "Click the sign in button" or "Type 'hello' into the search input" or
      "Scroll to the bottom of the page" or "Fill in the username field with 'john_doe'" or "Scroll the modal to the next chunk".
      AVOID actions that are more than one step, i.e. "Order me pizza" or "Send an email to Paul
      asking him to call me". Only use act when you are sure that the action is going to be successful.
      If you are not sure, observe first to see if the action is going to be successful.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: `The natural language instruction for the action. Required if 'selector' and 'method' are not provided. Should be as atomic and specific as possible,
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
        selector: {
          type: "string",
          description: `The path returned from an observation. Required if 'action' is not provided. For example: /html/body/div[1]/div[1]/a`,
        },
        method: {
          type: "string",
          description: `The method to use on the element identified by the selector. Required if 'action' is not provided.
            click: To click on an item.
            type: To type text in an input field.
            hover: To hover over an element.
            scroll: To navigate to an element.
            select: To select an option from a drop-down menu.`,
        },
        description: {
          type: "string",
          description: `References the UI element the cached action will use. Required if 'action' is not provided. For example: "The quickstart link" or "textbox: Username" or "button: Submit" or "link: Sign in".`,
        },
      },
      required: [],
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
          description: "An optional string representing a valid JSON Schema for the expected output (e.g., '{\"type\": \"object\", \"properties\": {\"price\": {\"type\": \"number\"}}}'). This schema will be used to validate and structure the extracted data."
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
  {
    name: "stagehand_agent_execute",
    description: "Executes a natural language instruction using the Stagehand agent.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: { type: "string", description: "The instruction for the Stagehand agent." },
      },
      required: ["instruction"],
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
        const selector = args.selector as string | undefined;
        const method = args.method as string | undefined;
        const description = args.description as string | undefined;
        const action = args.action as string | undefined;
        const variables = args.variables as Record<string, string> | undefined;

        let result;
        if (selector && method && description) {
          // Use cached action logic
          await clearOverlays(stagehand.page); // Remove the highlight before acting
          result = await stagehand.page.act({
            description,
            selector,
            method
          });
        } else if (action) {
          // Use natural language action logic
          result = await stagehand.page.act({
            action,
            variables
          });
        } else {
           return {
              content: [{ type: "text", text: `Invalid arguments for stagehand_act. Provide either 'action' or ('selector', 'method', and 'description').` }],
              _meta: {},
              isError: true
            };
        }

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


    case "stagehand_extract":
      try {
        const instruction = args.instruction as string | undefined;
        const schemaString = args.schema as string | undefined;

        let extractedContent;

        if (instruction || schemaString) {
            let schema = undefined;
            if (schemaString) {
                try {
                    // Parse the schema string as JSON.
                    schema = JSON.parse(schemaString);

                    // Validate the parsed schema against the JSON Schema standard
                    const validate = ajv.compile({}); // Use an empty schema to validate the schema itself
                    if (!validate(schema)) {
                        throw new Error(`Invalid JSON Schema: ${ajv.errorsText(validate.errors)}`);
                    }

                } catch (e) {
                    throw new Error(`Failed to process schema string: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            extractedContent = await stagehand.page.extract({
                instruction: instruction,
                schema: schema as any // Forzar tipo a any para resolver error de compilación
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

    case "stagehand_agent_execute":
      try {
        const instruction = args.instruction as string;
        if (!instruction) {
          return {
            content: [{ type: "text", text: `Missing required argument 'instruction' for stagehand_agent_execute.` }],
            _meta: {},
            isError: true
          };
        }
        const operator = stagehand.agent();
        const { message, actions } = await operator.execute(instruction);
        return {
          content: [{ type: "text", text: message }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Stagehand agent execution error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
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