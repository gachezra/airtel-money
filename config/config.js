const currentMatch = {
  _id: null, // Store MongoDB document ID
  homeTeam: "",
  awayTeam: "",
  homeScore: 0,
  awayScore: 0,
  scorers: [],
  fouls: {
    home: [],
    away: [],
  },
  freeKicks: {
    home: [],
    away: [],
  },
  matchStats: {
    home: {
      totalFouls: 0,
      freeKicksTaken: 0,
      freeKicksScored: 0,
    },
    away: {
      totalFouls: 0,
      freeKicksTaken: 0,
      freeKicksScored: 0,
    },
  },
  isActive: false,
  startTime: null,
};

module.exports = currentMatch;
