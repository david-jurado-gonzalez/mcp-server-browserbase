/**
 * Gestión de una o varias instancias {@link Stagehand} en el mismo proceso MCP.
 *
 * - Cada instancia tiene un **alias** (string). Sin alias al crear, se genera `"1"`, `"2"`, …
 * - **`lastCreatedAlias`**: instancia considerada “activa” cuando una herramienta no pasa `alias`.
 * - Al hacer `getStagehandInstance(alias explícito)` con una instancia existente, esa alias pasa a ser la activa.
 * - Al **cerrar** la instancia activa, se reasigna la activa a la última clave que quede en el `Map` (orden de inserción).
 *
 * @see {@link handleToolCall} en `tools.ts` — crea instancias de forma implícita si hace falta (depuración).
 */
import { Stagehand } from "@browserbasehq/stagehand";
import config from "./config.js";
import { log } from "./logging.js";

const stagehandInstances = new Map<string, Stagehand>();
/** Alias de la instancia devuelta por última vez por `get`/`create` sin ambigüedad; usada cuando `alias` es `undefined`. */
let lastCreatedAlias: string | null = null;
/** Contador para alias numéricos autogenerados (`"1"`, `"2"`, …). */
let instanceCounter = 0;

/**
 * Obtiene la instancia para `alias`, o la instancia activa si `alias` es `undefined`.
 *
 * @param alias - Si se omite, se usa `lastCreatedAlias` (si existe).
 * @returns `undefined` si no hay instancia para ese alias / no hay activa.
 */
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

/**
 * Crea (o reutiliza) un {@link Stagehand} con `config.stagehand`, llama a `init()` y lo registra.
 *
 * @param alias - Opcional; si falta, se asigna un alias numérico nuevo.
 * @throws Si `init()` falla (CDP, API key, etc.).
 */
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

/**
 * Cierra navegadores y limpia el mapa.
 *
 * @param alias - Si se indica, solo esa instancia. Si no, **todas** (mapa vacío, contador a 0).
 * Los errores en `close()` se registran pero la entrada se elimina igualmente para no dejar estado corrupto.
 */
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
