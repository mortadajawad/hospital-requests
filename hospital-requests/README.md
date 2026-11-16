# Hospital Request & Task Manager

## Setup (Step 1: backend, database, auth)

Requirements: Node.js 20+, Docker (for PostgreSQL).

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend
cd server
cp .env.example .env        # then edit JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Test it:

```bash
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"ChangeMe123!"}'
```

## Frontend (next)

```bash
npm create vite@latest client -- --template react
```
