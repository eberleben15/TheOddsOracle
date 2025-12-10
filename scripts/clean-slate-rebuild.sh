#!/bin/bash

echo "🧹 COMPLETE CLEAN SLATE REBUILD"
echo "═══════════════════════════════════════"
echo ""

echo "1. Stopping any running dev servers..."
pkill -f "next dev" || true
sleep 2

echo "2. Clearing Next.js build cache..."
rm -rf .next
echo "   ✓ Removed .next/"

echo "3. Backing up and clearing team mapping files..."
if [ -f "lib/team-mappings.json" ]; then
  mv lib/team-mappings.json lib/team-mappings.json.backup
  echo "   ✓ Backed up team-mappings.json"
fi

if [ -f "lib/team-mappings-comprehensive.json" ]; then
  mv lib/team-mappings-comprehensive.json lib/team-mappings-comprehensive.json.backup
  echo "   ✓ Backed up team-mappings-comprehensive.json"
fi

# Create empty mapping files
echo '{"mappings":{}}' > lib/team-mappings-comprehensive.json
echo '{}' > lib/team-mappings.json
echo "   ✓ Created fresh empty mapping files"

echo ""
echo "4. Clearing node module cache (optional)..."
npm cache clean --force 2>/dev/null || true

echo ""
echo "✅ CLEAN SLATE COMPLETE!"
echo ""
echo "═══════════════════════════════════════"
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Navigate to Nebraska vs Wisconsin matchup"
echo "  3. Watch console for team lookups:"
echo "     - Should see database lookups (not cache hits)"
echo "     - Nebraska: ID 195"
echo "     - Wisconsin: ID 2214"
echo ""
echo "If you still see wrong data:"
echo "  - Hard refresh browser (Cmd+Shift+R)"
echo "  - Clear browser cache"
echo "  - Check console logs carefully"
echo "═══════════════════════════════════════"

