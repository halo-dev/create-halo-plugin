#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import minimist from "minimist";
import { red, green, cyan } from "kolorist";

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = minimist(process.argv.slice(2), {
  alias: {
    h: "help",
    v: "version",
  },
});

const helpMessage = `
${green(
  "create-halo-plugin"
)} - Quickly create Halo plugin development templates

${cyan("Usage:")}
  create-halo-plugin [project-directory] [options]

${cyan("Options:")}
  -h, --help     Show help information
  -v, --version  Show version information

${cyan("Examples:")}
  create-halo-plugin                    # Create in plugin-{name} directory
  create-halo-plugin my-plugin          # Create in my-plugin directory
  create-halo-plugin ./my-awesome-plugin # Create in specified path
  npx create-halo-plugin my-plugin
`;

async function main() {
  if (argv.help) {
    console.log(helpMessage);
    process.exit(0);
  }

  if (argv.version) {
    const pkg = await import("./package.json", { with: { type: "json" } });
    console.log(pkg.default.version);
    process.exit(0);
  }

  try {
    // Pass all arguments to the main script
    const indexPath = resolve(__dirname, "./src/index.js");
    const child = spawn("node", [indexPath, ...process.argv.slice(2)], {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      process.exit(code || 0);
    });

    child.on("error", (error) => {
      console.error(red("Error occurred:"), error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error(red("Creation failed:"), error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(red("Error occurred:"), error);
  process.exit(1);
});
