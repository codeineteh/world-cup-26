export const WORLD_CUP_API_URL = "https://worldcup26.ir/get/games";

const LIVE_STATUSES = new Set(["live", "halftime"]);
const FINISHED_STATUSES = new Set(["finished", "fulltime", "ft"]);

function stageFromApiType(type) {
  const stages = {
    group: "Group Stage",
    r32: "Round of 32",
    r16: "Round of 16",
    qf: "Quarterfinal",
    sf: "Semifinal",
    third: "Third Place",
    final: "Final",
  };

  return stages[type] || type;
}

function teamNameFromApiGame(game, side) {
  const teamName = game[`${side}_team_name_en`];
  const teamLabel = game[`${side}_team_label`];

  return teamName || teamLabel || "TBD";
}

function parseEventList(value) {
  if (!value || value === "null") {
    return [];
  }

  return value
    .replace(/[{}]/g, "")
    .split(",")
    .map((event) => event.replace(/[“”"]/g, "").trim())
    .filter(Boolean);
}

function parseCardList(value) {
  if (!value || value === "null") {
    return [];
  }

  if (/^\d+$/.test(value)) {
    return Array.from({ length: Number(value) }, () => "Red card");
  }

  return parseEventList(value);
}

function firstPresentValue(game, keys) {
  return keys.map((key) => game[key]).find((value) => value && value !== "null");
}

function statusFromApiGame(game) {
  if (game.finished === "TRUE" || FINISHED_STATUSES.has(game.time_elapsed)) {
    return "completed";
  }

  if (LIVE_STATUSES.has(game.time_elapsed)) {
    return "live";
  }

  return "scheduled";
}

export function normalizeApiGame(game) {
  return {
    id: Number(game.id),
    stage: stageFromApiType(game.type),
    group: game.group,
    matchday: Number(game.matchday),
    localDate: game.local_date,
    homeTeam: teamNameFromApiGame(game, "home"),
    awayTeam: teamNameFromApiGame(game, "away"),
    homeScore: Number(game.home_score || 0),
    awayScore: Number(game.away_score || 0),
    status: statusFromApiGame(game),
    timeElapsed: game.time_elapsed,
    homeScorers: parseEventList(game.home_scorers),
    awayScorers: parseEventList(game.away_scorers),
    homeRedCards: parseCardList(
      firstPresentValue(game, ["home_red_cards", "home_red_card", "home_redcards", "home_reds"])
    ),
    awayRedCards: parseCardList(
      firstPresentValue(game, ["away_red_cards", "away_red_card", "away_redcards", "away_reds"])
    ),
  };
}

export async function fetchWorldCupMatches() {
  const response = await fetch(WORLD_CUP_API_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch World Cup data");
  }

  const data = await response.json();
  return (data.games || []).map(normalizeApiGame);
}
