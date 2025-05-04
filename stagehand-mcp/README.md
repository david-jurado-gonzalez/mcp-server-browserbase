# Stagehand MCP Server

Servidor MCP que proporciona herramientas de automatización de navegador basadas en Stagehand, con soporte para múltiples instancias de navegador.

## Instalación

0. Construir:

```bash
npm run build
```

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

## Soporte para Múltiples Instancias y Alias

Este servidor Stagehand MCP ahora soporta la gestión de múltiples instancias de navegador Stagehand simultáneamente. Cada instancia puede ser identificada y referenciada utilizando un `alias`.

- Al usar la herramienta `stagehand_navigate`, se puede proporcionar un `alias` opcional. Si se proporciona un alias y ya existe una instancia con ese alias, se navegará en esa instancia existente. Si no existe, se creará una nueva instancia con ese alias. Si no se proporciona un alias, se creará una nueva instancia con un alias generado automáticamente (un contador numérico: "1", "2", "3", etc.).
- Para las demás herramientas (`stagehand_act`, `stagehand_extract`, `stagehand_observe`, `screenshot`, `stagehand_agent_execute`), se puede especificar un `alias` opcional para indicar en qué instancia de Stagehand se debe ejecutar la herramienta.
- Si no se especifica un `alias` para estas herramientas, la operación se realizará en la última instancia de Stagehand que fue creada o utilizada (la última instancia "activa").

Esto permite controlar y automatizar múltiples páginas web de forma independiente dentro de la misma sesión del servidor MCP.

## Herramientas Disponibles

Las herramientas disponibles a través de este servidor MCP son:

- **stagehand_navigate**: Navega a una URL específica en una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, crea una nueva instancia con un alias por defecto.
    - **Parámetros:**
        - `url` (string, requerido): La URL a navegar.
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar o crear.

- **stagehand_act**: Realiza acciones en elementos de la página de una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, usa la última instancia activa.
    - **Parámetros:**
        - `action` (string, opcional): Instrucción en lenguaje natural para la acción.
        - `variables` (object, opcional): Variables para la acción.
        - `selector` (string, opcional): Selector del elemento (usar con `method` y `description`).
        - `method` (string, opcional): Método a aplicar (`click`, `type`, `hover`, `scroll`, `select`).
        - `description` (string, opcional): Descripción del elemento.
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar.

- **stagehand_extract**: Extrae información de la página actual de una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, usa la última instancia activa.
    - **Parámetros:**
        - `instruction` (string, opcional): Instrucción para la extracción.
        - `schema` (string, opcional): Esquema JSON para validar y estructurar la salida.
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar.

- **stagehand_observe**: Observa elementos en la página de una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, usa la última instancia activa.
    - **Parámetros:**
        - `instruction` (string, requerido): Instrucción para la observación.
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar.

- **screenshot**: Toma una captura de pantalla de la página actual de una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, usa la última instancia activa. Las capturas se guardan en el directorio configurado (por defecto `downloads/screenshots`).
    - **Parámetros:**
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar.

- **stagehand_agent_execute**: Ejecuta una instrucción en lenguaje natural utilizando el agente Stagehand en una instancia de navegador. Acepta un parámetro opcional `alias` para especificar la instancia. Si no se proporciona, usa la última instancia activa.
    - **Parámetros:**
        - `instruction` (string, requerido): La instrucción para el agente.
        - `alias` (string, opcional): El alias de la instancia de Stagehand a utilizar.

## Estructura del Proyecto

```
stagehand-mcp/
├── src/
│   ├── config.ts      # Configuración del servidor
│   ├── index.ts       # Punto de entrada
│   ├── logging.ts     # Configuración y utilidades de logging
│   ├── prompts.ts     # Prompts utilizados por Stagehand (si aplica)
│   ├── resources.ts   # Definición de recursos MCP (ej: capturas de pantalla)
│   ├── server.ts      # Configuración del servidor MCP y registro de herramientas/recursos
│   ├── stagehandManager.ts # Gestión de múltiples instancias de Stagehand
│   ├── tools.ts       # Implementación de herramientas MCP
│   └── utils.ts       # Funciones de utilidad
├── downloads/
│   └── screenshots/   # Capturas de pantalla guardadas
├── package.json
├── tsconfig.json
└── .env               # Variables de entorno para configuración
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
