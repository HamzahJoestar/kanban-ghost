# Boo-Do Deployment Guide 🎃

## Your Deployments
- **Frontend (Vercel)**: https://kanban-ghost.vercel.app/
- **Backend (Render)**: https://kanban-ghost.onrender.com

## Required Changes

### 1. **Create `src/lib/api.js`** (if it doesn't exist)
Copy the API file I created to your project:
```bash
# In your project root
mkdir -p src/lib
# Then copy the api.js file to src/lib/
```

### 2. **Update your `.env` file**
Add this line to your `.env` file:
```
VITE_API_URL=https://kanban-ghost.onrender.com
```

### 3. **Set Environment Variables on Vercel**
Go to your Vercel dashboard:
1. Select your project
2. Go to Settings → Environment Variables
3. Add: `VITE_API_URL` = `https://kanban-ghost.onrender.com`
4. Redeploy your app

### 4. **Configure CORS on Render Backend**
Your `server.js` already has CORS enabled, but make sure it allows your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'https://kanban-ghost.vercel.app'
  ],
  credentials: true
}));
```

### 5. **Set Environment Variables on Render**
In your Render dashboard:
1. Go to your service
2. Environment → Add environment variables:
   - `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
   - `ELEVEN_API_KEY`
   - `ELEVEN_VOICE_ID`
   - `PORT=5174`

## How It Works

The `api.js` file automatically detects the environment:
- **Development** (localhost): Uses `http://localhost:5174`
- **Production** (deployed): Uses your Render URL from `VITE_API_URL`

## Testing Locally

To test with local backend:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
# Make sure .env has: VITE_API_URL=http://localhost:5174
npm run dev
```

To test with production backend:
```bash
# Update .env: VITE_API_URL=https://kanban-ghost.onrender.com
npm run dev
```

## Common Issues

### Issue: "Failed to fetch" errors
**Solution**: Check that:
1. Render backend is running (visit your Render URL)
2. CORS is configured correctly
3. Environment variables are set on Vercel

### Issue: Ghost features not working
**Solution**: 
1. Check browser console for errors
2. Verify API keys are set on Render
3. Check Render logs for backend errors

### Issue: Music not playing
**Solution**: 
1. Make sure `study-loop.mp3` is in your `public/` folder
2. User must interact with page before audio plays (browser restriction)

## Deployment Checklist

- [ ] `src/lib/api.js` file created
- [ ] `.env` updated with `VITE_API_URL`
- [ ] Vercel environment variables set
- [ ] Render environment variables set  
- [ ] CORS configured in `server.js`
- [ ] Both deployments tested and working

## Need Help?

- Check Render logs: Dashboard → Logs
- Check Vercel logs: Dashboard → Deployments → [latest] → Logs
- Browser console for frontend errors (F12)