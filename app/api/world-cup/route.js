const WORLD_CUP_API_URL = "https://worldcup26.ir/get/games";

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

function normalizeApiGame(game) {
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
    status: game.finished === "TRUE" ? "completed" : "scheduled",
    timeElapsed: game.time_elapsed,
  };
}

export async function GET() {
  const response = await fetch(WORLD_CUP_API_URL, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to fetch World Cup data" },
      { status: response.status }
    );
  }

  const data = await response.json();
  const matches = (data.games || []).map(normalizeApiGame);

  return Response.json({
    source: WORLD_CUP_API_URL,
    fetchedAt: new Date().toISOString(),
    matches,
  });
}
