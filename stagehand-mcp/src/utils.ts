/**
 * Sanitizes a message to ensure it's properly formatted JSON
 * @param message The message to sanitize
 * @returns A sanitized JSON string
 */
export function sanitizeMessage(message: any): string {
  try {
    // Ensure the message is properly stringified JSON
    if (typeof message === 'string') {
      JSON.parse(message); // Validate JSON structure
      return message;
    }
    return JSON.stringify(message);
  } catch (error) {
    // Return a standard JSON-RPC error object if sanitization fails
    return JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700, // JSON Parse error code
        message: 'Parse error: Invalid JSON received or generated.',
      },
      id: null, // Typically null for parse errors before ID is known
    });
  }
}