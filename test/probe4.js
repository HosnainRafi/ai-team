// Probe 4: simulate the EXACT conditions of the failed Developer call.
// In the orchestrator, messages content = `Product spec:\n${JSON.stringify(this.spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(this.design, null, 1)}`
// spec and design are full objects from prior agent outputs. The failure happened consistently
// after the long Designer JSON output — maybe the proxy throttles long messages or returns
// something weird when input is large. Test with progressively larger inputs.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

// Build realistic long design JSON (~2500 chars) mirroring the real transcript
const spec = {
  product_name: "TempConvert CLI",
  summary:
    "A lightweight Node.js command-line application that lets users convert temperatures between Celsius and Fahrenheit through a simple interactive text menu.",
  target_users:
    "Students, developers, or general computer users who need a quick terminal-based tool for converting temperatures without opening a browser or installing a large application.",
  features: [
    "Display a simple interactive CLI menu when the script starts.",
    "Menu must include: 'Convert Celsius to Fahrenheit', 'Convert Fahrenheit to Celsius', and 'Exit'.",
    "Prompt the user to select a menu option by entering a number.",
    "Prompt the user to enter a temperature value after selecting a conversion type.",
    "Support decimal temperature inputs such as 36.6, 98.6, -40, and 0.",
    "Convert Celsius to Fahrenheit using the formula: F = C * 9 / 5 + 32.",
    "Convert Fahrenheit to Celsius using the formula: C = (F - 32) * 5 / 9.",
    "Display the conversion result clearly, including the original value, original unit, converted value, and converted unit.",
    "Round displayed results to two decimal places.",
    "After showing a conversion result, return to the main menu instead of exiting immediately.",
    "Allow the user to exit cleanly from the menu.",
    "Validate menu selections and show a friendly error message for invalid options.",
    "Validate temperature input and reject empty input, letters, symbols, or non-numeric values.",
    "Handle negative temperatures correctly.",
  ],
  non_goals: ["Graphical user interface", "Unit conversions beyond Celsius and Fahrenheit", "Temperature conversion from web or API sources", "Persistent history of conversions", "Localization or multi-language support"],
  tech_stack_suggestion: "Node.js command-line application using built-in modules only (no npm dependencies required)",
  idea: "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu",
};

const design = {
  tech_stack:
    "Node.js 20+ CLI application using plain JavaScript and the built-in readline/promises module. No runtime dependencies. Optional npm scripts use only Node.js built-in capabilities.",
  files: [
    {
      path: "index.js",
      purpose:
        "Main executable CLI script. Displays the interactive menu, reads user input, validates selections and temperature values, performs conversions, prints rounded results, loops back to the menu, and exits cleanly.",
      key_contents:
        "Use `readline/promises` and `process.stdin/process.stdout` to create an interactive terminal prompt. Define conversion helpers: `celsiusToFahrenheit(celsius)` and `fahrenheitToCelsius(fahrenheit)`. Define validation helper `parseTemperature(input)` that trims input, rejects empty strings and non-numeric values, and accepts decimals/negative numbers. Define `formatTemperature(value)` to display results rounded to two decimal places using `toFixed(2)`. Define async `main()` loop that prints menu options: 1) Convert Celsius to Fahrenheit, 2) Convert Fahrenheit to Celsius, 3) Exit. Validate menu input and show friendly errors for invalid options. After successful conversion, print a clear result such as `36.60 °C = 97.88 °F` and return to the menu. Handle Ctrl+C using `process.on('SIGINT', ...)` and/or readline close handling to exit without a stack trace.",
    },
    {
      path: "package.json",
      purpose: "Project metadata and convenience scripts for running the CLI.",
      key_contents:
        "Declare package name `tempconvert-cli`, version `1.0.0`, description, author, license MIT, main `index.js`, and a start script `node index.js` so the app can be launched with `npm start`. Keep the file minimal with no dependencies block since only Node.js built-ins are used.",
    },
  ],
  run_instructions:
    "1. Ensure Node.js 20 or later is installed.\n2. Clone or copy the project files into a directory.\n3. Run `node index.js` directly, or run `npm start` if you prefer using the npm script.\n4. Follow the interactive menu: enter 1 for Celsius to Fahrenheit, 2 for Fahrenheit to Celsius, or 3 to exit.\n5. Enter temperature values when prompted. Use Ctrl+C to abort at any time.",
  dependencies: ["Node.js runtime (built-in modules only; no npm packages required)"],
};

console.log("message content length:", JSON.stringify(spec).length + JSON.stringify(design).length);

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const res = await client.chat({
      model: process.env.E2E_MODEL || "gpt-5.5",
      messages: [
        {
          role: "user",
          content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}`,
        },
      ],
      systemPrompt: ROLES.developer.prompt,
      mode: "json",
    });
    console.log(`attempt ${attempt} OK:`, res.json?.files?.map((f) => f.path));
    break;
  } catch (err) {
    console.error(`attempt ${attempt} FAILED:`, err.message.slice(0, 300));
    if (attempt === 3) {
      // get raw text output
      const raw = await client.chat({
        model: process.env.E2E_MODEL || "gpt-5.5",
        messages: [
          {
            role: "user",
            content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}`,
          },
        ],
        systemPrompt: ROLES.developer.prompt,
        mode: "text",
      });
      console.log("\n=== RAW TEXT (first 2500 chars) ===\n", raw.text.slice(0, 2500));
    }
  }
}
