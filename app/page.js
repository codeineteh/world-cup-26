import { participants } from "../data/draft";
import { worldCupGroups } from "../data/groups";
import { manualMatches, groupBonuses } from "../data/manualResults";
import { flagForTeam } from "../data/teamFlags";
import { fetchWorldCupMatches } from "../data/worldCupApi";
import TodaysScoreboard from "./components/TodaysScoreboard";
import {
  calculateParticipantStandings,
  calculateWorldCupGroupStandings,
  getRecentCompletedMatches,
} from "../data/scoring";

export const dynamic = "force-dynamic";

function mergeCompletedMatches(manualMatches, apiMatches) {
  const completedApiMatches = apiMatches.filter((match) => match.status === "completed");
  const matchesById = new Map(completedApiMatches.map((match) => [match.id, match]));

  manualMatches.forEach((match) => {
    matchesById.set(match.id, match);
  });

  return Array.from(matchesById.values()).sort((matchA, matchB) => matchA.id - matchB.id);
}

function mergeDraftScoringMatches(manualMatches, apiMatches) {
  const scoringApiMatches = apiMatches.filter((match) => match.status === "completed" || match.status === "live");
  const matchesById = new Map(scoringApiMatches.map((match) => [match.id, match]));

  manualMatches.forEach((match) => {
    matchesById.set(match.id, match);
  });

  return Array.from(matchesById.values()).sort((matchA, matchB) => matchA.id - matchB.id);
}

function formatMatchScore(match) {
  const homePenalty = match.hasPenaltyShootout ? ` (${match.homePenaltyScore})` : "";
  const awayPenalty = match.hasPenaltyShootout ? ` (${match.awayPenaltyScore})` : "";

  return `${match.homeTeam} ${match.homeScore}${homePenalty} - ${match.awayScore}${awayPenalty} ${match.awayTeam}`;
}

function matchTag(match) {
  if (match.hasPenaltyShootout) {
    return "PKs";
  }

  if (match.hasExtraTime) {
    return "AET";
  }

  return null;
}

function formatGoalDifference(goalDifference) {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return goalDifference;
}

export default async function Home() {
  let apiMatches = [];
  let liveResultsError = "";

  try {
    apiMatches = await fetchWorldCupMatches();
  } catch (error) {
    liveResultsError = error.message || "Unable to load live results";
  }

  const resultsMatches = mergeCompletedMatches(manualMatches, apiMatches);
  const draftScoringMatches = mergeDraftScoringMatches(manualMatches, apiMatches);
  const standings = calculateParticipantStandings(participants, draftScoringMatches, groupBonuses);
  const groupStandings = calculateWorldCupGroupStandings(worldCupGroups, resultsMatches);
  const recentMatches = getRecentCompletedMatches(resultsMatches);
  const hasSoleLeader = standings.filter((participant) => participant.rank === 1).length === 1;

  const scoringRules = [
    "Group stage win: +3",
    "Group stage draw: +1",
    "Win group: +3",
    "Finish second in group: +2",
    "Advance from third place: +1",
    "Round of 32 win: +5",
    "Round of 16 win: +7",
    "Quarterfinal win: +10",
    "Semifinal win: +13",
    "Final win: +18",
    "Third-place win: +6",
    "Extra-time loss: +1",
    "Penalty shootout loss: +2",
  ];

  return (
    <main className="pitch-page relative min-h-screen overflow-hidden px-3 py-5 text-white sm:px-6 sm:py-6">
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-5 border-b border-white/10 pb-5 sm:mb-6">
          <div className="mb-4 h-1.5 w-40 rounded-full bg-[linear-gradient(90deg,#16a34a,#facc15,#ef4444,#2563eb)]" />
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Sheth + Rawitscher World Cup 26'
          </h1>
        </header>

        {liveResultsError && (
          <div className="mb-6 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-50">
            Live results are temporarily unavailable, so standings are using manual results only.
          </div>
        )}

        <div className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <TodaysScoreboard />

          <section className="h-full rounded-lg border border-amber-300/30 bg-amber-950/30 p-4 shadow-lg shadow-black/20" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="text-xl font-semibold text-amber-100">
              Recent Completed Matches
            </h2>
            <div className="mt-4 space-y-3">
              {recentMatches.length > 0 ? (
                recentMatches.map((match) => (
                <div key={match.id} className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
                    <span>{match.stage}</span>
                    {matchTag(match) && (
                      <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                        {matchTag(match)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-semibold text-white">{formatMatchScore(match)}</div>
                </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300/30 bg-zinc-950/80 p-4 text-sm text-zinc-400">
                  No completed matches entered yet
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="space-y-4" aria-labelledby="standings-heading">
          <h2 id="standings-heading" className="text-xl font-semibold">
            Draft Pool Standings
          </h2>

          {standings.map((participant) => (
            <article
              key={participant.name}
              className="rounded-lg border border-white/10 bg-zinc-900/90 p-3 shadow-lg shadow-black/20 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-base font-bold text-emerald-300 sm:h-10 sm:w-10 sm:text-lg">
                    {participant.rank}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{participant.name}</h3>
                      {hasSoleLeader && participant.rank === 1 && participant.totalPoints > 0 && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-zinc-950">
                          Leader
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-bold sm:text-3xl ${
                      participant.hasLiveTeam ? "text-yellow-300" : "text-white"
                    }`}
                  >
                    {participant.totalPoints}
                  </div>
                  <div className="text-sm text-zinc-400">points</div>
                </div>
              </div>

              {participant.teams.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3">
                  {participant.teams.map((team) => (
                  <div
                    key={team.name}
                    className={`rounded-lg border p-3 ${
                      team.liveMatch
                        ? "border-yellow-300/50 bg-yellow-300/10 shadow-sm shadow-yellow-300/10"
                        : "border-zinc-800 bg-zinc-950/95"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-semibold ${team.liveMatch ? "text-yellow-200" : "text-white"}`}>
                        {flagForTeam(team.name) && <span className="mr-2">{flagForTeam(team.name)}</span>}
                        {team.name}
                      </h4>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${
                          team.liveMatch
                            ? "bg-yellow-300/15 text-yellow-200"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {team.points} pts
                      </span>
                    </div>
                    {team.liveMatch && (
                      <div className="mt-2 text-sm font-semibold text-yellow-200">
                        Live: {team.liveMatch.teamScore} - {team.liveMatch.opponentScore} vs{" "}
                        {team.liveMatch.opponent}
                        {team.liveMatch.timeElapsed ? ` · ${team.liveMatch.timeElapsed}` : ""}
                        {team.livePoints > 0
                          ? ` · +${team.livePoints} pts if result holds`
                          : " · 0 pts if result holds"}
                      </div>
                    )}
                    {team.scoringLog.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                        {team.scoringLog.map((logItem, index) => <li key={`${team.name}-${index}`}>{logItem}</li>)}
                      </ul>
                    )}
                  </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-400">
                  No teams drafted yet
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="mt-8" aria-labelledby="groups-heading">
          <h2 id="groups-heading" className="text-xl font-semibold">
            World Cup Groups
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {groupStandings.map((group) => (
              <article key={group.name} className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:p-4">
                <h3 className="font-semibold text-white">{group.name}</h3>
                <div className="mt-3">
                  <table className="w-full table-fixed text-left text-sm">
                    <colgroup>
                      <col className="w-[43%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[11%]" />
                      <col className="w-[14%]" />
                    </colgroup>
                    <thead className="text-xs uppercase text-zinc-500">
                      <tr className="border-b border-zinc-800">
                        <th className="py-2 pr-1 font-semibold">Team</th>
                        <th className="px-1 py-2 text-center font-semibold">GP</th>
                        <th className="px-1 py-2 text-center font-semibold">W</th>
                        <th className="px-1 py-2 text-center font-semibold">D</th>
                        <th className="px-1 py-2 text-center font-semibold">L</th>
                        <th className="px-1 py-2 text-center font-semibold">GD</th>
                        <th className="py-2 pl-1 text-right font-semibold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((team) => (
                        <tr key={team.name} className="border-b border-zinc-800/70 last:border-0">
                          <td className="break-words py-2 pr-1 text-xs font-medium leading-4 text-white sm:text-sm">
                            {team.name}
                          </td>
                          <td className="px-1 py-2 text-center text-zinc-400">{team.played}</td>
                          <td className="px-1 py-2 text-center text-zinc-400">{team.wins}</td>
                          <td className="px-1 py-2 text-center text-zinc-400">{team.draws}</td>
                          <td className="px-1 py-2 text-center text-zinc-400">{team.losses}</td>
                          <td className="px-1 py-2 text-center text-zinc-400">
                            {formatGoalDifference(team.goalDifference)}
                          </td>
                          <td className="py-2 pl-1 text-right font-semibold text-emerald-300">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 sm:p-4" aria-labelledby="rules-heading">
          <h2 id="rules-heading" className="text-xl font-semibold">
            Scoring Rules
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {scoringRules.map((rule) => (
              <div key={rule} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300">
                {rule}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
