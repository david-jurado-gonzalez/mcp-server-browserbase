import { Stagehand } from "@browserbasehq/stagehand";
import config from "./config.js";
import { log } from "./logging.js";

const stagehandInstances = new Map<string, Stagehand>();
let lastCreatedAlias: string | null = null;
let instanceCounter = 0;

export function getStagehandInstance(alias?: string): Stagehand | undefined {
  if (alias) {
    const stagehand = stagehandInstances.get(alias);
    if (stagehand) {
      lastCreatedAlias = alias;
    }
    return stagehand;
  }

  if (lastCreatedAlias) {
    return stagehandInstances.get(lastCreatedAlias);
  }

  return undefined;
}

export async function createStagehandInstance(alias?: string): Promise<Stagehand> {
  let instanceAlias = alias;
  if (!instanceAlias) {
    instanceCounter++;
    instanceAlias = instanceCounter.toString();
    log(`No alias provided, generating default alias: ${instanceAlias}`, "info");
  }

  if (stagehandInstances.has(instanceAlias)) {
    log(`Stagehand instance with alias "${instanceAlias}" already exists. Returning existing instance.`, "info");
    lastCreatedAlias = instanceAlias;
    return stagehandInstances.get(instanceAlias)!;
  }

  log(`Creating and initializing Stagehand instance with alias "${instanceAlias}"...`, "info");
  try {
    const stagehand = new Stagehand(config.stagehand);
    await stagehand.init();
    stagehandInstances.set(instanceAlias, stagehand);
    lastCreatedAlias = instanceAlias;
    log(`Stagehand instance with alias "${instanceAlias}" initialized successfully.`, "info");
    return stagehand;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Failed to initialize Stagehand instance with alias "${instanceAlias}": ${errorMsg}`, "error");
    console.error(`Failed to initialize Stagehand instance with alias "${instanceAlias}": ${errorMsg}`);
    throw new Error(`Failed to initialize Stagehand instance with alias "${instanceAlias}": ${errorMsg}`);
  }
}

export async function closeStagehand(alias?: string): Promise<void> {
  if (alias) {
    const stagehand = stagehandInstances.get(alias);
    if (stagehand) {
      log(`Closing Stagehand instance with alias "${alias}"...`, "info");
      try {
        await stagehand.close();
        log(`Stagehand instance with alias "${alias}" closed successfully.`, "info");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`Error closing Stagehand instance with alias "${alias}": ${errorMsg}`, "error");
        console.error(`Error closing Stagehand instance with alias "${alias}": ${errorMsg}`);
      } finally {
        stagehandInstances.delete(alias);
        if (lastCreatedAlias === alias) {
          const remainingAliases = Array.from(stagehandInstances.keys());
          lastCreatedAlias = remainingAliases.length > 0 ? remainingAliases[remainingAliases.length - 1] : null;
        }
      }
    } else {
      log(`No Stagehand instance found with alias "${alias}".`, "info");
    }
    return;
  }

  log("Closing all Stagehand instances...", "info");
  for (const [instanceAlias, stagehand] of stagehandInstances.entries()) {
    log(`Closing Stagehand instance with alias "${instanceAlias}"...`, "info");
    try {
      await stagehand.close();
      log(`Stagehand instance with alias "${instanceAlias}" closed successfully.`, "info");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error closing Stagehand instance with alias "${instanceAlias}": ${errorMsg}`, "error");
      console.error(`Error closing Stagehand instance with alias "${instanceAlias}": ${errorMsg}`);
    }
  }

  stagehandInstances.clear();
  lastCreatedAlias = null;
  instanceCounter = 0;
  log("All Stagehand instances closed.", "info");
}