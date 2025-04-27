/**
 * Prompts module for the Stagehand MCP server
 * Contains prompts definitions and handlers for prompt-related requests
 */
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js"; // Keep PromptMessage if valid

// Define the prompts available in this server
// TODO: Add more relevant prompts for stagehand-mcp functionality
// Using 'any[]' for now as PromptDefinition type seems unavailable in SDK export
export const PROMPTS: any[] = [
  {
    name: "example_prompt",
    description: "An example prompt template",
    arguments: [
        { name: "topic", description: "The topic to discuss", type: "string", required: true }
    ]
  }
];

/**
 * Get a prompt's content by name
 * @param name The name of the prompt to retrieve
 * @returns The prompt messages or throws an error if not found
 */
// Adjusting return type based on GetPromptResponse structure if needed, keeping PromptMessage
export function getPrompt(name: string): { description: string; messages: PromptMessage[] } {
  const promptDefinition = PROMPTS.find(p => p.name === name);

  if (!promptDefinition) {
    throw new Error(`Prompt not found: ${name}`);
  }

  // Example implementation - replace with actual logic to generate messages
  if (name === "example_prompt") {
    // This is just a placeholder. You'd typically generate messages based on the definition
    // and potentially passed arguments (though GetPrompt doesn't take runtime args).
    return {
      description: promptDefinition.description,
      messages: [
        {
          // Changed role from "system" to "assistant" as "system" is not valid for PromptMessage
          role: "assistant",
          content: {
            type: "text",
            text: "I am a helpful assistant ready to discuss the topic." // Adjusted message
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            // Placeholder - real implementation might use template variables
            text: `Tell me about the example topic.`
          }
        }
      ]
    };
  }

  // Fallback for other potential prompts or if logic is missing
  throw new Error(`Implementation missing for prompt: ${name}`);
}