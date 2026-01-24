#!/usr/bin/env node

import { main } from '../dist/index.js'

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
