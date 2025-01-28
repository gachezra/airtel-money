# Telegram Match Bot

This project is a Telegram bot built using [Telegraf.js](https://telegraf.js.org/) to manage and track live football (soccer) match events. Users can record events like goals, fouls, and free kicks during a match in real time. The bot leverages inline buttons and database updates to make event tracking seamless and efficient.

## Features

- **Goal Recording**:

  - Choose which team scored (Home/Away) using buttons.
  - Input scorer details and automatically update match stats.

- **Foul Tracking**:

  - Track fouls committed by players with team-specific data.

- **Free Kick Management**:

  - Record free kicks, specify the player, and whether it resulted in a goal.

- **Real-time Match Stats**:
  - Automatically updates the score and player stats in the database.
  - Sends updates to external services via API calls.

## Technology Stack

- **Backend**: Node.js
- **Framework**: Telegraf.js
- **Database**: MongoDB
- **HTTP Client**: Axios

## Setup Instructions

### Prerequisites

Ensure you have the following installed:

- Node.js (v14+)
- npm (v6+)
- MongoDB

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/gachezra/futaa-bot.git
   cd futaa-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following variables:

   ```env
   BOT_TOKEN=<Your_Telegram_Bot_Token>
   MONGO_URI=<Your_MongoDB_Connection_String>
   URL=<Your_External_API_URL>
   ```

4. Start the bot:

   ```bash
   npm start
   ```

5. Use the `/start` command in your Telegram bot to initialize the bot.

## Usage

### Commands

#### `/start_game`

- Start a new match and initialize stats.

#### `/goal`

- Record a goal scored by a team.
- Inline buttons allow selecting the scoring team.
- Enter the scorer’s name and update the match score.

#### `/foul`

- Record a foul committed by a team.
- Inline buttons allow selecting the team.
- Input the player's name and update the foul stats.

#### `/freekick`

- Record a free kick for a team.
- Inline buttons allow selecting the team and whether the kick was scored.
- Input the player's name and update match stats accordingly.

## File Structure

```
.
├── src
│   ├── bot.js         # Main bot logic
│   ├── commands       # Command handlers (goal, foul, freekick)
│   ├── db             # MongoDB models
│   └── utils          # Utility functions (e.g., time calculations)
├── .env               # Environment variables
├── package.json       # Project dependencies
├── README.md          # Project documentation
└── ...
```

## API Integration

The bot sends match updates to an external API for real-time updates. Ensure your API endpoint is correctly configured in the `.env` file with the `URL` variable.

### Example API Payloads

#### Goal Event:

```json
{
  "team": "home",
  "scorer": "Player Name",
  "minute": 45,
  "type": "open play",
  "score": {
    "home": 2,
    "away": 1
  }
}
```

#### Free Kick Event:

```json
{
  "team": "away",
  "player": "Player Name",
  "minute": 75,
  "scored": true,
  "matchStats": {
    "home": { "freeKicksTaken": 3, "freeKicksScored": 1 },
    "away": { "freeKicksTaken": 5, "freeKicksScored": 2 }
  },
  "currentScore": {
    "home": 1,
    "away": 3
  }
}
```

## Contribution

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any inquiries or support, please contact:

- **Name**: Your Name
- **Email**: your.email@example.com
- **GitHub**: [gachezra](https://github.com/gachezra)
