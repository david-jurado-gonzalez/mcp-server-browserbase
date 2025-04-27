import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import type { ConstructorParams } from "@browserbasehq/stagehand"; // Import ConstructorParams for typing

// Cargar variables de entorno
dotenv.config();

const downloadsDirName = "downloads";
const screenshotsDirName = "screenshots";

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  // Use ConstructorParams for the type of stagehand config
  readonly stagehand: ConstructorParams = {
    // Removed headless from top level
    // Assert the type of the conditional expression
    env: (process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) ? "BROWSERBASE" : "LOCAL" as ConstructorParams['env'],
    modelName: "gemini-2.0-flash",
    modelClientOptions: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: false, // headless is inside localBrowserLaunchOptions
      viewport: {
        width: 1280,
        height: 720,
      },
      cdpUrl: process.env.LOCAL_CDP_URL,
    },
    browserbaseSessionCreateParams: {
       projectId: process.env.BROWSERBASE_PROJECT_ID!,
       browserSettings: {
         viewport: {
           width: 1280,
           height: 720,
         },
       },
    },
    apiKey: process.env.BROWSERBASE_API_KEY,
    // Initialize other properties with default or undefined if not provided
    verbose: 1,
    domSettleTimeoutMs: 30000,
    enableCaching: false,
    browserbaseSessionID: undefined,
    systemPrompt: undefined,
    useAPI: false,
    waitForCaptchaSolves: false,
    logInferenceToFile: false,
    disablePino: undefined,
  };

  constructor() {
    // Verificar variables de entorno requeridas
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no está definida en el archivo .env");
    }
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY no está definida en el archivo .env");
    }

    // Solo verificar variables de Browserbase si el entorno es BROWSERBASE
    if (this.stagehand.env === "BROWSERBASE") {
        if (!process.env.BROWSERBASE_API_KEY) {
            throw new Error("BROWSERBASE_API_KEY no está definida en el archivo .env para el entorno BROWSERBASE");
        }
        if (!process.env.BROWSERBASE_PROJECT_ID) {
            throw new Error("BROWSERBASE_PROJECT_ID no está definida en el archivo .env para el entorno BROWSERBASE");
        }
        // If using Browserbase, useAPI should be true
        this.stagehand.useAPI = true;
    } else {
        // If using LOCAL, ensure Browserbase specific options are undefined
        this.stagehand.browserbaseSessionCreateParams = undefined;
        this.stagehand.apiKey = undefined;
        this.stagehand.useAPI = false;
        // Also ensure localBrowserLaunchOptions is defined for LOCAL env
        if (!this.stagehand.localBrowserLaunchOptions) {
             this.stagehand.localBrowserLaunchOptions = { headless: false, viewport: { width: 1280, height: 720 } };
        }
    }


    this.downloadsDir = path.join(process.cwd(), downloadsDirName);
    this.screenshotsDir = path.join(this.downloadsDir, screenshotsDirName);
  }

  async ensureDirectories() {
    await fs.mkdir(this.downloadsDir, { recursive: true });
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }
}

export default new Config();