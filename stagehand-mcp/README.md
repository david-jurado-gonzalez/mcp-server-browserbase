# Stagehand MCP Server

Servidor MCP que proporciona herramientas de automatización de navegador basadas en Stagehand.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo .env:
```bash
cp .env.example .env
```

3. Configurar las variables de entorno en el archivo .env:
- `GOOGLE_GENERATIVE_AI_API_KEY`: Clave de API para Google AI
- `GOOGLE_API_KEY`: Clave de API de Google

## Herramientas Disponibles

- **stagehand_navigate**: Navega a una URL específica en el navegador
- **stagehand_act**: Realiza acciones en elementos de la página
- **stagehand_cachedact**: Realiza acciones observadas en elementos de la página
- **stagehand_extract**: Extrae texto de la página actual
- **stagehand_observe**: Observa elementos en la página
- **screenshot**: Toma capturas de pantalla (se guardan en downloads/screenshots)

## Estructura del Proyecto

```
stagehand-mcp/
├── src/
│   ├── config.ts      # Configuración del servidor
│   ├── index.ts       # Punto de entrada
│   └── tools.ts       # Implementación de herramientas
├── downloads/
│   └── screenshots/   # Capturas de pantalla
├── package.json
├── tsconfig.json
└── .env
```

## Uso

1. Iniciar el servidor:
```bash
npm start
```

2. Depuración con Chrome DevTools:
```bash
npm run debug
npm run start:debug
```

El servidor se puede configurar en mcp_settings.json con este formato:

```json
{
  "mcpServers": {
    "stagehand-server": {
      "command": "node",
      "args": ["path/to/stagehand-mcp/dist/index.js"],
      "env": {
        "GOOGLE_GENERATIVE_AI_API_KEY": "your-ai-key",
        "GOOGLE_API_KEY": "your-google-key"
      },
      "disabled": false,
      "alwaysAllow": [
        "screenshot",
        "stagehand_observe",
        "stagehand_extract",
        "stagehand_act",
        "stagehand_cachedact",
        "stagehand_navigate"
      ]
    }
  }
}