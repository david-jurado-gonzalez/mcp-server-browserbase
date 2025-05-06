# Browserbase MCP Server

![cover](assets/cover-mcp.png)

[The Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Whether you’re building an AI-powered IDE, enhancing a chat interface, or creating custom AI workflows, MCP provides a standardized way to connect LLMs with the context they need.

This server provides cloud browser automation capabilities using [Browserbase](https://www.browserbase.com/), [Puppeteer](https://pptr.dev/), and [Stagehand](https://github.com/browserbase/stagehand). This server enables LLMs to interact with web pages, take screenshots, and execute JavaScript in a cloud browser environment.

To learn to get started with Browserbase, check out [Browserbase MCP](./browserbase/README.md) or [Stagehand MCP](./stagehand/README.md).

## Getting Started with available MCPs

🌐 **Browserbase MCP** - Located in [`browserbase/`](./browserbase/)

| Feature            | Description                               |
| ------------------ | ----------------------------------------- |
| Browser Automation | Control and orchestrate cloud browsers    |
| Data Extraction    | Extract structured data from any webpage  |
| Console Monitoring | Track and analyze browser console logs    |
| Screenshots        | Capture full-page and element screenshots |
| JavaScript         | Execute custom JS in the browser context  |
| Web Interaction    | Navigate, click, and fill forms with ease |

🤘 **Stagehand MCP** - Located in [`stagehand/`](./stagehand/)

| Feature             | Description                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atomic Instructions | Execute precise actions like `act("click the login button")` or `extract("find the red shoes")`                                                                |
| Model Flexibility   | Supports multiple models, including OpenAI's GPT-4 and Anthropic's Claude-3.7 Sonnet                                                                           |
| Modular Design      | Easily integrate new models with minimal changes                                                                                                               |
| Vision Support      | Use annotated screenshots for complex DOMs                                                                                                                     |
| Open Source         | Contribute to the project and join the [Slack community](https://join.slack.com/t/stagehand-dev/shared_invite/zt-2uvuobu50-~wVSx2Si75CPa3332hwVEw) for support |

## MCP Server: What Can You Do With This Bad Boy?

So, you've got this shiny MCP server, and you're wondering, "What kind of digital shenanigans can I get up to?" Well, buckle up, buttercup, because the possibilities are hilariously vast. The MCP server will act as your browser-based agent, using tools to perform actions and returning the results or status of those actions.

*   **Automate the Tedious:** Got a repetitive online task that makes you want to scream into a pillow? Offload it!
    *   **Use Case:** "Automate the tedious parts of web interaction, like, say, running functional tests for your Salesforce developments. Let the robots do the clicking while you sip your coffee (or nap, we don't judge)."
    *   **How it Works:** You'd instruct the MCP server to navigate a Salesforce flow. It might use Browserbase's `load_url` to open a page, `fill_form` to enter test data, and `click_element` to submit. Stagehand's `act("click the 'Next' button if visible")` could handle conditional logic. The server would respond with success/failure for each step, or perhaps a final report with screenshots taken via `take_screenshot` at crucial points.

*   **Become a Data Detective:** Need to scrape the web for... reasons? Whether you're gathering vital market research or just trying to find out how many cat videos exist on the internet (spoiler: a lot), this server is your digital bloodhound.
    *   **How it Works:** Tell the MCP server what data you need and from where. It could use Browserbase's `load_url` to visit a list of URLs, then `extract_data` with CSS selectors or Stagehand's `extract("all product names and prices")` to pull the specific information. The server will return the extracted data, likely in a structured format like JSON.

*   **Your Personal Army of Digital Minions:** Ever wished you had a legion of tireless assistants to handle your online chores? Now you can! Automate social media posting (responsibly, please!), manage online accounts, or even set up complex workflows for... uh... advanced research purposes.
    *   **How it Works:** For social media, you could provide content and a schedule. The MCP server would use tools like `load_url` to go to the platform, `fill_form` to enter your credentials (securely, of course!), type your post, and `click_element` to publish. It would then report back with a "Posted successfully" message or any errors encountered.

*   **Conquer E-commerce:** Snag those limited-edition sneakers or concert tickets before anyone else. Set up your server to monitor pages and pounce when the time is right. Just don't blame us if your credit card bill looks like a phone number.
    *   **How it Works:** You'd instruct the server to periodically check a product page using `load_url` and `extract_data` (or Stagehand's `extract("the availability status")`) to see if an item is in stock. If it is, it could then execute a pre-defined sequence of `fill_form` and `click_element` actions to add to cart and proceed to checkout (you'd still want to handle payment securely yourself!). It would notify you immediately of its progress.

*   **Build the Next Big Thing (or a really cool small thing):** Integrate web automation into your own applications. Create custom dashboards, generate reports from online sources, or build tools that make your life (and maybe others') a little bit easier and a lot more automated.
    *   **How it Works:** Your application would send requests to the MCP server. For example, to generate a report, your app might ask the server to log into multiple internal web tools (using `load_url`, `fill_form`, `click_element`), gather data using `extract_data` or `execute_script` for custom logic, and then return all the compiled data to your application for processing and display.

Basically, if it happens in a browser, this MCP server can probably help you do it faster, smarter, or at least while you're doing something more fun. It will use its suite of browser interaction tools to perform the actions you request and provide you with the outcomes, data, or screenshots. Go forth and automate!

### Alternative Installation Methods

[Smithery](https://smithery.ai/server/@browserbasehq/mcp-browserbase)
