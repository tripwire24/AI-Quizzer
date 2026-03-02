<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Quizzer

A real-time multiplayer quiz game built with Next.js and Socket.io. Kahoot-style gameplay where hosts create games and participants join using a PIN code.

## Features

- **Real-time multiplayer** - Multiple players can join and play simultaneously
- **Live leaderboard** - Players see their rank and scores in real-time
- **Customizable quizzes** - Create your own quiz questions
- **Mobile-friendly** - Works on phones and tablets
- **No account required** - Players join with just a nickname

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Set the `GEMINI_API_KEY` in `.env.local` for AI features
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Deploy to Render

### Option 1: One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Option 2: Manual Setup

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure the service:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variable:
   - `NODE_ENV` = `production`
5. Deploy!

The app URL will be your Render service URL (e.g., `https://ai-quizzer.onrender.com`)

## How to Play

### As Host:
1. Go to the app URL and click "Host a Game"
2. Select a quiz and click "Host"
3. Share the **PIN** displayed on screen with players
4. Wait for players to join, then click "Start Game"

### As Player:
1. Go to the app URL
2. Enter the **Game PIN** and your **Nickname**
3. Click "Enter" to join the lobby
4. Answer questions as fast as you can!
5. Track your ranking on the live leaderboard

## Tech Stack

- **Next.js 15** - React framework
- **Socket.io** - Real-time communication
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Framer Motion** - Animations
