import { userInfo } from "node:os";

/**
 * Validate project name
 * @param {string} name Project name
 * @returns {boolean|string} Validation result
 */
export function validateProjectName(name) {
  if (!name) {
    return "Project name cannot be empty";
  }

  if (
    !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(
      name,
    )
  ) {
    return "Project name must follow the pattern: lowercase letters, numbers, hyphens, and dots. Must start and end with alphanumeric characters.";
  }

  return true;
}

/**
 * Validate domain format
 * @param {string} domain Domain
 * @returns {boolean|string} Validation result
 */
export function validateDomain(domain) {
  if (!domain) {
    return "Domain cannot be empty";
  }

  if (!/^[a-z0-9.-]+$/.test(domain)) {
    return "Domain can only contain lowercase letters, numbers, dots and hyphens";
  }

  const parts = domain.split(".");
  if (parts.length < 2) {
    return "Domain must have at least two parts (e.g., com.example)";
  }

  for (const part of parts) {
    if (!part || part.startsWith("-") || part.endsWith("-")) {
      return "Each part of domain cannot be empty or start/end with hyphens";
    }
  }

  return true;
}

/**
 * Get current username
 * @returns {string} Username
 */
export function getCurrentUser() {
  try {
    return userInfo().username || "Anonymous";
  } catch {
    return "Anonymous";
  }
}

/**
 * Format project name
 * @param {string} name Original name
 * @returns {string} Formatted name
 */
export function formatProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Format class name
 * @param {string} name Project name
 * @returns {string} Java class name
 */
export function formatClassName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Format package name
 * @param {string} domain Domain
 * @param {string} projectName Project name
 * @returns {string} Java package name
 */
export function formatPackageName(domain, projectName) {
  const packageProject = projectName.replace(/-/g, "").toLowerCase();
  return `${domain}.${packageProject}`;
}
