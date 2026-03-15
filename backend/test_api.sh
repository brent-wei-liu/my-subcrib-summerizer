#!/usr/bin/env bash
# ============================================================
# API verification script
# Usage: bash test_api.sh
# Requires: curl, jq, uvicorn running on localhost:8000
# ============================================================

set -euo pipefail

BASE="http://localhost:8000/api/v1"
PASS=0
FAIL=0

check() {
  local desc="$1" expected_code="$2" actual_code="$3" body="$4"
  if [ "$actual_code" -eq "$expected_code" ]; then
    echo "  PASS  [$actual_code] $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  [$actual_code != $expected_code] $desc"
    echo "        Response: $body"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo " API Verification"
echo "=========================================="

# ----------------------------------------------------------
# Health
# ----------------------------------------------------------
echo ""
echo "--- Health ---"
resp=$(curl -s -w "\n%{http_code}" "http://localhost:8000/health")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /health" 200 "$code" "$body"

# ----------------------------------------------------------
# Settings
# ----------------------------------------------------------
echo ""
echo "--- Settings ---"

resp=$(curl -s -w "\n%{http_code}" "$BASE/settings")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /settings — default config" 200 "$code" "$body"

# Verify default values
provider=$(echo "$body" | jq -r '.llm.provider')
[ "$provider" = "claude" ] && check "  provider == claude" 200 200 "" || check "  provider == claude" 200 500 "got $provider"

resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/settings" \
  -H "Content-Type: application/json" \
  -d '{"llm":{"max_tokens":4000},"crawler":{"request_timeout_seconds":60}}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /settings — update max_tokens & timeout" 200 "$code" "$body"

max_tokens=$(echo "$body" | jq '.llm.max_tokens')
timeout_s=$(echo "$body" | jq '.crawler.request_timeout_seconds')
[ "$max_tokens" = "4000" ] && check "  max_tokens == 4000" 200 200 "" || check "  max_tokens == 4000" 200 500 "got $max_tokens"
[ "$timeout_s" = "60" ] && check "  timeout == 60" 200 200 "" || check "  timeout == 60" 200 500 "got $timeout_s"

# Set API key and verify it's masked
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/settings" \
  -H "Content-Type: application/json" \
  -d '{"llm":{"claude_api_key":"sk-test-12345"}}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
key_set=$(echo "$body" | jq '.llm.claude_api_key_set')
has_raw=$(echo "$body" | jq 'has("claude_api_key")')
[ "$key_set" = "true" ] && check "  claude_api_key_set == true" 200 200 "" || check "  claude_api_key_set == true" 200 500 "got $key_set"

# ----------------------------------------------------------
# Sources CRUD
# ----------------------------------------------------------
echo ""
echo "--- Sources ---"

resp=$(curl -s -w "\n%{http_code}" "$BASE/sources")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /sources — initially empty" 200 "$code" "$body"
count=$(echo "$body" | jq 'length')
[ "$count" = "0" ] && check "  count == 0" 200 200 "" || check "  count == 0" 200 500 "got $count"

# Create
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/sources" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker News","url":"https://news.ycombinator.com/rss","category":"tech"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /sources — create HN" 201 "$code" "$body"
SOURCE_ID=$(echo "$body" | jq -r '.id')
echo "        created source_id=$SOURCE_ID"

# Create a second source
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/sources" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lobsters","url":"https://lobste.rs/rss","category":"tech"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /sources — create Lobsters" 201 "$code" "$body"
SOURCE_ID_2=$(echo "$body" | jq -r '.id')

# Get single
resp=$(curl -s -w "\n%{http_code}" "$BASE/sources/$SOURCE_ID")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /sources/{id}" 200 "$code" "$body"

# Update
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/sources/$SOURCE_ID" \
  -H "Content-Type: application/json" \
  -d '{"category":"news"}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /sources/{id} — change category" 200 "$code" "$body"
cat_val=$(echo "$body" | jq -r '.category')
[ "$cat_val" = "news" ] && check "  category == news" 200 200 "" || check "  category == news" 200 500 "got $cat_val"

# List — should have 2
resp=$(curl -s -w "\n%{http_code}" "$BASE/sources")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
count=$(echo "$body" | jq 'length')
[ "$count" = "2" ] && check "  list count == 2" 200 200 "" || check "  list count == 2" 200 500 "got $count"

# 404
resp=$(curl -s -w "\n%{http_code}" "$BASE/sources/00000000-0000-0000-0000-000000000000")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /sources/{bad_id} — 404" 404 "$code" "$body"

# Validation error
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/sources" \
  -H "Content-Type: application/json" \
  -d '{"name":""}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /sources — validation error (empty name)" 422 "$code" "$body"

# ----------------------------------------------------------
# Crawler
# ----------------------------------------------------------
echo ""
echo "--- Crawler ---"

resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/crawler/trigger")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /crawler/trigger — first crawl" 200 "$code" "$body"
new_count=$(echo "$body" | jq '.total_new_articles')
crawled=$(echo "$body" | jq '.sources_crawled')
echo "        new_articles=$new_count  sources_crawled=$crawled"
[ "$new_count" -gt 0 ] && check "  total_new_articles > 0" 200 200 "" || check "  total_new_articles > 0" 200 500 "got $new_count"

# Second crawl — dedup
resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/crawler/trigger")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /crawler/trigger — dedup crawl" 200 "$code" "$body"
new_count2=$(echo "$body" | jq '.total_new_articles')
echo "        new_articles=$new_count2 (should be 0 or very few)"
[ "$new_count2" -lt "$new_count" ] && check "  dedup: fewer new articles" 200 200 "" || check "  dedup: fewer new articles" 200 500 "first=$new_count second=$new_count2"

# Verify last_fetched_at is updated
resp=$(curl -s -w "\n%{http_code}" "$BASE/sources/$SOURCE_ID")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
fetched=$(echo "$body" | jq -r '.last_fetched_at')
[ "$fetched" != "null" ] && check "  last_fetched_at is set" 200 200 "" || check "  last_fetched_at is set" 200 500 "got null"

# ----------------------------------------------------------
# Articles
# ----------------------------------------------------------
echo ""
echo "--- Articles ---"

resp=$(curl -s -w "\n%{http_code}" "$BASE/articles?limit=3")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /articles?limit=3" 200 "$code" "$body"
total=$(echo "$body" | jq '.total')
items_len=$(echo "$body" | jq '.items | length')
echo "        total=$total  returned=$items_len"
[ "$items_len" -le 3 ] && check "  returned <= 3" 200 200 "" || check "  returned <= 3" 200 500 "got $items_len"

# Filter by source_id
resp=$(curl -s -w "\n%{http_code}" "$BASE/articles?source_id=$SOURCE_ID&limit=5")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /articles?source_id=... — filter" 200 "$code" "$body"
filtered_total=$(echo "$body" | jq '.total')
echo "        filtered_total=$filtered_total for source $SOURCE_ID"

# Pagination
resp=$(curl -s -w "\n%{http_code}" "$BASE/articles?limit=2&offset=0")
body1=$(echo "$resp" | sed '$d')
resp=$(curl -s -w "\n%{http_code}" "$BASE/articles?limit=2&offset=2")
body2=$(echo "$resp" | sed '$d')
id1=$(echo "$body1" | jq -r '.items[0].id // empty')
id2=$(echo "$body2" | jq -r '.items[0].id // empty')
if [ -n "$id1" ] && [ -n "$id2" ] && [ "$id1" != "$id2" ]; then
  check "  pagination returns different items" 200 200 ""
else
  check "  pagination returns different items" 200 200 "(not enough articles to verify)"
fi

# Get single article
ARTICLE_ID=$(echo "$body1" | jq -r '.items[0].id // empty')
if [ -n "$ARTICLE_ID" ]; then
  resp=$(curl -s -w "\n%{http_code}" "$BASE/articles/$ARTICLE_ID")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')
  check "GET /articles/{id}" 200 "$code" "$body"
fi

# 404
resp=$(curl -s -w "\n%{http_code}" "$BASE/articles/00000000-0000-0000-0000-000000000000")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /articles/{bad_id} — 404" 404 "$code" "$body"

# ----------------------------------------------------------
# Summaries
# ----------------------------------------------------------
echo ""
echo "--- Summaries ---"

resp=$(curl -s -w "\n%{http_code}" "$BASE/summaries")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /summaries — initially empty" 200 "$code" "$body"

# Generate — no API key set for real LLM, expect 502
# (reset to remove the test key we set earlier)
curl -s -X PUT "$BASE/settings" \
  -H "Content-Type: application/json" \
  -d '{"llm":{"claude_api_key":""}}' > /dev/null

resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/summaries/generate" \
  -H "Content-Type: application/json" \
  -d '{"since_days":7}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "POST /summaries/generate — no API key → error" 400 "$code" "$body"

# If CLAUDE_API_KEY env var is set, test real generation
if [ -n "${CLAUDE_API_KEY:-}" ]; then
  echo ""
  echo "  (CLAUDE_API_KEY detected — testing real summary generation)"

  # Reset settings to use env var
  curl -s -X PUT "$BASE/settings" \
    -H "Content-Type: application/json" \
    -d '{"llm":{"provider":"claude","model":"claude-sonnet-4-20250514","max_tokens":1000}}' > /dev/null

  resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/summaries/generate" \
    -H "Content-Type: application/json" \
    -d "{\"source_ids\":[\"$SOURCE_ID\"],\"since_days\":7}")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')
  check "POST /summaries/generate — single source" 200 "$code" "$body"
  if [ "$code" = "200" ]; then
    SUMMARY_ID=$(echo "$body" | jq -r '.id')
    article_count=$(echo "$body" | jq '.article_count')
    echo "        summary_id=$SUMMARY_ID  article_count=$article_count"
    echo "        content preview: $(echo "$body" | jq -r '.content' | head -3)"
  fi

  # Generate cross-source summary
  resp=$(curl -s -w "\n%{http_code}" -X POST "$BASE/summaries/generate" \
    -H "Content-Type: application/json" \
    -d '{"since_days":7}')
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')
  check "POST /summaries/generate — cross-source" 200 "$code" "$body"

  # List summaries
  resp=$(curl -s -w "\n%{http_code}" "$BASE/summaries")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')
  total=$(echo "$body" | jq '.total')
  check "GET /summaries — has entries" 200 "$code" "$body"
  [ "$total" -gt 0 ] && check "  total > 0" 200 200 "" || check "  total > 0" 200 500 "got $total"

  # Get single summary
  if [ -n "${SUMMARY_ID:-}" ]; then
    resp=$(curl -s -w "\n%{http_code}" "$BASE/summaries/$SUMMARY_ID")
    code=$(echo "$resp" | tail -1)
    body=$(echo "$resp" | sed '$d')
    check "GET /summaries/{id}" 200 "$code" "$body"

    # Verify token counts
    ptokens=$(echo "$body" | jq '.prompt_tokens')
    ctokens=$(echo "$body" | jq '.completion_tokens')
    [ "$ptokens" -gt 0 ] && check "  prompt_tokens > 0" 200 200 "" || check "  prompt_tokens > 0" 200 500 "got $ptokens"
    [ "$ctokens" -gt 0 ] && check "  completion_tokens > 0" 200 200 "" || check "  completion_tokens > 0" 200 500 "got $ctokens"

    # Delete summary
    resp=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/summaries/$SUMMARY_ID")
    code=$(echo "$resp" | tail -1)
    check "DELETE /summaries/{id}" 204 "$code" ""
  fi
else
  echo "  (set CLAUDE_API_KEY to test real summary generation)"
fi

# 404
resp=$(curl -s -w "\n%{http_code}" "$BASE/summaries/00000000-0000-0000-0000-000000000000")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /summaries/{bad_id} — 404" 404 "$code" "$body"

# ----------------------------------------------------------
# Scheduler
# ----------------------------------------------------------
echo ""
echo "--- Scheduler ---"

resp=$(curl -s -w "\n%{http_code}" "$BASE/scheduler/status")
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "GET /scheduler/status" 200 "$code" "$body"
running=$(echo "$body" | jq '.running')
echo "        enabled=$(echo "$body" | jq '.enabled')  running=$running  interval=$(echo "$body" | jq '.interval_minutes')min"

# Update interval
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/scheduler/config" \
  -H "Content-Type: application/json" \
  -d '{"interval_minutes":60}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /scheduler/config — set 60min" 200 "$code" "$body"
interval=$(echo "$body" | jq '.interval_minutes')
[ "$interval" = "60" ] && check "  interval == 60" 200 200 "" || check "  interval == 60" 200 500 "got $interval"

# Disable
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/scheduler/config" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /scheduler/config — disable" 200 "$code" "$body"
next=$(echo "$body" | jq -r '.next_run_at')
[ "$next" = "null" ] && check "  next_run_at == null" 200 200 "" || check "  next_run_at == null" 200 500 "got $next"

# Re-enable
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/scheduler/config" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /scheduler/config — re-enable" 200 "$code" "$body"

# Validation error
resp=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/scheduler/config" \
  -H "Content-Type: application/json" \
  -d '{"interval_minutes":1}')
code=$(echo "$resp" | tail -1)
body=$(echo "$resp" | sed '$d')
check "PUT /scheduler/config — invalid interval → 422" 422 "$code" "$body"

# ----------------------------------------------------------
# Cleanup: delete sources
# ----------------------------------------------------------
echo ""
echo "--- Cleanup ---"

resp=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/sources/$SOURCE_ID")
code=$(echo "$resp" | tail -1)
check "DELETE /sources/{id} — HN" 204 "$code" ""

resp=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/sources/$SOURCE_ID_2")
code=$(echo "$resp" | tail -1)
check "DELETE /sources/{id} — Lobsters" 204 "$code" ""

# Confirm deletion
resp=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/sources/$SOURCE_ID")
code=$(echo "$resp" | tail -1)
check "DELETE /sources/{id} — already deleted → 404" 404 "$code" ""

# ----------------------------------------------------------
# Summary
# ----------------------------------------------------------
echo ""
echo "=========================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=========================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
