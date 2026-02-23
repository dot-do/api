import { describe, it, expect } from 'vitest'
import {
  isValidColumnName,
  isAllowedColumn,
  validateColumns,
  validateTableName
} from '../../src/helpers/sql-validation'

describe('SQL validation helpers', () => {
  describe('isValidColumnName', () => {
    describe('valid patterns', () => {
      it('accepts simple lowercase names', () => {
        expect(isValidColumnName('name')).toBe(true)
      })

      it('accepts names with underscores', () => {
        expect(isValidColumnName('user_id')).toBe(true)
        expect(isValidColumnName('first_name')).toBe(true)
        expect(isValidColumnName('created_at')).toBe(true)
      })

      it('accepts names starting with underscore', () => {
        expect(isValidColumnName('_private')).toBe(true)
        expect(isValidColumnName('_id')).toBe(true)
        expect(isValidColumnName('__internal')).toBe(true)
      })

      it('accepts names with numbers after first character', () => {
        expect(isValidColumnName('Column1')).toBe(true)
        expect(isValidColumnName('field2')).toBe(true)
        expect(isValidColumnName('data_v2')).toBe(true)
      })

      it('accepts uppercase and mixed case names', () => {
        expect(isValidColumnName('ID')).toBe(true)
        expect(isValidColumnName('UserName')).toBe(true)
        expect(isValidColumnName('createdAt')).toBe(true)
      })
    })

    describe('invalid patterns', () => {
      it('rejects names starting with a number', () => {
        expect(isValidColumnName('1name')).toBe(false)
        expect(isValidColumnName('123')).toBe(false)
        expect(isValidColumnName('2nd_field')).toBe(false)
      })

      it('rejects names with semicolons (SQL injection)', () => {
        expect(isValidColumnName('name;DROP')).toBe(false)
        expect(isValidColumnName(';DROP TABLE users')).toBe(false)
        expect(isValidColumnName('column;')).toBe(false)
      })

      it('rejects names with single quotes', () => {
        expect(isValidColumnName("name'")).toBe(false)
        expect(isValidColumnName("'name")).toBe(false)
        expect(isValidColumnName("na'me")).toBe(false)
      })

      it('rejects names with double quotes', () => {
        expect(isValidColumnName('name"')).toBe(false)
        expect(isValidColumnName('"name')).toBe(false)
        expect(isValidColumnName('na"me')).toBe(false)
      })

      it('rejects names with SQL comment markers', () => {
        expect(isValidColumnName('name--')).toBe(false)
        expect(isValidColumnName('--comment')).toBe(false)
        expect(isValidColumnName('name--comment')).toBe(false)
      })

      it('rejects names with block comment markers', () => {
        expect(isValidColumnName('name/*')).toBe(false)
        expect(isValidColumnName('/*comment*/')).toBe(false)
        expect(isValidColumnName('name*/')).toBe(false)
      })

      it('rejects names with spaces', () => {
        expect(isValidColumnName('column name')).toBe(false)
        expect(isValidColumnName(' name')).toBe(false)
        expect(isValidColumnName('name ')).toBe(false)
      })

      it('rejects names with special characters', () => {
        expect(isValidColumnName('name!')).toBe(false)
        expect(isValidColumnName('name@domain')).toBe(false)
        expect(isValidColumnName('name#1')).toBe(false)
        expect(isValidColumnName('name$')).toBe(false)
        expect(isValidColumnName('name%')).toBe(false)
        expect(isValidColumnName('name^')).toBe(false)
        expect(isValidColumnName('name&')).toBe(false)
        expect(isValidColumnName('name=')).toBe(false)
        expect(isValidColumnName('name+')).toBe(false)
      })
    })
  })

  describe('isAllowedColumn', () => {
    describe('with whitelist', () => {
      const allowedColumns = ['id', 'name', 'email', 'created_at']

      it('accepts columns in the whitelist', () => {
        expect(isAllowedColumn('id', allowedColumns)).toBe(true)
        expect(isAllowedColumn('name', allowedColumns)).toBe(true)
        expect(isAllowedColumn('email', allowedColumns)).toBe(true)
        expect(isAllowedColumn('created_at', allowedColumns)).toBe(true)
      })

      it('rejects columns not in the whitelist', () => {
        expect(isAllowedColumn('password', allowedColumns)).toBe(false)
        expect(isAllowedColumn('secret', allowedColumns)).toBe(false)
        expect(isAllowedColumn('internal_notes', allowedColumns)).toBe(false)
      })

      it('rejects invalid column names even if somehow in whitelist concept', () => {
        // Pattern validation happens first
        expect(isAllowedColumn('1invalid', ['1invalid', 'id'])).toBe(false)
        expect(isAllowedColumn('name;DROP', ['name;DROP', 'id'])).toBe(false)
      })
    })

    describe('without whitelist', () => {
      it('accepts any valid column name pattern', () => {
        expect(isAllowedColumn('any_column')).toBe(true)
        expect(isAllowedColumn('AnyColumn')).toBe(true)
        expect(isAllowedColumn('_private')).toBe(true)
      })

      it('rejects invalid column name patterns', () => {
        expect(isAllowedColumn('1invalid')).toBe(false)
        expect(isAllowedColumn('name;DROP')).toBe(false)
        expect(isAllowedColumn("name'")).toBe(false)
      })

      it('accepts valid columns with undefined whitelist', () => {
        expect(isAllowedColumn('column', undefined)).toBe(true)
      })

      it('accepts valid columns with empty whitelist array', () => {
        expect(isAllowedColumn('column', [])).toBe(true)
      })
    })
  })

  describe('validateColumns', () => {
    describe('batch validation success', () => {
      it('returns valid=true when all columns pass', () => {
        const result = validateColumns(['id', 'name', 'email'])
        expect(result.valid).toBe(true)
        expect(result.invalidColumns).toHaveLength(0)
      })

      it('returns valid=true with whitelist when all columns are allowed', () => {
        const allowedColumns = ['id', 'name', 'email', 'created_at']
        const result = validateColumns(['id', 'name'], allowedColumns)
        expect(result.valid).toBe(true)
        expect(result.invalidColumns).toHaveLength(0)
      })

      it('returns valid=true for empty column array', () => {
        const result = validateColumns([])
        expect(result.valid).toBe(true)
        expect(result.invalidColumns).toHaveLength(0)
      })
    })

    describe('batch validation failure', () => {
      it('returns invalidColumns list when some fail pattern validation', () => {
        const result = validateColumns(['id', '1invalid', 'name', 'bad;column'])
        expect(result.valid).toBe(false)
        expect(result.invalidColumns).toContain('1invalid')
        expect(result.invalidColumns).toContain('bad;column')
        expect(result.invalidColumns).not.toContain('id')
        expect(result.invalidColumns).not.toContain('name')
      })

      it('returns invalidColumns list when some fail whitelist check', () => {
        const allowedColumns = ['id', 'name']
        const result = validateColumns(['id', 'name', 'secret', 'password'], allowedColumns)
        expect(result.valid).toBe(false)
        expect(result.invalidColumns).toContain('secret')
        expect(result.invalidColumns).toContain('password')
        expect(result.invalidColumns).toHaveLength(2)
      })

      it('returns all invalid columns, not just the first one', () => {
        const result = validateColumns(['bad1;', 'good', 'bad2--', 'also_good', "bad3'"])
        expect(result.valid).toBe(false)
        expect(result.invalidColumns).toHaveLength(3)
        expect(result.invalidColumns).toContain('bad1;')
        expect(result.invalidColumns).toContain('bad2--')
        expect(result.invalidColumns).toContain("bad3'")
      })
    })
  })

  describe('SQL injection attack patterns', () => {
    const sqlInjectionPayloads = [
      // Basic SQL injection
      "'; DROP TABLE users; --",
      "1; DROP TABLE users",
      "' OR '1'='1",
      "' OR 1=1 --",
      '" OR "1"="1',
      "' UNION SELECT * FROM users --",

      // Comment-based injection
      "admin'--",
      "admin/*",
      "*/DROP TABLE users/*",

      // String termination attacks
      "name'; DELETE FROM users WHERE '1'='1",
      'column"; DROP TABLE users; --',

      // Stacked queries
      "id; UPDATE users SET admin=1 WHERE id=1",
      "col1; INSERT INTO admin VALUES('hacked')",

      // UNION-based injection
      "id UNION SELECT password FROM users",
      "col' UNION ALL SELECT NULL,NULL,NULL--",

      // Boolean-based blind injection patterns
      "' AND 1=1 --",
      "' AND '1'='1",
      "col' AND SUBSTRING(password,1,1)='a",

      // Time-based blind injection
      "'; WAITFOR DELAY '0:0:10'--",
      "' AND SLEEP(5)--",

      // Error-based injection
      "' AND EXTRACTVALUE(1,CONCAT(0x7e,@@version))--",

      // Second-order injection attempts
      "admin'/*",
      "test\"; DROP TABLE users; --",

      // Encoded injection attempts
      "col%27%20OR%201=1",
      "name%3BDROP%20TABLE",

      // Newline injection
      "col\n; DROP TABLE users",
      "name\r\nDELETE FROM users",

      // Special characters
      "col`",
      "name\\",
      "col|ls",
      "name&id",
      "col>file",
      "name<script>",

      // Parentheses (function calls)
      "col()",
      "name(1,2)",
      "SELECT()",
    ]

    it('rejects all common SQL injection payloads', () => {
      for (const payload of sqlInjectionPayloads) {
        expect(isValidColumnName(payload)).toBe(false)
      }
    })

    it('rejects SQL injection payloads in validateColumns', () => {
      const result = validateColumns(sqlInjectionPayloads)
      expect(result.valid).toBe(false)
      expect(result.invalidColumns).toHaveLength(sqlInjectionPayloads.length)
    })

    it('rejects SQL injection payloads even with permissive whitelist', () => {
      // Even if whitelist contained these values, pattern validation catches them
      for (const payload of sqlInjectionPayloads) {
        expect(isAllowedColumn(payload, [payload])).toBe(false)
      }
    })
  })

  describe('Edge cases', () => {
    describe('empty string', () => {
      it('rejects empty string as column name', () => {
        expect(isValidColumnName('')).toBe(false)
      })

      it('rejects empty string in isAllowedColumn', () => {
        expect(isAllowedColumn('')).toBe(false)
        expect(isAllowedColumn('', [''])).toBe(false)
      })

      it('handles empty string in validateColumns', () => {
        const result = validateColumns(['id', '', 'name'])
        expect(result.valid).toBe(false)
        expect(result.invalidColumns).toContain('')
      })
    })

    describe('very long names', () => {
      it('accepts reasonably long valid column names', () => {
        const longName = 'a'.repeat(100)
        expect(isValidColumnName(longName)).toBe(true)
      })

      it('accepts very long valid column names', () => {
        const veryLongName = 'column_' + 'a'.repeat(1000)
        expect(isValidColumnName(veryLongName)).toBe(true)
      })

      it('rejects long names with invalid characters', () => {
        const longInvalidName = 'a'.repeat(50) + ';' + 'a'.repeat(50)
        expect(isValidColumnName(longInvalidName)).toBe(false)
      })
    })

    describe('unicode characters', () => {
      it('rejects unicode letters', () => {
        expect(isValidColumnName('nombre')).toBe(true) // ASCII
        expect(isValidColumnName('nom\u00e9')).toBe(false) // e with accent
        expect(isValidColumnName('\u4e2d\u6587')).toBe(false) // Chinese characters
        expect(isValidColumnName('\u0410\u0411\u0412')).toBe(false) // Cyrillic
      })

      it('rejects emoji', () => {
        expect(isValidColumnName('column\ud83d\ude00')).toBe(false)
        expect(isValidColumnName('\ud83d\udcca')).toBe(false)
      })

      it('rejects zero-width characters', () => {
        expect(isValidColumnName('col\u200bumn')).toBe(false) // zero-width space
        expect(isValidColumnName('column\u200c')).toBe(false) // zero-width non-joiner
        expect(isValidColumnName('\ufeffname')).toBe(false) // BOM
      })

      it('rejects homograph attacks', () => {
        // Cyrillic 'a' (U+0430) looks like Latin 'a'
        expect(isValidColumnName('\u0430dmin')).toBe(false)
        // Cyrillic 'o' (U+043E) looks like Latin 'o'
        expect(isValidColumnName('c\u043elumn')).toBe(false)
      })
    })

    describe('whitespace variations', () => {
      it('rejects tabs', () => {
        expect(isValidColumnName('col\tumn')).toBe(false)
        expect(isValidColumnName('\tcol')).toBe(false)
      })

      it('rejects newlines', () => {
        expect(isValidColumnName('col\numn')).toBe(false)
        expect(isValidColumnName('col\r\numn')).toBe(false)
      })

      it('rejects other whitespace', () => {
        expect(isValidColumnName('col\u00a0umn')).toBe(false) // non-breaking space
        expect(isValidColumnName('col\u2003umn')).toBe(false) // em space
      })
    })

    describe('single character edge cases', () => {
      it('accepts single letter', () => {
        expect(isValidColumnName('a')).toBe(true)
        expect(isValidColumnName('Z')).toBe(true)
      })

      it('accepts single underscore', () => {
        expect(isValidColumnName('_')).toBe(true)
      })

      it('rejects single digit', () => {
        expect(isValidColumnName('1')).toBe(false)
        expect(isValidColumnName('0')).toBe(false)
      })

      it('rejects single special character', () => {
        expect(isValidColumnName(';')).toBe(false)
        expect(isValidColumnName("'")).toBe(false)
        expect(isValidColumnName('"')).toBe(false)
        expect(isValidColumnName('-')).toBe(false)
      })
    })

    describe('SQL reserved word handling', () => {
      // Note: The current implementation doesn't block SQL reserved words
      // This documents the current behavior - reserved words pass pattern validation
      it('allows SQL reserved words (pattern-only validation)', () => {
        expect(isValidColumnName('SELECT')).toBe(true)
        expect(isValidColumnName('FROM')).toBe(true)
        expect(isValidColumnName('WHERE')).toBe(true)
        expect(isValidColumnName('DROP')).toBe(true)
        expect(isValidColumnName('TABLE')).toBe(true)
        expect(isValidColumnName('DELETE')).toBe(true)
        expect(isValidColumnName('INSERT')).toBe(true)
        expect(isValidColumnName('UPDATE')).toBe(true)
      })

      it('can block reserved words via whitelist', () => {
        const safeColumns = ['id', 'name', 'email']
        expect(isAllowedColumn('SELECT', safeColumns)).toBe(false)
        expect(isAllowedColumn('DROP', safeColumns)).toBe(false)
      })
    })
  })

  describe('validateTableName', () => {
    describe('valid table names', () => {
      it('accepts simple lowercase names', () => {
        expect(validateTableName('users')).toBe(true)
      })

      it('accepts names with underscores', () => {
        expect(validateTableName('user_profiles')).toBe(true)
        expect(validateTableName('order_items')).toBe(true)
      })

      it('accepts PascalCase names', () => {
        expect(validateTableName('UserAccounts')).toBe(true)
        expect(validateTableName('OrderDetails')).toBe(true)
      })

      it('accepts camelCase names', () => {
        expect(validateTableName('userAccounts')).toBe(true)
        expect(validateTableName('orderItems')).toBe(true)
      })

      it('accepts names with numbers after first character', () => {
        expect(validateTableName('users2')).toBe(true)
        expect(validateTableName('data_v2')).toBe(true)
        expect(validateTableName('Table1')).toBe(true)
      })

      it('accepts single letter names', () => {
        expect(validateTableName('a')).toBe(true)
        expect(validateTableName('T')).toBe(true)
      })
    })

    describe('invalid table names - SQL injection patterns', () => {
      it('rejects names with semicolons (SQL injection)', () => {
        expect(validateTableName('users; DROP TABLE users--')).toBe(false)
        expect(validateTableName('users;DROP')).toBe(false)
      })

      it('rejects names with single quotes', () => {
        expect(validateTableName("users' OR '1'='1")).toBe(false)
        expect(validateTableName("table'name")).toBe(false)
      })

      it('rejects names with double quotes', () => {
        expect(validateTableName('users"')).toBe(false)
        expect(validateTableName('"users')).toBe(false)
      })

      it('rejects names with SQL comment markers', () => {
        expect(validateTableName('users--')).toBe(false)
        expect(validateTableName('--users')).toBe(false)
        expect(validateTableName('users/*comment*/')).toBe(false)
      })
    })

    describe('invalid table names - format violations', () => {
      it('rejects names with spaces', () => {
        expect(validateTableName('user table')).toBe(false)
        expect(validateTableName(' users')).toBe(false)
        expect(validateTableName('users ')).toBe(false)
      })

      it('rejects names starting with numbers', () => {
        expect(validateTableName('1users')).toBe(false)
        expect(validateTableName('123')).toBe(false)
      })

      it('rejects names starting with underscore (differs from column names)', () => {
        expect(validateTableName('_users')).toBe(false)
        expect(validateTableName('_private_table')).toBe(false)
      })

      it('rejects names with special characters', () => {
        expect(validateTableName('users!')).toBe(false)
        expect(validateTableName('users@domain')).toBe(false)
        expect(validateTableName('users#1')).toBe(false)
        expect(validateTableName('users$')).toBe(false)
        expect(validateTableName('users%')).toBe(false)
        expect(validateTableName('users^')).toBe(false)
        expect(validateTableName('users&')).toBe(false)
        expect(validateTableName('users=')).toBe(false)
        expect(validateTableName('users+')).toBe(false)
        expect(validateTableName('users()')).toBe(false)
      })

      it('rejects empty string', () => {
        expect(validateTableName('')).toBe(false)
      })
    })

    describe('SQL injection attack patterns', () => {
      const sqlInjectionPayloads = [
        "users; DROP TABLE users--",
        "users' OR '1'='1",
        "table'; DELETE FROM users WHERE '1'='1",
        "table UNION SELECT * FROM users",
        "table/*comment*/",
        "'; WAITFOR DELAY '0:0:10'--",
        "table\n; DROP TABLE users",
        "table`",
        "table|ls",
      ]

      it('rejects all common SQL injection payloads', () => {
        for (const payload of sqlInjectionPayloads) {
          expect(validateTableName(payload)).toBe(false)
        }
      })
    })

    describe('unicode and special cases', () => {
      it('rejects unicode characters', () => {
        expect(validateTableName('t\u00e1ble')).toBe(false) // a with accent
        expect(validateTableName('\u4e2d\u6587')).toBe(false) // Chinese
      })

      it('rejects zero-width characters', () => {
        expect(validateTableName('users\u200b')).toBe(false) // zero-width space
      })

      it('rejects newlines and tabs', () => {
        expect(validateTableName('users\n')).toBe(false)
        expect(validateTableName('users\t')).toBe(false)
        expect(validateTableName('users\r\n')).toBe(false)
      })
    })
  })
})
