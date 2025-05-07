# Stagehand MCP Server

MCP server that provides browser automation tools based on Stagehand, with support for multiple browser instances.

## Installation

0.  Build:
    ```bash
    npm run build
    ```

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Create .env file:
    ```bash
    cp .env.example .env
    ```

3.  Configure environment variables in the .env file:
    ```bash
    # Stagehand MCP Configuration (configurable from mcp_settings.json)
    # Specifies the model name to use (e.g., gemini-2.0-flash, gpt-4o)
    STAGEHAND_MODEL_NAME=gemini-2.0-flash

    # API key for the model (use STAGEHAND_MODEL_API_KEY instead of GOOGLE_API_KEY)
    STAGEHAND_MODEL_API_KEY=your-api-key

    # Local browser viewport dimensions
    STAGEHAND_VIEWPORT_WIDTH=1920
    STAGEHAND_VIEWPORT_HEIGHT=1080

    # Additional arguments for Chromium (space or comma-separated)
    # Example: STAGEHAND_ARGS=--user-data-dir="C:\test-profile" --no-sandbox
    STAGEHAND_ARGS=--disable-web-security,--disable-same-origin-policy

    # Browser locale
    STAGEHAND_LOCALE=en-US

    # Browser permissions (comma-separated)
    # Example: STAGEHAND_PERMISSIONS=notifications,geolocation
    STAGEHAND_PERMISSIONS=notifications

    # Maximum time to wait for the DOM to stabilize (in ms)
    STAGEHAND_DOM_SETTLE_TIMEOUT=30000

    # Log detail level (0: silent, 1: error, 2: warn, 3: info, 4: debug, 5: trace)
    STAGEHAND_VERBOSE=1
    ```

## Support for Multiple Instances and Aliases

This Stagehand MCP server now supports managing multiple Stagehand browser instances simultaneously. Each instance can be identified and referenced using an `alias`.

-   When using the `stagehand_navigate` tool, an optional `alias` can be provided. If an alias is provided and an instance with that alias already exists, navigation will occur in that existing instance. If it doesn't exist, a new instance with that alias will be created. If no alias is provided, a new instance will be created with an automatically generated alias (a numeric counter: "1", "2", "3", etc.).
-   For other tools (`stagehand_act`, `stagehand_extract`, `stagehand_observe`, `screenshot`, `stagehand_agent_execute`), an optional `alias` can be specified to indicate which Stagehand instance the tool should operate on.
-   If no `alias` is specified for these tools, the operation will be performed on the last Stagehand instance that was created or used (the last "active" instance).

This allows controlling and automating multiple web pages independently within the same MCP server session.

## Available Tools

The tools available through this MCP server are:

-   **`stagehand_navigate`**: Navigates to a specific URL in a browser instance.
    -   **Parameters:**
        -   `url` (string, required): The URL to navigate to.
        -   `alias` (string, optional): The alias of the Stagehand instance to use or create.
    -   **Critical Usage Note:** After any navigation, **you MUST immediately use `stagehand_observe`** to understand the current state of the page and handle any dynamic elements (pop-ups, cookie banners, etc.) before proceeding with other actions.

-   **`stagehand_observe`**: Observes elements on the current page of a browser instance. This is a **critical first step** after any page load or significant page content change (e.g., after `stagehand_navigate` or an action via `stagehand_act` that alters the page). It identifies actionable elements, pop-ups, and other dynamic content.
    -   **Parameters:**
        -   `instruction` (string, required): Instruction for the observation (e.g., "observe all interactive elements", "check for cookie consent banner").
        -   `alias` (string, optional): The alias of the Stagehand instance to use.
    -   **Output:** Provides a list of interactable elements, including their selectors and descriptions, which are essential for reliable use of `stagehand_act`.

-   **`stagehand_act`**: Performs actions on page elements of a browser instance. **Always use `stagehand_observe` immediately before `stagehand_act`** to ensure you are interacting with currently available and relevant elements, especially after page loads or changes.
    -   **Parameters:**
        -   `action` (string, optional): Natural language instruction for the action. Use when `stagehand_observe` confirms the element is clear and unambiguous.
        -   `variables` (object, optional): Variables for the action, especially for sensitive data.
        -   `selector` (string, optional): Element selector (use with `method` and `description`). **Must be obtained from a recent `stagehand_observe` call.**
        -   `method` (string, opcional): Method to apply (`click`, `type`, `hover`, `scroll`, `select`).
        -   `description` (string, opcional): Description of the element, from `stagehand_observe`.
        -   `alias` (string, opcional): The alias of the Stagehand instance to use.

-   **`stagehand_extract`**: Extracts information from the current page of a browser instance.
    -   **Parameters:**
        -   `instruction` (string, optional): Instruction for the extraction.
        -   `schema` (string, optional): JSON schema to validate and structure the output.
        -   `alias` (string, optional): The alias of the Stagehand instance to use.

-   **`screenshot`**: Takes a screenshot of the current page of a browser instance. Screenshots are saved in the configured directory (default `downloads/screenshots`).
    -   **Parameters:**
        -   `alias` (string, optional): The alias of the Stagehand instance to use.

-   **`stagehand_agent_execute`**: Executes a natural language instruction using the Stagehand agent in a browser instance.
    -   **Parameters:**
        -   `instruction` (string, required): The instruction for the agent.
        -   `alias` (string, optional): The alias of the Stagehand instance to use.

-   **`stagehand_copy_as_markdown`**: Captures HTML content from the current page (selection, visible part, or a specific element) and converts it to Markdown.
    -   **Parameters:**
        -   `sourceType` (string, required): The source of the HTML to convert. Can be one of:
            -   `"selection"`: Captures the current user selection.
            -   `"visiblePage"`: Captures the HTML of the visible page content (body).
            -   `"element"`: Captures the HTML of a specific DOM element.
        -   `selector` (string, optional): CSS selector for the target element. Required if `sourceType` is `"element"`.
        -   `alias` (string, optional): The alias of the Stagehand instance to use.
    -   **Humorous Use Case:** Ever wanted to send your cat a formal complaint about the quality of their naps in a well-structured Markdown format? Now you can! Navigate to your cat's favorite napping spot (if it has a webpage, that is), select the offending snoozing posture, and use `stagehand_copy_as_markdown` with `sourceType: "selection"`. The resulting Markdown can then be printed and solemnly presented. Results may vary.

-   **`stagehand_capture_screenshot`**: Captures a screenshot of the current browser viewport or a specified region.
    -   **Parameters:**
        -   `alias` (string, optional): The alias of the Stagehand instance to use.
        -   `clip` (object, optional): An object specifying a rectangular region to capture.
            -   `x` (number, required): The x-coordinate of the top-left corner of the clip region.
            -   `y` (number, required): The y-coordinate of the top-left corner of the clip region.
            -   `width` (number, required): The width of the clip region.
            -   `height` (number, required): The height of the clip region.
    -   **Output:** Returns the captured image as a base64 encoded string. This is useful for image-based interactions or visual analysis.
    -   **Note:** The coordinate system for `clip` originates at the top-left (0,0) of the current viewport.

-   **`stagehand_mouse_action_at_coordinates`**: Simulates various mouse actions at specified coordinates or scrolls the viewport.
    -   **Parameters:**
        -   `action` (string, required): The type of mouse action. Supported values:
            -   `"click"`: Standard left click at (x, y).
            -   `"dblclick"`: Double click at (x, y).
            -   `"rightclick"`: Right mouse button click at (x, y).
            -   `"middleclick"`: Middle mouse button click at (x, y).
            -   `"hover"`: Mouse over/hover at (x, y).
            -   `"scroll"`: Scrolls the viewport. Requires `deltaX` and/or `deltaY`.
        -   `x` (number, optional): The x-coordinate for point-based actions (click, dblclick, rightclick, middleclick, hover). Required if action is one of these. Relative to the top-left of the viewport.
        -   `y` (number, optional): The y-coordinate for point-based actions. Required if action is one of these. Relative to the top-left of the viewport.
        -   `deltaX` (number, optional): The horizontal scroll amount in pixels. Used only if `action` is `"scroll"`. Defaults to 0.
        -   `deltaY` (number, optional): The vertical scroll amount in pixels. Used only if `action` is `"scroll"`. Defaults to 0.
        -   `alias` (string, optional): The alias of the Stagehand instance to use.
    -   **Critical Usage Notes:**
        -   For point-based actions (`click`, `dblclick`, `rightclick`, `middleclick`, `hover`), coordinates are relative to the top-left (0,0) of the current viewport. Ensure the target coordinates are within the visible area.
        -   For `"scroll"` action, at least one of `deltaX` or `deltaY` must be provided if you intend to scroll.
    -   **Use Cases:**
        -   Interacting with elements difficult to target with selectors (e.g., `<canvas>`, complex SVGs).
        -   Performing specific click types (right, middle, double).
        -   Triggering hover effects.
        -   Scrolling the page programmatically.

## Project Structure

```
stagehand-mcp/
├── src/
│   ├── config.ts      # Server configuration
│   ├── index.ts       # Entry point
│   ├── logging.ts     # Logging configuration and utilities
│   ├── prompts.ts     # Prompts used by Stagehand (if applicable)
│   ├── resources.ts   # MCP resource definitions (e.g., screenshots)
│   ├── server.ts      # MCP server setup and tool/resource registration
│   ├── stagehandManager.ts # Management of multiple Stagehand instances
│   ├── tools.ts       # MCP tool implementations
│   └── utils.ts       # Utility functions
├── downloads/
│   └── screenshots/   # Saved screenshots
├── package.json
├── tsconfig.json
└── .env               # Environment variables for configuration
```

## Usage

1.  Start the server:
    ```bash
    npm start
    ```

2.  Debugging with Chrome DevTools:
    ```bash
    npm run debug
    npm run start:debug
    ```

## Configuration with Environment Variables

The Stagehand MCP server can be configured using environment variables defined in the `env` section of its configuration in `mcp_settings.json`. This allows parameterizing various aspects of Stagehand's behavior.

Available environment variables:

*   `STAGEHAND_MODEL_NAME`: Specifies the language model name to use (e.g., `gemini-2.0-flash`, `gpt-4o`).
*   `STAGEHAND_MODEL_API_KEY`: API key for the configured language model.
*   `STAGEHAND_VIEWPORT_WIDTH`: Width of the local browser viewport in pixels.
*   `STAGEHAND_VIEWPORT_HEIGHT`: Height of the local browser viewport in pixels.
*   `STAGEHAND_ARGS`: Additional arguments to pass to the Chromium instance. Multiple arguments can be separated by spaces or commas (e.g., `--user-data-dir="C:\test-profile" --no-sandbox`).
*   `STAGEHAND_LOCALE`: Configures the browser locale (e.g., `es-ES`, `en-US`).
*   `STAGEHAND_PERMISSIONS`: Configures browser permissions. Multiple permissions can be separated by commas (e.g., `notifications`, `geolocation`).
*   `STAGEHAND_DOM_SETTLE_TIMEOUT`: Maximum time in milliseconds Stagehand will wait for the DOM to stabilize before performing an action.
*   `STAGEHAND_VERBOSE`: Stagehand log detail level (0: silent, 1: error, 2: warn, 3: info, 4: debug, 5: trace).
*   `STAGEHAND_DOWNLOADS_DIR_NAME`: Specifies the name of the directory where downloads will be saved. Relative to the server's working directory. Default is "downloads".
*   `STAGEHAND_SCREENSHOTS_DIR_NAME`: Specifies the name of the directory where screenshots will be saved. Relative to the downloads directory. Default is "screenshots".

Example configuration in `mcp_settings.json`:

```json
{
  "mcpServers": {
    "stagehand-server": {
      "command": "node",
      "args": ["path/to/stagehand-mcp/dist/index.js"],
      "env": {
        "STAGEHAND_MODEL_NAME": "gemini-2.0-flash",
        "STAGEHAND_MODEL_API_KEY": "your-api-key",
        "STAGEHAND_VIEWPORT_WIDTH": "1920",
        "STAGEHAND_VIEWPORT_HEIGHT": "1080",
        "STAGEHAND_ARGS": "--user-data-dir=\"C:\\test-profile\"",
        "STAGEHAND_LOCALE": "en-US",
        "STAGEHAND_PERMISSIONS": "notifications,geolocation",
        "STAGEHAND_DOM_SETTLE_TIMEOUT": "45000",
        "STAGEHAND_VERBOSE": "3"
      },
      "disabled": false,
      "alwaysAllow": [
        "screenshot",
        "stagehand_observe",
        "stagehand_extract",
        "stagehand_act",
        "stagehand_cachedact",
        "stagehand_navigate",
        "stagehand_copy_as_markdown",
        "stagehand_capture_screenshot",
        "stagehand_mouse_action_at_coordinates"
      ]
    }
  }
}
