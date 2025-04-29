import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import type { ConstructorParams } from "@browserbasehq/stagehand"; // Import ConstructorParams for typing// Import missing function from logging
import { logLineToString } from "./logging.js";

// Cargar variables de entorno
dotenv.config();

const downloadsDirName = process.env.STAGEHAND_DOWNLOADS_DIR_NAME || "downloads";
const screenshotsDirName = process.env.STAGEHAND_SCREENSHOTS_DIR_NAME || "screenshots";

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  // Use ConstructorParams for the type of stagehand config
  readonly stagehand: ConstructorParams = {
    // Force LOCAL environment regardless of env variables
    env: "LOCAL",
    modelName: (process.env.STAGEHAND_MODEL_NAME || "gemini-2.0-flash") as ConstructorParams['modelName'], // Añadir casting
    modelClientOptions: {
      apiKey: process.env.STAGEHAND_MODEL_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: false, // Mantener headless en false por defecto para desarrollo local
      viewport: {
        width: parseInt(process.env.STAGEHAND_VIEWPORT_WIDTH || "1920", 10),
        height: parseInt(process.env.STAGEHAND_VIEWPORT_HEIGHT || "1080", 10),
      },
      // cdpUrl: process.env.LOCAL_CDP_URL, // Mantener cdpUrl de variable de entorno existente
      args: [
        ...(process.env.STAGEHAND_ARGS ? process.env.STAGEHAND_ARGS.split(/[ ,]+/) : []), // Añadir args desde variable de entorno
      ],
      ignoreHTTPSErrors: true, // Mantener por defecto
      bypassCSP: true, // Mantener por defecto
      locale: process.env.STAGEHAND_LOCALE || "es-ES",
      permissions: [
        ...(process.env.STAGEHAND_PERMISSIONS ? process.env.STAGEHAND_PERMISSIONS.split(/[ ,]+/) : []), // Añadir permissions desde variable de entorno
      ],
      acceptDownloads: true, // Mantener por defecto
      devtools: true, // Mantener por defecto
    },
    // These will be overridden in the constructor if env is LOCAL
    browserbaseSessionCreateParams: undefined, // Anulado en el constructor
    apiKey: undefined, // Anulado en el constructor
    // Initialize other properties with default or undefined if not provided
    verbose: parseInt(process.env.STAGEHAND_VERBOSE || "1", 10) as ConstructorParams['verbose'], // Añadir casting
    domSettleTimeoutMs: parseInt(process.env.STAGEHAND_DOM_SETTLE_TIMEOUT || "30000", 10), // Parametrizar domSettleTimeoutMs
    browserbaseSessionID: undefined,
    systemPrompt: undefined,
    useAPI: false, // Default to false, ensure it stays false for LOCAL
    waitForCaptchaSolves: false,
    logInferenceToFile: false,
    disablePino: undefined,
    enableCaching: true /* Enable caching functionality */,
    logger: (message) => console.error( logLineToString(message) ) /* Custom logging function to stderr */,
  };

  constructor() {
    // No verificar variables de entorno requeridas aquí, se manejará en la inicialización de Stagehand si faltan.
    this.downloadsDir = path.join(process.cwd(), downloadsDirName);
    this.screenshotsDir = path.join(this.downloadsDir, screenshotsDirName);
  }

  async ensureDirectories() {
    await fs.mkdir(this.downloadsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }
}

export default new Config();