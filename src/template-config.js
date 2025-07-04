export const templateConfig = {
  conditionalFiles: {
    vite: ["ui/vite.config.ts"],
    rsbuild: ["ui/rsbuild.config.ts"],
  },
};

export function getFileProcessingConfig(uiTool) {
  return {
    templateFiles: templateConfig.templateFiles,
    conditionalFiles: templateConfig.conditionalFiles[uiTool] || [],
  };
}
