import { draftSettings, participants } from "../data/draft";
import { worldCupGroups } from "../data/groups";
import { manualMatches, groupBonuses } from "../data/manualResults";
import {
  calculateParticipantStandings,
  calculateWorldCupGroupStandings,
  getRecentCompletedMatches,
} from "../data/scoring";

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

export default function Home() {
  const standings = calculateParticipantStandings(participants, manualMatches, groupBonuses);
  const groupStandings = calculateWorldCupGroupStandings(worldCupGroups, manualMatches);
  const recentMatches = getRecentCompletedMatches(manualMatches);

  const scoringRules = [
    "Group win: 3",
    "Group draw: 1",
    "Advance: +3",
    "Win group: +2",
    "Finish second: +1",
    "Round of 32: +5",
    "Round of 16: +7",
    "Quarterfinal: +10",
    "Semifinal: +13",
    "Final: +18",
    "Third-place win: +6",
    "Extra-time loss: +1",
    "PK loss: +2",
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <div className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
            Manual results mode
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">World Cup Draft</h1>
        </header>

        <section className="mb-8" aria-labelledby="groups-heading">
          <h2 id="groups-heading" className="text-xl font-semibold">
            World Cup Groups
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {groupStandings.map((group) => (
              <article key={group.name} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="font-semibold text-white">{group.name}</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="text-xs uppercase text-zinc-500">
                      <tr className="border-b border-zinc-800">
                        <th className="py-2 pr-2 font-semibold">Team</th>
                        <th className="px-2 py-2 text-center font-semibold">P</th>
                        <th className="px-2 py-2 text-center font-semibold">W</th>
                        <th className="px-2 py-2 text-center font-semibold">D</th>
                        <th className="px-2 py-2 text-center font-semibold">L</th>
                        <th className="px-2 py-2 text-center font-semibold">GD</th>
                        <th className="py-2 pl-2 text-right font-semibold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((team) => (
                        <tr key={team.name} className="border-b border-zinc-800/70 last:border-0">
                          <td className="py-2 pr-2 font-medium text-white">{team.name}</td>
                          <td className="px-2 py-2 text-center text-zinc-400">{team.played}</td>
                          <td className="px-2 py-2 text-center text-zinc-400">{team.wins}</td>
                          <td className="px-2 py-2 text-center text-zinc-400">{team.draws}</td>
                          <td className="px-2 py-2 text-center text-zinc-400">{team.losses}</td>
                          <td className="px-2 py-2 text-center text-zinc-400">
                            {formatGoalDifference(team.goalDifference)}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold text-emerald-300">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="standings-heading">
          <h2 id="standings-heading" className="text-xl font-semibold">
            Draft Pool Standings
          </h2>

          {standings.map((participant) => (
            <article
              key={participant.name}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-emerald-300">
                    {participant.rank}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{participant.name}</h3>
                      {participant.rank === 1 && participant.totalPoints > 0 && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-zinc-950">
                          Leader
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">
                      {participant.teams.length}/{draftSettings.teamsPerParticipant} drafted teams
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{participant.totalPoints}</div>
                  <div className="text-sm text-zinc-400">points</div>
                </div>
              </div>

              {participant.teams.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {participant.teams.map((team) => (
                  <div key={team.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-white">{team.name}</h4>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-300">
                        {team.points} pts
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                      {team.scoringLog.length > 0 ? (
                        team.scoringLog.map((logItem, index) => <li key={`${team.name}-${index}`}>{logItem}</li>)
                      ) : (
                        <li>No points yet</li>
                      )}
                    </ul>
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-xl font-semibold">
            Recent Completed Matches
          </h2>
          <div className="mt-4 space-y-3">
            {recentMatches.length > 0 ? (
              recentMatches.map((match) => (
              <div key={match.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
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
              <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-400">
                No completed matches entered yet
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="rules-heading">
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

        <section className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4" aria-labelledby="editing-heading">
          <h2 id="editing-heading" className="text-xl font-semibold text-emerald-200">
            Manual Editing
          </h2>
          <p className="mt-3 text-sm leading-6 text-emerald-50/80">
            To update drafted teams during or after the draft, edit data/draft.js. To update scores once matches start,
            edit data/manualResults.js.
          </p>
        </section>
      </div>
    </main>
  );
}
