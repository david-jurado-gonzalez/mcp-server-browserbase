import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getServerInstance, operationLogs, log } from "./logging.js";
import path from "path";
import config from "./config.js";
import { screenshots } from "./resources.js";
import { drawObserveOverlay, clearOverlays } from "./utils.js";
import { getStagehandInstance, createStagehandInstance } from "./stagehandManager.js";
import TurndownService from 'turndown';

import { Ajv } from 'ajv';

const ajv = new Ajv();
const turndownService = new TurndownService();

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
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
      },
      required: ["url"],
    },
  },
  {
    name: "stagehand_act",
    description: `Performs an action on a web page element. This tool can perform an action based on a natural language instruction or based on a previously observed element's selector and method.
      If 'selector' and 'method' are provided, the action will be performed on the element identified by the selector using the specified method returned from a previous 'stagehand_observe' observation (this is the preferred action variant).
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
         alias: { type: "string", description: "Optional alias for the Stagehand instance" },
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
        },
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
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
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
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
      properties: {
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
      },
    },
  },
  {
    name: "stagehand_agent_execute",
    description: "Executes a natural language instruction using the Stagehand agent.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: { type: "string", description: "The instruction for the Stagehand agent." },
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
      },
      required: ["instruction"],
    },
  },
  {
    name: "stagehand_copy_as_markdown",
    description: "Captures HTML content from the current page (selection, visible part, or a specific element) and converts it to Markdown.",
    inputSchema: {
      type: "object",
      properties: {
        sourceType: {
          type: "string",
          description: "The source of the HTML to convert: 'selection', 'visiblePage', or 'element'.",
          enum: ["selection", "visiblePage", "element"],
        },
        selector: {
          type: "string",
          description: "CSS selector for the element to capture. Required if sourceType is 'element'.",
        },
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
      },
      required: ["sourceType"],
      if: {
        properties: { sourceType: { const: "element" } },
      },
      then: {
        required: ["selector"],
      },
    },
  },
  {
    name: "stagehand_capture_screenshot",
    description: "Captures a screenshot of the current browser viewport or a specified region. The image is returned as a base64 encoded string.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
        clip: {
          type: "object",
          description: "Optional rectangular region to capture (x, y, width, height). Coordinates are relative to the top-left of the viewport.",
          properties: {
            x: { type: "number", description: "X-coordinate of the top-left corner of the clip region" },
            y: { type: "number", description: "Y-coordinate of the top-left corner of the clip region" },
            width: { type: "number", description: "Width of the clip region" },
            height: { type: "number", description: "Height of the clip region" },
          },
          required: ["x", "y", "width", "height"],
        },
      },
    },
  },
  {
    name: "stagehand_mouse_action_at_coordinates",
    description: "Simulates various mouse actions. For 'click', 'dblclick', 'rightclick', 'middleclick', 'hover', it acts at specified x/y coordinates. For 'scroll', it scrolls the viewport by deltaX/deltaY. Coordinates are relative to the top-left of the viewport for point-based actions.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The type of mouse action to perform.",
          enum: ["click", "dblclick", "rightclick", "middleclick", "hover", "scroll"],
        },
        x: { type: "number", description: "The x-coordinate for point-based actions (click, dblclick, rightclick, middleclick, hover). Relative to the top-left of the viewport." },
        y: { type: "number", description: "The y-coordinate for point-based actions (click, dblclick, rightclick, middleclick, hover). Relative to the top-left of the viewport." },
        deltaX: { type: "number", description: "The horizontal scroll amount in pixels. Used only if action is 'scroll'. Defaults to 0 if not provided." },
        deltaY: { type: "number", description: "The vertical scroll amount in pixels. Used only if action is 'scroll'. Defaults to 0 if not provided." },
        alias: { type: "string", description: "Optional alias for the Stagehand instance" },
      },
      required: ["action"],
    },
  },
];

// Handle tool calls
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  // We remove the stagehand parameter as we will get it from the manager
  // stagehand: Stagehand
): Promise<CallToolResult> {
  const alias = args.alias as string | undefined;
  let stagehand = getStagehandInstance(alias);

  // If Stagehand is not initialized and the tool is not stagehand_navigate,
  // inform the user that they must navigate first.
  if (!stagehand && name !== "stagehand_navigate") {
    return {
      content: [{ type: "text", text: `Stagehand browser is not initialized. Please use the 'stagehand_navigate' tool first to open a page.` }],
      _meta: {},
      isError: true
    };
  }

  // If Stagehand is not initialized and the tool is stagehand_navigate, we create a new instance.
  if (!stagehand && name === "stagehand_navigate") {
    try {
      stagehand = await createStagehandInstance(alias);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
       return {
          content: [{ type: "text", text: `Failed to initialize Stagehand: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true
        };
    }
  } else if (stagehand && name === "stagehand_navigate") {
     // If Stagehand instance exists and the tool is stagehand_navigate, navigate the existing instance
     log(`Stagehand instance with alias "${alias}" already exists. Navigating existing instance.`, "info");
  }


  // If Stagehand was initialized successfully (or already existed), we proceed with the tool call.
  // If initialization failed, the previous block would have already returned an error.
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
        const response = await stagehand.page.goto(args.url as string);

        if (response && response.status() >= 400) {
          return {
            content: [{ type: "text", text: `Navigation error to ${args.url}: Status code ${response.status()}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
            _meta: {},
            isError: true
          };
        }

        return {
          content: [{ type: "text", text: `Successful navigation to: ${args.url}` }],
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

                    // Validate the parsed schema itself before passing it to Stagehand.
                    const isValidSchema = ajv.validateSchema(schema);
                    if (!isValidSchema) {
                        throw new Error(`Invalid JSON Schema: ${ajv.errorsText(ajv.errors)}`);
                    }

                } catch (e) {
                    throw new Error(`Failed to process schema string: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            extractedContent = await stagehand.page.extract({
                instruction: instruction,
                schema: schema as any // Force type to any to resolve compilation error
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

    case "stagehand_copy_as_markdown":
      try {
        const sourceType = args.sourceType as "selection" | "visiblePage" | "element";
        const selector = args.selector as string | undefined;

        if (!sourceType) {
          return {
            content: [{ type: "text", text: "Missing required argument 'sourceType' for stagehand_copy_as_markdown." }],
            _meta: {},
            isError: true,
          };
        }

        if (sourceType === "element" && !selector) {
          return {
            content: [{ type: "text", text: "Missing required argument 'selector' when 'sourceType' is 'element'." }],
            _meta: {},
            isError: true,
          };
        }

        let htmlContent = "";

        if (sourceType === "selection") {
          htmlContent = await stagehand.page.evaluate(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return "";
            const range = selection.getRangeAt(0);
            const div = document.createElement("div");
            div.appendChild(range.cloneContents());
            return div.innerHTML;
          });
        } else if (sourceType === "visiblePage") {
          // Using document.body.outerHTML to get the content of the body
          htmlContent = await stagehand.page.evaluate(() => document.body.outerHTML);
        } else if (sourceType === "element" && selector) {
          htmlContent = await stagehand.page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element ? element.outerHTML : "";
          }, selector);
        } else {
          return {
            content: [{ type: "text", text: `Invalid sourceType: ${sourceType}` }],
            _meta: {},
            isError: true,
          };
        }

        if (!htmlContent) {
          return {
            content: [{ type: "text", text: "No HTML content found to convert." }],
            _meta: {},
          };
        }

        const markdown = turndownService.turndown(htmlContent);

        return {
          content: [{ type: "text", text: markdown }],
          _meta: {},
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Copy as Markdown error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true,
        };
      }

    case "stagehand_capture_screenshot":
      try {
        const clip = args.clip as { x: number; y: number; width: number; height: number } | undefined;
        
        const screenshotOptions: Parameters<typeof stagehand.page.screenshot>[0] = {
          fullPage: false, // Capture viewport by default unless clip is specified
        };

        if (clip) {
          if (typeof clip.x !== 'number' || typeof clip.y !== 'number' || typeof clip.width !== 'number' || typeof clip.height !== 'number') {
            return {
              content: [{ type: "text", text: "Invalid 'clip' object. 'x', 'y', 'width', and 'height' must all be numbers." }],
              _meta: {},
              isError: true,
            };
          }
          screenshotOptions.clip = clip;
          // When a clip is provided, fullPage must be false (which is default or explicitly set).
          // Playwright handles this, but good to be aware.
        }

        const screenshotBuffer = await stagehand.page.screenshot(screenshotOptions);
        const screenshotBase64 = screenshotBuffer.toString("base64");

        return {
          content: [
            { type: "text", text: "Screenshot captured successfully." },
            {
              type: "image",
              data: screenshotBase64,
              mimeType: "image/png",
            },
          ],
          _meta: {},
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Screenshot capture error: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true,
        };
      }

    case "stagehand_mouse_action_at_coordinates":
      try {
        const action = args.action as string;
        const x = typeof args.x === 'number' ? args.x : undefined;
        const y = typeof args.y === 'number' ? args.y : undefined;
        const deltaX = typeof args.deltaX === 'number' ? args.deltaX : undefined;
        const deltaY = typeof args.deltaY === 'number' ? args.deltaY : undefined;

        if (!action) {
          return { content: [{ type: "text", text: "Missing required argument 'action'." }], _meta: {}, isError: true };
        }

        let message = "";

        switch (action) {
          case "click":
          case "dblclick":
          case "rightclick":
          case "middleclick":
          case "hover":
            if (x === undefined || y === undefined) {
              return { content: [{ type: "text", text: `Coordinates 'x' and 'y' must be provided as numbers for action '${action}'.` }], _meta: {}, isError: true };
            }
            if (action === "click") await stagehand.page.mouse.click(x, y);
            else if (action === "dblclick") await stagehand.page.mouse.dblclick(x, y);
            else if (action === "rightclick") await stagehand.page.mouse.click(x, y, { button: 'right' });
            else if (action === "middleclick") await stagehand.page.mouse.click(x, y, { button: 'middle' });
            else if (action === "hover") await stagehand.page.mouse.move(x, y);
            message = `Successfully performed '${action}' at (${x}, ${y}).`;
            break;

          case "scroll":
            const dX = deltaX !== undefined ? deltaX : 0;
            const dY = deltaY !== undefined ? deltaY : 0;
            // Ensure user provided at least one delta if action is scroll, or explicitly set both to 0.
            if (args.deltaX === undefined && args.deltaY === undefined) {
                 return { content: [{ type: "text", text: "For 'scroll' action, provide 'deltaX' and/or 'deltaY'. If you intend to scroll by (0,0), explicitly pass deltaX: 0 and deltaY: 0." }], _meta: {}, isError: true };
            }
            await stagehand.page.mouse.wheel(dX, dY);
            message = `Successfully scrolled viewport by deltaX: ${dX}, deltaY: ${dY}.`;
            break;

          default:
            return { content: [{ type: "text", text: `Invalid action type: '${action}'. Supported actions are: click, dblclick, rightclick, middleclick, hover, scroll.` }], _meta: {}, isError: true };
        }
        return { content: [{ type: "text", text: message }], _meta: {} };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const actionArgs = JSON.stringify({ action: args.action, x: args.x, y: args.y, deltaX: args.deltaX, deltaY: args.deltaY });
        return {
          content: [{ type: "text", text: `Mouse action error for ${actionArgs}: ${errorMsg}` }, { type: "text", text: `Operation logs:\n${operationLogs.join("\n")}` }],
          _meta: {},
          isError: true,
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