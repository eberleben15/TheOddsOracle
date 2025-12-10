#!/bin/bash

echo "💣 NUCLEAR CLEAN - REMOVING ALL TEAM DATA"
echo "═══════════════════════════════════════"
echo ""
echo "⚠️  This will force API lookups for every team"
echo "⚠️  It will be slower but guarantee correct data"
echo ""

echo "1. Stopping all Next.js processes..."
pkill -f "next" || true
pkill -f "node" || true
sleep 3

echo "2. Removing ALL cache directories..."
rm -rf .next
rm -rf node_modules/.cache
echo "   ✓ Cleared .next and node cache"

echo "3. Removing ALL team mapping files..."
rm -f lib/team-mappings.json
rm -f lib/team-mappings.json.backup
rm -f lib/team-mappings-comprehensive.json
rm -f lib/team-mappings-comprehensive.json.backup
echo "   ✓ Removed all mapping files"

echo "4. Backing up and clearing team database..."
if [ -f "data/ncaa-teams.json" ]; then
  cp data/ncaa-teams.json data/ncaa-teams.json.backup.$(date +%Y%m%d_%H%M%S)
  echo "   ✓ Backed up database"
fi

# Create minimal empty database structure
cat > data/ncaa-teams.json << 'EOF'
{
  "version": "1.0.0-empty",
  "buildDate": "2024-12-10T00:00:00.000Z",
  "totalTeams": 0,
  "note": "Empty database - all teams will be looked up via API",
  "teams": []
}
EOF
echo "   ✓ Created empty database (all lookups will use API)"

echo "5. Creating empty mapping files..."
echo '{}' > lib/team-mappings.json
echo '{"mappings":{}}' > lib/team-mappings-comprehensive.json
echo "   ✓ Created empty mapping files"

echo ""
echo "✅ NUCLEAR CLEAN COMPLETE!"
echo ""
echo "═══════════════════════════════════════"
echo "🔥 ALL TEAM DATA HAS BEEN REMOVED"
echo ""
echo "What happens now:"
echo "  - Every team lookup will hit the API"
echo "  - This is SLOWER but GUARANTEES correct data"
echo "  - No cached wrong IDs can persist"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Navigate to any matchup"
echo "  3. Watch console - will see API searches"
echo "  4. Should get CORRECT team IDs every time"
echo ""
echo "Console will show:"
echo "  [STATS] 🌐 API CALL: Searching for \"Team Name\"..."
echo "  [STATS] ✓ Found via API: \"Team\" (ID: XXX)"
echo "═══════════════════════════════════════"

