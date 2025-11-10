#!/usr/bin/env node

import path from "node:path";
import fs from "fs-extra";
import minimist from "minimist";
import prompts from "prompts";
import { generateProject } from "./template-engine.js";
import {
  formatClassName,
  formatPackageName,
  formatProjectName,
  getCurrentUser,
  validateDomain,
  validateProjectName,
} from "./utils.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ["name", "domain", "author", "uiTool"],
  boolean: ["help", "version"],
  alias: {
    h: "help",
    v: "version",
    n: "name",
    d: "domain",
    a: "author",
    u: "uiTool",
    i: "includeUI",
  },
});

const targetDir = argv._[0];

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 Halo Plugin Creator

Usage:
  pnpm create halo-plugin [directory] [options]

Options:
  -n, --name <name>       Plugin name (e.g., my-awesome-plugin)
  -d, --domain <domain>   Domain for group and package name (e.g., com.example)
  -a, --author <author>   Author name
  -i, --includeUI         Include UI project (default: prompt)
  -u, --uiTool <tool>     UI build tool (rsbuild or vite, required if includeUI is true)
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  pnpm create halo-plugin demo --name=demo --domain=com.example --author=ryanwang --includeUI --uiTool=rsbuild
  pnpm create halo-plugin --name my-plugin --domain com.example --author "John Doe" --includeUI=false
  pnpm create halo-plugin
`);
}

/**
 * Show version information
 */
function showVersion() {
  // Read version from package.json
  const packagePath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "package.json",
  );
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    console.log(packageJson.version || "1.0.0");
  } catch {
    console.log("1.0.0");
  }
}

/**
 * Validate UI tool parameter
 * @param {string} uiTool - UI tool name
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateUITool(uiTool) {
  const validTools = ["rsbuild", "vite"];
  if (!validTools.includes(uiTool)) {
    return `UI tool must be one of: ${validTools.join(", ")}`;
  }
  return true;
}

/**
 * Parse includeUI parameter from command line
 * @param {*} value - Value from argv.includeUI
 * @returns {boolean|null} Parsed boolean value or null if not provided
 */
function parseIncludeUI(value) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower !== "false" && lower !== "0";
  }
  return true;
}

/**
 * Collect user inputs through interactive prompts or command line
 * @param {Object} argv - Command line arguments
 * @returns {Promise<Object>} User answers with isInteractive flag
 */
async function collectUserInputs(argv) {
  const includeUI = parseIncludeUI(argv.includeUI);

  const fromCLI = {
    name: argv.name,
    domain: argv.domain,
    author: argv.author,
    includeUI: includeUI,
    uiTool: argv.uiTool,
  };

  const needsPrompt =
    !fromCLI.name ||
    !fromCLI.domain ||
    !fromCLI.author ||
    fromCLI.includeUI === null ||
    (fromCLI.includeUI && !fromCLI.uiTool);

  if (!needsPrompt) {
    validateInputs(fromCLI);
    logCommandLineArgs(fromCLI);
    return { ...fromCLI, isInteractive: false };
  }

  const answers = await promptForMissingInputs(fromCLI);
  return { ...answers, isInteractive: true };
}

/**
 * Validate all inputs
 * @param {Object} inputs - User inputs to validate
 */
function validateInputs(inputs) {
  const nameValidation = validateProjectName(inputs.name);
  if (nameValidation !== true) {
    throw new Error(`Invalid plugin name: ${nameValidation}`);
  }

  const domainValidation = validateDomain(inputs.domain);
  if (domainValidation !== true) {
    throw new Error(`Invalid domain: ${domainValidation}`);
  }

  if (inputs.includeUI && inputs.uiTool) {
    const uiToolValidation = validateUITool(inputs.uiTool);
    if (uiToolValidation !== true) {
      throw new Error(`Invalid UI tool: ${uiToolValidation}`);
    }
  }
}

/**
 * Log command line arguments
 * @param {Object} inputs - User inputs
 */
function logCommandLineArgs(inputs) {
  console.log("📋 Using command line arguments:");
  console.log(`   Name: ${inputs.name}`);
  console.log(`   Domain: ${inputs.domain}`);
  console.log(`   Author: ${inputs.author}`);
  console.log(`   Include UI: ${inputs.includeUI ? "Yes" : "No"}`);
  if (inputs.includeUI) {
    console.log(`   UI Tool: ${inputs.uiTool}`);
  }
}

/**
 * Prompt for missing inputs
 * @param {Object} fromCLI - Inputs from command line
 * @returns {Promise<Object>} Complete user inputs
 */
async function promptForMissingInputs(fromCLI) {
  const questions = [];

  if (!fromCLI.name) {
    questions.push({
      type: "text",
      name: "name",
      message: "Plugin name:",
      hint: "e.g., my-awesome-plugin",
      validate: validateProjectName,
    });
  }

  if (!fromCLI.domain) {
    questions.push({
      type: "text",
      name: "domain",
      message: "Domain (for group and package name):",
      hint: "e.g., com.example",
      validate: validateDomain,
    });
  }

  if (!fromCLI.author) {
    questions.push({
      type: "text",
      name: "author",
      message: "Author name:",
      initial: getCurrentUser(),
    });
  }

  if (fromCLI.includeUI === null) {
    questions.push({
      type: "confirm",
      name: "includeUI",
      message: "Include UI project?",
      initial: true,
    });
  }

  const answers = await prompts(questions);

  if (questions.some((q) => answers[q.name] === undefined)) {
    console.log("❌ Operation cancelled");
    process.exit(0);
  }

  const includeUI = fromCLI.includeUI ?? answers.includeUI;
  let uiTool = fromCLI.uiTool;

  if (includeUI && !uiTool) {
    const uiToolAnswer = await prompts({
      type: "select",
      name: "uiTool",
      message: "Choose UI build tool:",
      choices: [
        {
          title: "Rsbuild",
          value: "rsbuild",
          description: "The Rspack Powered Build Tool(Recommended)",
        },
        {
          title: "Vite",
          value: "vite",
          description: "The Build Tool for the Web",
        },
      ],
    });

    if (uiToolAnswer.uiTool === undefined) {
      console.log("❌ Operation cancelled");
      process.exit(0);
    }

    uiTool = uiToolAnswer.uiTool;
  }

  return {
    name: fromCLI.name || answers.name,
    domain: fromCLI.domain || answers.domain,
    author: fromCLI.author || answers.author,
    includeUI: includeUI,
    uiTool: includeUI ? uiTool : null,
  };
}

/**
 * Check if directory is empty
 * @param {string} dir - Directory path
 * @returns {boolean} Whether directory is empty
 */
function isEmpty(dir) {
  if (!fs.existsSync(dir)) {
    return true;
  }

  const files = fs.readdirSync(dir);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

/**
 * Validate if target directory is available
 * @param {string} targetDir - Target directory
 */
function validateTargetDir(targetDir) {
  if (!targetDir) {
    return; // No directory specified, will generate based on project name later
  }

  const projectPath = path.resolve(process.cwd(), targetDir);

  // Check if directory already exists and is not empty
  if (fs.existsSync(projectPath) && !isEmpty(projectPath)) {
    const relativePath = path.relative(process.cwd(), projectPath);
    throw new Error(
      `Directory "${relativePath}" is not empty. Please choose a different directory or remove existing files.`,
    );
  }
}

/**
 * Get project directory path
 * @param {string} targetDir - Target directory
 * @param {string} projectName - Project name
 * @returns {string} Project path
 */
function getProjectPath(targetDir, projectName) {
  if (targetDir) {
    return path.resolve(process.cwd(), targetDir);
  } else {
    const dirName = `plugin-${projectName}`;
    const projectPath = path.resolve(process.cwd(), dirName);

    // Check if auto-generated directory already exists and is not empty
    if (fs.existsSync(projectPath) && !isEmpty(projectPath)) {
      const relativePath = path.relative(process.cwd(), projectPath);
      throw new Error(
        `Directory "${relativePath}" already exists and is not empty. Please choose a different plugin name or remove existing files.`,
      );
    }

    return projectPath;
  }
}

async function main() {
  // Handle help and version flags
  if (argv.help) {
    showHelp();
    process.exit(0);
  }

  if (argv.version) {
    showVersion();
    process.exit(0);
  }

  console.log("🚀 Welcome to Halo Plugin Creator!\n");

  try {
    // Validate target directory early (if user specified one)
    validateTargetDir(targetDir);

    // Collect user inputs (from CLI args or interactive prompts)
    const answers = await collectUserInputs(argv);

    // Process and format input
    const projectName = formatProjectName(answers.name);
    const className = formatClassName(answers.name);
    const packageName = formatPackageName(answers.domain, projectName);
    const group = answers.domain;

    // Get project path (will check auto-generated directory if needed)
    const projectPath = getProjectPath(targetDir, projectName);
    const projectDirName = path.relative(process.cwd(), projectPath);

    // Generate project configuration
    const variables = {
      projectName,
      className,
      packageName,
      group,
      author: answers.author,
      includeUI: answers.includeUI,
      uiTool: answers.uiTool,
    };

    // Show configuration and confirm in interactive mode
    if (answers.isInteractive) {
      console.log("\n📋 Project Configuration:");
      console.log(`   Name: ${projectName}`);
      console.log(`   Domain: ${group}`);
      console.log(`   Package: ${packageName}`);
      console.log(`   Author: ${answers.author}`);
      console.log(`   Include UI: ${answers.includeUI ? "Yes" : "No"}`);
      if (answers.includeUI) {
        console.log(`   UI Tool: ${answers.uiTool}`);
      }
      console.log(`   Output Directory: ${projectPath}`);

      const { confirm } = await prompts({
        type: "confirm",
        name: "confirm",
        message: "Create project?",
        initial: true,
      });

      if (!confirm) {
        console.log("❌ Operation cancelled");
        process.exit(0);
      }
    } else {
      console.log(`   Output Directory: ${projectPath}\n`);
      console.log("🔨 Creating project...");
    }

    // Generate project
    await generateProject(projectPath, variables);

    console.log("\n✅ Project created successfully!");
    console.log("\n📖 Next steps:");
    console.log(`   cd ${projectDirName}`);
    console.log("   ./gradlew haloServer");
  } catch (error) {
    console.error("❌ Creation failed:", error.message);
    process.exit(1);
  }
}

main();
