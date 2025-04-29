# Plan de Parametrización del Servidor Stagehand MCP

## Objetivo

Permitir que la configuración del servidor Stagehand MCP se especifique a través de variables de entorno definidas en `mcp_settings.json`.

## Pasos

1.  **Modificar `stagehand-mcp/src/config.ts`:**
    *   Actualizar la clase `Config` para leer los valores de las variables de entorno para los siguientes parámetros:
        *   `modelName`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_MODEL_NAME`. Usar un valor por defecto si no está definida.
        *   `modelClientOptions.apiKey`: Leer de una variable de entorno llamada `API_KEY`. Asegurarse de que se mapea correctamente a `modelClientOptions.apiKey`.
        *   `localBrowserLaunchOptions.viewport.width`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_VIEWPORT_WIDTH`. Convertir a número. Usar un valor por defecto.
        *   `localBrowserLaunchOptions.viewport.height`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_VIEWPORT_HEIGHT`. Convertir a número. Usar un valor por defecto.
        *   `localBrowserLaunchOptions.args`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_ARGS`. Esta variable podría ser una cadena separada por espacios o comas que se dividirá en un array de strings. Incluir los argumentos por defecto actuales y añadir los de la variable de entorno.
        *   `localBrowserLaunchOptions.locale`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_LOCALE`. Usar un valor por defecto.
        *   `localBrowserLaunchOptions.permissions`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_PERMISSIONS`. Esta variable podría ser una cadena separada por comas que se dividirá en un array de strings. Incluir los permisos por defecto actuales y añadir los de la variable de entorno.
        *   `domSettleTimeoutMs`: Leer de una variable de entorno, por ejemplo, `STAGEHAND_DOM_SETTLE_TIMEOUT`. Convertir a número. Usar un valor por defecto.
    *   Implementar lógica para parsear las variables de entorno de arrays (`STAGEHAND_ARGS`, `STAGEHAND_PERMISSIONS`) si se proporcionan como cadenas.
    *   Mantener los valores por defecto actuales si las variables de entorno no están definidas.
    *   Eliminar las verificaciones de `GOOGLE_GENERATIVE_AI_API_KEY` y `GOOGLE_API_KEY` en el constructor.
    *   Asegurarse de que la lógica para forzar el entorno `LOCAL` y anular las opciones de Browserbase API se mantiene.

2.  **Actualizar `stagehand-mcp/.env.example`:**
    *   Añadir ejemplos de las nuevas variables de entorno (`STAGEHAND_MODEL_NAME`, `API_KEY`, `STAGEHAND_VIEWPORT_WIDTH`, `STAGEHAND_VIEWPORT_HEIGHT`, `STAGEHAND_ARGS`, `STAGEHAND_LOCALE`, `STAGEHAND_PERMISSIONS`, `STAGEHAND_DOM_SETTLE_TIMEOUT`).

3.  **Documentar los cambios en `stagehand-mcp/README.md`:**
    *   Explicar cómo configurar el servidor Stagehand MCP usando las variables de entorno en `mcp_settings.json`.

## Diagrama de Flujo de Configuración

```mermaid
graph TD
    A[mcp_settings.json] --> B{Variables de Entorno};
    B --> C[stagehand-mcp/src/config.ts];
    C --> D[Stagehand Instance];
    D --> E[Stagehand MCP Server];
    E --> F[Uso de Herramientas Stagehand];

    B -- STAGEHAND_MODEL_NAME --> C;
    B -- API_KEY --> C;
    B -- STAGEHAND_VIEWPORT_WIDTH --> C;
    B -- STAGEHAND_VIEWPORT_HEIGHT --> C;
    B -- STAGEHAND_ARGS --> C;
    B -- STAGEHAND_LOCALE --> C;
    B -- STAGEHAND_PERMISSIONS --> C;
    B -- STAGEHAND_DOM_SETTLE_TIMEOUT --> C;

    C -- Configuración --> D;
    D -- Inicialización --> E;
    E -- Llamada a Herramienta --> F;