# Team Logo Sources

This document outlines various sources for college basketball team logos and how to integrate them.

## Current Implementation

We're currently using ESPN CDN URLs, which work but may have limitations. Here are better alternatives:

## Recommended Sources

### 1. **SportsLogos.net** (Best for Static URLs)
- **URL Format**: `https://a.espncdn.com/i/teamlogos/ncaa/500/{teamId}.png`
- **Pros**: 
  - High quality logos
  - Consistent format
  - No API key required
  - Works well for known teams
- **Cons**: 
  - Need to map team names to ESPN team IDs
  - May not have all teams
- **Usage**: Currently implemented in `lib/team-data.ts`

### 2. **Sportradar Images API** (Best for Commercial Use)
- **Website**: https://developer.sportradar.com/images-and-editorials/reference/images-overview
- **Pros**:
  - Official, licensed images
  - Comprehensive coverage
  - High quality
  - Includes player photos, venue images
- **Cons**:
  - Requires API key
  - May have usage limits/costs
  - More complex integration
- **Best for**: Production applications with budget

### 3. **Fantasy Nerds API**
- **Website**: https://api.fantasynerds.com/api-images
- **Pros**:
  - Free tier available
  - Multiple sizes available
  - Includes NFL, NBA, MLB, NCAA
- **Cons**:
  - Requires API key
  - May have rate limits
- **Best for**: Free tier projects

### 4. **GitHub Repositories** (Best for Open Source)
- **Example**: https://github.com/klunn91/team-logos
- **Pros**:
  - Free and open source
  - Can host yourself
  - No API calls needed
- **Cons**:
  - Need to verify licensing
  - May not be up-to-date
  - Requires hosting or CDN
- **Best for**: Self-hosted solutions

### 5. **UI Avatars API** (Fallback/Placeholder)
- **URL**: `https://ui-avatars.com/api/?name={abbreviation}&background={color}&color=fff`
- **Pros**:
  - Always works
  - No API key needed
  - Customizable colors
- **Cons**:
  - Not actual team logos
  - Generated avatars only
- **Best for**: Fallback when logos aren't available

## Implementation Recommendations

### Option 1: Expand ESPN CDN Mapping (Easiest)
Create a comprehensive mapping of team names to ESPN team IDs:

```typescript
const ESPN_TEAM_IDS: Record<string, number> = {
  "Duke Blue Devils": 150,
  "North Carolina Tar Heels": 153,
  "Kentucky Wildcats": 96,
  // ... add more
};

function getEspnLogoUrl(teamName: string): string {
  const teamId = ESPN_TEAM_IDS[teamName];
  if (teamId) {
    return `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`;
  }
  return fallbackUrl;
}
```

### Option 2: Use Sportradar API (Most Reliable)
If you have budget/API access:

```typescript
async function getTeamLogo(teamId: string): Promise<string> {
  const response = await fetch(
    `https://api.sportradar.com/ncaamb/images/v1/teams/${teamId}/logo`,
    {
      headers: {
        'Authorization': `Bearer ${SPORTRADAR_API_KEY}`
      }
    }
  );
  const data = await response.json();
  return data.logo_url;
}
```

### Option 3: Self-Host Logos (Most Control)
1. Download logos from official sources (with permission)
2. Host them on your CDN/storage
3. Create mapping file

```typescript
const LOGO_BASE_URL = process.env.NEXT_PUBLIC_LOGO_CDN_URL || '/logos';

function getTeamLogoUrl(teamName: string): string {
  const normalized = teamName.toLowerCase().replace(/\s+/g, '-');
  return `${LOGO_BASE_URL}/ncaa/${normalized}.png`;
}
```

## Finding ESPN Team IDs

To find ESPN team IDs for college basketball teams:

1. Go to ESPN.com and search for a team
2. Look at the team's page URL: `https://www.espn.com/mens-college-basketball/team/_/id/{ID}/...`
3. Or inspect network requests when loading team pages
4. Or use ESPN's API (if available) to search teams

## Quick Reference: Popular Teams

Here are some common ESPN team IDs for reference:

- Duke: 150
- North Carolina: 153
- Kentucky: 96
- Kansas: 2305
- UCLA: 26
- Michigan State: 127
- Villanova: 222
- Gonzaga: 2250
- Arizona: 12
- Baylor: 239

## Legal Considerations

⚠️ **Important**: Always ensure you have proper rights to use team logos:
- Check team/league licensing agreements
- Some logos are trademarked
- Educational/non-commercial use may have different rules
- Consider fair use guidelines for your jurisdiction

## Recommended Approach for This Project

For a sports betting dashboard:

1. **Short term**: Expand the ESPN CDN mapping with more teams
2. **Medium term**: Consider Sportradar API if budget allows
3. **Long term**: Self-host logos with proper licensing

The current implementation with ESPN CDN + UI Avatars fallback is a good starting point and works well for MVP.

