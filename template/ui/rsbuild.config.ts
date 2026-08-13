import type { RsbuildConfig } from '@rsbuild/core'
import { pluginSass } from '@rsbuild/plugin-sass'
import { rsbuildConfig } from '@halo-dev/ui-plugin-bundler-kit'
import Icons from 'unplugin-icons/rspack'

export default rsbuildConfig({
  rsbuild: {
    resolve: {
      alias: {
        '@': './src',
      },
    },
    plugins: [pluginSass()],
    tools: {
      rspack: {
        plugins: [Icons({ compiler: 'vue3' })],
      },
    },
  },
}) as RsbuildConfig
