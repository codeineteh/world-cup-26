export function knockoutWinPoints(stage) {
  const pointsByStage = {
    "Round of 32": 4,
    "Round of 16": 6,
    Quarterfinal: 8,
    Quarterfinals: 8,
    "Round of 8": 8,
    Semifinal: 10,
    Semifinals: 10,
    "Round of 4": 10,
    Final: 12,
    Finals: 12,
    "Third Place": 3,
    "Third-place Playoff": 3,
  };

  return pointsByStage[stage] || 0;
}

const TEAM_NAME_ALIASES = {
  "Bosnia & Herzegovina": "bosnia and herzegovina",
  "Bosnia and Herzegovina": "bosnia and herzegovina",
  "Bosnia-Herzegovina": "bosnia and herzegovina",
  "Cape Verde": "cabo verde",
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

function canonicalTeamName(teamName) {
  return TEAM_NAME_ALIASES[teamName] || String(teamName || "").toLowerCase();
}

function isSameTeam(teamA, teamB) {
  return canonicalTeamName(teamA) === canonicalTeamName(teamB);
}

function bonusForTeam(teamName, groupBonuses) {
  if (groupBonuses[teamName]) {
    return groupBonuses[teamName];
  }

  return [...Object.entries(groupBonuses)]
    .reverse()
    .find(([bonusTeam]) => isSameTeam(bonusTeam, teamName))?.[1];
}

function compareGroupRows(teamA, teamB) {
  if (teamB.points !== teamA.points) {
    return teamB.points - teamA.points;
  }

  if (teamB.goalDifference !== teamA.goalDifference) {
    return teamB.goalDifference - teamA.goalDifference;
  }

  return teamB.goalsFor - teamA.goalsFor;
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

  if (match.homeWinner === true) {
    return match.homeTeam;
  }

  if (match.awayWinner === true) {
    return match.awayTeam;
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
        if (didWin) {
          points += 3;

          if (isLiveMatch) {
            livePoints = 3;
          } else {
            scoringLog.push(`+3 group win vs ${opponent}`);
          }
        } else if (didDraw) {
          points += 1;

          if (isLiveMatch) {
            livePoints = 1;
          } else {
            scoringLog.push(`+1 group draw vs ${opponent}`);
          }
        } else if (!isLiveMatch) {
          scoringLog.push(`+0 group loss vs ${opponent}`);
        }

        return;
      }

      const winner = getMatchWinner(match);

      if (winner && isSameTeam(winner, teamName)) {
        const winPoints = knockoutWinPoints(match.stage);
        points += winPoints;

        if (isLiveMatch) {
          livePoints = winPoints;
        } else {
          scoringLog.push(`+${winPoints} ${match.stage} win vs ${opponent}`);
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
        } else {
          scoringLog.push(`+0 ${match.stage} loss vs ${opponent}`);
        }
      }
    });

  const bonus = bonusForTeam(teamName, groupBonuses);

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
  const sortedParticipants = participants
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
    .sort((participantA, participantB) => participantB.totalPoints - participantA.totalPoints);

  let previousPoints = null;
  let previousRank = 0;

  return sortedParticipants.map((participant, index) => {
    const rank = participant.totalPoints === previousPoints ? previousRank : index + 1;

    previousPoints = participant.totalPoints;
    previousRank = rank;

    return {
      ...participant,
      rank,
    };
  });
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

    teams.sort(compareGroupRows);

    return {
      ...group,
      teams,
    };
  });
}

export function isGroupStageComplete(groupStandings) {
  return (
    groupStandings.length > 0 &&
    groupStandings.every((group) => group.teams.every((team) => team.played >= 3))
  );
}

export function calculateAutomaticGroupBonuses(groupStandings) {
  const bonuses = {};

  groupStandings.forEach((group) => {
    const groupIsComplete = group.teams.every((team) => team.played >= 3);

    if (!groupIsComplete) {
      return;
    }

    bonuses[group.teams[0].name] = { groupFinish: 1, advanced: true };
    bonuses[group.teams[1].name] = { groupFinish: 2, advanced: true };
  });

  if (isGroupStageComplete(groupStandings)) {
    groupStandings
      .map((group) => group.teams[2])
      .sort(compareGroupRows)
      .slice(0, 8)
      .forEach((team) => {
        bonuses[team.name] = { advanced: true };
      });
  }

  return bonuses;
}

export function calculateTeamsRemaining(teamNames, groupBonuses, matches) {
  const advancingTeams = Object.entries(groupBonuses)
    .filter(([, bonus]) => bonus.advanced || bonus.groupFinish === 1 || bonus.groupFinish === 2)
    .map(([teamName]) => teamName);

  const eliminatedTeams = matches
    .filter((match) => match.status === "completed" && match.stage !== "Group Stage")
    .map((match) => {
      const winner = getMatchWinner(match);

      if (!winner) {
        return null;
      }

      return isSameTeam(winner, match.homeTeam) ? match.awayTeam : match.homeTeam;
    })
    .filter(Boolean);

  return teamNames.filter(
    (teamName) =>
      advancingTeams.some((advancingTeam) => isSameTeam(advancingTeam, teamName)) &&
      !eliminatedTeams.some((eliminatedTeam) => isSameTeam(eliminatedTeam, teamName))
  ).length;
}

function matchStartTime(match) {
  const startTime = Date.parse(match.startDate || "");
  return Number.isNaN(startTime) ? Number(match.id) : startTime;
}

function setMaximum(map, key, points) {
  if (!map.has(key) || points > map.get(key)) {
    map.set(key, points);
  }
}

export function calculateRemainingPointPotential(teamNames, matches) {
  const ownsTeam = (teamName) => teamNames.some((ownedTeam) => isSameTeam(ownedTeam, teamName));
  const bracketMatches = matches.filter((match) => match.stage !== "Group Stage");
  const matchesByStage = new Map();

  bracketMatches.forEach((match) => {
    const stageMatches = matchesByStage.get(match.stage) || [];
    stageMatches.push(match);
    matchesByStage.set(match.stage, stageMatches);
  });

  matchesByStage.forEach((stageMatches) => {
    stageMatches.sort((matchA, matchB) => matchStartTime(matchA) - matchStartTime(matchB));
  });

  const winnerStateCache = new Map();

  function referencedMatch(teamSlot) {
    const source = String(teamSlot || "").match(
      /^(Round of 32|Round of 16|Quarterfinal|Semifinal) (\d+) Winner$/
    );

    if (!source) {
      return null;
    }

    return matchesByStage.get(source[1])?.[Number(source[2]) - 1] || null;
  }

  function entrantStates(teamSlot) {
    const sourceMatch = referencedMatch(teamSlot);

    if (sourceMatch) {
      return winnerStates(sourceMatch);
    }

    return new Map([[teamSlot, 0]]);
  }

  function futureWinPoints(winner, stage) {
    return ownsTeam(winner) ? knockoutWinPoints(stage) : 0;
  }

  function winnerStates(match) {
    if (winnerStateCache.has(match.id)) {
      return winnerStateCache.get(match.id);
    }

    if (match.status === "completed") {
      const winner = getMatchWinner(match);
      const completedState = winner ? new Map([[winner, 0]]) : new Map();
      winnerStateCache.set(match.id, completedState);
      return completedState;
    }

    const homeStates = entrantStates(match.homeTeam);
    const awayStates = entrantStates(match.awayTeam);
    const outcomes = new Map();

    homeStates.forEach((homePoints, homeTeam) => {
      awayStates.forEach((awayPoints, awayTeam) => {
        const priorPoints = homePoints + awayPoints;
        setMaximum(
          outcomes,
          homeTeam,
          priorPoints + futureWinPoints(homeTeam, match.stage)
        );
        setMaximum(
          outcomes,
          awayTeam,
          priorPoints + futureWinPoints(awayTeam, match.stage)
        );
      });
    });

    winnerStateCache.set(match.id, outcomes);
    return outcomes;
  }

  function semifinalOutcomes(match) {
    if (match.status === "completed") {
      const winner = getMatchWinner(match);

      if (!winner) {
        return [];
      }

      const loser = isSameTeam(winner, match.homeTeam) ? match.awayTeam : match.homeTeam;
      return [{ winner, loser, points: 0 }];
    }

    const outcomes = new Map();
    const homeStates = entrantStates(match.homeTeam);
    const awayStates = entrantStates(match.awayTeam);

    homeStates.forEach((homePoints, homeTeam) => {
      awayStates.forEach((awayPoints, awayTeam) => {
        const priorPoints = homePoints + awayPoints;
        setMaximum(
          outcomes,
          `${homeTeam}\u0000${awayTeam}`,
          priorPoints + futureWinPoints(homeTeam, match.stage)
        );
        setMaximum(
          outcomes,
          `${awayTeam}\u0000${homeTeam}`,
          priorPoints + futureWinPoints(awayTeam, match.stage)
        );
      });
    });

    return Array.from(outcomes, ([teams, points]) => {
      const [winner, loser] = teams.split("\u0000");
      return { winner, loser, points };
    });
  }

  function remainingMatchPotential(match, homeTeam, awayTeam) {
    if (!match || match.status === "completed") {
      return 0;
    }

    return Math.max(
      futureWinPoints(homeTeam, match.stage),
      futureWinPoints(awayTeam, match.stage)
    );
  }

  const semifinals = matchesByStage.get("Semifinal") || [];
  const finalMatch = matchesByStage.get("Final")?.[0];
  const thirdPlaceMatch = matchesByStage.get("Third Place")?.[0];

  if (semifinals.length !== 2 || !finalMatch) {
    return 0;
  }

  const firstSemifinalOutcomes = semifinalOutcomes(semifinals[0]);
  const secondSemifinalOutcomes = semifinalOutcomes(semifinals[1]);
  let maximumPotential = 0;

  firstSemifinalOutcomes.forEach((firstSemifinal) => {
    secondSemifinalOutcomes.forEach((secondSemifinal) => {
      const potential =
        firstSemifinal.points +
        secondSemifinal.points +
        remainingMatchPotential(finalMatch, firstSemifinal.winner, secondSemifinal.winner) +
        remainingMatchPotential(thirdPlaceMatch, firstSemifinal.loser, secondSemifinal.loser);

      maximumPotential = Math.max(maximumPotential, potential);
    });
  });

  return maximumPotential;
}

export function getRecentCompletedMatches(matches) {
  return matches
    .filter((match) => match.status === "completed")
    .sort((matchA, matchB) => matchB.id - matchA.id)
    .slice(0, 5);
}
