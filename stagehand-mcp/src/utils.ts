import { ObserveResult, Page } from "@browserbasehq/stagehand";

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


export async function drawObserveOverlay(page: Page, results: ObserveResult[]) {
  // Convert single xpath to array for consistent handling
  const xpathList = results.map((result) => result.selector);

  // Filter out empty xpaths
  const validXpaths = xpathList.filter((xpath) => xpath !== "xpath=");

  await page.evaluate((selectors) => {
    selectors.forEach((selector) => {
      let element;
      if (selector.startsWith("xpath=")) {
        const xpath = selector.substring(6);
        element = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
      } else {
        element = document.querySelector(selector);
      }

      if (element instanceof HTMLElement) {
        const overlay = document.createElement("div");
        overlay.setAttribute("stagehandObserve", "true");
        const rect = element.getBoundingClientRect();
        overlay.style.position = "absolute";
        overlay.style.left = rect.left + "px";
        overlay.style.top = rect.top + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";
        overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "10000";
        document.body.appendChild(overlay);
      }
    });
  }, validXpaths);
}

export async function clearOverlays(page: Page) {
  // remove existing stagehandObserve attributes
  await page.evaluate(() => {
    const elements = document.querySelectorAll('[stagehandObserve="true"]');
    elements.forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
  });
}
