export const templateConfig = {
  conditionalFiles: {
    vite: ["ui/vite.config.ts"],
    rsbuild: ["ui/rsbuild.config.ts"],
  },
};

export function getFileProcessingConfig(uiTool, includeUI = true) {
  return {
    templateFiles: templateConfig.templateFiles,
    conditionalFiles: includeUI && uiTool ? (templateConfig.conditionalFiles[uiTool] || []) : [],
    includeUI: includeUI,
  };
}
