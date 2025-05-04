import { Stagehand, Page } from "@browserbasehq/stagehand";


// tsc -p stagehand/stagehand_dave/tsconfig.json
// node stagehand/stagehand_dave/dist/multi_browser_test.js --STAGEHAND_MODEL_NAME=gemini-2.0-flash --STAGEHAND_MODEL_API_KEY=YOUR_API_KEY --STAGEHAND_LOCALE=es-ES --STAGEHAND_DOM_SETTLE_TIMEOUT=10000 --STAGEHAND_VIEWPORT_WIDTH=1920 --STAGEHAND_VIEWPORT_HEIGHT=1080

// This is a test script to demonstrate the use of Stagehand with multiple browser instances
// and to perform independent actions on each page, configured via command-line arguments.
async function runMultiBrowserTest() {
  console.log("Starting multi-browser test...");

  const args = process.argv.slice(2); // Skip node path and script path
  const config: any = {
    env: "LOCAL", // Assuming local environment for this test
    // Default values or values from stagehand.config.js can be merged here if needed
  };

  args.forEach(arg => {
    const parts = arg.split('=');
    if (parts.length === 2 && parts[0].startsWith('--')) {
      const key = parts[0].substring(2);
      const value = parts[1];
      // Map command line argument names to StagehandConfig property names
      if (key === 'STAGEHAND_MODEL_NAME') config.modelName = value;
      if (key === 'STAGEHAND_MODEL_API_KEY') {
          config.modelClientOptions = { apiKey: value };
      }
      if (key === 'STAGEHAND_LOCALE') config.locale = value;
      if (key === 'STAGEHAND_DOM_SETTLE_TIMEOUT') config.domSettleTimeoutMs = parseInt(value, 10);
      if (key === 'STAGEHAND_VIEWPORT_WIDTH') {
          if (!config.localBrowserLaunchOptions) config.localBrowserLaunchOptions = {};
          if (!config.localBrowserLaunchOptions.viewport) config.localBrowserLaunchOptions.viewport = {};
          config.localBrowserLaunchOptions.viewport.width = parseInt(value, 10);
      }
       if (key === 'STAGEHAND_VIEWPORT_HEIGHT') {
          if (!config.localBrowserLaunchOptions) config.localBrowserLaunchOptions = {};
          if (!config.localBrowserLaunchOptions.viewport) config.localBrowserLaunchOptions.viewport = {};
          config.localBrowserLaunchOptions.viewport.height = parseInt(value, 10);
      }
      // Add other mappings as needed
    }
  });

  console.log("Using configuration:", JSON.stringify(config, null, 2));


  let stagehand1: Stagehand | undefined;
  let stagehand2: Stagehand | undefined;

  try {
    // Create and initialize the first Stagehand instance
    console.log("Initializing Stagehand instance 1...");
    stagehand1 = new Stagehand(config);
    await stagehand1.init();
    const page1: Page = stagehand1.page;
    console.log("Stagehand instance 1 initialized.");

    // Create and initialize the second Stagehand instance
    console.log("Initializing Stagehand instance 2...");
    stagehand2 = new Stagehand(config);
    await stagehand2.init();
    const page2: Page = stagehand2.page;
    console.log("Stagehand instance 2 initialized.");

    // Navigate pages independently
    console.log("Navigating page 1 to https://www.wikipedia.org...");
    await page1.goto("https://www.wikipedia.org");
    console.log("Page 1 navigated.");

    console.log("Navigating page 2 to https://www.bing.com...");
    await page2.goto("https://www.bing.com");
    console.log("Page 2 navigated.");

    // Perform independent observations
    console.log("Performing observe on page 1...");
    const [action1] = await page1.observe("What is the main heading text?");
    console.log(`Observation on page 1 result: ${JSON.stringify(action1)}`);

    console.log("Performing observe on page 2...");
    const [action2] = await page2.observe("What is the search box placeholder text?");
    console.log(`Observation on page 2 result: ${JSON.stringify(action2)}`);

    await page1.waitForTimeout(4000);
    await page2.waitForTimeout(2000);

    console.log("Multi-browser test completed successfully.");

  } catch (error) {
    console.error("An error occurred during the multi-browser test:", error);
  } finally {
    // Close Stagehand instances
    if (stagehand1) {
      console.log("Closing Stagehand instance 1...");
      await stagehand1.close();
      console.log("Stagehand instance 1 closed.");
    }
    if (stagehand2) {
      console.log("Closing Stagehand instance 2...");
      await stagehand2.close();
      console.log("Stagehand instance 2 closed.");
    }
    console.log("Cleanup complete.");
  }
}

runMultiBrowserTest();