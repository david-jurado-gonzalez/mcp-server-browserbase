import { Stagehand } from "@browserbasehq/stagehand";
import config from "./config.js";
import { log } from "./logging.js";

let stagehandInstance: Stagehand | null = null;

export function getStagehandInstance(): Stagehand | null {
  return stagehandInstance;
}

export async function initializeStagehand(): Promise<Stagehand> {
  if (stagehandInstance === null) {
    log("Initializing Stagehand...", "info");
    try {
      stagehandInstance = new Stagehand(config.stagehand);
      await stagehandInstance.init();
      log("Stagehand initialized successfully.", "info");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Failed to initialize Stagehand: ${errorMsg}`, "error");
      console.error(`Failed to initialize Stagehand: ${errorMsg}`);
      // No salir del proceso aquí, permitir que el error se maneje en la llamada a la herramienta
      throw new Error(`Failed to initialize Stagehand: ${errorMsg}`);
    }
  }
  return stagehandInstance;
}

export async function closeStagehand(): Promise<void> {
  if (stagehandInstance !== null) {
    log("Closing Stagehand...", "info");
    try {
      await stagehandInstance.close();
      log("Stagehand closed successfully.", "info");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error closing Stagehand: ${errorMsg}`, "error");
      console.error(`Error closing Stagehand: ${errorMsg}`);
    } finally {
      stagehandInstance = null;
    }
  }
}