#!/bin/bash
# Test script for wiktionary.example.com.ai

BASE_URL="https://wiktionary.example.com.ai"

echo "=== Wiktionary Dictionary API Test ==="
echo ""

echo "1. Health Check (instant):"
curl -s "$BASE_URL/ping" | jq -C '.'
echo ""

echo "2. Debug Info (instant):"
curl -s "$BASE_URL/debug" | jq -C '.wasm, .timing'
echo ""

echo "3. PostgreSQL Version:"
curl -s "$BASE_URL/version" | jq -C '.version, .timing'
echo ""

echo "4. Current Stats:"
curl -s "$BASE_URL/stats" | jq -C '.'
echo ""

echo "5. Seed Status:"
curl -s "$BASE_URL/seed/status" | jq -C '.'
echo ""

echo "6. List Words (first 3):"
curl -s "$BASE_URL/words?limit=3" | jq -C '.words[].word, .total, .timing'
echo ""

echo "7. Get Word 'dictionary':"
curl -s "$BASE_URL/words/dictionary" | jq -C '.[0] | {word, pos, definitions}'
echo ""

echo "8. Search for 'abandon':"
curl -s "$BASE_URL/search?q=abandon&limit=3" | jq -C '.words[] | {word, pos}'
echo ""

echo "9. Run Benchmarks:"
curl -s -X POST "$BASE_URL/benchmark" | jq -C '.queries, .totalMs'
echo ""

echo "=== All tests complete ==="
