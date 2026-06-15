export const participants = [
  {
    name: "Tej",
    teams: ["Argentina", "Norway", "Morocco", "Türkiye", "Senegal", "Iraq"],
  },
  {
    name: "Rushil",
    teams: ["France", "Belgium", "Ecuador", "Czechia", "Panama", "DR Congo"],
  },
  {
    name: "Janey",
    teams: ["Portugal", "England", "Australia", "Algeria", "Tunisia", "Qatar"],
  },
  {
    name: "Courtney",
    teams: ["Spain", "Mexico", "Japan", "Austria", "Scotland", "Haiti"],
  },
  {
    name: "Lindsay",
    teams: [
      "Colombia",
      "Switzerland",
      "Ghana",
      "Paraguay",
      "Cape Verde",
      "Saudi Arabia",
    ],
  },
  {
    name: "Jagat & Kiran",
    teams: [
      "Germany",
      "Uruguay",
      "Egypt",
      "Ivory Coast",
      "Bosnia-Herzegovina",
      "Jordan",
    ],
  },
  {
    name: "Ryan",
    teams: ["Canada", "South Africa", "Brazil", "South Korea", "Uzbekistan", "Sweden"],
  },
  {
    name: "Mimi",
    teams: ["United States", "Netherlands", "Croatia", "Iran", "New Zealand", "Curaçao"],
  },
];

export const draftSettings = {
  teamsPerParticipant: 6,
};

const TEAM_NAME_ALIASES = {
  "Bosnia & Herzegovina": "bosnia and herzegovina",
  "Bosnia and Herzegovina": "bosnia and herzegovina",
  "Bosnia-Herzegovina": "bosnia and herzegovina",
  "Cape Verde": "cabo verde",
  "Czech Republic": "czechia",
  "Côte d'Ivoire": "ivory coast",
  "Democratic Republic of the Congo": "dr congo",
  Korea: "south korea",
  "South Korea": "south korea",
  Turkey: "turkey",
  Türkiye: "turkey",
  "United States": "usa",
};

function canonicalTeamName(teamName) {
  return TEAM_NAME_ALIASES[teamName] || (teamName || "").toLowerCase();
}

export function managerForTeam(teamName) {
  const canonicalName = canonicalTeamName(teamName);
  const participant = participants.find((candidate) =>
    candidate.teams.some((team) => canonicalTeamName(team) === canonicalName)
  );

  return participant?.name || "";
}
