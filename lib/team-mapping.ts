/**
 * Team Mapping Cache System
 * Maps team names from The Odds API to API-Sports.io team IDs
 */

export type MatchConfidence = "exact" | "partial" | "manual";

export interface TeamMapping {
  apiSportsId: number;
  apiSportsName: string;
  confidence: MatchConfidence;
  oddsApiName: string; // Original name from Odds API
  cachedAt: number; // Timestamp
}

class TeamMappingCache {
  private cache: Map<string, TeamMapping> = new Map();
  private manualMappings: Map<string, TeamMapping> = new Map();

  /**
   * Load manual mappings from a JSON object
   */
  loadManualMappings(mappings: Record<string, { id: number; name: string }>): void {
    for (const [oddsApiName, mapping] of Object.entries(mappings)) {
      this.manualMappings.set(oddsApiName.toLowerCase(), {
        apiSportsId: mapping.id,
        apiSportsName: mapping.name,
        confidence: "manual",
        oddsApiName,
        cachedAt: Date.now(),
      });
    }
    console.log(`Loaded ${this.manualMappings.size} manual team mappings`);
  }

  /**
   * Get a team mapping from cache
   */
  get(oddsApiName: string): TeamMapping | null {
    const normalizedName = oddsApiName.toLowerCase().trim();
    
    // Check manual mappings first (highest priority)
    const manualMapping = this.manualMappings.get(normalizedName);
    if (manualMapping) {
      console.log(`Cache HIT (manual): "${oddsApiName}" -> ID ${manualMapping.apiSportsId}`);
      return manualMapping;
    }
    
    // Check regular cache
    const cached = this.cache.get(normalizedName);
    if (cached) {
      console.log(`Cache HIT: "${oddsApiName}" -> ID ${cached.apiSportsId} (${cached.confidence})`);
      return cached;
    }
    
    console.log(`Cache MISS: "${oddsApiName}"`);
    return null;
  }

  /**
   * Store a team mapping in cache
   */
  set(
    oddsApiName: string,
    apiSportsId: number,
    apiSportsName: string,
    confidence: MatchConfidence = "partial"
  ): void {
    const normalizedName = oddsApiName.toLowerCase().trim();
    
    // Don't overwrite manual mappings
    if (this.manualMappings.has(normalizedName)) {
      console.log(`Skipping cache set for "${oddsApiName}" - manual mapping exists`);
      return;
    }
    
    const mapping: TeamMapping = {
      apiSportsId,
      apiSportsName,
      confidence,
      oddsApiName,
      cachedAt: Date.now(),
    };
    
    this.cache.set(normalizedName, mapping);
    console.log(`Cache SET: "${oddsApiName}" -> ID ${apiSportsId} (${confidence})`);
  }

  /**
   * Clear all cached mappings (except manual ones)
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`Cleared ${count} cached team mappings`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; manual: number; cached: number } {
    return {
      total: this.cache.size + this.manualMappings.size,
      manual: this.manualMappings.size,
      cached: this.cache.size,
    };
  }

  /**
   * Check if a team is in cache
   */
  has(oddsApiName: string): boolean {
    const normalizedName = oddsApiName.toLowerCase().trim();
    return this.manualMappings.has(normalizedName) || this.cache.has(normalizedName);
  }
}

// Singleton instance
export const teamMappingCache = new TeamMappingCache();

// Function to load manual mappings (can be called from API route or server component)
export function loadManualMappingsFromFile(mappings: Record<string, { id: number; name: string }>): void {
  teamMappingCache.loadManualMappings(mappings);
}

// Load comprehensive mappings first (if available)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const comprehensiveMappings = require("./team-mappings-comprehensive.json");
  if (comprehensiveMappings.mappings) {
    loadManualMappingsFromFile(comprehensiveMappings.mappings);
    console.log(`Loaded ${Object.keys(comprehensiveMappings.mappings).length} comprehensive team mappings`);
  }
} catch (error) {
  // File doesn't exist - that's okay
}

// Load manual mappings (overrides comprehensive mappings if same key exists)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const manualMappings = require("./team-mappings.json");
  loadManualMappingsFromFile(manualMappings);
} catch (error) {
  // File doesn't exist or can't be loaded - that's okay
  // Manual mappings are optional, cache will work without them
}

