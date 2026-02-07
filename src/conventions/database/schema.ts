/**
 * Schema Parser
 *
 * Parses IceType-inspired schema shorthand into structured schema information.
 */

import type { SchemaDef, ParsedSchema, ParsedModel, ParsedField } from './types'
import { validateTableName } from '../../helpers/sql-validation'

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
 * - 'string!##' -> { type: 'string', required: true, unique: true, indexed: true }
 * - 'string!#' -> { type: 'string', required: true, indexed: true }
 * - 'enum(a,b,c) = "a"' -> { type: 'string', enum: ['a','b','c'], default: 'a' }
 * - 'decimal(15,2)' -> { type: 'number', precision: 15, scale: 2 }
 * - 'url' -> { type: 'string', format: 'url' }
 * - 'email' -> { type: 'string', format: 'email' }
 * - 'markdown' -> { type: 'string', format: 'markdown' }
 * - 'string[]' -> { type: 'string', array: true }
 * - '-> User' -> { type: 'relation', relation: { type: 'forward', target: 'User', many: false } }
 * - '-> User!' -> { type: 'relation', required: true, relation: { type: 'forward', target: 'User', many: false } }
 * - '-> Organization.contacts' -> { type: 'relation', relation: { type: 'forward', target: 'Organization', inverseField: 'contacts' } }
 * - '<- Post[]' -> { type: 'relation', relation: { type: 'inverse', target: 'Post', many: true } }
 * - '<- Lead.contact[]' -> { type: 'relation', relation: { type: 'inverse', target: 'Lead', many: true, inverseField: 'contact' } }
 * - 'vector[1536]' -> { type: 'vector', vector: { dimensions: 1536 } }
 */
export function parseField(name: string, def: string): ParsedField {
  let remaining = def.trim()

  // Parse word-based modifiers (#unique, #index)
  let unique = remaining.includes('#unique')
  let indexed = remaining.includes('#index') || unique
  remaining = remaining.replace(/#unique/g, '').replace(/#index/g, '').trim()

  // Parse inline ## (unique+indexed) and # (indexed) at end of string
  if (remaining.endsWith('##')) {
    unique = true
    indexed = true
    remaining = remaining.slice(0, -2).trim()
  } else if (remaining.endsWith('#')) {
    indexed = true
    remaining = remaining.slice(0, -1).trim()
  }

  // Parse default value (must handle enum defaults like '= "a"' after 'enum(a,b,c)')
  let defaultValue: unknown
  const defaultMatch = remaining.match(/=\s*(.+)$/)
  if (defaultMatch?.[1]) {
    const defaultStr = defaultMatch[1].trim()
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

  // Parse enum(val1,val2,val3) syntax
  const enumMatch = remaining.match(/^enum\(([^)]+)\)$/)
  if (enumMatch?.[1]) {
    const enumValues = enumMatch[1].split(',').map((v) => v.trim())
    return {
      name,
      type: 'string',
      required,
      unique,
      indexed,
      default: defaultValue,
      enum: enumValues,
    }
  }

  // Parse pipe-separated enum syntax: 'Lead | Qualified | Customer'
  if (remaining.includes(' | ')) {
    const enumValues = remaining.split('|').map((v) => v.trim())
    return {
      name,
      type: 'string',
      required,
      unique,
      indexed,
      default: defaultValue,
      enum: enumValues,
    }
  }

  // Parse decimal(precision,scale) syntax
  const decimalMatch = remaining.match(/^decimal\((\d+),\s*(\d+)\)$/)
  if (decimalMatch) {
    return {
      name,
      type: 'number',
      required,
      unique,
      indexed,
      default: defaultValue,
      precision: parseInt(decimalMatch[1]!, 10),
      scale: parseInt(decimalMatch[2]!, 10),
    }
  }

  // Parse forward relations (->)
  if (remaining.startsWith('->')) {
    let relStr = remaining.slice(2).trim()
    const many = relStr.includes('[]')
    relStr = relStr.replace('[]', '')
    // Split target.inverseField
    const dotIdx = relStr.indexOf('.')
    let target: string
    let inverseField: string | undefined
    if (dotIdx !== -1) {
      target = relStr.slice(0, dotIdx)
      inverseField = relStr.slice(dotIdx + 1)
    } else {
      target = relStr
    }
    return {
      name,
      type: 'relation',
      required,
      unique: false,
      indexed: true,
      relation: { type: 'forward', target, many, inverseField },
    }
  }

  // Parse inverse relations (<-)
  if (remaining.startsWith('<-')) {
    let relStr = remaining.slice(2).trim()
    const many = relStr.includes('[]')
    relStr = relStr.replace('[]', '')
    const dotIdx = relStr.indexOf('.')
    let target: string
    let inverseField: string | undefined
    if (dotIdx !== -1) {
      target = relStr.slice(0, dotIdx)
      inverseField = relStr.slice(dotIdx + 1)
    } else {
      target = relStr
    }
    return {
      name,
      type: 'relation',
      required: false,
      unique: false,
      indexed: false,
      relation: { type: 'inverse', target, many, inverseField },
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

  // Parse array types (e.g., 'string[]')
  let isArray = false
  if (remaining.endsWith('[]')) {
    isArray = true
    remaining = remaining.slice(0, -2)
  }

  // Parse base type with format hints
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
    ulid: 'string',
    id: 'cuid',
    url: 'string',
    email: 'string',
    markdown: 'string',
    slug: 'string',
  }

  const formatMap: Record<string, string> = {
    url: 'url',
    email: 'email',
    markdown: 'markdown',
    slug: 'slug',
  }

  const lowerRemaining = remaining.toLowerCase()
  const baseType = typeMap[lowerRemaining] || 'string'
  const format = formatMap[lowerRemaining]

  const result: ParsedField = {
    name,
    type: baseType,
    required,
    unique,
    indexed,
    default: defaultValue,
  }

  if (format) result.format = format
  if (isArray) result.array = true

  return result
}

/**
 * Parse a model definition
 */
export function parseModel(name: string, def: Record<string, string>): ParsedModel {
  const fields: Record<string, ParsedField> = {}
  let primaryKey = 'id'

  // Extract $-prefixed metadata before processing fields
  const idStrategy = def.$id
  const nameField = def.$name

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

  const model: ParsedModel = {
    name,
    singular: toCamelCase(name),
    plural: pluralize(toCamelCase(name)),
    fields,
    primaryKey,
  }

  if (idStrategy) model.idStrategy = idStrategy
  if (nameField) model.nameField = nameField

  return model
}

/**
 * Parse a complete schema definition
 */
export function parseSchema(schema: SchemaDef): ParsedSchema {
  const models: Record<string, ParsedModel> = {}

  for (const [modelName, modelDef] of Object.entries(schema)) {
    // Validate table/model name to prevent SQL injection
    if (!validateTableName(modelName)) {
      throw new Error(
        `Invalid model name "${modelName}": must start with a letter and contain only alphanumeric characters and underscores`
      )
    }
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
        if (field.enum) {
          prop.enum = field.enum
        }
        if (field.format) {
          prop.format = field.format
        }
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

    // Wrap in array if field is array type
    if (field.array) {
      prop = { type: 'array', items: prop }
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
