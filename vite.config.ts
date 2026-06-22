import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/jacob-kesher/',
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
