const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const Match = require("./models/matchModel");
const currentMatch = require("./config/config");
const startMatch = require("./handlers/startMatch");
const bot = new Telegraf(`${process.env.TOKEN}`);
const url = process.env.BASE;

// Connect to MongoDB
mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@insta-project.oodqm.mongodb.net/?retryWrites=true&w=majority&appName=insta-project`
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const getMatchMinute = () => {
  if (!currentMatch.startTime) return 0;
  const elapsed = Date.now() - currentMatch.startTime;
  return Math.floor(elapsed / 60000);
};

// Bot commands
bot.command("start_game", async (ctx) => {
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
});

bot.command("goal", async (ctx) => {
  if (!currentMatch.isActive) {
    return ctx.reply("No active match. Start one with /start_game");
  }

  // Send buttons for selecting the scoring team
  ctx.reply(
    "Which team scored?",
    Markup.inlineKeyboard([
      Markup.button.callback("Home Team", "goal_home"),
      Markup.button.callback("Away Team", "goal_away"),
    ])
  );
});

// Handle team selection
bot.action(["goal_home", "goal_away"], async (ctx) => {
  const team = ctx.match[0] === "goal_home" ? "home" : "away";

  // Ask for scorer's name
  await ctx.reply(
    `Enter scorer's name for the ${team === "home" ? "Home" : "Away"} team:`
  );

  // Set up a listener for the next text input
  bot.on("text", async function scorerListener(ctx) {
    const scorer = ctx.message.text;
    const minute = getMatchMinute();

    // Update the score
    if (team === "home") {
      currentMatch.homeScore++;
    } else {
      currentMatch.awayScore++;
    }

    const goalData = {
      name: scorer,
      team: team,
      minute: minute,
      type: "open play",
    };

    currentMatch.scorers.push(goalData);

    try {
      // Save goal to the database
      await Match.findByIdAndUpdate(currentMatch._id, {
        $push: { scorers: goalData },
        $set: {
          homeScore: currentMatch.homeScore,
          awayScore: currentMatch.awayScore,
        },
      });

      // Notify an external service
      await axios.post(`${url}/goal`, {
        team: team,
        scorer: scorer,
        minute: minute,
        type: "open play",
        score: {
          home: currentMatch.homeScore,
          away: currentMatch.awayScore,
        },
      });

      // Reply with success message
      ctx.reply(
        `Goal recorded!\n` +
          `⚽ ${scorer} (${
            team === "home" ? currentMatch.homeTeam : currentMatch.awayTeam
          })\n` +
          `⏱️ Minute: ${minute}\n\n` +
          `Current score: ${currentMatch.homeTeam} ${currentMatch.homeScore} - ${currentMatch.awayScore} ${currentMatch.awayTeam}`
      );

      // Remove the text listener after handling the input
      bot.off("text", scorerListener);
    } catch (error) {
      console.error("Error saving goal:", error);
      ctx.reply("Error recording goal. Please try again.");
    }
  });
});

bot.command("foul", async (ctx) => {
  if (!currentMatch.isActive) {
    return ctx.reply("No active match. Start one with /start_game");
  }

  // Send buttons for selecting the team that committed the foul
  ctx.reply(
    "Which team committed the foul?",
    Markup.inlineKeyboard([
      Markup.button.callback("Home Team", "foul_home"),
      Markup.button.callback("Away Team", "foul_away"),
    ])
  );
});

// Handle team selection
bot.action(["foul_home", "foul_away"], async (ctx) => {
  const team = ctx.match[0] === "foul_home" ? "home" : "away";

  // Ask for the player who committed the foul
  await ctx.reply(
    `Enter the player who committed the foul for the ${
      team === "home" ? "Home" : "Away"
    } team:`
  );

  // Set up a listener for the next text input
  bot.on("text", async function foulListener(ctx) {
    const player = ctx.message.text;
    const minute = getMatchMinute();

    const foulData = { player, minute };
    currentMatch.fouls[team].push(foulData);
    currentMatch.matchStats[team].totalFouls++;

    try {
      // Update the database with the foul data
      await Match.findByIdAndUpdate(currentMatch._id, {
        $push: { [`fouls.${team}`]: foulData },
        $set: {
          [`matchStats.${team}.totalFouls`]:
            currentMatch.matchStats[team].totalFouls,
        },
      });

      // Notify an external service
      await axios.post(`${url}/foul`, {
        team,
        player,
        minute,
        matchStats: currentMatch.matchStats,
      });

      // Reply with success message
      ctx.reply(
        `Foul recorded!\n${player} (${
          team === "home" ? currentMatch.homeTeam : currentMatch.awayTeam
        }) - Minute: ${minute}`
      );

      // Remove the text listener after handling the input
      bot.off("text", foulListener);
    } catch (error) {
      console.error("Error saving foul:", error);
      ctx.reply("Error recording foul. Please try again.");
    }
  });
});

bot.command("freekick", async (ctx) => {
  if (!currentMatch.isActive) {
    return ctx.reply("No active match. Start one with /start_game");
  }

  // Ask which team is taking the free kick
  ctx.reply(
    "Which team is taking the free kick?",
    Markup.inlineKeyboard([
      Markup.button.callback("Home Team", "freekick_home"),
      Markup.button.callback("Away Team", "freekick_away"),
    ])
  );
});

// Handle team selection
bot.action(["freekick_home", "freekick_away"], async (ctx) => {
  const team = ctx.match[0] === "freekick_home" ? "home" : "away";

  // Ask for the player taking the free kick
  await ctx.reply(
    `Enter the player taking the free kick for the ${
      team === "home" ? "Home" : "Away"
    } team:`
  );

  // Set up a listener for the player's name
  bot.on("text", async function playerListener(ctx) {
    const player = ctx.message.text;

    // Ask if the free kick was scored
    await ctx.reply(
      `Was the free kick scored?`,
      Markup.inlineKeyboard([
        Markup.button.callback("Yes", `freekick_scored_${team}_${player}`),
        Markup.button.callback("No", `freekick_missed_${team}_${player}`),
      ])
    );

    // Remove the text listener after capturing the player's name
    bot.off("text", playerListener);
  });
});

// Handle scored/missed free kick
bot.action(/^freekick_(scored|missed)_(home|away)_(.+)$/, async (ctx) => {
  const [, result, team, player] = ctx.match;
  const scored = result === "scored";
  const minute = getMatchMinute();

  const freeKickData = { player, minute, scored };
  currentMatch.freeKicks[team].push(freeKickData);
  currentMatch.matchStats[team].freeKicksTaken++;

  if (scored) {
    currentMatch.matchStats[team].freeKicksScored++;
    if (team === "home") {
      currentMatch.homeScore++;
    } else {
      currentMatch.awayScore++;
    }
    currentMatch.scorers.push({
      name: player,
      team: team,
      minute: minute,
      type: "free kick",
    });
  }

  try {
    // Update the database
    await Match.findByIdAndUpdate(currentMatch._id, {
      $push: {
        [`freeKicks.${team}`]: freeKickData,
        ...(scored && {
          scorers: {
            name: player,
            team: team,
            minute: minute,
            type: "free kick",
          },
        }),
      },
      $set: {
        [`matchStats.${team}.freeKicksTaken`]:
          currentMatch.matchStats[team].freeKicksTaken,
        [`matchStats.${team}.freeKicksScored`]:
          currentMatch.matchStats[team].freeKicksScored,
        homeScore: currentMatch.homeScore,
        awayScore: currentMatch.awayScore,
      },
    });

    // Notify external service
    await axios.post(`${url}/freekick`, {
      team,
      player,
      minute,
      scored,
      matchStats: currentMatch.matchStats,
      currentScore: {
        home: currentMatch.homeScore,
        away: currentMatch.awayScore,
      },
    });

    // Reply with success message
    await ctx.reply(
      `Free kick recorded!\n${player} (${
        team === "home" ? currentMatch.homeTeam : currentMatch.awayTeam
      }) - Minute: ${minute}\n${scored ? "GOAL!" : "Missed"}`
    );

    if (scored) {
      await ctx.reply(
        `Updated score: ${currentMatch.homeTeam} ${currentMatch.homeScore} - ${currentMatch.awayScore} ${currentMatch.awayTeam}`
      );
    }
  } catch (error) {
    console.error("Error saving free kick:", error);
    ctx.reply("Error recording free kick. Please try again.");
  }
});

bot.command("stats", async (ctx) => {
  if (!currentMatch.isActive) {
    return ctx.reply("No active match statistics available");
  }

  try {
    const match = await Match.findById(currentMatch._id);
    console.log("Match ID: ", currentMatch._id);
    const homeStats = match.matchStats.home;
    const awayStats = match.matchStats.away;

    ctx.reply(
      `Match Statistics:\n\n` +
        `${match.homeTeam}:\n` +
        `Goals: ${match.homeScore}\n` +
        `Fouls: ${homeStats.totalFouls}\n` +
        `Free Kicks: ${homeStats.freeKicksTaken} (Scored: ${homeStats.freeKicksScored})\n\n` +
        `${match.awayTeam}:\n` +
        `Goals: ${match.awayScore}\n` +
        `Fouls: ${awayStats.totalFouls}\n` +
        `Free Kicks: ${awayStats.freeKicksTaken} (Scored: ${awayStats.freeKicksScored})`
    );
  } catch (error) {
    console.error("Error fetching stats:", error);
    ctx.reply("Error fetching match statistics. Please try again.");
  }
});

bot.command("end", async (ctx) => {
  if (!currentMatch.isActive) {
    return ctx.reply("No active match to end");
  }

  const matchDuration = getMatchMinute();
  const endTime = new Date();

  try {
    const match = await Match.findByIdAndUpdate(
      currentMatch._id,
      {
        $set: {
          endTime: endTime,
          isActive: false,
        },
      },
      { new: true }
    );

    const matchSummary = {
      finalScore: {
        home: match.homeScore,
        away: match.awayScore,
      },
      duration: matchDuration,
      scorers: match.scorers,
      fouls: match.fouls,
      freeKicks: match.freeKicks,
      matchStats: match.matchStats,
    };

    await axios.post(`${url}/end`, matchSummary);

    ctx.reply(
      `Match ended!\n\nFinal Score:\n${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}\n\n` +
        `Duration: ${matchDuration} minutes\n\n` +
        `Scorers:\n${match.scorers
          .map(
            (s) =>
              `${s.name} (${
                s.team === "home" ? match.homeTeam : match.awayTeam
              }) - ${s.minute}' ${s.type === "free kick" ? "(FK)" : ""}`
          )
          .join("\n")}\n\n` +
        `Match Statistics:\n` +
        `${match.homeTeam}:\n` +
        `- Fouls: ${matchSummary.matchStats.home.totalFouls}\n` +
        `- Free Kicks: ${matchSummary.matchStats.home.freeKicksTaken} (Scored: ${matchSummary.matchStats.home.freeKicksScored})\n\n` +
        `${match.awayTeam}:\n` +
        `- Fouls: ${matchSummary.matchStats.away.totalFouls}\n` +
        `- Free Kicks: ${matchSummary.matchStats.away.freeKicksTaken} (Scored: ${matchSummary.matchStats.away.freeKicksScored})`
    );

    // Reset match state
    currentMatch = {
      _id: null,
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
  } catch (error) {
    console.error("Error ending match:", error);
    ctx.reply("Error ending match. Please try again.");
  }
});

// Express endpoints
const app = express();

app.use(express.json());

app.post("/startgame", (req, res) => {
  console.log("Match started:", req.body);
  res.status(200).send("Match started");
});

app.post("/goal", (req, res) => {
  console.log("Goal scored:", req.body);
  res.status(200).send("Goal recorded");
});

app.post("/foul", (req, res) => {
  console.log("Foul committed:", req.body);
  res.status(200).send("Foul recorded");
});

app.post("/freekick", (req, res) => {
  console.log("Free kick taken:", req.body);
  res.status(200).send("Free kick recorded");
});

app.post("/end", (req, res) => {
  console.log("Match ended with summary:", req.body);
  res.status(200).send("Match ended");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

bot.launch();
