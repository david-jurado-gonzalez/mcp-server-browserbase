import { Stagehand } from "@browserbasehq/stagehand";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import config from "./config.js";

// Define the Stagehand tools
export const TOOLS: Tool[] = [
  {
    name: "stagehand_navigate",
    description:
      "Navigate to a URL in the browser. Only use this tool with URLs you're confident will work and stay up to date. Otheriwse use https://google.com as the starting point.",
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
      "Scroll to the bottom of the page" or "Fill in the username field with 'john_doe'" or "scroll the modal to the next chunk". 
      AVOID actions that are more than one step, i.e. "Order me pizza" or "Send an email to Paul 
      asking him to call me".`,
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
            key in the action template. For example: {"action": "Fill in the password", "variables": {"password": "123456"}}`,
        },
      },
      required: ["action"],
    },
  },
  {
    name: "stagehand_extract",
    description: `Extracts all of the text from the current page.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "stagehand_observe",
    description:
      "Observes elements on the web page. Use this tool to observe elements that you can later use in an action. Use observe instead of extract when dealing with actionable (interactable) elements rather than text. More often than not, you'll want to use extract instead of observe when dealing with scraping or extracting structured text.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "Instruction for observation (e.g., 'find the login button'). This instruction must be extremely specific.",
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
  stagehand: Stagehand
): Promise<CallToolResult> {
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
          content: [{ type: "text", text: `Navigation error: ${errorMsg}` }],
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
          content: [{ type: "text", text: `Action performed: ${action}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Action error: ${errorMsg}` }],
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
          content: [{ type: "text", text: `Content extraction error: ${errorMsg}` }],
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
          content: [{ type: "text", text: `Observations: ${JSON.stringify(observations)}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Observation error: ${errorMsg}` }],
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
          content: [{ type: "text", text: `Screenshot saved to: ${filepath}` }],
          _meta: {}
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Screenshot error: ${errorMsg}` }],
          _meta: {},
          isError: true
        };
      }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        _meta: {},
        isError: true
      };
  }
}