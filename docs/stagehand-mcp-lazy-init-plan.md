# Plan para inicializar Stagehand bajo demanda en stagehand-mcp

Este plan detalla los pasos necesarios para modificar el servidor MCP de Stagehand (`stagehand-mcp`) para que la instancia de `Stagehand` se inicialice solo la primera vez que se invoca una herramienta, en lugar de al iniciar el servidor.

## Objetivo

Modificar el servidor `stagehand-mcp` para retrasar la inicialización de la instancia de `Stagehand` hasta la primera llamada a una herramienta, específicamente `stagehand_navigate`.

## Plan Detallado

1.  **Modificar `stagehand-mcp/src/index.ts`:**
    *   Eliminar la inicialización de `Stagehand` y el bloque `try...catch` asociado.
    *   Eliminar la llamada a `setStagehandInstance(stagehand)`.
    *   Ajustar los manejadores de señales (`SIGINT`, `SIGTERM`) para que solo intenten cerrar `stagehand` si la instancia existe (obteniéndola a través de un nuevo módulo auxiliar).

2.  **Crear un módulo auxiliar para la instancia de Stagehand (`stagehand-mcp/src/stagehandManager.ts`):**
    *   Declarar una variable `stagehandInstance: Stagehand | null = null;` a nivel de módulo.
    *   Exportar una función `getStagehandInstance()` que devuelva la instancia actual o `null`.
    *   Exportar una función asíncrona `initializeStagehand()` que cree y retorne una nueva instancia de `Stagehand` si `stagehandInstance` es `null`. Esta función debería incluir la lógica de `try...catch` para la inicialización y asignar la nueva instancia a `stagehandInstance`.
    *   Exportar una función asíncrona `closeStagehand()` que cierre la instancia si existe y la establezca en `null`.

3.  **Modificar `stagehand-mcp/src/tools.ts`:**
    *   Importar `getStagehandInstance` y `initializeStagehand` del nuevo módulo `stagehandManager.ts`.
    *   Modificar la función `handleToolCall`:
        *   Antes del `switch`, obtener la instancia de Stagehand usando `getStagehandInstance()`.
        *   Si la instancia es `null`:
            *   Verificar si la herramienta solicitada es `stagehand_navigate`.
            *   Si es `stagehand_navigate`, llamar a `initializeStagehand()` para crear la instancia. Manejar posibles errores de inicialización.
            *   Si no es `stagehand_navigate`, devolver un error indicando que el navegador no está inicializado y que se debe usar `stagehand_navigate` primero.
        *   Si la instancia existe, proceder con el `switch` como antes, utilizando la instancia obtenida.

4.  **Modificar `stagehand-mcp/src/server.ts`:**
    *   Eliminar la función `setStagehandInstance`.
    *   Ajustar la función `createServer` para que no espere una instancia de Stagehand.
    *   Modificar el registro de herramientas para que `handleToolCall` se llame sin pasar la instancia de Stagehand directamente, ya que ahora se obtendrá internamente a través del módulo auxiliar.

5.  **Ajustar la lógica de cierre en `index.ts`:**
    *   Importar `closeStagehand` del nuevo módulo `stagehandManager.ts`.
    *   En los manejadores de señales (`SIGINT`, `SIGTERM`), llamar a `closeStagehand()` en lugar de `stagehand.close()`.

## Diagrama de Flujo

```mermaid
graph TD
    A[Inicio del Servidor MCP] --> B{Llamada a Herramienta?};
    B -- Sí --> C{Herramienta es stagehand_navigate?};
    C -- Sí --> D{Stagehand Inicializado?};
    D -- No --> E[Inicializar Stagehand];
    E --> F[Ejecutar Herramienta stagehand_navigate];
    D -- Sí --> F[Ejecutar Herramienta stagehand_navigate];
    C -- No --> G{Stagehand Inicializado?};
    G -- No --> H[Devolver Error: Navegador no Inicializado];
    G -- Sí --> I[Ejecutar Otra Herramienta Stagehand];
    B -- No --> A; % Loop back or wait for call
    F --> J[Devolver Resultado de Herramienta];
    I --> J;
    H --> J;