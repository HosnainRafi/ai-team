// Probe 6: the Developer call fails repeatedly with "No JSON found".
// Test: same call, multiple models available on the sandbox proxy, to see if
// it's model-specific. Also print raw output of failures to diagnose.
import { LLMClient } from "../src/llm.js";
import { resolveProvider } from "../src/config.js";
import { ROLES } from "../src/roles.js";

const provider = resolveProvider({});
const client = new LLMClient(provider);

const spec = {
  product_name: "TempConvert CLI",
  summary: "A lightweight Node.js command-line application that lets users convert temperatures between Celsius and Fahrenheit through a simple interactive text menu. The tool runs in a terminal, prompts the user to choose a conversion direction, accepts a numeric temperature input, displays the converted result, and allows the user to perform additional conversions or exit.",
  target_users: "Students, developers, educators, and general terminal users who need a quick, simple way to convert temperatures between Celsius and Fahrenheit without using a web browser or calculator app.",
  features: [
    "Provide an interactive terminal menu when the script starts.",
    "Display clear menu options: convert Celsius to Fahrenheit, convert Fahrenheit to Celsius, and exit.",
    "Accept user selection by entering a number corresponding to the menu option.",
    "Prompt the user for a temperature value after a conversion direction is selected.",
    "Support Celsius to Fahrenheit conversion using the formula: Fahrenheit = Celsius × 9/5 + 32.",
    "Support Fahrenheit to Celsius conversion using the formula: Celsius = (Fahrenheit - 32) × 5 / 9.",
    "Accept negative temperatures, zero, positive temperatures, and decimal values.",
    "Validate that temperature input is numeric before converting.",
    "Reject empty input, non-numeric text, malformed numbers, and invalid menu choices with a helpful error message.",
    "Display conversion results with a readable format such as `36.60 °C = 97.88 °F`.",
    "Round displayed results to two decimal places.",
    "After showing a conversion result, return to the main menu instead of exiting immediately.",
    "Allow the user to exit cleanly from the menu.",
    "Validate menu selections and show a friendly error message for invalid options.",
    "Handle negative temperatures correctly.",
  ],
  non_goals: ["Graphical user interface", "Unit conversions beyond Celsius and Fahrenheit", "Temperature conversion from web or API sources", "Persistent history of conversions", "Localization or multi-language support"],
  tech_stack_suggestion: "Node.js command-line application using built-in modules only (no npm dependencies required)",
  idea: "a node CLI script that converts temperatures between Celsius and Fahrenheit with a simple menu",
};

const design = {
  tech_stack: "Node.js 20+ command-line application using only built-in standard libraries. The CLI will be implemented as a single executable JavaScript file using `readline/promises` for interactive terminal input. A small README will document setup and usage. No npm package or third-party dependency is required.",
  files: [
    {
      path: "temp-convert.js",
      purpose: "Main executable Node.js CLI script for interactive temperature conversion.",
      key_contents: "Include shebang. Import readline/promises. Create readline interface on stdin/stdout. Implement celsiusToFahrenheit(celsius), fahrenheitToCelsius(fahrenheit), isValidNumberInput(input) rejecting empty/non-numeric/malformed/Infinity/NaN while allowing negatives/zero/positives/decimals, formatNumber(value) rounding to 2 dp via toFixed(2), promptTemperature(sourceUnit), showMenu() printing numbered options 1. C->F, 2. F->C, 3. Exit, mainLoop() async loop displaying menu reading selection, handling invalid menu choices with friendly errors, printing results like 36.60 °C = 97.88 °F, looping back, handling SIGINT gracefully.",
    },
    {
      path: "README.md",
      purpose: "Documentation of setup and usage.",
      key_contents: "Title, description, requirements (Node.js 20+), usage instructions with node temp-convert.js and npm start, menu walkthrough, conversion formulas.",
    },
  ],
  run_instructions: "1. Ensure Node.js 20+ installed. 2. Run `node temp-convert.js` or `npm start`. 3. Follow the menu: 1 C->F, 2 F->C, 3 exit.",
  dependencies: ["Node.js runtime only"],
};

const models = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "claude-sonnet-4-6"];

for (const model of models) {
  console.log(`\n=== model: ${model} ===`);
  try {
    const res = await client.chatWithRetry({
      model,
      messages: [
        { role: "user", content: `Product spec:\n${JSON.stringify(spec, null, 1)}\n\nDesign plan:\n${JSON.stringify(design, null, 1)}` },
      ],
      systemPrompt: ROLES.developer.prompt,
      mode: "json",
    });
    console.log("OK:", res.json?.files?.map((f) => f.path));
  } catch (err) {
    console.error("FAILED:", err.message.slice(0, 150));
  }
}
