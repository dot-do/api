#!/bin/bash
# Patch PGlite for Cloudflare Workers compatibility
#
# This script patches the Emscripten-generated pglite.js for Workers:
# 1. Replace import.meta.url references (undefined in Workers)
# 2. Add caches check to skip Node.js detection (Workers have caches API)
# 3. Handle other Workers-specific incompatibilities
#
# Usage: ./scripts/patch-pglite.sh <input-file> <output-file>

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

INPUT="${1:-$PROJECT_DIR/../../../postgres/packages/pglite/packages/pglite/dist/pglite.js}"
OUTPUT="${2:-$PROJECT_DIR/src/pglite-patched/pglite-workers.js}"

echo "Patching PGlite for Cloudflare Workers..."
echo "  Input:  $INPUT"
echo "  Output: $OUTPUT"

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT")"

# Copy the file first
cp "$INPUT" "$OUTPUT"

# Patch 1: Replace _scriptName = import.meta.url with empty string
sed -i '' 's/var _scriptName = import.meta.url;/var _scriptName = "";/' "$OUTPUT"
echo "  Patched _scriptName"

# Patch 2: Add caches check to ENVIRONMENT_IS_NODE detection
# Workers have globalThis.caches, Node.js doesn't
sed -i '' 's/process.type!="renderer"/process.type!="renderer"\&\&typeof globalThis.caches==="undefined"/g' "$OUTPUT"
echo "  Patched ENVIRONMENT_IS_NODE detection"

# Patch 3: Guard the Node.js module import with caches check
sed -i '' 's/if(ENVIRONMENT_IS_NODE){const{createRequire}/if(ENVIRONMENT_IS_NODE \&\& typeof globalThis.caches === "undefined"){const{createRequire}/' "$OUTPUT"
echo "  Patched Node.js module import guard"

# Patch 4: Replace dirname = import.meta.url with "/"
sed -i '' 's|let dirname=import.meta.url|let dirname="/"|g' "$OUTPUT"
echo "  Patched dirname import.meta.url"

# Patch 5: Replace all remaining import.meta.url with empty string or safe fallback
sed -i '' 's|import\.meta\.url\.startsWith|("").startsWith|g' "$OUTPUT"
sed -i '' 's|import\.meta\.url|""|g' "$OUTPUT"
echo "  Patched remaining import.meta.url references"

# Patch 6: Replace new URL(..., "") patterns that result from earlier patches
# These are URLs relative to import.meta.url which is now ""
sed -i '' 's|new URL("pglite.wasm","").href|"pglite.wasm"|g' "$OUTPUT"
sed -i '' 's|new URL("pglite.data","").href|"pglite.data"|g' "$OUTPUT"
echo "  Patched new URL patterns"

# Patch 7: Add caches check to isNode variable detection (inside IIFE)
# var isNode=typeof process==="object"&&... => add &&typeof globalThis.caches==="undefined"
sed -i '' 's/var isNode=typeof process==="object"&&typeof process.versions==="object"&&typeof process.versions.node==="string"/var isNode=typeof process==="object"\&\&typeof process.versions==="object"\&\&typeof process.versions.node==="string"\&\&typeof globalThis.caches==="undefined"/g' "$OUTPUT"
echo "  Patched isNode variable detection"

# Patch 8: Add caches check to if(isNode) conditionals
sed -i '' 's/if(isNode){/if(isNode \&\& typeof globalThis.caches === "undefined"){/g' "$OUTPUT"
echo "  Patched if(isNode) conditionals"

# Patch 9: Guard self.location.href access (may be undefined in Durable Objects)
sed -i '' 's/scriptDirectory=self\.location\.href/scriptDirectory=(self.location\&\&self.location.href)||""/g' "$OUTPUT"
echo "  Patched self.location.href access"

# Verify patches applied
REMAINING=$(grep -c "import\.meta" "$OUTPUT" 2>/dev/null || true)
if [ -n "$REMAINING" ] && [ "$REMAINING" -gt 0 ]; then
    echo "  Warning: $REMAINING import.meta references remain"
    grep -n "import\.meta" "$OUTPUT" | head -5
else
    echo "  All import.meta references patched"
fi

echo "Done! Patched file: $OUTPUT"
