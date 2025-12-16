# Render Deployment Guide

## Overview

This guide walks you through deploying the MCP Connector Platform to Render, a modern cloud platform with free tier support.

## Prerequisites

- Render account (https://render.com)
- GitHub account with this repository
- OpenAI API key (for AI Reviewer feature)

## Deployment Steps

### Step 1: Fork/Push Repository to GitHub

Ensure your repository is on GitHub:

```bash
git remote add origin https://github.com/yourusername/mcp-connector-platform.git
git push -u origin master
```

### Step 2: Connect GitHub to Render

1. Go to https://render.com
2. Click "New +" → "Blueprint"
3. Select "Public Git repository"
4. Enter your repository URL: `https://github.com/yourusername/mcp-connector-platform`
5. Click "Connect"

### Step 3: Configure Services

Render will automatically detect the `render.yaml` file and show you the services to deploy:

- **mcp-postgres** - PostgreSQL database
- **mcp-backend** - Express API server
- **mcp-frontend** - React admin UI
- **mcp-runtime** - MCP protocol server

Click "Deploy" to create all services.

### Step 4: Set Environment Variables

After deployment starts, you need to set the `OPENAI_API_KEY`:

1. Go to the **mcp-backend** service
2. Click "Environment"
3. Add environment variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your OpenAI API key (from https://platform.openai.com/api-keys)
4. Click "Save"

The service will automatically redeploy with the new variable.

### Step 5: Verify Deployment

Once all services are deployed (green status):

1. **Backend API** - Click the URL for mcp-backend
   - Should show: `{"status":"ok","timestamp":"..."}`
   - Full URL: `https://mcp-backend-xxx.onrender.com`

2. **Frontend UI** - Click the URL for mcp-frontend
   - Should show the MCP Connector Platform admin interface
   - Full URL: `https://mcp-frontend-xxx.onrender.com`

3. **MCP Runtime** - Click the URL for mcp-runtime
   - Should show: `{"status":"ok","timestamp":"..."}`
   - Full URL: `https://mcp-runtime-xxx.onrender.com`

### Step 6: Test the Platform

1. Open the frontend URL in your browser
2. Create a new connector:
   - Name: "Test API"
   - OpenAPI URL: `https://petstore.swagger.io/v2/swagger.json`
   - Base URL: `https://petstore.swagger.io/v2`
   - Auth Type: API Key
   - Auth Secret: (any value for demo)
3. Select endpoints and deploy
4. Get the MCP URL and token

### Step 7: Test with Claude

1. In Claude, go to Custom Connectors
2. Add new connector:
   - Name: "MCP Connector Platform"
   - URL: Your mcp-runtime URL (e.g., `https://mcp-runtime-xxx.onrender.com`)
   - Authentication: Bearer Token
   - Token: The MCP token from step 6
3. Test by calling a tool

## Service URLs

After deployment, you'll have:

| Service | URL Pattern | Purpose |
|---------|------------|---------|
| Backend API | `https://mcp-backend-xxx.onrender.com` | Control plane API |
| Frontend | `https://mcp-frontend-xxx.onrender.com` | Admin UI |
| MCP Runtime | `https://mcp-runtime-xxx.onrender.com` | MCP server for Claude |
| Database | Internal (PostgreSQL) | Data storage |

## Environment Variables

### Backend (mcp-backend)

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Auto-set from postgres | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes (for AI Reviewer) |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | Yes |

### Frontend (mcp-frontend)

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | Auto-set from backend | Yes |
| `NODE_ENV` | `production` | Yes |

### MCP Runtime (mcp-runtime)

| Variable | Value | Required |
|----------|-------|----------|
| `CONTROL_PLANE_URL` | Auto-set from backend | Yes |
| `MCP_RUNTIME_URL` | Auto-set from runtime | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `4000` | Yes |

## Monitoring

### View Logs

1. Go to each service in Render dashboard
2. Click "Logs" tab
3. View real-time logs

### Health Checks

Services have health checks enabled:
- Backend: `/health`
- MCP Runtime: `/health`

If a service is unhealthy, Render will automatically restart it.

### Metrics

Monitor in Render dashboard:
- CPU usage
- Memory usage
- Request count
- Error rate

## Troubleshooting

### Services Won't Deploy

**Check logs:**
1. Go to service → Logs
2. Look for build errors
3. Common issues:
   - Missing dependencies (run `npm install`)
   - TypeScript errors (run `npm run build` locally)
   - Wrong build command

**Solution:**
```bash
# Test locally first
npm install
npm run build
npm start
```

### Frontend Can't Connect to Backend

**Check environment variable:**
1. Frontend service → Environment
2. Verify `VITE_API_URL` is set correctly
3. Should be the full backend URL

**Solution:**
- Redeploy frontend after backend is ready
- Check CORS headers in backend

### Database Connection Fails

**Check connection string:**
1. Backend service → Environment
2. Verify `DATABASE_URL` is set
3. Should be auto-set from postgres service

**Solution:**
- Wait for postgres service to fully initialize (5-10 minutes)
- Check postgres service logs

### AI Reviewer Not Working

**Check OpenAI API key:**
1. Backend service → Environment
2. Verify `OPENAI_API_KEY` is set
3. Key should be valid and have credits

**Solution:**
- Get new key from https://platform.openai.com/api-keys
- Ensure key has API usage enabled
- Check OpenAI account has credits

## Scaling

### Free Tier Limits

- **Compute:** 0.5 CPU, 512MB RAM per service
- **Database:** 256MB storage
- **Bandwidth:** Unlimited
- **Requests:** Unlimited

For production use, upgrade to paid plans.

### Upgrade to Paid

1. Go to service settings
2. Click "Plan"
3. Select paid tier (Standard, Pro, etc.)
4. Service will automatically scale

## Auto-Deploy

The platform is configured for auto-deploy:
- Push to `master` branch
- Render automatically builds and deploys
- No manual deployment needed

## Rollback

If deployment fails:
1. Go to service → Deployments
2. Click previous successful deployment
3. Click "Redeploy"

## Custom Domain

To use a custom domain:

1. Go to service settings
2. Click "Custom Domain"
3. Enter your domain (e.g., `api.example.com`)
4. Update DNS records as instructed
5. Render will automatically provision SSL certificate

## Backup

### Database Backup

Render automatically backs up PostgreSQL:
1. Go to postgres service
2. Click "Backups"
3. View automatic backups
4. Download backup if needed

### Manual Backup

```bash
# Connect to database
psql $DATABASE_URL

# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Cost Estimation

**Free Tier:**
- 4 services × free = $0/month
- Perfect for development and testing

**Starter Tier (recommended for production):**
- Backend: $7/month
- Frontend: $7/month
- MCP Runtime: $7/month
- Database: $15/month
- **Total: ~$36/month**

## Support

- Render docs: https://render.com/docs
- GitHub issues: Create issue in repository
- Discord: Join Render community

## Next Steps

1. Deploy to Render using this guide
2. Test with sample connector
3. Create your own connectors
4. Configure governance rules
5. Test with Claude Custom Connectors

## License

MIT
