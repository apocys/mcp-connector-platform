# Deployment Guide

## Overview

The MCP Connector Platform consists of three main components that can be deployed together or separately:

1. **Backend (Control Plane API)** - Node.js/Express on port 3000
2. **Frontend (Admin UI)** - React/Vite on port 5173
3. **MCP Runtime** - Node.js/Express on port 4000

## Local Development

### Prerequisites
- Node.js 18+
- npm or pnpm
- PostgreSQL 13+ (optional for local dev)

### Setup

```bash
# Backend
cd backend
npm install
npm run dev
# Runs on http://localhost:3000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173

# MCP Runtime (in another terminal)
cd mcp-runtime
npm install
npm run dev
# Runs on http://localhost:4000
```

### Access
- Admin UI: http://localhost:5173
- Backend API: http://localhost:3000
- MCP Runtime: http://localhost:4000

## Docker Deployment

### Build Images

```bash
# Backend
docker build -t mcp-connector-backend ./backend

# Frontend
docker build -t mcp-connector-frontend ./frontend

# MCP Runtime
docker build -t mcp-connector-runtime ./mcp-runtime
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mcp_connector
      POSTGRES_USER: mcp
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mcp:secure_password@postgres:5432/mcp_connector
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      NODE_ENV: production
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    depends_on:
      - backend

  mcp-runtime:
    build: ./mcp-runtime
    ports:
      - "4000:4000"
    environment:
      CONTROL_PLANE_URL: http://backend:3000
      MCP_RUNTIME_URL: http://localhost:4000
      NODE_ENV: production
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Run

```bash
docker-compose up
```

## Kubernetes Deployment

### Prerequisites
- kubectl configured
- Kubernetes cluster 1.20+
- Helm (optional)

### Create Namespace

```bash
kubectl create namespace mcp-connector
```

### Deploy Backend

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-backend
  namespace: mcp-connector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-backend
  template:
    metadata:
      labels:
        app: mcp-backend
    spec:
      containers:
      - name: backend
        image: mcp-connector-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: openai-api-key
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-backend
  namespace: mcp-connector
spec:
  selector:
    app: mcp-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Deploy Frontend

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-frontend
  namespace: mcp-connector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-frontend
  template:
    metadata:
      labels:
        app: mcp-frontend
    spec:
      containers:
      - name: frontend
        image: mcp-connector-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_URL
          value: http://mcp-backend

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-frontend
  namespace: mcp-connector
spec:
  selector:
    app: mcp-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

### Deploy MCP Runtime

```yaml
# runtime-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-runtime
  namespace: mcp-connector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-runtime
  template:
    metadata:
      labels:
        app: mcp-runtime
    spec:
      containers:
      - name: runtime
        image: mcp-connector-runtime:latest
        ports:
        - containerPort: 4000
        env:
        - name: CONTROL_PLANE_URL
          value: http://mcp-backend
        - name: NODE_ENV
          value: production

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-runtime
  namespace: mcp-connector
spec:
  selector:
    app: mcp-runtime
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: LoadBalancer
```

### Deploy

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f runtime-deployment.yaml
```

## Cloud Platforms

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

### Heroku (Backend)

```bash
# Create app
heroku create mcp-connector-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main
```

### AWS

**Option 1: ECS**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker build -t mcp-backend ./backend
docker tag mcp-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/mcp-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/mcp-backend:latest

# Create ECS task definition and service
```

**Option 2: Lambda**
```bash
# Package backend for Lambda
cd backend
npm run build
zip -r lambda.zip dist node_modules

# Upload to Lambda
aws lambda create-function \
  --function-name mcp-connector-backend \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789:role/lambda-role \
  --handler dist/index.handler \
  --zip-file fileb://lambda.zip
```

## Environment Variables

### Backend

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/mcp_connector

# OpenAI (for AI Reviewer)
OPENAI_API_KEY=sk-...

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# MCP Runtime
MCP_RUNTIME_URL=https://mcp.example.com
```

### Frontend

```env
VITE_API_URL=https://api.example.com
```

### MCP Runtime

```env
CONTROL_PLANE_URL=https://api.example.com
MCP_RUNTIME_URL=https://mcp.example.com
PORT=4000
NODE_ENV=production
```

## Database Setup

### PostgreSQL

```bash
# Create database
createdb mcp_connector

# Run migrations
cd backend
npm run migrate
```

### Backup

```bash
# Backup
pg_dump mcp_connector > backup.sql

# Restore
psql mcp_connector < backup.sql
```

## SSL/TLS

### Self-Signed Certificate

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Let's Encrypt

```bash
# Using Certbot
certbot certonly --standalone -d api.example.com -d mcp.example.com
```

## Monitoring

### Health Checks

```bash
# Backend
curl http://localhost:3000/health

# MCP Runtime
curl http://localhost:4000/health
```

### Logging

```bash
# Docker
docker logs -f mcp-connector-backend

# Kubernetes
kubectl logs -f deployment/mcp-backend -n mcp-connector
```

### Metrics

Use Prometheus + Grafana for monitoring:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-backend'
    static_configs:
      - targets: ['localhost:3000']
```

## Scaling

### Horizontal Scaling

**Backend:**
- Stateless design allows multiple replicas
- Use load balancer to distribute traffic
- Share database connection pool

**MCP Runtime:**
- Can scale independently
- Supports multiple replicas
- Per-connector rate limiting

**Frontend:**
- Static files can be cached
- CDN recommended for global distribution

### Vertical Scaling

- Increase CPU/memory for database
- Increase container resource limits
- Optimize queries and indexes

## Backup & Recovery

### Automated Backups

```bash
# Daily backup script
0 2 * * * pg_dump mcp_connector | gzip > /backups/mcp_$(date +%Y%m%d).sql.gz
```

### Disaster Recovery

1. Restore database from backup
2. Redeploy backend and runtime
3. Verify MCP tokens still valid
4. Test with sample connector

## Security Checklist

- [ ] Enable HTTPS/TLS
- [ ] Use strong database password
- [ ] Rotate API keys regularly
- [ ] Enable database encryption
- [ ] Set up firewall rules
- [ ] Enable audit logging
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable CORS properly
- [ ] Rate limit API endpoints
- [ ] Monitor for suspicious activity

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs mcp-connector-backend

# Verify database connection
psql $DATABASE_URL -c "SELECT 1"

# Check port availability
lsof -i :3000
```

### Frontend can't reach backend
```bash
# Check CORS headers
curl -H "Origin: http://localhost:5173" http://localhost:3000/health

# Verify API URL in env
echo $VITE_API_URL
```

### MCP Runtime not responding
```bash
# Check registration
curl http://localhost:3000/api/connectors

# Verify token
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/mcp/tools/list
```

## License

MIT
