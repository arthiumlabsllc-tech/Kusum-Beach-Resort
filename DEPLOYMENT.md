# Kusum Beach - Deployment Guide ($0 Hosting Stack)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Render        │     │   Supabase      │
│   (Frontend)    │────▶│   (Backend API) │────▶│   (PostgreSQL)  │
│   FREE          │     │   FREE          │     │   FREE          │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   kusum-beach-            kusum-beach-api-         supabase.com
   vercel.app              onrender.com
```

## Step 1: Set Up Supabase Database (Free)

1. Go to https://supabase.com and sign up (free)
2. Click "New Project"
3. Configure:
   - **Name**: `kusum-beach`
   - **Database Password**: (save this somewhere safe)
   - **Region**: US East (closest to Ghana)
4. Wait for project to initialize (~2 minutes)
5. Go to **Settings** → **Database**
6. Under "Connection string" → Select **URI** tab
7. Copy the connection string (looks like):
   ```
   postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
8. Replace `[PASSWORD]` with your actual database password
9. Save this as your `DATABASE_URL`

## Step 2: Deploy Backend to Render

1. Go to https://render.com and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select `Kusum-Beach-Resort`
4. Configure:
   - **Name**: `kusum-beach-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://...  (from Step 1)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://kusum-beach-frontend.vercel.app
   LOG_LEVEL=info
   ```
6. Click "Create Web Service"
7. Wait for deployment (2-3 minutes)
8. Copy your API URL (e.g., `https://kusum-beach-api.onrender.com`)

### Run Database Migration on Render
After deployment, run migration once via Render Shell:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Step 3: Deploy Frontend to Vercel

### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com and sign up (free)
2. Click "Add New" → "Project"
3. Import `Kusum-Beach-Resort` from GitHub
4. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   ```
   VITE_API_URL=https://kusum-beach-api.onrender.com/api/v1
   ```
6. Click "Deploy"

### Option B: Via Vercel CLI
```bash
cd client
npm i -g vercel
vercel
# Follow prompts, set VITE_API_URL in dashboard after
```

## Step 4: Update CORS on Render

After Vercel deployment:
1. Go back to Render dashboard
2. Update `CORS_ORIGIN` environment variable:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
3. Redeploy (automatic on env change)

## Step 5: Verify Deployment

1. Visit your Vercel URL (e.g., `https://kusum-beach.vercel.app`)
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Test creating a product, making an order

## Environment Variables Reference

### Backend (Render)
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default |
| `DATABASE_URL` | `postgresql://...` | From Neon/Supabase |
| `JWT_SECRET` | Any random string | Min 32 chars |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `CORS_ORIGIN` | `https://*.vercel.app` | Your Vercel URL |
| `LOG_LEVEL` | `info` | Debug level |

### Frontend (Vercel)
| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://kusum-beach-api.onrender.com/api/v1` | Your Render URL |

## Free Tier Limitations

### Render (Free)
- Server spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month (shared across all services)
- **Solution**: Use UptimeRobot (free) to ping every 5 minutes

### Vercel (Free)
- 100 GB bandwidth/month
- Serverless function execution limits
- More than enough for MVP demo

### Supabase (Free)
- 500 MB database storage
- Unlimited API requests
- More than enough for MVP demo

## Keep Render Alive (Optional)

To prevent cold starts, use a free uptime monitor:
1. Go to https://uptimerobot.com
2. Add HTTP monitor
3. URL: `https://kusum-beach-api.onrender.com/health`
4. Interval: 5 minutes

## Custom Domain (Optional)

If you have a domain (e.g., `pos.kusumbeach.com`):
1. **Vercel**: Settings → Domains → Add `pos.kusumbeach.com`
2. **Render**: Settings → Custom Domains → Add `api.kusumbeach.com`
3. Update DNS records as instructed

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Ensure migration has run: `npx prisma migrate deploy`
- Check Render logs for errors

### Frontend can't connect to API
- Verify VITE_API_URL is set correctly
- Check CORS_ORIGIN on Render matches your Vercel URL
- Check browser console for CORS errors

### Database connection errors
- Verify DATABASE_URL format
- Ensure database allows connections from anywhere (Neon does by default)
- Check SSL mode is set: `?sslmode=require`

## Cost Summary

| Service | Free Tier | MVP Usage | Cost |
|---------|-----------|-----------|------|
| Vercel | 100GB bandwidth | ~1GB | $0 |
| Render | 750 hours/month | ~100 hours | $0 |
| Supabase | 500MB storage | ~50MB | $0 |
| **Total** | | | **$0/month** |

## Production Upgrade Path

When ready to go live:
1. **Render Starter**: $7/month (no cold starts)
2. **Supabase Pro**: $25/month (8GB storage, backups)
3. **Vercel Pro**: $20/month (more bandwidth)
4. **Total**: ~$52/month for production

---

**Support**: tech@arthiumlabs.com
