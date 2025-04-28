# Guide to AI Wizard - Stagehand MCP Server

This document provides guidance on how to use the Stagehand MCP server tools and resources.

## Available Tools:

- `stagehand_navigate`: Navigate to a specific URL.
- `stagehand_act`: Performs an action on an element of the web page.
- `stagehand_extract`: Extracts information from the current page based on an optional instruction and schema. If no instruction or schema is provided, it extracts all text from the page body.
- `stagehand_observe`: Observe actionable elements in the web page. Preview actions.
- `stagehand_cachedact`: Performs an action on an element of the web page previously observed.
- `screenshot`: Take a screenshot of the current page.

#### How to use the tools:

- **Navigation:** Use `stagehand_navigate` to go to the necessary web page before performing other actions. The first time you access a website do observe `stagehand_observe` if there are popups with options to be clicked before launching actions (i.e.: Accpet cookies, Login screen, Disclaimer...). This can also happen after certain actions such as those that lead to another page.
- **Interaction:** If you are not sure of what is being showed the page or you want to preview the actions without executing them, do observe the expected elements with `stagehand_observe` to identify interactable elements and then `stagehand_cachedact` to interact with them (click, type, etc.). Be as specific as possible in the description of the action or the observation. Use variables with actions and observations containing sensitive information (name, email, phone...). Use `stagehand_act` to execute actions in the page if you are sure the element exsists. If `stagehand_act` doesn't work (i.e. is hard to find the element in the page), use `stagehand_observe`.
- **Information Extraction:** Use `stagehand_extract` to get the full text content of the page, or use the optional `instruction` and `schema` parameters to extract specific structured data.
  - **Using `instruction` and `schema`:** Provide a natural language `instruction` describing the data to extract (e.g., "extract the price of the item") and a `schema` string representing the Zod schema for the expected output (e.g., `'z.object({ price: z.number() })'`). The `schema` string will be evaluated as JavaScript code on the server side.
- **Debugging/Display:** Use screenshot if you need to see the current state of the page.

## Available Resources:

- `stagehand://ai_assistant_guide`: This guide.

Use these tools and resources effectively to interact with web pages and complete user tasks.