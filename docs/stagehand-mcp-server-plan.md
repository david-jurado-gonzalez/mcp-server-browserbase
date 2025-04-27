# Plan para Integrar Funcionalidad de `stagehand` en `stagehand-mcp`

Este documento detalla el plan para integrar funcionalidades clave del servidor MCP `stagehand` original en el servidor `stagehand-mcp`, manteniendo la estructura organizada y reutilizando código relevante.

**Objetivo:** Replicar la funcionalidad de manejo de peticiones MCP estándar (ListTools, ListResources, ReadResource, ListPrompts, GetPrompt) y adaptar el manejo de `CallTool` en `stagehand-mcp`, utilizando una estructura similar a la del servidor `stagehand` original.

**Archivos Origen:** `c:/Users/David/Documents/MCP/mcp-server-browserbase/stagehand/src`
**Archivos Destino:** `c:/Users/David/Documents/MCP/mcp-server-browserbase/stagehand-mcp/src`

## Pasos del Plan

1.  **Crear Archivos Base en `stagehand-mcp/src`:**
    *   Crear un nuevo archivo: `stagehand-mcp/src/server.ts`. Este archivo contendrá la lógica principal para crear, configurar y gestionar la instancia del servidor MCP.
    *   Copiar `stagehand/src/logging.ts` a `stagehand-mcp/src/logging.ts`.
    *   Copiar `stagehand/src/utils.ts` a `stagehand-mcp/src/utils.ts`.
    *   Copiar `stagehand/src/prompts.ts` a `stagehand-mcp/src/prompts.ts`.
    *   Copiar `stagehand/src/resources.ts` a `stagehand-mcp/src/resources.ts`.
    *   *Nota:* `stagehand-mcp/src/tools.ts` ya existe y se utilizará su contenido actual.

2.  **Adaptar `stagehand-mcp/src/server.ts`:**
    *   Mover la lógica de creación de `McpServer` desde `stagehand-mcp/src/index.ts` a una función `createServer()` dentro de `stagehand-mcp/src/server.ts`.
    *   Importar las dependencias necesarias (`@modelcontextprotocol/sdk`, `Stagehand`, `config` desde `./config.ts`, `tools` desde `./tools.ts`, `logging` desde `./logging.ts`, `utils` desde `./utils.ts`, `prompts` desde `./prompts.ts`, `resources` desde `./resources.ts`).
    *   Replicar la estructura de `stagehand/src/server.ts` para registrar los handlers de peticiones MCP estándar mediante `server.setRequestHandler()`:
        *   Implementar el handler para `ListToolsRequestSchema` utilizando la definición de `TOOLS` de `stagehand-mcp/src/tools.ts`.
        *   Implementar los handlers para `ListResourcesRequestSchema`, `ListResourceTemplatesRequestSchema`, `ReadResourceRequestSchema` utilizando las funciones de `stagehand-mcp/src/resources.ts`.
        *   Implementar los handlers para `ListPromptsRequestSchema` y `GetPromptRequestSchema` utilizando las funciones y definiciones de `stagehand-mcp/src/prompts.ts`.
    *   Adaptar el handler `CallToolRequestSchema` (actualmente implementado con `server.tool()` en `index.ts`) para que funcione dentro de la estructura `server.setRequestHandler()`. Se asegurará de inicializar `Stagehand` (posiblemente con una función `ensureStagehand` similar a la original) y utilizará `handleToolCall` de `stagehand-mcp/src/tools.ts`.
    *   Integrar la lógica de logging de `stagehand-mcp/src/logging.ts` (ej., `logRequest`, `logResponse`, `setServerInstance`).
    *   **Importante:** Utilizar la configuración existente definida en `stagehand-mcp/src/config.ts` para la inicialización de `Stagehand` y otras configuraciones relevantes.

3.  **Adaptar Archivos Copiados (`logging.ts`, `utils.ts`, `prompts.ts`, `resources.ts`):**
    *   Revisar las importaciones y rutas relativas en estos archivos para asegurarse de que sean correctas dentro del contexto de `stagehand-mcp`.
    *   Ajustar cualquier lógica específica que dependa de la estructura o configuración de `stagehand` si es necesario (p. ej., rutas de logs en `logging.ts`).

4.  **Refactorizar `stagehand-mcp/src/index.ts`:**
    *   Eliminar la lógica de creación y configuración del servidor MCP (`new McpServer(...)`, `server.tool(...)`).
    *   Importar la función `createServer` desde `./server.ts`.
    *   Modificar la función `main` para:
        *   Llamar a `createServer()` para obtener la instancia del servidor.
        *   Mantener la inicialización de `Stagehand` (o moverla a `server.ts` si se centraliza allí, por ejemplo, en `ensureStagehand`).
        *   Mantener la lógica de conexión del transporte (`StdioServerTransport`) y el inicio del servidor (`server.connect(transport)`).
        *   Mantener los manejadores de señales (`SIGINT`, `SIGTERM`) para el cierre limpio de `Stagehand`.

5.  **Revisar Dependencias (`stagehand-mcp/package.json`):**
    *   Asegurarse de que todas las dependencias necesarias (`@modelcontextprotocol/sdk`, `@browserbasehq/stagehand`, `zod`, etc.) estén presentes y actualizadas si es necesario.

## Diagrama de Flujo (Simplificado)

```mermaid
graph TD
    A[index.ts: main()] --> B(server.ts: createServer());
    B --> C{Crea Instancia McpServer};
    C --> D[Registra Handlers Estándar];
    D --> E[Registra Handler CallTool];
    B --> F(index.ts: Conecta Transporte);
    F --> G(index.ts: Inicia Servidor);

    subgraph server.ts
        direction LR
        B --- H(Importa config.ts);
        B --- I(Importa tools.ts);
        B --- J(Importa logging.ts);
        B --- K(Importa utils.ts);
        B --- L(Importa prompts.ts);
        B --- M(Importa resources.ts);
        D --- J;
        D --- K;
        D --- L;
        D --- M;
        E --- I;
        E --- J;
        E --- H; # Usa config para Stagehand
    end

    subgraph utils Copiados/Adaptados
        direction LR
        J --- N[logging.ts];
        K --- O[utils.ts];
        L --- P[prompts.ts];
        M --- Q[resources.ts];
    end

    subgraph index.ts
        direction LR
        A --- F;
        F --- G;
        A --- R(Inicializa Stagehand?); # O se mueve a server.ts
        A --- S(Maneja SIGINT/SIGTERM);
    end
```

## Próximos Pasos

Una vez revisado y confirmado este plan, el siguiente paso es solicitar el cambio al modo "Code" para comenzar la implementación.