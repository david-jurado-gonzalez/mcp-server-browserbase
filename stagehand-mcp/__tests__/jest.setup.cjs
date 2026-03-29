/**
 * Se ejecuta antes de cargar el entorno de pruebas.
 * Evita que index.ts arranque main() al importarse (comparación de entrypoint).
 */
process.env.STAGEHAND_MCP_UNDER_TEST = '1';
