# Plan de Mejora para la herramienta `stagehand_extract`

Este documento detalla el plan para mejorar la herramienta `stagehand_extract` en el servidor MCP `stagehand-mcp`, añadiendo parámetros opcionales y documentando los cambios.

**Objetivo:** Mejorar la funcionalidad de `stagehand_extract` y actualizar su documentación para reflejar los nuevos parámetros opcionales.

**Archivos a modificar:**
*   `stagehand-mcp/src/tools.ts`: Implementación de la herramienta `stagehand_extract`.
*   `stagehand-mcp/src/resources/ai_assistant_guide.md`: Documentación para asistentes de IA sobre el uso de las herramientas de Stagehand MCP.

**Pasos a seguir:**

1.  **Leer el contenido actual de `stagehand-mcp/src/tools.ts`:** Analizar la implementación existente de `stagehand_extract`.
2.  **Leer el contenido actual de `stagehand-mcp/src/resources/ai_assistant_guide.md`:** Identificar la sección de documentación de `stagehand_extract`.
3.  **Analizar la documentación de `page.extract` (https://docs.stagehand.dev/reference/extract):** Utilizar esta documentación como referencia para identificar parámetros opcionales relevantes.
4.  **Proponer e implementar parámetros opcionales en `stagehand-mcp/src/tools.ts`:** Añadir parámetros como `timeout`, `waitUntil`, y `selector` a la definición y lógica de `stagehand_extract`.
5.  **Actualizar la documentación en `stagehand-mcp/src/resources/ai_assistant_guide.md`:** Documentar los nuevos parámetros opcionales, explicando su propósito y uso, basándose en la documentación de `page.extract`.
6.  **Realizar pruebas:** Asegurar que los nuevos parámetros funcionan correctamente y que la herramienta sigue extrayendo información como se espera.

**Diagrama del Plan:**

```mermaid
graph TD
    A[Leer stagehand-mcp/src/tools.ts] --> B{Leer stagehand-mcp/src/resources/ai_assistant_guide.md};
    B --> C{Analizar documentación de page.extract};
    C --> D{Proponer parámetros opcionales};
    D --> E{Crear plan detallado};
    E --> F{Solicitar aprobación del plan};
    F --> G{Escribir plan en Markdown};
    G --> H{Solicitar cambio de modo a "code"};
```

Este plan será implementado en el modo "code".