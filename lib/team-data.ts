// Team data mapping for college basketball teams
// Includes logos (using sportslogos.net or similar) and primary colors

export interface TeamData {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

// Common college basketball teams with their colors and logos
// Using sportslogos.net format for logos
const TEAM_DATA: Record<string, TeamData> = {
  // Popular teams - you can expand this list
  "Duke Blue Devils": {
    name: "Duke Blue Devils",
    abbreviation: "DUKE",
    primaryColor: "#003087",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png",
  },
  "North Carolina Tar Heels": {
    name: "North Carolina Tar Heels",
    abbreviation: "UNC",
    primaryColor: "#7BAFD4",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png",
  },
  "Kentucky Wildcats": {
    name: "Kentucky Wildcats",
    abbreviation: "UK",
    primaryColor: "#0033A0",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/96.png",
  },
  "Kansas Jayhawks": {
    name: "Kansas Jayhawks",
    abbreviation: "KU",
    primaryColor: "#0051BA",
    secondaryColor: "#E8000D",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png",
  },
  "UCLA Bruins": {
    name: "UCLA Bruins",
    abbreviation: "UCLA",
    primaryColor: "#2D68C4",
    secondaryColor: "#FFB81C",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/26.png",
  },
  "Michigan State Spartans": {
    name: "Michigan State Spartans",
    abbreviation: "MSU",
    primaryColor: "#18453B",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/127.png",
  },
  "Villanova Wildcats": {
    name: "Villanova Wildcats",
    abbreviation: "NOVA",
    primaryColor: "#00205B",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/222.png",
  },
  "Gonzaga Bulldogs": {
    name: "Gonzaga Bulldogs",
    abbreviation: "GONZ",
    primaryColor: "#003366",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png",
  },
  "Arizona Wildcats": {
    name: "Arizona Wildcats",
    abbreviation: "ARIZ",
    primaryColor: "#003366",
    secondaryColor: "#CC0033",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png",
  },
  "Baylor Bears": {
    name: "Baylor Bears",
    abbreviation: "BAY",
    primaryColor: "#003015",
    secondaryColor: "#FFB81C",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png",
  },
  // ACC Teams
  "Virginia Cavaliers": {
    name: "Virginia Cavaliers",
    abbreviation: "UVA",
    primaryColor: "#232D4B",
    secondaryColor: "#E57200",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/258.png",
  },
  "Florida State Seminoles": {
    name: "Florida State Seminoles",
    abbreviation: "FSU",
    primaryColor: "#782F40",
    secondaryColor: "#CEB888",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/52.png",
  },
  "Louisville Cardinals": {
    name: "Louisville Cardinals",
    abbreviation: "LOU",
    primaryColor: "#AD0000",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/97.png",
  },
  "Syracuse Orange": {
    name: "Syracuse Orange",
    abbreviation: "SYR",
    primaryColor: "#F47321",
    secondaryColor: "#003366",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/183.png",
  },
  "Miami Hurricanes": {
    name: "Miami Hurricanes",
    abbreviation: "MIA",
    primaryColor: "#F47321",
    secondaryColor: "#005030",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2390.png",
  },
  "Notre Dame Fighting Irish": {
    name: "Notre Dame Fighting Irish",
    abbreviation: "ND",
    primaryColor: "#0C2340",
    secondaryColor: "#C99700",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/87.png",
  },
  "Virginia Tech Hokies": {
    name: "Virginia Tech Hokies",
    abbreviation: "VT",
    primaryColor: "#630031",
    secondaryColor: "#FF6600",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/259.png",
  },
  "NC State Wolfpack": {
    name: "NC State Wolfpack",
    abbreviation: "NCST",
    primaryColor: "#CC0000",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/152.png",
  },
  "Wake Forest Demon Deacons": {
    name: "Wake Forest Demon Deacons",
    abbreviation: "WAKE",
    primaryColor: "#9E7E38",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/154.png",
  },
  "Clemson Tigers": {
    name: "Clemson Tigers",
    abbreviation: "CLEM",
    primaryColor: "#F66733",
    secondaryColor: "#522D80",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png",
  },
  "Georgia Tech Yellow Jackets": {
    name: "Georgia Tech Yellow Jackets",
    abbreviation: "GT",
    primaryColor: "#003A70",
    secondaryColor: "#B3A369",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/59.png",
  },
  "Boston College Eagles": {
    name: "Boston College Eagles",
    abbreviation: "BC",
    primaryColor: "#8B0000",
    secondaryColor: "#FFD700",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/103.png",
  },
  "Pittsburgh Panthers": {
    name: "Pittsburgh Panthers",
    abbreviation: "PITT",
    primaryColor: "#003263",
    secondaryColor: "#FFB612",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/221.png",
  },
  // Big Ten Teams
  "Michigan Wolverines": {
    name: "Michigan Wolverines",
    abbreviation: "MICH",
    primaryColor: "#00274C",
    secondaryColor: "#FFCB05",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png",
  },
  "Indiana Hoosiers": {
    name: "Indiana Hoosiers",
    abbreviation: "IND",
    primaryColor: "#990000",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/84.png",
  },
  "Purdue Boilermakers": {
    name: "Purdue Boilermakers",
    abbreviation: "PUR",
    primaryColor: "#CEB888",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png",
  },
  "Ohio State Buckeyes": {
    name: "Ohio State Buckeyes",
    abbreviation: "OSU",
    primaryColor: "#BB0000",
    secondaryColor: "#666666",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/194.png",
  },
  "Illinois Fighting Illini": {
    name: "Illinois Fighting Illini",
    abbreviation: "ILL",
    primaryColor: "#FF5F00",
    secondaryColor: "#13294B",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/356.png",
  },
  "Wisconsin Badgers": {
    name: "Wisconsin Badgers",
    abbreviation: "WISC",
    primaryColor: "#C5050C",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/275.png",
  },
  "Maryland Terrapins": {
    name: "Maryland Terrapins",
    abbreviation: "MD",
    primaryColor: "#E03A3E",
    secondaryColor: "#FFD520",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/120.png",
  },
  "Iowa Hawkeyes": {
    name: "Iowa Hawkeyes",
    abbreviation: "IOWA",
    primaryColor: "#000000",
    secondaryColor: "#FFCD00",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2294.png",
  },
  "Penn State Nittany Lions": {
    name: "Penn State Nittany Lions",
    abbreviation: "PSU",
    primaryColor: "#041E42",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/213.png",
  },
  "Rutgers Scarlet Knights": {
    name: "Rutgers Scarlet Knights",
    abbreviation: "RUTG",
    primaryColor: "#CC0033",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/164.png",
  },
  "Nebraska Cornhuskers": {
    name: "Nebraska Cornhuskers",
    abbreviation: "NEB",
    primaryColor: "#E41C38",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/158.png",
  },
  "Minnesota Golden Gophers": {
    name: "Minnesota Golden Gophers",
    abbreviation: "MINN",
    primaryColor: "#7A0019",
    secondaryColor: "#FFCC33",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/135.png",
  },
  "Northwestern Wildcats": {
    name: "Northwestern Wildcats",
    abbreviation: "NW",
    primaryColor: "#4E2A84",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/77.png",
  },
  // Big 12 Teams
  "Texas Longhorns": {
    name: "Texas Longhorns",
    abbreviation: "TEX",
    primaryColor: "#BF5700",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/251.png",
  },
  "Oklahoma Sooners": {
    name: "Oklahoma Sooners",
    abbreviation: "OU",
    primaryColor: "#841617",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/201.png",
  },
  "Iowa State Cyclones": {
    name: "Iowa State Cyclones",
    abbreviation: "ISU",
    primaryColor: "#C8102E",
    secondaryColor: "#F1BE48",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/66.png",
  },
  "Texas Tech Red Raiders": {
    name: "Texas Tech Red Raiders",
    abbreviation: "TTU",
    primaryColor: "#CC0000",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png",
  },
  "Oklahoma State Cowboys": {
    name: "Oklahoma State Cowboys",
    abbreviation: "OKST",
    primaryColor: "#FF6600",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/197.png",
  },
  "West Virginia Mountaineers": {
    name: "West Virginia Mountaineers",
    abbreviation: "WVU",
    primaryColor: "#002855",
    secondaryColor: "#EAAA00",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/277.png",
  },
  "TCU Horned Frogs": {
    name: "TCU Horned Frogs",
    abbreviation: "TCU",
    primaryColor: "#4D1979",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2628.png",
  },
  "Kansas State Wildcats": {
    name: "Kansas State Wildcats",
    abbreviation: "KSU",
    primaryColor: "#512888",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2306.png",
  },
  // SEC Teams
  "Alabama Crimson Tide": {
    name: "Alabama Crimson Tide",
    abbreviation: "ALA",
    primaryColor: "#9E1B32",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
  },
  "Auburn Tigers": {
    name: "Auburn Tigers",
    abbreviation: "AUB",
    primaryColor: "#0C2340",
    secondaryColor: "#E87722",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2.png",
  },
  "Arkansas Razorbacks": {
    name: "Arkansas Razorbacks",
    abbreviation: "ARK",
    primaryColor: "#9D2235",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png",
  },
  "Florida Gators": {
    name: "Florida Gators",
    abbreviation: "FLA",
    primaryColor: "#0021A5",
    secondaryColor: "#FA4616",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png",
  },
  "LSU Tigers": {
    name: "LSU Tigers",
    abbreviation: "LSU",
    primaryColor: "#461D7C",
    secondaryColor: "#FDB927",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/99.png",
  },
  "Tennessee Volunteers": {
    name: "Tennessee Volunteers",
    abbreviation: "TENN",
    primaryColor: "#FF8200",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png",
  },
  "Mississippi State Bulldogs": {
    name: "Mississippi State Bulldogs",
    abbreviation: "MSST",
    primaryColor: "#660000",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/344.png",
  },
  "Ole Miss Rebels": {
    name: "Ole Miss Rebels",
    abbreviation: "MISS",
    primaryColor: "#00205B",
    secondaryColor: "#CF0A2C",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png",
  },
  "South Carolina Gamecocks": {
    name: "South Carolina Gamecocks",
    abbreviation: "SCAR",
    primaryColor: "#73000A",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2579.png",
  },
  "Georgia Bulldogs": {
    name: "Georgia Bulldogs",
    abbreviation: "UGA",
    primaryColor: "#BA0C2F",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png",
  },
  "Vanderbilt Commodores": {
    name: "Vanderbilt Commodores",
    abbreviation: "VAN",
    primaryColor: "#866D4B",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/238.png",
  },
  "Missouri Tigers": {
    name: "Missouri Tigers",
    abbreviation: "MIZ",
    primaryColor: "#F1B82D",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/142.png",
  },
  "Texas A&M Aggies": {
    name: "Texas A&M Aggies",
    abbreviation: "TAMU",
    primaryColor: "#500000",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png",
  },
  // Pac-12 Teams
  "USC Trojans": {
    name: "USC Trojans",
    abbreviation: "USC",
    primaryColor: "#990000",
    secondaryColor: "#FFCC00",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/30.png",
  },
  "Oregon Ducks": {
    name: "Oregon Ducks",
    abbreviation: "ORE",
    primaryColor: "#154733",
    secondaryColor: "#FEE11A",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png",
  },
  "Colorado Buffaloes": {
    name: "Colorado Buffaloes",
    abbreviation: "COLO",
    primaryColor: "#CFB87C",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/38.png",
  },
  "Utah Utes": {
    name: "Utah Utes",
    abbreviation: "UTAH",
    primaryColor: "#CC0000",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/254.png",
  },
  "Stanford Cardinal": {
    name: "Stanford Cardinal",
    abbreviation: "STAN",
    primaryColor: "#8C1515",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/24.png",
  },
  "Washington Huskies": {
    name: "Washington Huskies",
    abbreviation: "WASH",
    primaryColor: "#2D5AA0",
    secondaryColor: "#B7A57A",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/264.png",
  },
  "Oregon State Beavers": {
    name: "Oregon State Beavers",
    abbreviation: "ORST",
    primaryColor: "#DC4405",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/204.png",
  },
  "Washington State Cougars": {
    name: "Washington State Cougars",
    abbreviation: "WSU",
    primaryColor: "#981E32",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/265.png",
  },
  "California Golden Bears": {
    name: "California Golden Bears",
    abbreviation: "CAL",
    primaryColor: "#003262",
    secondaryColor: "#FDB515",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/25.png",
  },
  // Big East Teams
  "Connecticut Huskies": {
    name: "Connecticut Huskies",
    abbreviation: "UConn",
    primaryColor: "#000E2F",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/41.png",
  },
  "Marquette Golden Eagles": {
    name: "Marquette Golden Eagles",
    abbreviation: "MARQ",
    primaryColor: "#003366",
    secondaryColor: "#FFD700",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/269.png",
  },
  "Creighton Bluejays": {
    name: "Creighton Bluejays",
    abbreviation: "CREI",
    primaryColor: "#003366",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/156.png",
  },
  "Seton Hall Pirates": {
    name: "Seton Hall Pirates",
    abbreviation: "SHU",
    primaryColor: "#004488",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2550.png",
  },
  "Providence Friars": {
    name: "Providence Friars",
    abbreviation: "PROV",
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2507.png",
  },
  "Xavier Musketeers": {
    name: "Xavier Musketeers",
    abbreviation: "XAV",
    primaryColor: "#0C2340",
    secondaryColor: "#006747",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2752.png",
  },
  "Butler Bulldogs": {
    name: "Butler Bulldogs",
    abbreviation: "BUTL",
    primaryColor: "#003366",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2086.png",
  },
  "St. John's Red Storm": {
    name: "St. John's Red Storm",
    abbreviation: "SJU",
    primaryColor: "#C8102E",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png",
  },
  "Georgetown Hoyas": {
    name: "Georgetown Hoyas",
    abbreviation: "GTWN",
    primaryColor: "#041E42",
    secondaryColor: "#8C1515",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/46.png",
  },
  "DePaul Blue Demons": {
    name: "DePaul Blue Demons",
    abbreviation: "DEP",
    primaryColor: "#003366",
    secondaryColor: "#006747",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2182.png",
  },
  // Other Notable Teams
  "Houston Cougars": {
    name: "Houston Cougars",
    abbreviation: "HOU",
    primaryColor: "#C8102E",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/248.png",
  },
  "Memphis Tigers": {
    name: "Memphis Tigers",
    abbreviation: "MEM",
    primaryColor: "#001C58",
    secondaryColor: "#8DC8E8",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/235.png",
  },
  "Cincinnati Bearcats": {
    name: "Cincinnati Bearcats",
    abbreviation: "CIN",
    primaryColor: "#E00122",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2132.png",
  },
  "Wichita State Shockers": {
    name: "Wichita State Shockers",
    abbreviation: "WICH",
    primaryColor: "#FFC72C",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2724.png",
  },
  "San Diego State Aztecs": {
    name: "San Diego State Aztecs",
    abbreviation: "SDSU",
    primaryColor: "#A6192E",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/21.png",
  },
  "BYU Cougars": {
    name: "BYU Cougars",
    abbreviation: "BYU",
    primaryColor: "#002255",
    secondaryColor: "#FFFFFF",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/252.png",
  },
  "Saint Mary's Gaels": {
    name: "Saint Mary's Gaels",
    abbreviation: "SMC",
    primaryColor: "#003366",
    secondaryColor: "#E31837",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png",
  },
  "Dayton Flyers": {
    name: "Dayton Flyers",
    abbreviation: "DAY",
    primaryColor: "#C8102E",
    secondaryColor: "#0C2340",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2168.png",
  },
  "VCU Rams": {
    name: "VCU Rams",
    abbreviation: "VCU",
    primaryColor: "#FFB300",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png",
  },
  "Davidson Wildcats": {
    name: "Davidson Wildcats",
    abbreviation: "DAV",
    primaryColor: "#C8102E",
    secondaryColor: "#000000",
    logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2166.png",
  },
};

// Default team data for teams not in our mapping
const DEFAULT_TEAM_DATA: TeamData = {
  name: "Unknown",
  abbreviation: "UNK",
  primaryColor: "#6B7280",
  secondaryColor: "#FFFFFF",
  logoUrl: "https://via.placeholder.com/100/6B7280/FFFFFF?text=TEAM",
};

/**
 * Get team data by name (case-insensitive partial match)
 */
export function getTeamData(teamName: string): TeamData {
  // Handle undefined/null team names
  if (!teamName) {
    return {
      logo: `https://ui-avatars.com/api/?name=Unknown&background=94a3b8&color=fff`,
      primaryColor: "#64748b",
      secondaryColor: "#475569",
      abbreviation: "UNK",
    };
  }

  // 1. Try exact match first
  if (TEAM_DATA[teamName]) {
    return TEAM_DATA[teamName];
  }

  // 2. Try case-insensitive exact match
  const normalizedName = teamName.toLowerCase();
  const exactMatch = Object.keys(TEAM_DATA).find(
    (key) => key.toLowerCase() === normalizedName
  );

  if (exactMatch) {
    return TEAM_DATA[exactMatch];
  }

  // 3. Try matching full name variations (e.g., "UCLA Bruins" matches "UCLA")
  const fullNameMatch = Object.keys(TEAM_DATA).find((key) => {
    const keyLower = key.toLowerCase();
    const inputLower = normalizedName;
    
    // Check if one is a subset of the other
    return (
      keyLower === inputLower ||
      keyLower.startsWith(inputLower + " ") ||
      inputLower.startsWith(keyLower + " ") ||
      keyLower.endsWith(" " + inputLower) ||
      inputLower.endsWith(" " + keyLower)
    );
  });

  if (fullNameMatch) {
    return TEAM_DATA[fullNameMatch];
  }

  // 4. Try removing common suffixes and matching
  // e.g., "Duke Blue Devils" -> "Duke", "North Carolina Tar Heels" -> "North Carolina"
  const commonSuffixes = [
    'bulldogs', 'wildcats', 'tigers', 'bears', 'eagles', 'hawks',
    'spartans', 'trojans', 'huskies', 'cougars', 'terrapins', 'hoosiers',
    'jayhawks', 'tar heels', 'blue devils', 'crimson tide', 'volunteers',
    'wolverines', 'buckeyes', 'longhorns', 'bruins', 'cardinals', 'fighting irish'
  ];

  for (const suffix of commonSuffixes) {
    if (normalizedName.endsWith(' ' + suffix)) {
      const baseName = normalizedName.slice(0, -(suffix.length + 1));
      const baseMatch = Object.keys(TEAM_DATA).find(
        key => key.toLowerCase() === baseName || key.toLowerCase().startsWith(baseName + ' ')
      );
      if (baseMatch) {
        return TEAM_DATA[baseMatch];
      }
    }
  }

  // 5. Try first word match only if it's substantial (4+ chars)
  const firstWord = normalizedName.split(" ")[0];
  if (firstWord.length >= 4) {
    const firstWordMatch = Object.keys(TEAM_DATA).find((key) => {
      const keyFirstWord = key.toLowerCase().split(" ")[0];
      return keyFirstWord === firstWord;
    });

    if (firstWordMatch) {
      return TEAM_DATA[firstWordMatch];
    }
  }

  // 6. No match found - generate a placeholder
  const abbreviation = teamName
    .split(" ")
    .filter(word => word.length > 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const colorHue = teamName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return {
    ...DEFAULT_TEAM_DATA,
    name: teamName,
    abbreviation,
    primaryColor: `hsl(${colorHue}, 60%, 55%)`,
    secondaryColor: `hsl(${colorHue}, 50%, 40%)`,
    logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      abbreviation
    )}&background=6B7280&color=fff&size=128&bold=true`,
  };
}

/**
 * Get team abbreviation
 */
export function getTeamAbbreviation(teamName: string): string {
  return getTeamData(teamName).abbreviation;
}

/**
 * Normalize team name from Odds API and return search variations
 * Returns an array of possible search terms to try with API-Sports.io
 * 
 * Examples:
 * - "BYU Cougars" -> ["BYU", "Brigham Young", "BYU Cougars"]
 * - "Clemson Tigers" -> ["Clemson", "Clemson Tigers"]
 * - "North Carolina Tar Heels" -> ["North Carolina", "UNC", "North Carolina Tar Heels"]
 */
export function normalizeTeamName(oddsApiName: string): string[] {
  const variations: string[] = [];
  const normalized = oddsApiName.trim();
  
  // Add the full name as-is
  variations.push(normalized);
  
  // Check if we have this team in our TEAM_DATA mapping
  const teamData = getTeamData(normalized);
  if (teamData.name !== "Unknown" && teamData.name !== normalized) {
    // We found a match in TEAM_DATA, use that name
    variations.push(teamData.name);
  }
  
  // Add abbreviation if available
  if (teamData.abbreviation && teamData.abbreviation.length <= 5) {
    variations.push(teamData.abbreviation);
  }
  
  // Extract school name (first part before common mascot names)
  // Prioritize school name variations (they're more likely to match men's teams)
  const words = normalized.split(" ");
  const commonMascots = [
    "tigers", "wildcats", "bulldogs", "eagles", "hawks", "seminoles",
    "cavaliers", "tar heels", "blue devils", "jayhawks", "bruins",
    "spartans", "wolverines", "hoosiers", "boilermakers", "buckeyes",
    "longhorns", "sooners", "crimson tide", "razorbacks", "gators",
    "trojans", "ducks", "huskies", "cardinal", "cougars", "mountaineers",
    "cyclones", "red raiders", "cowboys", "horned frogs", "bears",
    "yellow jackets", "demon deacons", "wolfpack", "hokies", "orange",
    "panthers", "fighting illini", "badgers", "terrapins", "hawkeyes",
    "nittany lions", "scarlet knights", "cornhuskers", "golden gophers",
    "aggies", "gamecocks", "commodores", "rebels", "volunteers",
    "bluejays", "pirates", "friars", "musketeers", "red storm", "hoyas",
    "blue demons", "shockers", "aztecs", "gaels", "flyers", "rams"
  ];
  
  // Find where the mascot name starts
  let schoolNameEnd = words.length;
  for (let i = 1; i < words.length; i++) {
    const potentialMascot = words.slice(i).join(" ").toLowerCase();
    if (commonMascots.some(mascot => potentialMascot.includes(mascot))) {
      schoolNameEnd = i;
      break;
    }
  }
  
  // Extract school name (first part) - ADD THIS FIRST to prioritize it
  if (schoolNameEnd < words.length) {
    const schoolName = words.slice(0, schoolNameEnd).join(" ");
    if (schoolName && schoolName !== normalized) {
      // Insert school name at the beginning (higher priority)
      variations.unshift(schoolName);
    }
  }
  
  // Also try just the first word if it's a known school
  if (words.length > 1 && words[0]) {
    const firstWord = words[0];
    if (!variations.includes(firstWord)) {
      variations.unshift(firstWord); // Highest priority
    }
  }
  
  // Handle special cases
  if (normalized.includes("BYU")) {
    variations.push("BYU");
    variations.push("Brigham Young");
  }
  if (normalized.includes("UNC") || normalized.includes("North Carolina")) {
    variations.push("North Carolina");
    variations.push("UNC");
  }
  if (normalized.includes("UCLA")) {
    variations.push("UCLA");
  }
  if (normalized.includes("USC")) {
    variations.push("USC");
    variations.push("Southern California");
  }
  
  // Remove duplicates and empty strings
  const uniqueVariations = Array.from(new Set(variations.filter(v => v.trim().length > 0)));
  
  return uniqueVariations;
}

