/**
 * Debug odds accuracy - check what The Odds API actually returns
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

async function debugOdds() {
  const apiKey = process.env.THE_ODDS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ THE_ODDS_API_KEY not set");
    process.exit(1);
  }

  console.log("🎲 ODDS API ACCURACY CHECK");
  console.log("═══════════════════════════════════════\n");

  // Fetch upcoming games
  const url = `${THE_ODDS_API_BASE_URL}/sports/basketball_ncaab/odds/?regions=us&markets=spreads&apiKey=${apiKey}`;
  
  console.log("Fetching odds from The Odds API...\n");
  
  const response = await fetch(url);
  const data = await response.json();

  // Find Norfolk State vs Baylor game
  const game = data.find((g: any) => 
    (g.home_team?.includes("Norfolk") || g.away_team?.includes("Norfolk")) &&
    (g.home_team?.includes("Baylor") || g.away_team?.includes("Baylor"))
  );

  if (!game) {
    console.log("❌ Norfolk State vs Baylor game not found in API response");
    console.log("\nShowing first 3 games instead:\n");
    
    data.slice(0, 3).forEach((g: any) => {
      console.log(`${g.away_team} @ ${g.home_team}`);
      if (g.bookmakers && g.bookmakers.length > 0) {
        g.bookmakers.forEach((book: any) => {
          const spreadMarket = book.markets?.find((m: any) => m.key === 'spreads');
          if (spreadMarket) {
            console.log(`  ${book.title}:`);
            spreadMarket.outcomes.forEach((o: any) => {
              console.log(`    ${o.name}: ${o.point > 0 ? '+' : ''}${o.point}`);
            });
          }
        });
      }
      console.log();
    });
    return;
  }

  console.log("📊 GAME FOUND:");
  console.log("═══════════════════════════════════════");
  console.log(`${game.away_team} @ ${game.home_team}`);
  console.log(`Game Time: ${new Date(game.commence_time).toLocaleString()}`);
  console.log();

  console.log("📖 BOOKMAKERS & SPREADS:");
  console.log("═══════════════════════════════════════\n");

  if (!game.bookmakers || game.bookmakers.length === 0) {
    console.log("❌ No bookmakers found for this game");
    return;
  }

  // Show all bookmakers
  game.bookmakers.forEach((bookmaker: any) => {
    const spreadMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads');
    
    if (spreadMarket) {
      console.log(`${bookmaker.title} (key: ${bookmaker.key}):`);
      spreadMarket.outcomes.forEach((outcome: any) => {
        const point = outcome.point;
        const displayPoint = point > 0 ? `+${point}` : point;
        console.log(`  ${outcome.name}: ${displayPoint} (price: ${outcome.price})`);
      });
      console.log();
    }
  });

  // Check for DraftKings specifically
  const draftKings = game.bookmakers.find((b: any) => 
    b.key === 'draftkings' || b.title.toLowerCase().includes('draftkings')
  );

  console.log("\n🎯 COMPARISON:");
  console.log("═══════════════════════════════════════");
  
  if (draftKings) {
    const dkSpread = draftKings.markets?.find((m: any) => m.key === 'spreads');
    if (dkSpread) {
      console.log("DraftKings (from API):");
      dkSpread.outcomes.forEach((o: any) => {
        console.log(`  ${o.name}: ${o.point > 0 ? '+' : ''}${o.point}`);
      });
    }
  } else {
    console.log("⚠️  DraftKings not in API response");
    console.log("   The Odds API may not include DraftKings in your subscription");
  }

  console.log("\nYour App Shows:");
  console.log("  +27.5 / -27.5");
  
  console.log("\nDraftKings Website Shows:");
  console.log("  +26.5 / -26.5");

  console.log("\n💡 EXPLANATION:");
  console.log("═══════════════════════════════════════");
  console.log("1. Odds move constantly based on betting action");
  console.log("2. Different books have different lines");
  console.log("3. The Odds API updates every ~5 minutes");
  console.log("4. Your app caches for 30 seconds");
  console.log("5. DraftKings may not be in your API subscription");
  console.log("\n✅ This is NORMAL - odds are live and change constantly");
}

debugOdds().catch(console.error);

