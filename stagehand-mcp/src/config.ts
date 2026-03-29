/**
 * Configuración singleton: directorios de artefactos + parámetros {@link ConstructorParams} de Stagehand.
 *
 * Los enteros y listas desde env usan helpers para no propagar `NaN` ni entradas vacías.
 */
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import type { ConstructorParams } from "@browserbasehq/stagehand";
import { logLineToString } from "./logging.js";

// Cargar variables de entorno (.env)
dotenv.config();

const downloadsDirName = process.env.STAGEHAND_DOWNLOADS_DIR_NAME || "downloads";
const screenshotsDirName = process.env.STAGEHAND_SCREENSHOTS_DIR_NAME || "screenshots";

/** Entero desde env; si falta o no es finito, `fallback`. */
function parseIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

/** Lista desde env: separadores espacio o coma; se recortan y se omiten vacíos. */
function parseListEnv(name: string): string[] {
  const rawValue = process.env[name];
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[ ,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  readonly stagehand: ConstructorParams = {
    // Forzar LOCAL; sesión Browserbase no se usa en este fork orientado a CDP local.
    env: "LOCAL",
    modelName: (process.env.STAGEHAND_MODEL_NAME || "gemini-2.0-flash") as ConstructorParams["modelName"],
    modelClientOptions: {
      apiKey: process.env.STAGEHAND_MODEL_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: false, // false por defecto para depuración visual en desarrollo
      viewport: {
        width: parseIntegerEnv("STAGEHAND_VIEWPORT_WIDTH", 1920),
        height: parseIntegerEnv("STAGEHAND_VIEWPORT_HEIGHT", 1080),
      },
      args: parseListEnv("STAGEHAND_ARGS"),
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      locale: process.env.STAGEHAND_LOCALE || "es-ES",
      permissions: parseListEnv("STAGEHAND_PERMISSIONS"),
      acceptDownloads: true,
      devtools: true,
    },
    browserbaseSessionCreateParams: undefined,
    apiKey: undefined, // no aplica en modo LOCAL
    verbose: parseIntegerEnv("STAGEHAND_VERBOSE", 1) as ConstructorParams["verbose"],
    domSettleTimeoutMs: parseIntegerEnv("STAGEHAND_DOM_SETTLE_TIMEOUT", 30000),
    browserbaseSessionID: undefined,
    systemPrompt: undefined,
    useAPI: false,
    waitForCaptchaSolves: false,
    logInferenceToFile: false,
    disablePino: undefined,
    enableCaching: true,
    logger: (message) => console.error(logLineToString(message)),
  };

  constructor() {
    // Faltas de API key / modelo se detectan al inicializar Stagehand, no aquí.
    this.downloadsDir = path.join(process.cwd(), downloadsDirName);
    this.screenshotsDir = path.join(this.downloadsDir, screenshotsDirName);
  }

  async ensureDirectories() {
    await fs.mkdir(this.downloadsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }
}

export default new Config();