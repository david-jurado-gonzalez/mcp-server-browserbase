import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LogLine } from "@browserbasehq/stagehand";
// Import McpServer specifically if we need its type
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Keep base Server type if needed for compatibility or if McpServer extends it implicitly
// import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Get the directory name for the current module
// Assuming this runs from stagehand-mcp/dist after compilation, adjust if needed
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure logging - place logs inside the stagehand-mcp project
const LOG_DIR = path.join(__dirname, '../logs'); // Puts logs in stagehand-mcp/logs
const LOG_FILE = path.join(LOG_DIR, `stagehand-mcp-${new Date().toISOString().split('T')[0]}.log`);
const MAX_LOG_FILES = 10;
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Queue for batching log writes
let logQueue: string[] = [];
let logWriteTimeout: NodeJS.Timeout | null = null;
const LOG_FLUSH_INTERVAL = 1000;
const MAX_OPERATION_LOGS = 1000;

// Operation logs stored in memory
export const operationLogs: string[] = [];
export const consoleLogs: string[] = [];

// Reference to server instance for logging
let serverInstance: McpServer | undefined; // Use McpServer type

// Set server for logging
export function setServerInstance(server: McpServer) { // Use McpServer type
  serverInstance = server;
}

// Get server instance for notifications and logging
export function getServerInstance(): McpServer | undefined { // Use McpServer type
  return serverInstance;
}

// Ensure log directory exists
export function ensureLogDirectory() {
  // Use synchronous fs methods here as this likely runs at startup
  if (!fs.existsSync(LOG_DIR)) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (err) {
      console.error(`Failed to create log directory ${LOG_DIR}:`, err);
    }
  }
}

// Setup log rotation management
export function setupLogRotation() {
  try {
    ensureLogDirectory(); // Ensure directory exists before rotation logic
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const rotatedLogFile = path.join(LOG_DIR, `stagehand-mcp-${timestamp}.log`);
      fs.renameSync(LOG_FILE, rotatedLogFile);
    }

    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(file => file.startsWith('stagehand-mcp-') && file.endsWith('.log'))
      .map(file => ({ name: file, mtime: fs.statSync(path.join(LOG_DIR, file)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (logFiles.length > MAX_LOG_FILES) {
      logFiles.slice(MAX_LOG_FILES).forEach(fileInfo => {
        try {
          fs.unlinkSync(path.join(LOG_DIR, fileInfo.name));
        } catch (err) {
          console.error(`Failed to delete old log file ${fileInfo.name}:`, err);
        }
      });
    }
  } catch (err) {
    // Avoid crashing the server due to logging errors
    console.error('Error in log rotation:', err);
  }
}

// Flush logs to disk asynchronously
export async function flushLogs() {
  if (logQueue.length === 0) return;

  ensureLogDirectory(); // Ensure directory exists before writing
  const logsToWrite = logQueue.join('\n') + '\n';
  logQueue = [];
  logWriteTimeout = null;

  try {
    await fs.promises.appendFile(LOG_FILE, logsToWrite);

    const stats = await fs.promises.stat(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      setupLogRotation(); // Rotate after write if needed
    }
  } catch (err) {
    console.error('Failed to write logs to file:', err);
    try { // Fallback sync write
      fs.appendFileSync(LOG_FILE, logsToWrite);
    } catch (syncErr) {
      console.error('Failed to write logs synchronously:', syncErr);
    }
  }
}

// Helper function to convert LogLine to string (from Stagehand)
export function logLineToString(logLine: LogLine): string {
  const timestamp = logLine.timestamp ? new Date(logLine.timestamp).toISOString() : new Date().toISOString();
  const level = logLine.level !== undefined ?
    (logLine.level === 0 ? 'DEBUG' :
     logLine.level === 1 ? 'INFO' :
     logLine.level === 2 ? 'ERROR' : 'UNKNOWN') : 'UNKNOWN';
  return `[${timestamp}] [${level}] ${logLine.message || ''}`;
}

// Main logging function
export function log(message: string, level: 'info' | 'error' | 'debug' = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  // Manage operation logs (in-memory)
  operationLogs.push(logMessage);
  if (operationLogs.length > MAX_OPERATION_LOGS) {
    const excess = operationLogs.length - MAX_OPERATION_LOGS;
    operationLogs.splice(100, excess, `[...${excess} logs truncated...]`); // More efficient truncation
  }

  // Queue log for async writing to file
  logQueue.push(logMessage);
  if (!logWriteTimeout) {
    logWriteTimeout = setTimeout(flushLogs, LOG_FLUSH_INTERVAL);
  }

  // Console output (stderr)
  if (process.env.DEBUG || level === 'error') {
    console.error(logMessage);
  }

  // Send logging message to client via MCP (if server instance set and capable)
  if (serverInstance && (level === 'info' || level === 'error')) {
    // Check if McpServer instance has a method for sending log notifications
    // The base SDK might not define a standard way, check McpServer specifics
    if (typeof (serverInstance as any).sendNotification === 'function') { // Example check
        // Assuming a generic notification method exists, adapt as needed
        (serverInstance as any).sendNotification('$/log', { level, message });
    } else if (typeof (serverInstance as any).sendLoggingMessage === 'function') {
         // If it inherits or implements sendLoggingMessage
        (serverInstance as any).sendLoggingMessage({ level: level, data: message });
    } else {
        // console.warn("Logging to client not implemented for this McpServer instance.");
        // Keep quiet if not supported to avoid spamming logs
    }
  }
}

// Format logs for response (e.g., in case of errors)
export function formatLogResponse(logs: string[]): string {
  if (logs.length <= 100) {
    return logs.join("\n");
  }
  const first = logs.slice(0, 50);
  const last = logs.slice(-50);
  return [
    ...first,
    `\n... ${logs.length - 100} more log entries (truncated) ...\n`,
    ...last
  ].join("\n");
}

// Log request details
export function logRequest(type: string, params: any) {
  try {
    const requestLog = {
      timestamp: new Date().toISOString(),
      type,
      params: params ? JSON.parse(JSON.stringify(params)) : params, // Basic deep clone to avoid logging issues with complex objects
    };
    log(`REQUEST: ${JSON.stringify(requestLog, null, 2)}`, 'debug');
  } catch (e) {
     log(`REQUEST (unserializable params): ${type}`, 'debug');
  }
}

// Log response details
export function logResponse(type: string, response: any) {
 try {
    const responseLog = {
      timestamp: new Date().toISOString(),
      type,
      response: response ? JSON.parse(JSON.stringify(response)) : response, // Basic deep clone
    };
    log(`RESPONSE: ${JSON.stringify(responseLog, null, 2)}`, 'debug');
 } catch (e) {
    log(`RESPONSE (unserializable): ${type}`, 'debug');
 }
}

// Register handlers for graceful process exit
export function registerExitHandlers() {
  const exitHandler = () => {
    if (logQueue.length > 0) {
      console.log('Flushing remaining logs on exit...');
      try {
        // Use sync append on exit
        fs.appendFileSync(LOG_FILE, logQueue.join('\n') + '\n');
        logQueue = []; // Clear queue after flushing
      } catch (err) {
        console.error('Failed to flush logs synchronously on exit:', err);
      }
    }
  };

  process.on('exit', exitHandler);
  // Handle signals for graceful shutdown
  process.on('SIGINT', () => {
    exitHandler();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
     exitHandler();
     process.exit(15); // Standard exit code for SIGTERM
  });
}

// Schedule periodic log rotation check
export function scheduleLogRotation() {
  setupLogRotation(); // Initial check
  setInterval(setupLogRotation, 15 * 60 * 1000); // Check every 15 minutes
}