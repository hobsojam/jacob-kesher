import { execSync } from 'child_process'
import { mkdirSync } from 'fs'

mkdirSync('schemas', { recursive: true })

const base = 'npx ts-json-schema-generator --no-type-check --path'

const targets = [
  ['src/types/files.ts',   'MapFile',          'schemas/map.schema.json'],
  ['src/types/files.ts',   'ItemsFile',         'schemas/items.schema.json'],
  ['src/types/files.ts',   'EnemiesFile',       'schemas/enemies.schema.json'],
  ['src/types/files.ts',   'TemplatesFile',     'schemas/templates.schema.json'],
  ['src/types/files.ts',   'MissionManifest',   'schemas/manifest.schema.json'],
]

for (const [path, type, out] of targets) {
  console.log(`Generating ${out}...`)
  execSync(`${base} "${path}" --type "${type}" --out "${out}"`, { stdio: 'inherit' })
}

console.log('Done.')
