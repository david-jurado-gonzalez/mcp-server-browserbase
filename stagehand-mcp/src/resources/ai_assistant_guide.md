# AI Assistant Guide: Stagehand MCP Server

This guide helps you, an AI assistant, effectively utilize the Stagehand MCP server's tools and resources to automate web interactions, gather information, and assist users with web-based tasks. Understanding these tools will enable you to control a web browser programmatically and perform complex actions on web pages.

## Available Tools:

- `stagehand_navigate`: Navigate to a specific URL.
- `stagehand_act`: Performs an action on a web page element.
- `stagehand_extract`: Extracts information from the current page based on an optional instruction and schema. If no instruction or schema is provided, it extracts all text from the page body.
- `stagehand_observe`: Observes the current web page to identify actionable elements (e.g., buttons, links, input fields). This tool provides a list of these elements, including their selectors and descriptions, which can then be used for precise interactions with `stagehand_act`.
- `screenshot`: Take a screenshot of the current page. (Note: This is a general screenshot tool. For more advanced capture, see `stagehand_capture_screenshot`).
- `stagehand_agent_execute`: Executes a natural language instruction using the Stagehand agent.
- `stagehand_copy_as_markdown`: Captures HTML content from the current page (from the current selection, the visible part of the page, or a specific DOM element identified by a selector) and converts it to Markdown format.
- `stagehand_capture_screenshot`: Captures a screenshot of the current browser viewport or a specified region. Returns the image as a base64 encoded string.
  - **Parameters:**
    - `alias` (string, optional): Alias of the Stagehand instance.
    - `clip` (object, optional): Region to capture (`{ x, y, width, height }`). Coordinates are relative to the top-left of the viewport.
  - **Use Case:** Ideal for tasks requiring visual input for AI processing, or for capturing specific parts of a page when standard element selectors are insufficient (e.g., canvas, complex UIs).
- `stagehand_click_coordinates`: Simulates a mouse click at specified x and y coordinates within the browser viewport.
  - **Parameters:**
    - `x` (number, required): X-coordinate for the click (relative to viewport top-left).
    - `y` (number, required): Y-coordinate for the click (relative to viewport top-left).
    - `alias` (string, optional): Alias of the Stagehand instance.
  - **Use Case:** Essential for interacting with non-standard elements like those in a game rendered on a `<canvas>`, or specific points in an image map where DOM selectors are not applicable. Always ensure coordinates are within the visible viewport.

### How to use the tools:

- **Critical Step: Observation after Page Changes:** After using `stagehand_navigate` to go to a new page, OR after any action (e.g., using `stagehand_act` for a form submission, clicking a link) that results in a significant change to the page content or URL, you **MUST** immediately use `stagehand_observe`. This is a critical step to identify the current state of the page, including any dynamic elements like pop-ups, cookie consent banners, login prompts, or disclaimers that may have appeared.
    - **Act on Observations:** Review the output of `stagehand_observe`. If interactive elements requiring immediate attention are present (e.g., an "Accept Cookies" button), you **MUST** use `stagehand_act` to address them before attempting any other task-specific actions on the page.
    - **Proceed with Confidence:** Only once the page is in a stable and expected state (i.e., preliminary interactions are handled), should you proceed with other `stagehand_act` or `stagehand_extract` operations based on the elements confirmed by your latest `stagehand_observe` call. This ensures you are always interacting with available and relevant elements.

- **Interaction (`stagehand_act`):** This is your primary tool for performing actions on a web page. **Crucially, before using `stagehand_act`, ensure you have a fresh understanding of the page's actionable elements from a recent `stagehand_observe` call, especially if the page just loaded or changed.** `stagehand_act` can be used in two ways:
    - **Action-based:** Use `action` (and optionally `variables` if sensitive data is used) to perform actions based on natural language descriptions (e.g., "Click the login button"). Use this method **only when your latest `stagehand_observe` confirms the element is clearly present and unambiguous.**
    - **Selector-based:** Use `selector`, `method`, and `description` to interact with specific elements. **These details MUST come from the output of a `stagehand_observe` call performed after the most recent page load or significant content change.** Then, use `stagehand_act` with these parameters and the desired `method` (e.g., `click`, `type`, `scroll`, `select`). This is the preferred method for precision and reliability.
    In both `Action-based` and `Selector-based` interactions with `stagehand_act`, aim for clear and specific descriptions. When an action involves inputting sensitive information (e.g., usernames, passwords, personal details), always use the `variables` parameter. This ensures that sensitive data is handled more securely and is not logged or exposed unnecessarily. Note that `stagehand_observe` itself does not use variables.

- **Information Extraction:** Use `stagehand_extract` to get the full text content of the page, or use the optional `instruction` and `schema` parameters to extract specific structured data.
  - **Using `instruction` and `schema`:** Provide a natural language `instruction` describing the data to extract (e.g., "extract the item price") and a `schema` string representing a valid JSON Schema for the expected output. The `schema` should be provided as a string representation of a JSON object. For example: `'{\"type\": \"object\", \"properties\": {\"product_name\": {\"type\": \"string\"}, \"price\": {\"type\": \"number\"}}}'`. This schema will be used to validate and structure the extracted data. Using a well-defined schema ensures that the extracted data is structured, validated, and ready for use.
- **Debugging/Visualization:** Use `screenshot` if you need to see the current state of the page.
- **Agent Execution:** Use `stagehand_agent_execute` with the `instruction` parameter to pass a natural language instruction directly to the Stagehand agent for execution.
- **Copying Content as Markdown (`stagehand_copy_as_markdown`):** Use this tool to get a Markdown representation of parts of a web page.
  - **Parameters:**
    - `sourceType` (required): Specify `"selection"` to copy the current user selection, `"visiblePage"` to copy the main content of the visible page, or `"element"` to copy a specific HTML element.
    - `selector` (optional): If `sourceType` is `"element"`, provide a CSS `selector` to identify the element you want to copy.
  - **Example:** To copy the HTML of an element with the ID `article-body` as Markdown:
    ```json
    {
      "tool_name": "stagehand_copy_as_markdown",
      "arguments": {
        "sourceType": "element",
        "selector": "#article-body"
      }
    }
    ```

- **Image-Based Interactions:**
  - When standard DOM interactions (`stagehand_act` with selectors) are difficult or impossible (e.g., inside a `<canvas>` element, a complex graphical interface, or an iframe with access restrictions), use `stagehand_capture_screenshot` to get a visual representation of the area of interest.
  - This image can then be (conceptually) processed (e.g., by a multimodal AI model if available to you, or by asking the user to identify coordinates based on the image).
  - Once target coordinates (x, y) are determined (relative to the viewport's top-left), use `stagehand_click_coordinates` to simulate a click at that precise location.
  - **Example Workflow:**
    1. User task: "Click the 'Start Game' button inside the game canvas."
    2. You: Use `stagehand_capture_screenshot` (possibly with a `clip` if the button's general area is known) to get an image of the game interface.
    3. You: (If you have vision capabilities and can identify the button in the image) Determine the (x,y) coordinates of the "Start Game" button within the captured image (and thus, the viewport).
    4. You: (If you don't have vision, or need confirmation) Present the image to the user and ask them to provide the (x,y) coordinates of the button.
    5. You: Use `stagehand_click_coordinates` with the determined `x` and `y` values.

## Available Resources:

- `stagehand://ai_assistant_guide`: This guide.

Use these tools and resources effectively to interact with web pages and complete user tasks.