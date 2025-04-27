# Guide to AI Wizard - Stagehand MCP Server

This document provides guidance on how to use the Stagehand MCP server tools and resources.

## Available Tools:

- `stagehand_navigate`: Navigate to a specific URL.
- `stagehand_act`: Performs an action on an element of the web page.
- `stagehand_extract`: Extracts all the text from the current page.
- `stagehand_observe`: Observe actionable elements in the web page.
- `stagehand_cachedact`: Performs an action on an element of the web page previously observed.
- `screenshot`: Take a screenshot of the current page.

#### How to use the tools:

- **Navigation:** Use `stagehand_navigate` to go to the necessary web page before performing other actions.
- **Interaction:** Use `stagehand_act` to execute actions in the page. If `stagehand_act` doesn't work (i.e. is hard to find the element in the page) or you prefer to preview the actions without executing them, use `stagehand_observe` to identify interactable elements and then `stagehand_cachedact` to interact with them (clicks, typing, etc.). Be as specific as possible in the description of the action or the observation. Use variables with the actions containing sensitive information (name, email, phone...).
- **Information Extraction:** Use `stagehand_extract` to get the full text content of the page.
- **Debugging/Display:** Use screenshot if you need to see the current state of the page.

## Available Resources:

- `stagehand://ai_assistant_guide`: This guide.

Use these tools and resources effectively to interact with web pages and complete user tasks.