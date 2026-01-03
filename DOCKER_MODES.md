# Docker Modes: Development vs Production

## Development Mode (Hot Reload - See Changes Instantly)

**Use this when actively developing and making frequent changes.**

### Start Development Mode:
```bash
# Stop any running containers first
docker-compose down

# Start in development mode
docker-compose -f docker-compose.dev.yml up --build
```

**Features:**
- Changes to frontend code appear **instantly** (no rebuild needed)
- Vite dev server with hot module replacement
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Backend also has volume mounting for live reload

**Stop:**
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## Production Mode (Static Build - Requires Rebuild)

**Use this for testing production builds or deployment.**

### Start Production Mode:
```bash
# Stop any running containers first
docker-compose down

# Build and start
docker-compose up --build
```

**Features:**
- Optimized, minified production build
- Served via Nginx (faster, more efficient)
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- **Requires rebuild** for every frontend change

**To see changes in production mode:**
```bash
# 1. Rebuild the container
docker-compose build frontend

# 2. Restart the container
docker-compose restart frontend

# 3. Hard refresh browser (Ctrl+Shift+R)
```

**Stop:**
```bash
docker-compose down
```

---

## Quick Reference

| Feature | Development Mode | Production Mode |
|---------|-----------------|-----------------|
| **Command** | `docker-compose -f docker-compose.dev.yml up` | `docker-compose up` |
| **Frontend Port** | 5173 | 3000 |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Rebuild on Change** | ❌ No | ✅ Yes |
| **Performance** | Slower | Faster |
| **Use Case** | Active development | Testing/Deployment |

---

## Troubleshooting

### Changes not showing in browser?
1. Make sure you're using the correct mode
2. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. Clear browser cache
4. Check that the container is running: `docker ps`

### Port already in use?
```bash
# Stop all containers
docker-compose down
docker-compose -f docker-compose.dev.yml down

# Or kill specific port
# On Linux/Mac:
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```
