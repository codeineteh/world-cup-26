"use client";

import { useEffect, useMemo, useState } from "react";
import { managerForTeam } from "../../data/draft";
import { flagForTeam } from "../../data/teamFlags";

const POLL_INTERVAL_MS = 15000;
const CENTRAL_TIME_ZONE = "America/Chicago";
const KNOCKOUT_ROUNDS = [
  { stage: "Round of 32", label: "Round of 32", shortLabel: "R32" },
  { stage: "Round of 16", label: "Round of 16", shortLabel: "R16" },
  { stage: "Quarterfinal", label: "Quarterfinals", shortLabel: "QF" },
  { stage: "Semifinal", label: "Semifinals", shortLabel: "SF" },
  { stage: "Final", label: "Final", shortLabel: "Final" },
];

function centralDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.month}/${values.day}/${values.year}`;
}

function formatCentralTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CENTRAL_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

function kickoffTime(match) {
  if (!match.startDate) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CENTRAL_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(match.startDate));
}

function statusLabel(match) {
  if (match.status === "live") return match.timeElapsed || "Live";
  if (match.status === "completed") return match.hasExtraTime ? "Final ET" : "Final";
  return kickoffTime(match);
}

function bracketStatusLabel(match) {
  if (match.status !== "scheduled" || !match.startDate) return statusLabel(match);

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: CENTRAL_TIME_ZONE,
  }).format(new Date(match.startDate));
}

function displayScore(match, side) {
  const score = side === "home" ? match.homeScore : match.awayScore;
  const penalty = side === "home" ? match.homePenaltyScore : match.awayPenaltyScore;
  if (match.status === "scheduled") return "–";
  return match.hasPenaltyShootout ? `${score} (${penalty})` : score;
}

function isWinner(match, side) {
  if (side === "home" && match.homeWinner) return true;
  if (side === "away" && match.awayWinner) return true;
  if (match.status !== "completed") return false;
  if (match.hasPenaltyShootout) {
    return side === "home"
      ? match.homePenaltyScore > match.awayPenaltyScore
      : match.awayPenaltyScore > match.homePenaltyScore;
  }
  return side === "home" ? match.homeScore > match.awayScore : match.awayScore > match.homeScore;
}

function hasKnownTeam(match) {
  return [match?.homeTeam, match?.awayTeam].some(
    (team) => team && !/^(tbd|tba|to be determined)$/i.test(team)
  );
}

function TeamName({ name, flagOnly = false }) {
  const flag = flagForTeam(name);

  if (flagOnly) {
    return flag ? <span className="bracket-team-flag" aria-label={name}>{flag}</span> : <span />;
  }

  return (
    <span className="min-w-0 truncate">
      {flag && <span className="mr-1.5">{flag}</span>}
      {name || "TBD"}
    </span>
  );
}

function FixtureCard({ match }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-zinc-500">
        <span>{match.stage}{match.group ? ` · Group ${match.group}` : ""}</span>
        <span className={match.status === "live" ? "rounded-full bg-red-500 px-2 py-0.5 text-white" : "rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-300"}>
          {statusLabel(match)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {["home", "away"].map((side) => {
          const team = side === "home" ? match.homeTeam : match.awayTeam;
          return (
            <div key={side} className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="flex font-semibold text-white"><TeamName name={team} /></div>
                {managerForTeam(team) && <div className="mt-0.5 truncate text-xs font-medium text-zinc-500">{managerForTeam(team)}</div>}
              </div>
              <div className="text-3xl font-bold tabular-nums text-white">{displayScore(match, side)}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function MatchPanel({ id, title, matches, loading, error, emptyText, tone }) {
  const colors = tone === "cyan"
    ? "border-cyan-300/40 bg-cyan-950/40 text-cyan-100"
    : "border-amber-300/40 bg-amber-950/40 text-amber-100";
  return (
    <section className={`h-full rounded-lg border p-4 shadow-lg shadow-black/20 ${colors}`} aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {loading ? <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 text-sm text-zinc-400">Loading fixtures…</div>
          : error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
          : matches.length ? matches.map((match) => <FixtureCard key={match.id} match={match} />)
          : <div className="rounded-lg border border-dashed border-white/20 bg-zinc-950/80 p-4 text-sm text-zinc-400">{emptyText}</div>}
      </div>
    </section>
  );
}

function BracketMatch({ match }) {
  return (
    <article className={`bracket-match ${match?.status === "live" ? "bracket-match-live" : ""}`}>
      <div className="bracket-match-meta mb-1.5 flex justify-between gap-2 text-[10px] font-semibold uppercase text-zinc-500">
        <span>{match ? bracketStatusLabel(match) : ""}</span>
        {match?.hasPenaltyShootout && <span>PKs</span>}
      </div>
      {["home", "away"].map((side) => {
        const name = match?.[`${side}Team`] || "TBD";
        const winner = match && isWinner(match, side);
        return (
          <div key={side} className={`flex items-center justify-between gap-2 border-t border-zinc-800 py-1.5 text-sm ${winner ? "font-bold text-emerald-300" : "text-zinc-200"}`}>
            <TeamName name={name} flagOnly />
            <span className="shrink-0 tabular-nums">{winner ? "✓ " : ""}{match ? displayScore(match, side) : ""}</span>
          </div>
        );
      })}
    </article>
  );
}

function BracketSide({ side, rounds }) {
  return (
    <div className={`bracket-side bracket-side-${side}`}>
      {rounds.map((round) => (
        <div key={`${side}-${round.stage}`} className="bracket-round">
          <h3 className="bracket-round-heading">{round.shortLabel}</h3>
          <div className="bracket-round-matches">
            {round.matches.length
              ? round.matches.map((match) => hasKnownTeam(match) ? <BracketMatch key={match.id} match={match} /> : null)
              : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveBracket({ matches }) {
  const knockout = KNOCKOUT_ROUNDS.map((round) => ({
    ...round,
    matches: matches.filter((match) => match.stage === round.stage).sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
  }));
  const hasFixtures = knockout.some((round) => round.matches.length);
  const thirdPlace = matches.find((match) => match.stage === "Third Place");
  const progressionRounds = knockout.filter((round) => round.stage !== "Final");
  const sides = ["left", "right"].map((side, sideIndex) => ({
    side,
    rounds: progressionRounds.map((round) => {
      const midpoint = Math.ceil(round.matches.length / 2);
      return {
        ...round,
        matches: sideIndex === 0 ? round.matches.slice(0, midpoint) : round.matches.slice(midpoint),
      };
    }),
  }));
  const final = knockout.find((round) => round.stage === "Final")?.matches[0];

  return (
    <section className="mt-4 rounded-lg border border-emerald-300/30 bg-zinc-900/90 p-4 shadow-lg shadow-black/20" aria-labelledby="bracket-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bracket-heading" className="text-xl font-semibold text-emerald-100">Bracket</h2>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Live data</span>
      </div>
      {hasFixtures ? (
        <div className="bracket-viewport mt-4">
          <div className="bracket-layout">
            <BracketSide side="left" rounds={sides[0].rounds} />
            <div className="bracket-center">
              <div className="w-full">
                <h3 className="bracket-round-heading text-amber-200">Final</h3>
                {hasKnownTeam(final) && <BracketMatch match={final} />}
                {hasKnownTeam(thirdPlace) && <div className="bracket-third-place"><div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">Third place</div><BracketMatch match={thirdPlace} /></div>}
              </div>
            </div>
            <BracketSide side="right" rounds={sides[1].rounds} />
          </div>
        </div>
      ) : <div className="mt-4 rounded-lg border border-dashed border-emerald-300/20 bg-zinc-950/70 p-4 text-sm text-zinc-400">Knockout fixtures will appear here when ESPN publishes the bracket.</div>}
    </section>
  );
}

export default function TodaysScoreboard() {
  const [matches, setMatches] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dateKeys = useMemo(() => ({
    today: centralDateKey(new Date()),
    tomorrow: centralDateKey(new Date(Date.now() + 86400000)),
  }), []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/world-cup", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load live World Cup fixtures");
        const data = await response.json();
        if (mounted) { setMatches(data.matches || []); setFetchedAt(data.fetchedAt); setError(""); }
      } catch (loadError) { if (mounted) setError(loadError.message); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const fixturesFor = (key) => matches.filter((match) => match.localDate?.startsWith(key)).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return (
    <div className="mb-8">
      <div className="mb-3 flex justify-end text-xs text-zinc-500">{fetchedAt ? `Updated ${formatCentralTime(new Date(fetchedAt))}` : "Connecting to ESPN…"}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MatchPanel id="today-heading" title="Today's Matches" matches={fixturesFor(dateKeys.today)} loading={loading} error={error} emptyText="No matches are scheduled for today." tone="cyan" />
        <MatchPanel id="tomorrow-heading" title="Tomorrow's Fixtures" matches={fixturesFor(dateKeys.tomorrow)} loading={loading} error={error} emptyText="No matches are scheduled for tomorrow." tone="amber" />
      </div>
      <LiveBracket matches={matches} />
    </div>
  );
}
