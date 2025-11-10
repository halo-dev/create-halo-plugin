import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import handlebars from "handlebars";
import { getFileProcessingConfig, templateConfig } from "./template-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(__dirname, "../template");

handlebars.registerHelper("eq", (a, b) => a === b);

/**
 * Render template file
 * @param {string} templatePath - Template file path
 * @param {Object} variables - Template variables
 * @returns {string} Rendered content
 */
function renderTemplate(templatePath, variables) {
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const template = handlebars.compile(templateContent);
  return template(variables);
}

/**
 * Create Java package directory structure
 * @param {string} baseDir - Base directory
 * @param {string} packageName - Package name (e.g., com.example.plugin)
 * @returns {string} Package directory path
 */
function createPackageDir(baseDir, packageName) {
  const packagePath = packageName.replace(/\./g, "/");
  const fullPath = path.join(baseDir, packagePath);
  fs.ensureDirSync(fullPath);
  return fullPath;
}

/**
 * Recursively traverse directory and get all file relative paths
 * @param {string} dir - Directory path
 * @param {string} basePath - Base path
 * @returns {string[]} Array of file paths
 */
function getAllFiles(dir, basePath = "") {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = basePath ? path.join(basePath, item) : item;

    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Check if file is a conditional file
 * @param {string} filePath - File path
 * @param {string[]} conditionalFiles - Conditional files list
 * @returns {boolean}
 */
function isConditionalFile(filePath, conditionalFiles) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return conditionalFiles.some(conditional => {
    const normalizedConditional = conditional.replace(/\\/g, '/');
    return normalizedPath === normalizedConditional;
  });
}

/**
 * Check if file is an excluded conditional file (should not be copied)
 * @param {string} filePath - File path
 * @param {Object} config - File processing configuration
 * @returns {boolean}
 */
function isExcludedConditionalFile(filePath, config) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Get all conditional files (including selected and unselected)
  const allConditionalFiles = Object.values(
    templateConfig.conditionalFiles,
  ).flat().map(file => file.replace(/\\/g, '/'));

  const selectedConditionalFiles = config.conditionalFiles.map(file => 
    file.replace(/\\/g, '/')
  );

  // If it's a conditional file but not in current selected conditional files list, it should be excluded
  return (
    allConditionalFiles.includes(normalizedPath) &&
    !selectedConditionalFiles.includes(normalizedPath)
  );
}

/**
 * Generate project
 * @param {string} projectPath - Project path
 * @param {Object} variables - Template variables
 */
export async function generateProject(projectPath, variables) {
  console.log("🔄 Generating project...");

  // Ensure project directory exists
  await fs.ensureDir(projectPath);

  // Get file processing configuration
  const config = getFileProcessingConfig(variables.uiTool, variables.includeUI);

  // Get all files in template directory
  const allFiles = getAllFiles(templateDir);

  // Process each file
  for (const filePath of allFiles) {
    await processFile(filePath, projectPath, variables, config);
  }

  console.log("✨ Project generation completed!");
}

/**
 * Process single file
 * @param {string} filePath - File relative path
 * @param {string} projectPath - Project output path
 * @param {Object} variables - Template variables
 * @param {Object} config - File processing configuration
 */
async function processFile(filePath, projectPath, variables, config) {
  const srcPath = path.join(templateDir, filePath);

  // Check if file exists
  if (!fs.existsSync(srcPath)) {
    return;
  }

  // Skip UI files if includeUI is false
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (!config.includeUI && normalizedPath.startsWith('ui/')) {
    return;
  }

  if (filePath.endsWith('.template')) {
    // Process template file
    await processTemplateFile(filePath, srcPath, projectPath, variables);
  } else if (isExcludedConditionalFile(filePath, config)) {
    // Skip unmatched conditional files
    return;
  } else if (isConditionalFile(filePath, config.conditionalFiles)) {
    // Process conditional file
    await processConditionalFile(filePath, srcPath, projectPath);
  } else {
    // Process static file (direct copy)
    await processStaticFile(filePath, srcPath, projectPath);
  }
}

/**
 * Process template file
 * @param {string} filePath - File relative path
 * @param {string} srcPath - Source file path
 * @param {string} projectPath - Project path
 * @param {Object} variables - Template variables
 */
async function processTemplateFile(filePath, srcPath, projectPath, variables) {
  // Remove .template suffix
  let destFile = filePath.replace(".template", "");

  // Special handling for Java file names
  if (destFile.includes("Plugin.java")) {
    destFile = destFile.replace(
      "Plugin.java",
      `${variables.className}Plugin.java`,
    );
  } else if (destFile.includes("PluginTest.java")) {
    destFile = destFile.replace(
      "PluginTest.java",
      `${variables.className}PluginTest.java`,
    );
  }

  let destPath = path.join(projectPath, destFile);

  // Special handling for Java file package structure
  if (
    destFile.includes("Plugin.java") ||
    destFile.includes("PluginTest.java")
  ) {
    const javaDir = path.dirname(destPath);
    const fileName = path.basename(destPath);
    const packageDir = createPackageDir(javaDir, variables.packageName);
    destPath = path.join(packageDir, fileName);
  }

  // Render template and write file
  const content = renderTemplate(srcPath, variables);
  await fs.ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, content, "utf-8");

  console.log(`✓ Render template: ${destFile}`);
}

/**
 * Process conditional file
 * @param {string} filePath - File relative path
 * @param {string} srcPath - Source file path
 * @param {string} projectPath - Project path
 */
async function processConditionalFile(filePath, srcPath, projectPath) {
  const destPath = path.join(projectPath, filePath);

  await fs.ensureDir(path.dirname(destPath));
  await fs.copy(srcPath, destPath);

  console.log(`✓ Copy conditional file: ${filePath}`);
}

/**
 * Process static file
 * @param {string} filePath - File relative path
 * @param {string} srcPath - Source file path
 * @param {string} projectPath - Project path
 */
async function processStaticFile(filePath, srcPath, projectPath) {
  const destPath = path.join(projectPath, filePath);

  await fs.ensureDir(path.dirname(destPath));
  await fs.copy(srcPath, destPath);

  console.log(`✓ Copy file: ${filePath}`);
}
