# DuksiText AI Setup Guide

Your messaging app now uses AI-powered responses! Each bot (Duksi, Micic, Skad) has its own personality and can actually understand and respond to your questions.

## Quick Start

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key (you'll need it next)

### 2. Set Up the Backend

1. **Create a `.env` file** in the project root (same directory as `server.js`):
   ```
   OPENAI_API_KEY=your_key_here
   PORT=3000
   ```
   Replace `your_key_here` with your actual OpenAI API key.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the backend server**:
   ```bash
   npm start
   ```
   You should see: `Server running on port 3000`

### 3. Test It Out

- Open `index.html` in your browser
- Make sure the backend is running (step 2)
- Try sending a message like "Tell me a joke" or "How do I learn JavaScript?"
- The bots will respond intelligently based on their personalities!

## Bot Personalities

- **Duksi**: Friendly problem-solver, direct and practical
- **Micic**: Tech enthusiast, witty, thinks outside the box
- **Skad**: Thoughtful analyst, asks clarifying questions, sees different angles

## Important Settings

- **Auto-reply**: Toggle on/off in the right panel
- **Settings are saved** in your browser's LocalStorage
- **Conversation context**: Recent messages are sent to the AI for better responses

## Troubleshooting

### "Failed to get response" error
- Check that the backend server is running (`npm start`)
- Make sure `http://localhost:3000` is accessible
- Check your OpenAI API key is valid

### "API error" or quota exceeded
- Your OpenAI API might have run out of credits
- Check your usage at [OpenAI Usage](https://platform.openai.com/account/usage/overview)

### Slow responses
- OpenAI API calls take 1-3 seconds normally
- If much slower, check your internet connection

## Deploying to Production

To run this online, you'll need to:

1. Deploy the backend to a service like:
   - Heroku (free tier deprecated, but still works with paid plans)
   - Railway
   - Render
   - AWS/Google Cloud
   - DigitalOcean

2. Update `API_BASE` in `script.js` to point to your deployed backend

3. Store your `OPENAI_API_KEY` as an environment variable on your hosting service

## Customizing Bot Personalities

Edit the `BOT_PERSONALITIES` object in `server.js` to change how each bot responds:

```javascript
const BOT_PERSONALITIES = {
  Duksi: "Your custom prompt here...",
  Micic: "Your custom prompt here...",
  Skad: "Your custom prompt here..."
};
```

## More Info

- OpenAI Docs: https://platform.openai.com/docs
- Express.js: https://expressjs.com
- Full conversation history is used for context (last 6 messages)
