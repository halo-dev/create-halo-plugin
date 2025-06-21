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
const argv = minimist(process.argv.slice(2));
const targetDir = argv._[0];

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
  console.log("🚀 Welcome to Halo Plugin Creator!\n");

  try {
    // Validate target directory early (if user specified one)
    validateTargetDir(targetDir);

    // Get user input
    const answers = await prompts([
      {
        type: "text",
        name: "name",
        message: "Plugin name:",
        hint: "e.g., my-awesome-plugin",
        validate: validateProjectName,
      },
      {
        type: "text",
        name: "domain",
        message: "Domain (for group and package name):",
        hint: "e.g., com.example",
        validate: validateDomain,
      },
      {
        type: "text",
        name: "author",
        message: "Author name:",
        initial: getCurrentUser(),
      },
      {
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
      },
    ]);

    // If user cancelled input
    if (
      !answers.name ||
      !answers.domain ||
      !answers.author ||
      !answers.uiTool
    ) {
      console.log("❌ Operation cancelled");
      process.exit(0);
    }

    // Process and format input
    const projectName = formatProjectName(answers.name);
    const className = formatClassName(answers.name);
    const packageName = formatPackageName(answers.domain, projectName);
    const group = answers.domain;

    // Get project path (will check auto-generated directory if needed)
    const projectPath = getProjectPath(targetDir, projectName);
    const projectDirName = path.basename(projectPath);

    // Generate project configuration
    const variables = {
      projectName,
      className,
      packageName,
      group,
      author: answers.author,
      uiTool: answers.uiTool,
    };

    console.log("\n📋 Project Configuration:");
    console.log(`   Name: ${projectName}`);
    console.log(`   Domain: ${group}`);
    console.log(`   Package: ${packageName}`);
    console.log(`   Author: ${answers.author}`);
    console.log(`   UI Tool: ${answers.uiTool}`);
    console.log(`   Output Directory: ${projectPath}`);

    // Confirm creation
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
