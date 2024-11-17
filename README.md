# Cybersnake Game

A cyberpunk-themed Snake game with persistent high scores and user authentication.

## Features

- Cyberpunk-themed UI with glitch effects
- Persistent high scores
- User authentication with passwords
- Automatic login with saved credentials
- Real-time leaderboard updates

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in your browser

## Deployment on Render (Free)

1. Create a [Render](https://render.com) account

2. Fork or push this repository to GitHub

3. In Render:
   - Click "New +"
   - Select "Blueprint"
   - Connect your GitHub repository
   - Click "Apply"

Render will automatically:
- Deploy the Node.js server
- Deploy the static frontend
- Set up HTTPS
- Provide you with deployment URLs

## Architecture

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express
- Database: SQLite
- Deployment: Render.com

## Development Notes

- The game uses SQLite for data persistence
- High scores are limited to top 10
- Each player can only have one score (their highest)
- Passwords are stored in plain text (not for production use)
