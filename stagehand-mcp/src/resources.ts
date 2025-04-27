/**
 * Resources module for the Stagehand MCP server
 * Contains resources definitions and handlers for resource-related requests.
 * Currently focuses on managing screenshots taken via tools.
 */
import { Resource, ResourceTemplate, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js"; // Corrected type import

// Define static resources
export const RESOURCES: Resource[] = [
  {
    uri: "stagehand://ai_assistant_guide",
    mimeType: "text/markdown",
    name: "Stagehand AI Assistant Guide",
    description: "AI Assistant Guide to Using Stagehand MCP Tools",
  },
]; // Added type annotation

// Define static resource templates (if any) - currently none
export const RESOURCE_TEMPLATES: ResourceTemplate[] = []; // Added type annotation

// Store dynamic resources like screenshots in memory
// The key is the identifier (e.g., "screenshot-1"), value is base64 encoded PNG
export const screenshots = new Map<string, string>();

/**
 * Handle listing resources request.
 * Includes dynamically generated screenshot resources.
 * @returns A list of available resources.
 */
export function listResources(): { resources: Resource[] } { // Added return type
  const dynamicResources: Resource[] = Array.from(screenshots.entries()).map(([name, _blob]) => ({
    uri: `screenshot://${name}`, // Using a custom URI scheme for screenshots
    mimeType: "image/png",
    name: `Screenshot: ${name}`,
    description: `Screenshot taken at ${new Date().toISOString()}` // Optional description
  }));

  return {
    resources: [
      ...RESOURCES, // Include any static resources
      ...dynamicResources
    ]
  };
}

/**
 * Handle listing resource templates request.
 * Currently returns an empty list as no templates are defined.
 * @returns An empty resource templates list response.
 */
export function listResourceTemplates(): { resourceTemplates: ResourceTemplate[] } { // Added return type
  return { resourceTemplates: RESOURCE_TEMPLATES };
}

/**
 * Read a resource by its URI.
 * Currently supports reading screenshots stored in the map.
 * @param uri The URI of the resource to read (e.g., "screenshot://screenshot-1").
 * @returns The resource content or throws if not found.
 */
export function readResource(uri: string): ReadResourceResult { // Corrected return type
  if (uri.startsWith("screenshot://")) {
    const name = uri.substring("screenshot://".length); // More robust way to get name
    const screenshotBlob = screenshots.get(name);

    if (screenshotBlob) {
      return {
        contents: [
          {
            uri,
            mimeType: "image/png",
            blob: screenshotBlob, // Assuming blob is base64 string
          },
        ],
      };
    } else {
      throw new Error(`Screenshot resource not found: ${uri}`);
    }
  }

  if (uri === "stagehand://ai_assistant_guide") {
    try {
      // Read the content of the markdown file
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, 'resources', 'ai_assistant_guide.md');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            blob: Buffer.from(fileContent).toString('base64'),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error reading AI assistant guide resource: ${error}`);
      throw new Error(`Failed to read AI assistant guide resource: ${error.message}`);
    }
  }


  throw new Error(`Resource not found or unsupported URI scheme: ${uri}`);
}