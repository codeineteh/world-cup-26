import { worldCupGroups } from "./groups";

export const WORLD_CUP_API_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const TOURNAMENT_START_DATE = "20260611";
const GROUP_STAGE_END_DATE = "20260627";
const KNOCKOUT_START_DATE = "20260628";
const TOURNAMENT_END_DATE = "20260719";

const TEAM_NAME_ALIASES = {
  "Bosnia & Herzegovina": "bosnia-herzegovina",
  "Bosnia and Herzegovina": "bosnia-herzegovina",
  "Bosnia-Herzegovina": "bosnia-herzegovina",
  "Czech Republic": "czechia",
  "Côte d'Ivoire": "ivory coast",
  "Democratic Republic of the Congo": "dr congo",
  "Congo DR": "dr congo",
  Korea: "south korea",
  "South Korea": "south korea",
  Turkey: "turkey",
  Türkiye: "turkey",
  "United States": "usa",
};

const TEAM_NAME_DISPLAY = {
  "Congo DR": "DR Congo",
  "Democratic Republic of the Congo": "DR Congo",
};

function canonicalTeamName(teamName) {
  return (TEAM_NAME_ALIASES[teamName] || teamName || "").toLowerCase();
}

function displayTeamName(teamName) {
  return TEAM_NAME_DISPLAY[teamName] || teamName;
}

function centralDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateFromEspnDate(dateValue) {
  const parts = centralDateParts(new Date(dateValue));
  return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function stageFromEspnEvent(event) {
  const stageBySlug = {
    "group-stage": "Group Stage",
    "round-of-32": "Round of 32",
    "round-of-16": "Round of 16",
    quarterfinals: "Quarterfinal",
    semifinals: "Semifinal",
    "third-place": "Third Place",
    "third-place-match": "Third Place",
    "3rd-place-match": "Third Place",
    final: "Final",
  };

  const competition = event.competitions?.[0] || {};
  const stageText = [
    event.season?.slug,
    event.seasonType?.name,
    event.season?.type?.name,
    ...(competition.notes || []).map((note) => note.headline),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/round[ -]of[ -]32/.test(stageText)) return "Round of 32";
  if (/round[ -]of[ -]16/.test(stageText)) return "Round of 16";
  if (/quarter/.test(stageText)) return "Quarterfinal";
  if (/semi/.test(stageText)) return "Semifinal";
  if (/third|3rd/.test(stageText)) return "Third Place";
  if (/\bfinal\b/.test(stageText)) return "Final";
  if (/group/.test(stageText)) return "Group Stage";

  return stageBySlug[event.season?.slug] || "Group Stage";
}

function statusFromEspnCompetition(competition) {
  const status = competition.status?.type;

  if (status?.completed || status?.state === "post") {
    return "completed";
  }

  if (status?.state === "in") {
    return "live";
  }

  return "scheduled";
}

function inferGroup(homeTeam, awayTeam) {
  const homeCanonical = canonicalTeamName(homeTeam);
  const awayCanonical = canonicalTeamName(awayTeam);
  const group = worldCupGroups.find((candidateGroup) => {
    const groupTeams = candidateGroup.teams.map(canonicalTeamName);
    return groupTeams.includes(homeCanonical) && groupTeams.includes(awayCanonical);
  });

  return group?.name.replace("Group ", "") || "";
}

function teamNameFromCompetitor(competitor) {
  return competitor.team?.displayName || competitor.team?.name || competitor.team?.shortDisplayName || "TBD";
}

function eventLabel(detail) {
  const player = detail.athletesInvolved?.[0]?.shortName || detail.athletesInvolved?.[0]?.displayName;
  const clock = detail.clock?.displayValue;

  return [player, clock].filter(Boolean).join(" ");
}

function eventLabelsForTeam(details, teamId, predicate) {
  return details
    .filter((detail) => detail.team?.id === teamId && predicate(detail))
    .map(eventLabel)
    .filter(Boolean);
}

function penaltyScoreForTeam(competitor, details) {
  if (competitor.shootoutScore !== undefined && competitor.shootoutScore !== null) {
    return Number(competitor.shootoutScore);
  }

  return details.filter(
    (detail) => detail.team?.id === competitor.team?.id && detail.shootout && detail.scoringPlay
  ).length;
}

export function normalizeEspnEvent(event) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === "home") || competitors[0] || {};
  const away = competitors.find((competitor) => competitor.homeAway === "away") || competitors[1] || {};
  const homeTeam = displayTeamName(teamNameFromCompetitor(home));
  const awayTeam = displayTeamName(teamNameFromCompetitor(away));
  const details = competition.details || [];
  const hasPenaltyShootout =
    home.shootoutScore !== undefined ||
    away.shootoutScore !== undefined ||
    details.some((detail) => detail.shootout);
  const hasExtraTime =
    Number(competition.status?.period || 0) > 2 ||
    Number(competition.status?.clock || 0) > 5400 ||
    /AET|extra time/i.test(competition.status?.type?.detail || "");

  return {
    id: Number(event.id),
    startDate: competition.date || event.date,
    stage: stageFromEspnEvent(event),
    group: inferGroup(homeTeam, awayTeam),
    matchday: null,
    localDate: localDateFromEspnDate(competition.date || event.date),
    homeTeam,
    awayTeam,
    homeScore: Number(home.score || 0),
    awayScore: Number(away.score || 0),
    homeWinner: home.winner === true,
    awayWinner: away.winner === true,
    hasExtraTime,
    hasPenaltyShootout,
    homePenaltyScore: penaltyScoreForTeam(home, details),
    awayPenaltyScore: penaltyScoreForTeam(away, details),
    status: statusFromEspnCompetition(competition),
    timeElapsed: competition.status?.type?.shortDetail || competition.status?.displayClock,
    homeScorers: eventLabelsForTeam(details, home.team?.id, (detail) => detail.scoringPlay),
    awayScorers: eventLabelsForTeam(details, away.team?.id, (detail) => detail.scoringPlay),
    homeRedCards: eventLabelsForTeam(details, home.team?.id, (detail) => detail.redCard),
    awayRedCards: eventLabelsForTeam(details, away.team?.id, (detail) => detail.redCard),
  };
}

export async function fetchWorldCupMatches() {
  const timestamp = Date.now();
  const dateRanges = [
    `${TOURNAMENT_START_DATE}-${GROUP_STAGE_END_DATE}`,
    `${KNOCKOUT_START_DATE}-${TOURNAMENT_END_DATE}`,
  ];
  const responses = await Promise.all(
    dateRanges.map((dates) =>
      fetch(`${WORLD_CUP_API_URL}?dates=${dates}&t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "cache-control": "no-cache",
        },
      })
    )
  );

  if (responses.some((response) => !response.ok)) {
    throw new Error("Unable to fetch World Cup data");
  }

  const payloads = await Promise.all(responses.map((response) => response.json()));
  const matchesById = new Map();

  payloads.forEach((data) => {
    (data.events || []).forEach((event) => {
      const match = normalizeEspnEvent(event);
      matchesById.set(match.id, match);
    });
  });

  return Array.from(matchesById.values());
}
