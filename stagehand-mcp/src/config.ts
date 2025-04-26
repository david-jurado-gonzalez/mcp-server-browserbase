import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
// import type { ConstructorParams } from "@browserbasehq/stagehand"; // Comentar la importación temporalmente

// Cargar variables de entorno
dotenv.config();

const downloadsDirName = "downloads";
const screenshotsDirName = "screenshots";

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  readonly stagehand = { // Eliminar la anotación de tipo temporalmente
    headless: false, // Propiedad headless
    env: "LOCAL" as const, // Usar el entorno local para Chrome
    modelName: "gemini-2.0-flash" as const, // Usar tipo literal y as const
    modelClientOptions: { // Opciones del cliente del modelo
      apiKey: process.env.GOOGLE_API_KEY,
    },
    localBrowserLaunchOptions: { // Opciones de lanzamiento del navegador local
      headless: false, // Propiedad headless dentro de localBrowserLaunchOptions
      viewport: {
        width: 1280,
        height: 720,
      },
    },
    browserbaseSessionCreateParams: { // Parámetros de creación de sesión de Browserbase
       projectId: process.env.BROWSERBASE_PROJECT_ID!, // Asumiendo que esto es necesario
       browserSettings: {
         viewport: {
           width: 1280,
           height: 720,
         },
       },
    },
    // Otras propiedades relevantes del constructor de Stagehand si son necesarias:
    // verbose: 1,
    // domSettleTimeoutMs: 30000,
    // enableCaching: false,
    // browserbaseSessionID: undefined,
    // systemPrompt: undefined,
    // useAPI: false,
    // waitForCaptchaSolves: false,
    // logInferenceToFile: false,
    // selfHeal: false,
    // disablePino: undefined,
  };

  constructor() {
    // Verificar variables de entorno requeridas
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no está definida en el archivo .env");
    }
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY no está definida en el archivo .env");
    }
     if (!process.env.BROWSERBASE_PROJECT_ID) { // Verificar también BROWSERBASE_PROJECT_ID
       throw new Error("BROWSERBASE_PROJECT_ID no está definida en el archivo .env");
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