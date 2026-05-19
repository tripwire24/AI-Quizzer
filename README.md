# YoungShand Live Lab

A real-time workshop game adapted from AI Quizzer for the YoungShand training decks.

The host creates a room PIN. Participants join from their phone or laptop, enter their name once, then contribute to live boards and scored questions during the session.

## Workshop Packs

- YoungShand Prove-It Sprint
- YoungShand Media Skills Lab

Each pack mixes:

- open exercises for workshop inputs and discussion
- scored questions for quick checks and energy
- facilitator notes on the host screen
- persisted participant names and avatars

## Run Locally

Prerequisite: Node.js 18+

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Render

Render settings:

- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `NODE_ENV=production`

The included `render.yaml` names the service `youngshand-live-lab`.
