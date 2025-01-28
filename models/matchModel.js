const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
    homeTeam: String,
    awayTeam: String,
    homeScore: Number,
    awayScore: Number,
    scorers: [{
      name: String,
      team: String,
      minute: Number,
      type: String
    }],
    fouls: {
      home: [{
        player: String,
        minute: Number
      }],
      away: [{
        player: String,
        minute: Number
      }]
    },
    freeKicks: {
      home: [{
        player: String,
        minute: Number,
        scored: Boolean
      }],
      away: [{
        player: String,
        minute: Number,
        scored: Boolean
      }]
    },
    matchStats: {
      home: {
        totalFouls: Number,
        freeKicksTaken: Number,
        freeKicksScored: Number
      },
      away: {
        totalFouls: Number,
        freeKicksTaken: Number,
        freeKicksScored: Number
      }
    },
    isActive: Boolean,
    startTime: Date,
    endTime: Date
  });
  
  module.exports = mongoose.model('Match', MatchSchema);
  