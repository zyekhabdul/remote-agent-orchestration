# Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Step 1: Clone and Install
```bash
cd remote-agent-orchestration
npm install
```

### Step 2: Configure
```bash
cp .env.example .env
# Edit .env with your settings (optional for local development)
```

### Step 3: Start Development Server
```bash
npm run dev
```

Server runs on: `http://localhost:3000`
WebSocket on: `ws://localhost:3001`

### Step 4: Test with curl
```bash
# Check health
curl http://localhost:3000/api/v1/health

# Get agents
curl http://localhost:3000/api/v1/agents

# Get status
curl http://localhost:3000/api/v1/status
```

---

## 🧪 Run Examples

### Example 1: Dummy Data
```bash
npm run build
npx ts-node examples/dummy-data.ts
```

Output: Registers 3 dummy agents and submits 3 commands

### Example 2: WebSocket Client
```bash
npx ts-node examples/ws-client.ts
```

Connects to WebSocket and demonstrates client operations

---

## 📊 Running Tests

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

---

## 🐳 Docker Setup

### Build and Run
```bash
npm run docker:build
npm run docker:run
```

### Access Services
- API: http://localhost:3000
- WebSocket: ws://localhost:3001
- Redis: localhost:6379

### Stop
```bash
npm run docker:stop
```

---

## 📖 Learn More

- Full README: `README.md`
- Architecture: `docs/ARCHITECTURE.md`
- API Reference: `docs/API.md`
- Examples: `examples/`

---

## 🆘 Troubleshooting

**Port already in use?**
```bash
lsof -i :3000
kill -9 <PID>
```

**Dependencies issue?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
npm run typecheck
```

---

## 💡 Next Steps

1. ✅ Review `/examples` for usage patterns
2. ✅ Explore API endpoints in `src/api/`
3. ✅ Check event system in `src/core/event_emitter.ts`
4. ✅ Deploy with Docker
5. ✅ Integrate with your agents

Happy orchestrating! 🎉
