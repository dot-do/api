/**
 * Schema Parser
 *
 * Parses IceType-inspired schema shorthand into structured schema information.
 */

import type { SchemaDef, ParsedSchema, ParsedModel, ParsedField } from './types'

/**
 * Pluralize a word (simple rules)
 */
function pluralize(word: string): string {
  if (word.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some((s) => word.endsWith(s))) {
    return word.slice(0, -1) + 'ies'
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es'
  }
  return word + 's'
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Parse a field definition string into structured field info
 *
 * Examples:
 * - 'string!' -> { type: 'string', required: true }
 * - 'string?' -> { type: 'string', required: false }
 * - 'string = "hello"' -> { type: 'string', required: false, default: 'hello' }
 * - 'string! #unique' -> { type: 'string', required: true, unique: true }
 * - 'string! #index' -> { type: 'string', required: true, indexed: true }
 * - '-> User' -> { type: 'relation', relation: { type: 'forward', target: 'User', many: false } }
 * - '-> User!' -> { type: 'relation', required: true, relation: { type: 'forward', target: 'User', many: false } }
 * - '<- Post[]' -> { type: 'relation', relation: { type: 'inverse', target: 'Post', many: true } }
 * - 'vector[1536]' -> { type: 'vector', vector: { dimensions: 1536 } }
 */
export function parseField(name: string, def: string): ParsedField {
  let remaining = def.trim()

  // Parse modifiers
  const unique = remaining.includes('#unique')
  const indexed = remaining.includes('#index') || unique
  remaining = remaining.replace(/#unique/g, '').replace(/#index/g, '').trim()

  // Parse default value
  let defaultValue: unknown
  const defaultMatch = remaining.match(/=\s*(.+)$/)
  if (defaultMatch?.[1]) {
    const defaultStr = defaultMatch[1].trim()
    // Parse the default value
    if (defaultStr.startsWith('"') && defaultStr.endsWith('"')) {
      defaultValue = defaultStr.slice(1, -1)
    } else if (defaultStr === 'true') {
      defaultValue = true
    } else if (defaultStr === 'false') {
      defaultValue = false
    } else if (defaultStr === 'null') {
      defaultValue = null
    } else if (!isNaN(Number(defaultStr))) {
      defaultValue = Number(defaultStr)
    } else {
      defaultValue = defaultStr
    }
    remaining = remaining.replace(/=\s*.+$/, '').trim()
  }

  // Parse required/optional
  let required = false
  if (remaining.endsWith('!')) {
    required = true
    remaining = remaining.slice(0, -1).trim()
  } else if (remaining.endsWith('?')) {
    required = false
    remaining = remaining.slice(0, -1).trim()
  }

  // Parse relations
  if (remaining.startsWith('->')) {
    const target = remaining.slice(2).trim().replace('[]', '')
    const many = remaining.includes('[]')
    return {
      name,
      type: 'relation',
      required,
      unique: false,
      indexed: true, // Relations are always indexed
      relation: { type: 'forward', target, many },
    }
  }

  if (remaining.startsWith('<-')) {
    const target = remaining.slice(2).trim().replace('[]', '')
    const many = remaining.includes('[]')
    return {
      name,
      type: 'relation',
      required: false, // Inverse relations are never required
      unique: false,
      indexed: false,
      relation: { type: 'inverse', target, many },
    }
  }

  // Parse vector
  const vectorMatch = remaining.match(/^vector\[(\d+)\]$/)
  if (vectorMatch?.[1]) {
    return {
      name,
      type: 'vector',
      required,
      unique: false,
      indexed: true,
      vector: { dimensions: parseInt(vectorMatch[1], 10) },
    }
  }

  // Parse base type
  const typeMap: Record<string, ParsedField['type']> = {
    string: 'string',
    text: 'text',
    number: 'number',
    int: 'number',
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    bool: 'boolean',
    json: 'json',
    object: 'json',
    timestamp: 'timestamp',
    datetime: 'timestamp',
    date: 'date',
    cuid: 'cuid',
    uuid: 'uuid',
    id: 'cuid',
  }

  const baseType = typeMap[remaining.toLowerCase()] || 'string'

  return {
    name,
    type: baseType,
    required,
    unique,
    indexed,
    default: defaultValue,
  }
}

/**
 * Parse a model definition
 */
export function parseModel(name: string, def: Record<string, string>): ParsedModel {
  const fields: Record<string, ParsedField> = {}
  let primaryKey = 'id'

  for (const [fieldName, fieldDef] of Object.entries(def)) {
    // Skip special keys
    if (fieldName.startsWith('$')) continue

    const field = parseField(fieldName, fieldDef)
    fields[fieldName] = field

    // Detect primary key
    if (field.type === 'cuid' || field.type === 'uuid') {
      if (field.required && field.unique) {
        primaryKey = fieldName
      }
    }
  }

  // Ensure there's always an id field
  if (!fields.id && !fields[primaryKey]) {
    fields.id = {
      name: 'id',
      type: 'cuid',
      required: true,
      unique: true,
      indexed: true,
    }
  }

  return {
    name,
    singular: toCamelCase(name),
    plural: pluralize(toCamelCase(name)),
    fields,
    primaryKey,
  }
}

/**
 * Parse a complete schema definition
 */
export function parseSchema(schema: SchemaDef): ParsedSchema {
  const models: Record<string, ParsedModel> = {}

  for (const [modelName, modelDef] of Object.entries(schema)) {
    models[modelName] = parseModel(modelName, modelDef)
  }

  // Resolve relation targets
  for (const model of Object.values(models)) {
    for (const field of Object.values(model.fields)) {
      if (field.relation) {
        // Validate target exists
        if (!models[field.relation.target]) {
          console.warn(`Warning: Relation target "${field.relation.target}" not found for ${model.name}.${field.name}`)
        }
      }
    }
  }

  return { models }
}

/**
 * Generate JSON Schema from parsed model
 */
export function generateJsonSchema(model: ParsedModel): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const field of Object.values(model.fields)) {
    // Skip inverse relations in input schema
    if (field.relation?.type === 'inverse') continue

    let prop: Record<string, unknown>

    switch (field.type) {
      case 'string':
      case 'text':
        prop = { type: 'string' }
        break
      case 'number':
        prop = { type: 'number' }
        break
      case 'boolean':
        prop = { type: 'boolean' }
        break
      case 'json':
        prop = { type: 'object' }
        break
      case 'timestamp':
      case 'date':
        prop = { type: 'string', format: 'date-time' }
        break
      case 'cuid':
      case 'uuid':
        prop = { type: 'string' }
        break
      case 'vector':
        prop = { type: 'array', items: { type: 'number' } }
        break
      case 'relation':
        if (field.relation?.many) {
          prop = { type: 'array', items: { type: 'string' } }
        } else {
          prop = { type: 'string' }
        }
        break
      default:
        prop = { type: 'string' }
    }

    if (field.default !== undefined) {
      prop.default = field.default
    }

    properties[field.name] = prop

    if (field.required && field.name !== model.primaryKey) {
      required.push(field.name)
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}
