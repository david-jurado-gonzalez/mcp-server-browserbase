import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const downloadsDirName = "downloads";
const screenshotsDirName = "screenshots";

class Config {
  readonly downloadsDir: string;
  readonly screenshotsDir: string;
  readonly stagehand = {
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    headless: false,
    env: "LOCAL" as const, // Usar el entorno local para Chrome
    envVars: {
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
    },
  };

  constructor() {
    // Verificar variables de entorno requeridas
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no está definida en el archivo .env");
    }
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY no está definida en el archivo .env");
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