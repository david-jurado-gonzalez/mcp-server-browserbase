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
```bash
# Configuración de Stagehand MCP (parametrizable desde mcp_settings.json)
# Especifica el nombre del modelo a usar (ej: gemini-2.0-flash, gpt-4o)
STAGEHAND_MODEL_NAME=gemini-2.0-flash

# Clave de API para el modelo (usar STAGEHAND_MODEL_API_KEY en lugar de GOOGLE_API_KEY)
STAGEHAND_MODEL_API_KEY=your-api-key

# Dimensiones del viewport del navegador local
STAGEHAND_VIEWPORT_WIDTH=1920
STAGEHAND_VIEWPORT_HEIGHT=1080

# Argumentos adicionales para Chromium (separados por espacios o comas)
# Ejemplo: STAGEHAND_ARGS=--user-data-dir="C:\test-profile" --no-sandbox
STAGEHAND_ARGS=--disable-web-security,--disable-same-origin-policy

# Locale del navegador
STAGEHAND_LOCALE=es-ES

# Permisos del navegador (separados por comas)
# Ejemplo: STAGEHAND_PERMISSIONS=notifications,geolocation
STAGEHAND_PERMISSIONS=notifications

# Tiempo máximo de espera para que el DOM se estabilice (en ms)
STAGEHAND_DOM_SETTLE_TIMEOUT=30000

# Nivel de detalle del log (0: silent, 1: error, 2: warn, 3: info, 4: debug, 5: trace)
STAGEHAND_VERBOSE=1
```
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

## Configuración con Variables de Entorno

El servidor Stagehand MCP puede ser configurado utilizando variables de entorno definidas en la sección `env` de su configuración en `mcp_settings.json`. Esto permite parametrizar varios aspectos del comportamiento de Stagehand.

Las variables de entorno disponibles son:

*   `STAGEHAND_MODEL_NAME`: Especifica el nombre del modelo de lenguaje a utilizar (ej: `gemini-2.0-flash`, `gpt-4o`).
*   `STAGEHAND_MODEL_API_KEY`: Clave de API para el modelo de lenguaje configurado.
*   `STAGEHAND_VIEWPORT_WIDTH`: Ancho del viewport del navegador local en píxeles.
*   `STAGEHAND_VIEWPORT_HEIGHT`: Alto del viewport del navegador local en píxeles.
*   `STAGEHAND_ARGS`: Argumentos adicionales para pasar a la instancia de Chromium. Múltiples argumentos pueden ser separados por espacios o comas (ej: `--user-data-dir="C:\test-profile" --no-sandbox`).
*   `STAGEHAND_LOCALE`: Configura el locale del navegador (ej: `es-ES`, `en-US`).
*   `STAGEHAND_PERMISSIONS`: Configura los permisos del navegador. Múltiples permisos pueden ser separados por comas (ej: `notifications`, `geolocation`).
*   `STAGEHAND_DOM_SETTLE_TIMEOUT`: Tiempo máximo en milisegundos que Stagehand esperará a que el DOM se estabilice antes de realizar una acción.
*   `STAGEHAND_VERBOSE`: Nivel de detalle del log de Stagehand (0: silent, 1: error, 2: warn, 3: info, 4: debug, 5: trace).
*   `STAGEHAND_DOWNLOADS_DIR_NAME`: Especifica el nombre del directorio donde se guardarán las descargas. Es relativo al directorio de trabajo del servidor. Por defecto es "downloads".
*   `STAGEHAND_SCREENSHOTS_DIR_NAME`: Especifica el nombre del directorio donde se guardarán las capturas de pantalla. Es relativo al directorio de descargas. Por defecto es "screenshots".

Ejemplo de configuración en `mcp_settings.json`:

```json
{
  "mcpServers": {
    "stagehand-server": {
      "command": "node",
      "args": ["path/to/stagehand-mcp/dist/index.js"],
      "env": {
        "STAGEHAND_MODEL_NAME": "gemini-2.0-flash",
        "STAGEHAND_MODEL_API_KEY": "your-api-key",
        "STAGEHAND_VIEWPORT_WIDTH": "1920",
        "STAGEHAND_VIEWPORT_HEIGHT": "1080",
        "STAGEHAND_ARGS": "--user-data-dir=\"C:\\test-profile\"",
        "STAGEHAND_LOCALE": "es-ES",
        "STAGEHAND_PERMISSIONS": "notifications,geolocation",
        "STAGEHAND_DOM_SETTLE_TIMEOUT": "45000",
        "STAGEHAND_VERBOSE": "3"
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
```
