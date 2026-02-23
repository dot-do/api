/**
 * SQL validation helpers to prevent SQL injection attacks
 */

// Valid SQL column name pattern: alphanumeric characters and underscores only
// Must start with a letter or underscore
const VALID_COLUMN_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

// Valid SQL table name pattern: alphanumeric characters and underscores only
// Must start with a letter (not underscore, unlike columns)
const VALID_TABLE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/

/**
 * Validates that a table/model name is safe for use in SQL queries
 * @param name - The table name to validate
 * @returns true if the table name is valid, false otherwise
 */
export function validateTableName(name: string): boolean {
  return VALID_TABLE_NAME_PATTERN.test(name)
}

/**
 * Validates that a column name is safe for use in SQL queries
 * @param column - The column name to validate
 * @returns true if the column name is valid, false otherwise
 */
export function isValidColumnName(column: string): boolean {
  return VALID_COLUMN_PATTERN.test(column)
}

/**
 * Validates that a column name is safe and optionally in a whitelist
 * @param column - The column name to validate
 * @param allowedColumns - Optional array of allowed column names
 * @returns true if the column is valid and (if whitelist provided) in the whitelist
 */
export function isAllowedColumn(column: string, allowedColumns?: string[]): boolean {
  // First check the pattern
  if (!isValidColumnName(column)) {
    return false
  }

  // If a whitelist is provided, check membership
  if (allowedColumns && allowedColumns.length > 0) {
    return allowedColumns.includes(column)
  }

  return true
}

/**
 * Validates all columns in an object against allowed patterns and whitelist
 * @param columns - Array of column names to validate
 * @param allowedColumns - Optional array of allowed column names
 * @returns Object with valid status and list of invalid columns if any
 */
export function validateColumns(
  columns: string[],
  allowedColumns?: string[]
): { valid: boolean; invalidColumns: string[] } {
  const invalidColumns: string[] = []

  for (const column of columns) {
    if (!isAllowedColumn(column, allowedColumns)) {
      invalidColumns.push(column)
    }
  }

  return {
    valid: invalidColumns.length === 0,
    invalidColumns
  }
}
