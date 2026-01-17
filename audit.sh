#!/bin/bash
# Nightmare Library - Security Audit Script
# Requires: wafw00f, nuclei, wapiti

TARGET="http://0.0.0.0:5000"
PASSWORD=${PASSWORD:-"admin123"} # Fallback for local testing

echo "--- 🔍 STEP 1: WAF FINGERPRINTING ---"
wafw00f $TARGET

echo "--- 🛡️ STEP 2: MODERN EXPLOIT SCAN (NUCLEI) ---"
# Check for misconfigurations, exposures, and tech-specific bugs
nuclei -u $TARGET -tags misconfig,tech,exposures -severity critical,high,medium

echo "--- 🧪 STEP 3: DYNAMIC FUZZING (WAPITI) ---"
# 1. Get Session Cookie (Authenticated Scan)
echo "Logging in to get session cookie..."
curl -s -X POST "$TARGET/api/auth" \
     -H "Content-Type: application/json" \
     -d "{\"password\": \"$PASSWORD\"}" \
     -c cookies.txt > /dev/null

# 2. Run Authenticated Scan
# --flush-session ensures a clean state
# -c uses the cookies we just grabbed
wapiti -u "$TARGET/" \
       -c cookies.txt \
       --flush-session \
       -o security_report \
       -f html \
       --level 1 # Level 1 for faster local audit

echo "--- ✅ AUDIT COMPLETE ---"
echo "Report generated in security_report/ folder."
