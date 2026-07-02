import { managerForTeam, participants } from "../data/draft";
import { worldCupGroups } from "../data/groups";
import { manualMatches, groupBonuses as manualGroupBonuses } from "../data/manualResults";
import { flagForTeam } from "../data/teamFlags";
import { fetchWorldCupMatches } from "../data/worldCupApi";
import TodaysScoreboard from "./components/TodaysScoreboard";
import {
  calculateAutomaticGroupBonuses,
  calculateParticipantStandings,
  calculateRemainingPointPotential,
  calculateTeamsRemaining,
  calculateWorldCupGroupStandings,
  isGroupStageComplete,
} from "../data/scoring";

export const dynamic = "force-dynamic";

function mergeTournamentMatches(manualMatches, apiMatches) {
  const matchesById = new Map(apiMatches.map((match) => [match.id, match]));

  manualMatches.forEach((match) => {
    matchesById.set(match.id, match);
  });

  return Array.from(matchesById.values()).sort((matchA, matchB) => matchA.id - matchB.id);
}

function activeGroupGamesForParticipant(participantName, matches) {
  return matches
    .filter((match) => (match.status === "completed" || match.status === "live") && match.stage === "Group Stage")
    .reduce((total, match) => {
      const homeGame = managerForTeam(match.homeTeam) === participantName ? 1 : 0;
      const awayGame = managerForTeam(match.awayTeam) === participantName ? 1 : 0;

      return total + homeGame + awayGame;
    }, 0);
}

const knockoutRounds = [
  { stage: "Round of 32", label: "R32" },
  { stage: "Round of 16", label: "R16" },
  { stage: "Quarterfinal", label: "QF" },
  { stage: "Semifinal", label: "SF" },
  { stage: "Third Place", label: "3rd" },
  { stage: "Final", label: "Final" },
];

function currentKnockoutRound(matches) {
  const activeRound = knockoutRounds.find(({ stage }) =>
    matches.some((match) => match.stage === stage && match.status !== "completed")
  );

  return activeRound || knockoutRounds.at(-1);
}

function roundProgressForParticipant(participantName, matches, stage) {
  const roundMatches = matches.filter((match) => match.stage === stage);
  const teamsInRound = new Set();

  roundMatches.forEach((match) => {
    if (managerForTeam(match.homeTeam) === participantName) {
      teamsInRound.add(match.homeTeam);
    }

    if (managerForTeam(match.awayTeam) === participantName) {
      teamsInRound.add(match.awayTeam);
    }
  });

  const matchesPlayed = roundMatches.filter(
    (match) =>
      (match.status === "completed" || match.status === "live") &&
      (managerForTeam(match.homeTeam) === participantName ||
        managerForTeam(match.awayTeam) === participantName)
  ).length;

  return {
    matchesPlayed,
    totalTeams: teamsInRound.size,
  };
}

function participantAnchorId(participantName) {
  return `manager-${participantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function scoreForManagers(standings, managerNames) {
  return standings
    .filter((participant) => managerNames.includes(participant.name))
    .reduce((total, participant) => total + participant.totalPoints, 0);
}

function scoreDisplay(match, side) {
  const score = side === "home" ? match.homeScore : match.awayScore;
  const penaltyScore = side === "home" ? match.homePenaltyScore : match.awayPenaltyScore;

  return match.hasPenaltyShootout ? `${score} (${penaltyScore})` : score;
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

  const tournamentMatches = mergeTournamentMatches(manualMatches, apiMatches);
  const resultsMatches = tournamentMatches.filter((match) => match.status === "completed");
  const draftScoringMatches = tournamentMatches.filter(
    (match) => match.status === "completed" || match.status === "live"
  );
  const groupStandings = calculateWorldCupGroupStandings(worldCupGroups, resultsMatches);
  const automaticGroupBonuses = calculateAutomaticGroupBonuses(groupStandings);
  const groupBonuses = { ...automaticGroupBonuses, ...manualGroupBonuses };
  const groupStageComplete = isGroupStageComplete(groupStandings);
  const currentRound = currentKnockoutRound(tournamentMatches);
  const standings = calculateParticipantStandings(participants, draftScoringMatches, groupBonuses).map(
    (participant) => ({
      ...participant,
      teams: participant.teams.map((team) => ({
        ...team,
        eliminated:
          groupStageComplete &&
          calculateTeamsRemaining([team.name], groupBonuses, resultsMatches) === 0,
      })),
    })
  );
  const liveMatches = draftScoringMatches.filter((match) => match.status === "live");
  const hasSoleLeader = standings.filter((participant) => participant.rank === 1).length === 1;
  const summaryStandings = standings.map((participant) => {
    const teamNames = participant.teams.map((team) => team.name);
    const provisionalLivePoints = participant.teams.reduce(
      (total, team) => total + team.livePoints,
      0
    );
    const potentialPoints =
      participant.totalPoints -
      provisionalLivePoints +
      calculateRemainingPointPotential(teamNames, tournamentMatches);

    return {
      name: participant.name,
      poolTeamName: participant.poolTeamName,
      anchorId: participantAnchorId(participant.name),
      rank: participant.rank,
      groupGamesCompleted: activeGroupGamesForParticipant(participant.name, draftScoringMatches),
      totalGroupGames: participant.teams.length * 3,
      teamsRemaining: calculateTeamsRemaining(teamNames, groupBonuses, resultsMatches),
      roundProgress: roundProgressForParticipant(
        participant.name,
        tournamentMatches,
        currentRound.stage
      ),
      totalPoints: participant.totalPoints,
      potentialPoints: groupStageComplete
        ? Math.max(participant.totalPoints, potentialPoints)
        : null,
    };
  });
  const shethManagers = ["Tej", "Rushil", "Jagat & Kiran", "Janey"];
  const rawitscherManagers = ["Ryan", "MiMi", "Courtney + Eric", "Lindsay"];
  const shethScore = scoreForManagers(standings, shethManagers);
  const rawitscherScore = scoreForManagers(standings, rawitscherManagers);

  const scoringRules = [
    "Group stage win: +3",
    "Group stage draw: +1",
    "Win group: +3",
    "Finish second in group: +2",
    "Advance from third place: +1",
    "Round of 32 win: +4",
    "Round of 16 win: +6",
    "Round of 8 win: +8",
    "Round of 4 win: +10",
    "Finals win: +12",
    "3rd place game win: +3",
    "Extra-time loss: +1",
    "Penalty shootout loss: +2",
  ];

  return (
    <main className="pitch-page relative min-h-screen overflow-hidden px-3 py-5 text-white sm:px-6 sm:py-6">
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-5 border-b border-white/10 pb-5 sm:mb-6">
          <div className="mb-4 h-1.5 w-52 rounded-full bg-[linear-gradient(90deg,#d80621_0%,#ffffff_18%,#b31942_34%,#0a3161_52%,#006847_72%,#ffffff_86%,#ce1126_100%)] shadow-sm shadow-black/30" />
          <h1 className="world-cup-title">
            La Familia World Cup 26'
          </h1>
        </header>

        {liveResultsError && (
          <div className="mb-6 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-50">
            Live results are temporarily unavailable, so standings are using manual results only.
          </div>
        )}

        {liveMatches.length > 0 && (
          <section className="mb-4 rounded-lg border border-yellow-300/40 bg-yellow-300/10 p-3 shadow-lg shadow-black/20 sm:p-4" aria-labelledby="live-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="live-heading" className="text-base font-semibold text-yellow-100 sm:text-lg">
                Live Now
              </h2>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
                Live
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {liveMatches.map((match) => (
                <article key={match.id} className="rounded-lg border border-yellow-300/20 bg-zinc-950/90 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-zinc-500">
                    <span>
                      {match.stage}
                      {match.group ? ` · Group ${match.group}` : ""}
                    </span>
                    <span className="text-yellow-200">{match.timeElapsed || "Live"}</span>
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {flagForTeam(match.homeTeam) && <span className="mr-2">{flagForTeam(match.homeTeam)}</span>}
                          {match.homeTeam}
                        </div>
                        {managerForTeam(match.homeTeam) && (
                          <div className="mt-0.5 truncate text-xs font-medium text-zinc-500">{managerForTeam(match.homeTeam)}</div>
                        )}
                      </div>
                      <div className="text-2xl font-bold tabular-nums text-yellow-100">{scoreDisplay(match, "home")}</div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {flagForTeam(match.awayTeam) && <span className="mr-2">{flagForTeam(match.awayTeam)}</span>}
                          {match.awayTeam}
                        </div>
                        {managerForTeam(match.awayTeam) && (
                          <div className="mt-0.5 truncate text-xs font-medium text-zinc-500">{managerForTeam(match.awayTeam)}</div>
                        )}
                      </div>
                      <div className="text-2xl font-bold tabular-nums text-yellow-100">{scoreDisplay(match, "away")}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-lg border border-white/10 bg-zinc-900/90 p-3 shadow-lg shadow-black/20 sm:p-4" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-xl font-semibold">
              Leaderboard
            </h2>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              Click team name for detailed breakdown
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[32%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <tr className="border-b border-zinc-800">
                    <th className="px-1 py-2 font-semibold sm:px-3">
                      <span className="sm:hidden">#</span>
                      <span className="hidden sm:inline">Pos</span>
                    </th>
                    <th className="px-1.5 py-2 font-semibold sm:px-3">Team</th>
                    <th className="px-1 py-2 text-center font-semibold sm:px-3">
                      <span className="sm:hidden">{groupStageComplete ? "Tm" : "Grp"}</span>
                      <span className="hidden sm:inline">
                        {groupStageComplete ? "Teams" : "Group"}
                      </span>
                    </th>
                    <th
                      className="px-1 py-2 text-center font-semibold sm:px-2"
                      title={`${currentRound.stage} fixtures played`}
                    >
                      {currentRound.label}
                    </th>
                    <th className="px-1 py-2 text-right font-semibold sm:px-3">Pts</th>
                    <th
                      className="px-1 py-2 text-right font-semibold sm:px-3"
                      title="Maximum possible tournament total"
                    >
                      Max
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStandings.map((participant) => (
                    <tr key={participant.name} className="border-b border-zinc-800/70 last:border-0">
                      <td className="px-1 py-2 font-semibold text-emerald-300 sm:px-3">{participant.rank}</td>
                      <td className="px-1.5 py-2 font-medium text-white sm:px-3">
                        <a className="block underline decoration-emerald-300/40 underline-offset-4 transition hover:text-emerald-200" href={`#${participant.anchorId}`}>
                          {participant.poolTeamName}
                        </a>
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-400 sm:px-3">
                        {groupStageComplete
                          ? participant.teamsRemaining
                          : `${participant.groupGamesCompleted}/${participant.totalGroupGames}`}
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-400 sm:px-2">
                        {participant.roundProgress.matchesPlayed}/{participant.roundProgress.totalTeams}
                      </td>
                      <td className="px-1 py-2 text-right font-semibold text-white sm:px-3">
                        {participant.totalPoints}
                      </td>
                      <td className="px-1 py-2 text-right font-semibold text-zinc-400 sm:px-3">
                        {participant.potentialPoints ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-cyan-300/30 bg-cyan-950/30 p-4 shadow-lg shadow-black/20" aria-labelledby="family-score-heading">
            <h2 id="family-score-heading" className="text-xl font-semibold text-cyan-100">
              Sheth vs Rawitscher
            </h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">Sheth</h3>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">{shethManagers.join(", ")}</div>
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-emerald-300">{shethScore}</div>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">Rawitscher</h3>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">{rawitscherManagers.join(", ")}</div>
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-emerald-300">{rawitscherScore}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <TodaysScoreboard />

        <section className="space-y-4" aria-labelledby="standings-heading">
          <h2 id="standings-heading" className="text-xl font-semibold">
            Draft Pool Standings
          </h2>

          {standings.map((participant) => (
            <article
              id={participantAnchorId(participant.name)}
              key={participant.name}
              className="scroll-mt-4 rounded-lg border border-white/10 bg-zinc-900/90 p-3 shadow-lg shadow-black/20 sm:scroll-mt-6 sm:p-4"
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
                        : team.eliminated
                          ? "border-red-500/60 bg-red-950/30"
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
                            : team.eliminated
                              ? "bg-red-500/15 text-red-300"
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
