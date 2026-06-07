export const manualMatches = [];

export const groupBonuses = {
  // groupFinish: 1 means group winner
  // groupFinish: 2 means second place
  // Third-place qualifiers should use advanced: true but no groupFinish bonus.
  // Teams not listed receive no advancement or placement bonus.
};

// Example match to copy into manualMatches after the tournament starts:
// {
//   id: 1,
//   stage: "Group Stage",
//   homeTeam: "Argentina",
//   awayTeam: "Japan",
//   homeScore: 2,
//   awayScore: 1,
//   status: "completed",
//   hasExtraTime: false,
//   hasPenaltyShootout: false,
// }
