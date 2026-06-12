export function knockoutWinPoints(stage) {
  const pointsByStage = {
    "Round of 32": 5,
    "Round of 16": 7,
    Quarterfinal: 10,
    Semifinal: 13,
    Final: 18,
    "Third Place": 6,
  };

  return pointsByStage[stage] || 0;
}

const TEAM_NAME_ALIASES = {
  "Bosnia & Herzegovina": "bosnia and herzegovina",
  "Cape Verde": "cabo verde",
  "Czech Republic": "czechia",
  "Côte d'Ivoire": "ivory coast",
  "Democratic Republic of the Congo": "dr congo",
  Korea: "south korea",
  "South Korea": "south korea",
  "United States": "usa",
};

function canonicalTeamName(teamName) {
  return TEAM_NAME_ALIASES[teamName] || teamName.toLowerCase();
}

function isSameTeam(teamA, teamB) {
  return canonicalTeamName(teamA) === canonicalTeamName(teamB);
}

export function getMatchWinner(match) {
  if (match.homeScore > match.awayScore) {
    return match.homeTeam;
  }

  if (match.awayScore > match.homeScore) {
    return match.awayTeam;
  }

  if (match.hasPenaltyShootout) {
    if (match.homePenaltyScore > match.awayPenaltyScore) {
      return match.homeTeam;
    }

    if (match.awayPenaltyScore > match.homePenaltyScore) {
      return match.awayTeam;
    }
  }

  return null;
}

export function calculateTeamPoints(teamName, matches, groupBonuses) {
  let points = 0;
  const scoringLog = [];
  let liveMatch = null;
  let livePoints = 0;

  matches
    .filter((match) => match.status === "completed" || match.status === "live")
    .forEach((match) => {
      const isHomeTeam = isSameTeam(match.homeTeam, teamName);
      const isAwayTeam = isSameTeam(match.awayTeam, teamName);

      if (!isHomeTeam && !isAwayTeam) {
        return;
      }

      const opponent = isHomeTeam ? match.awayTeam : match.homeTeam;
      const teamScore = isHomeTeam ? match.homeScore : match.awayScore;
      const opponentScore = isHomeTeam ? match.awayScore : match.homeScore;
      const isLiveMatch = match.status === "live";

      if (isLiveMatch) {
        liveMatch = {
          opponent,
          teamScore,
          opponentScore,
          timeElapsed: match.timeElapsed,
        };
      }

      if (match.stage === "Group Stage") {
        const didWin = teamScore > opponentScore;
        const didDraw = teamScore === opponentScore;
        const logPrefix = isLiveMatch ? "Live: " : "";
        const liveSuffix = isLiveMatch ? ` (${match.timeElapsed || "live"})` : "";

        if (didWin) {
          points += 3;
          scoringLog.push(`${logPrefix}+3 group win vs ${opponent}${liveSuffix}`);

          if (isLiveMatch) {
            livePoints = 3;
          }
        } else if (didDraw) {
          points += 1;
          scoringLog.push(`${logPrefix}+1 group draw vs ${opponent}${liveSuffix}`);

          if (isLiveMatch) {
            livePoints = 1;
          }
        }

        return;
      }

      const winner = getMatchWinner(match);

      if (winner && isSameTeam(winner, teamName)) {
        const winPoints = knockoutWinPoints(match.stage);
        points += winPoints;
        scoringLog.push(`${isLiveMatch ? "Live: " : ""}+${winPoints} ${match.stage} win vs ${opponent}`);

        if (isLiveMatch) {
          livePoints = winPoints;
        }

        return;
      }

      if (winner && !isSameTeam(winner, teamName)) {
        if (match.hasPenaltyShootout) {
          points += 2;
          scoringLog.push(`+2 lost in PKs vs ${opponent}`);
        } else if (match.hasExtraTime) {
          points += 1;
          scoringLog.push(`+1 lost in extra time vs ${opponent}`);
        }
      }
    });

  const bonus = groupBonuses[teamName];

  if (bonus?.groupFinish === 1) {
    points += 3;
    scoringLog.push("+3 won group");
  } else if (bonus?.groupFinish === 2) {
    points += 2;
    scoringLog.push("+2 finished second in group");
  } else if (bonus?.advanced) {
    points += 1;
    scoringLog.push("+1 advanced from third place");
  }

  return { points, scoringLog, liveMatch, livePoints };
}

export function calculateParticipantStandings(participants, matches, groupBonuses) {
  return participants
    .map((participant) => {
      const teams = participant.teams
        .map((teamName) => ({
          name: teamName,
          ...calculateTeamPoints(teamName, matches, groupBonuses),
        }))
        .sort((teamA, teamB) => teamB.points - teamA.points);

      const totalPoints = teams.reduce((total, team) => total + team.points, 0);
      const hasLiveTeam = teams.some((team) => team.liveMatch);

      return {
        ...participant,
        teams,
        totalPoints,
        hasLiveTeam,
      };
    })
    .sort((participantA, participantB) => participantB.totalPoints - participantA.totalPoints)
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
}

export function calculateWorldCupGroupStandings(groups, matches) {
  const completedGroupMatches = matches.filter(
    (match) => match.status === "completed" && match.stage === "Group Stage"
  );

  return groups.map((group) => {
    const teams = group.teams.map((teamName) => {
      const row = {
        name: teamName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };

      completedGroupMatches.forEach((match) => {
        const isHomeTeam = isSameTeam(match.homeTeam, teamName);
        const isAwayTeam = isSameTeam(match.awayTeam, teamName);

        if (!isHomeTeam && !isAwayTeam) {
          return;
        }

        const teamScore = isHomeTeam ? match.homeScore : match.awayScore;
        const opponentScore = isHomeTeam ? match.awayScore : match.homeScore;

        row.played += 1;
        row.goalsFor += teamScore;
        row.goalsAgainst += opponentScore;

        if (teamScore > opponentScore) {
          row.wins += 1;
          row.points += 3;
        } else if (teamScore === opponentScore) {
          row.draws += 1;
          row.points += 1;
        } else {
          row.losses += 1;
        }
      });

      row.goalDifference = row.goalsFor - row.goalsAgainst;
      return row;
    });

    teams.sort((teamA, teamB) => {
      if (teamB.points !== teamA.points) {
        return teamB.points - teamA.points;
      }

      if (teamB.goalDifference !== teamA.goalDifference) {
        return teamB.goalDifference - teamA.goalDifference;
      }

      return teamB.goalsFor - teamA.goalsFor;
    });

    return {
      ...group,
      teams,
    };
  });
}

export function getRecentCompletedMatches(matches) {
  return matches
    .filter((match) => match.status === "completed")
    .sort((matchA, matchB) => matchB.id - matchA.id)
    .slice(0, 5);
}
