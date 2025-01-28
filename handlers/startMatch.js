const currentMatch = require("../config/config");
const Match = require("../models/matchModel");

const startMatch = async (ctx) => {
  if (currentMatch.isActive) {
    return ctx.reply("There's already an active match. End it first with /end");
  }

  ctx.reply("Welcome to FutaaBot! the Football Match Monitor!");
  ctx.reply("Please enter the home team name:");

  bot.on("text", async (ctx) => {
    if (!currentMatch.homeTeam) {
      currentMatch.homeTeam = ctx.message.text;
      ctx.reply("Now enter the away team name:");
    } else if (!currentMatch.awayTeam) {
      currentMatch.awayTeam = ctx.message.text;
      currentMatch.isActive = true;
      currentMatch.startTime = Date.now();

      // Create new match in database
      try {
        const newMatch = new Match({
          ...currentMatch,
          startTime: new Date(currentMatch.startTime),
        });
        const savedMatch = await newMatch.save();
        currentMatch._id = savedMatch._id;

        await axios.post(`${url}/startgame`, {
          homeTeam: currentMatch.homeTeam,
          awayTeam: currentMatch.awayTeam,
          startTime: currentMatch.startTime,
        });

        ctx.reply(
          `Match started: ${currentMatch.homeTeam} vs ${currentMatch.awayTeam}\n\n` +
            "Available commands:\n" +
            "/goal - Record a goal\n" +
            "/foul - Record a foul\n" +
            "/freekick - Record a free kick\n" +
            "/stats - View match statistics\n" +
            "/end - End the match"
        );
      } catch (error) {
        console.error("Error saving match:", error);
        ctx.reply("Error starting match. Please try again.");
      }
    }
  });
};

module.exports = startMatch;
