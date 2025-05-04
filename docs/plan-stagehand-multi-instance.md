# Refactoring Plan for Stagehand MCP to Support Multiple Instances

**Goal:** Modify the Stagehand MCP server to manage multiple Stagehand instances, allowing tools to target specific instances.

**Current State:** A single Stagehand instance is managed globally in `stagehandManager.ts` and used by all tools in `tools.ts`.

**Desired State:** `stagehandManager.ts` manages a map of Stagehand instances, each identified by an alias (a simple counter by default). Tools in `tools.ts` accept an optional alias parameter to specify the target instance. If no alias is provided, the last created instance is used.

**Proposed Steps:**

1.  **Modify `stagehandManager.ts`:**
    *   Replace the single `stagehandInstance` variable with a `Map<string, Stagehand>` to store multiple `Stagehand` instances, using a string alias as the key.
    *   Add a variable to keep track of the `lastCreatedAlias` (string).
    *   Add a counter variable (e.g., `instanceCounter: number = 0`) for generating default aliases.
    *   Create a new function `createStagehandInstance` that takes an optional alias and configuration.
        *   If no alias is provided, increment the `instanceCounter` and use its value as the alias (converted to a string).
        *   If an alias *is* provided, use that alias.
        *   Create a new `Stagehand` instance, initialize it, and store it in the map with the chosen alias.
        *   Set `lastCreatedAlias` to the chosen alias.
        *   Return the created `Stagehand` instance.
    *   Modify `getStagehandInstance` to accept an optional alias.
        *   If an alias is provided, return the corresponding instance from the map.
        *   If no alias is provided, return the instance associated with `lastCreatedAlias`.
        *   Handle cases where the requested alias or `lastCreatedAlias` does not exist (e.g., return null or throw an error).
    *   Create a function to close a specific Stagehand instance by alias, and modify `closeStagehand` to close all managed instances and reset the map, `lastCreatedAlias`, and `instanceCounter`.

2.  **Modify `stagehand-mcp/src/tools.ts`:**
    *   Update the `inputSchema` for relevant tools (`stagehand_navigate`, `stagehand_act`, `stagehand_extract`, `stagehand_observe`, `screenshot`, `stagehand_agent_execute`) to include an optional `alias` parameter (string).
    *   Modify the `handleToolCall` function:
        *   When a tool is called, extract the `alias` from the arguments.
        *   For `stagehand_navigate`:
            *   If an alias is provided, call `createStagehandInstance` with the provided alias. If an instance with this alias already exists, navigate the existing instance instead of creating a new one.
            *   If no alias is provided, call `createStagehandInstance` without an alias (it will generate a default counter alias).
        *   For other tools:
            *   Call `getStagehandInstance` with the provided alias (or no alias if not provided, to get the last created instance).
            *   If no instance is found (either by provided alias or the last created), return an error indicating that the target instance does not exist.
        *   Update the tool logic to use the retrieved `Stagehand` instance.

3.  **Update `stagehand_navigate` tool logic:**
    *   Ensure the logic correctly handles creating a new instance with a default counter alias when no alias is provided, and navigating an existing instance when a known alias is provided.

**Mermaid Diagram:**

```mermaid
graph TD
    A[MCP Server] --> B{Tool Call Received};
    B --> C{Tool Name?};
    C -->|stagehand_navigate| D{Alias Provided?};
    D -->|Yes| E{Instance Exists?};
    E -->|Yes| F[Navigate Existing Instance];
    E -->|No| G[Create New Instance with Provided Alias];
    D -->|No| H[Generate Default Counter Alias];
    H --> G;
    G --> I[Store Instance in Manager Map & Update lastCreatedAlias];
    I --> J[Perform Navigation];
    C -->|Other Stagehand Tool| K{Alias Provided?};
    K -->|Yes| L[Get Instance by Alias from Manager];
    K -->|No| M[Get Instance by lastCreatedAlias from Manager];
    L --> N{Instance Found?};
    M --> N;
    N -->|Yes| O[Perform Tool Operation on Instance];
    N -->|No| P[Return Error: Instance Not Found];
    J --> Q[Return Result];
    O --> Q;
    G --> Q;
    F --> Q;
    P --> Q;

    classDef default fill:#f9f,stroke:#333,stroke-width:2px;
    classDef decision fill:#c9f,stroke:#333,stroke-width:2px;
    class B,C,D,E,K,N decision;