import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import type { ConstructorParams } from "@browserbasehq/stagehand"; // Import ConstructorParams for typing// Import missing function from logging
import { logLineToString } from "./logging.js";

// Cargar variables de entorno
dotenv.config();

const downloadsDirName = "downloads";
const screenshotsDirName = "screenshots";

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  // Use ConstructorParams for the type of stagehand config
  readonly stagehand: ConstructorParams = {
    // Force LOCAL environment regardless of env variables
    env: "LOCAL",
    modelName: "gemini-2.0-flash",
    modelClientOptions: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: false,
      viewport: {
        width: 1920,
        height: 1080,
      },
      cdpUrl: process.env.LOCAL_CDP_URL,
      args: [
        '--disable-web-security',
        '--disable-same-origin-policy'
      ],
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      locale: "es-ES",
      permissions: ["notifications"],
      acceptDownloads: true,
      devtools: true,
    },
    // These will be overridden in the constructor if env is LOCAL
    browserbaseSessionCreateParams: {
       projectId: process.env.BROWSERBASE_PROJECT_ID || "dummy-project-id", // Provide dummy or ensure undefined later
       browserSettings: {
         viewport: {
           width: 1920,
           height: 1080,
         },
       },
    },
    apiKey: process.env.BROWSERBASE_API_KEY,
    // Initialize other properties with default or undefined if not provided
    verbose: 1,
    domSettleTimeoutMs: 30000,
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
    // Verificar variables de entorno requeridas (non-Browserbase)
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no está definida en el archivo .env");
    }
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY no está definida en el archivo .env");
    }

    // Force LOCAL settings regardless of environment variables detected
    // Ensure Browserbase specific options are undefined for LOCAL env
    this.stagehand.browserbaseSessionCreateParams = undefined;
    this.stagehand.apiKey = undefined;
    this.stagehand.useAPI = false;

    // Ensure localBrowserLaunchOptions is defined for LOCAL env
    if (!this.stagehand.localBrowserLaunchOptions) {
         this.stagehand.localBrowserLaunchOptions = { headless: false, viewport: { width: 1280, height: 720 } };
    }
    // Remove check for BROWSERBASE variables as we are forcing LOCAL
    /*
    if (this.stagehand.env === "BROWSERBASE") {
        // This block is now unreachable because env is forced to LOCAL
    }
    */

    this.downloadsDir = path.join(process.cwd(), downloadsDirName);
    this.screenshotsDir = path.join(this.downloadsDir, screenshotsDirName);
  }

  async ensureDirectories() {
    await fs.mkdir(this.downloadsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }
}

export default new Config();