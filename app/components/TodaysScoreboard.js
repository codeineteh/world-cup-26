"use client";

import { useEffect, useMemo, useState } from "react";

const POLL_INTERVAL_MS = 15000;
const CENTRAL_TIME_ZONE = "America/Chicago";

function formatCentralTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CENTRAL_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

function formatTodayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}/${day}/${date.getFullYear()}`;
}

function kickoffTime(localDate) {
  if (!localDate) {
    return "TBD";
  }

  const [datePart, timePart] = localDate.split(" ");
  const [month, day, year] = datePart.split("/");
  const [hour, minute] = timePart.split(":");
  const kickoffDate = new Date(Date.UTC(year, Number(month) - 1, day, hour, minute));

  return formatCentralTime(kickoffDate);
}

function statusLabel(match) {
  if (match.status === "live") {
    return "Live";
  }

  if (match.status === "completed") {
    return "Final";
  }

  return kickoffTime(match.localDate);
}

function MatchScorers({ scorers }) {
  if (!scorers || scorers.length === 0) {
    return null;
  }

  return <div className="mt-1 text-xs leading-5 text-zinc-500">{scorers.join(", ")}</div>;
}

function RedCards({ cards }) {
  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-red-200">
      {cards.map((card, index) => (
        <span key={`${card}-${index}`} className="inline-flex items-center gap-1">
          <span className="h-3 w-2 rounded-[1px] bg-red-500" aria-hidden="true" />
          {card}
        </span>
      ))}
    </div>
  );
}

export default function TodaysScoreboard() {
  const [matches, setMatches] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const todayKey = useMemo(() => formatTodayKey(new Date()), []);

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      try {
        const response = await fetch("/api/world-cup", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load live scores");
        }

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        setMatches(data.matches || []);
        setFetchedAt(data.fetchedAt || new Date().toISOString());
        setError("");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMatches();
    const intervalId = window.setInterval(loadMatches, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const todaysMatches = matches
    .filter((match) => match.localDate?.startsWith(todayKey))
    .sort((matchA, matchB) => matchA.id - matchB.id);

  const lastUpdated = fetchedAt
    ? formatCentralTime(new Date(fetchedAt))
    : null;

  return (
    <section className="h-full rounded-lg border border-emerald-300/40 bg-emerald-950/50 p-4 shadow-lg shadow-black/20" aria-labelledby="today-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="today-heading" className="text-xl font-semibold text-cyan-100">
            Today's Matches
          </h2>
        </div>
        <div className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
          {lastUpdated ? `Updated ${lastUpdated}` : "Connecting"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          <div className="rounded-lg border border-emerald-300/20 bg-zinc-950/80 p-4 text-sm text-zinc-400">
            Loading today's scores...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        ) : todaysMatches.length > 0 ? (
          todaysMatches.map((match) => (
            <article key={match.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-zinc-500">
                <span>
                  {match.stage}
                  {match.group ? ` · Group ${match.group}` : ""}
                </span>
                <span
                  className={
                    match.status === "live"
                      ? "rounded-full bg-red-500 px-2 py-0.5 text-white"
                      : "rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-300"
                  }
                >
                  {statusLabel(match)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <div>
                    <div className="font-semibold text-white">{match.homeTeam}</div>
                    <MatchScorers scorers={match.homeScorers} />
                    <RedCards cards={match.homeRedCards} />
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-white">{match.homeScore}</div>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <div>
                    <div className="font-semibold text-white">{match.awayTeam}</div>
                    <MatchScorers scorers={match.awayScorers} />
                    <RedCards cards={match.awayRedCards} />
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-white">{match.awayScore}</div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-emerald-300/30 bg-zinc-950/80 p-4 text-sm text-zinc-400">
            No matches are scheduled for today.
          </div>
        )}
      </div>
    </section>
  );
}
