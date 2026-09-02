import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import handlebars from "handlebars";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(__dirname, "../template");
const internalTemplateDir = "_internal";
const conditionalFiles = {
  vite: ["ui/vite.config.ts"],
  rsbuild: ["ui/rsbuild.config.ts"],
};

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
 * Check if file is an excluded conditional file (should not be copied)
 * @param {string} filePath - File path
 * @param {Object} config - File processing configuration
 * @returns {boolean}
 */
function isExcludedConditionalFile(filePath, config) {
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Get all conditional files (including selected and unselected)
  const allConditionalFiles = Object.values(conditionalFiles)
    .flat()
    .map((file) => file.replace(/\\/g, "/"));

  const selectedConditionalFiles = config.selectedConditionalFiles.map((file) =>
    file.replace(/\\/g, "/"),
  );

  // If it's a conditional file but not in current selected conditional files list, it should be excluded
  return (
    allConditionalFiles.includes(normalizedPath) &&
    !selectedConditionalFiles.includes(normalizedPath)
  );
}

/**
 * Render project files without writing them.
 * @param {Object} variables - Template variables
 * @param {(filePath: string) => boolean} [filter] - Optional source path filter
 * @returns {Array<{path: string, content: string|Buffer, mode: number}>}
 */
export function renderProjectFiles(variables, filter = () => true) {
  const config = {
    includeUI: variables.includeUI,
    selectedConditionalFiles: conditionalFiles[variables.uiTool] ?? [],
  };
  return getAllFiles(templateDir)
    .filter(
      (filePath) => !filePath.startsWith(`${internalTemplateDir}${path.sep}`),
    )
    .filter(filter)
    .map((filePath) => renderProjectFile(filePath, variables, config))
    .filter(Boolean)
    .map((file) => ({ ...file, path: file.path.replace(/\\/g, "/") }));
}

export function renderInternalFiles(templateName, variables) {
  const sourceRoot = path.join(internalTemplateDir, templateName);
  const config = { includeUI: false, selectedConditionalFiles: [] };
  return getAllFiles(path.join(templateDir, sourceRoot), sourceRoot).map(
    (filePath) => {
      const file = renderProjectFile(filePath, variables, config);
      return {
        ...file,
        path: path.relative(sourceRoot, file.path).replace(/\\/g, "/"),
      };
    },
  );
}

function renderProjectFile(filePath, variables, config) {
  const srcPath = path.join(templateDir, filePath);
  const normalizedPath = filePath.replace(/\\/g, "/");

  if (!config.includeUI && normalizedPath.startsWith("ui/")) {
    return null;
  }

  if (isExcludedConditionalFile(filePath, config)) {
    return null;
  }

  const mode = fs.statSync(srcPath).mode & 0o777;
  if (filePath.endsWith(".template")) {
    return {
      path: getTemplateDestination(filePath, variables),
      content: renderTemplate(srcPath, variables),
      mode,
    };
  }

  return {
    path: filePath,
    content: fs.readFileSync(srcPath),
    mode,
  };
}

/**
 * Get rendered template destination path
 * @param {string} filePath - File relative path
 * @param {Object} variables - Template variables
 * @returns {string} Destination path
 */
function getTemplateDestination(filePath, variables) {
  let destFile = filePath.replace(".template", "");

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

  if (
    destFile.includes("Plugin.java") ||
    destFile.includes("PluginTest.java")
  ) {
    return path.join(
      path.dirname(destFile),
      variables.packageName.replace(/\./g, "/"),
      path.basename(destFile),
    );
  }

  return destFile;
}
