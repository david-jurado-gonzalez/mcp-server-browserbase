# Guide to AI Wizard - Stagehand MCP Server

This document provides guidance on how to use the Stagehand MCP server tools and resources.

## Available Tools:

- `stagehand_navigate`: Navigate to a specific URL.
- `stagehand_act`: Performs an action on a web page element.
- `stagehand_extract`: Extracts information from the current page based on an optional instruction and schema. If no instruction or schema is provided, it extracts all text from the page body.
- `stagehand_observe`: Observe actionable elements in the web page. Preview actions.
- `screenshot`: Take a screenshot of the current page.
- `stagehand_agent_execute`: Executes a natural language instruction using the Stagehand agent.

#### How to use the tools:

- **Navigation:** Use `stagehand_navigate` to go to the necessary web page before performing other actions. The first time you access a website do observe `stagehand_observe` if there are pop-ups with options to be clicked before launching actions (i.e.: Accept cookies, Login screen, Disclaimer...). This can also happen after certain actions such as those that lead to another page.
- **Observe:** When a page change was just performed, you should observe actionable elements. If found, you can execute with a `Selector-based` `Interaction`.
- **Interaction:** The main tool for interacting with the page is `stagehand_act`. It can be used in two ways:
    - **Action-based:** Use `action` (and optionally `variables` if sensitive data is used) to perform actions based on natural language descriptions (e.g., "Click the login button"). Use this method when you are sure that the action is clear and the element is easily identifiable on the page.
    - **Selector-based:** Use `selector`, `method`, and `description` to interact with specific elements previously identified by `stagehand_observe`. Use `stagehand_observe` first to get the `selector` and `description` of the interactable elements. Then, use `stagehand_act` with these parameters and the desired `method` (e.g., `click`, `type`, `scroll`, `select`). This method is useful when you need to interact with specific elements or when action-based interaction is not precise enough.
    In both cases, be as specific as possible in the description of the action or observation. Use variables with actions and observations that contain sensitive information (name, email, phone...).
- **Information Extraction:** Use `stagehand_extract` to get the full text content of the page, or use the optional `instruction` and `schema` parameters to extract specific structured data.
  - **Using `instruction` and `schema`:** Provide a natural language `instruction` describing the data to extract (e.g., "extract the item price") and a `schema` string representing a valid JSON Schema for the expected output (e.g., `'{\"type\": \"object\", \"properties\": {\"price\": {\"type\": \"number\"}}}'`). This schema will be used to validate and structure the extracted data.
- **Debugging/Visualization:** Use `screenshot` if you need to see the current state of the page.
- **Agent Execution:** Use `stagehand_agent_execute` with the `instruction` parameter to pass a natural language instruction directly to the Stagehand agent for execution.


## Available Resources:

- `stagehand://ai_assistant_guide`: This guide.

Use these tools and resources effectively to interact with web pages and complete user tasks.