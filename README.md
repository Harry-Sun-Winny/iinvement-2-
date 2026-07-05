# Investment Portfolio Management Platform

Scalable portfolio management platform for web, Android, and iOS.

## Documentation

Design and product specs: **[docs/](docs/README.md)**

| Document | Purpose |
|----------|---------|
| [ERD](docs/database/ERD.md) | Complete database design |
| [User Stories](docs/product/USER_STORIES.md) | Personas, flows, acceptance criteria |
| [News + AI Pipeline](docs/architecture/NEWS_AI_PIPELINE.md) | RSS → summarize → tag → store |
| [MVP Roadmap](docs/product/MVP_ROADMAP.md) | 5-sprint delivery plan |
| [API Scope](docs/api/API_SCOPE.md) | REST endpoint map |
| [Test Strategy](docs/testing/TEST_STRATEGY.md) | Quality gates |
| [AI KPIs](docs/ai/AI_KPI.md) | AI output quality targets |

## Architecture

- `backend`: Java 17 Spring Boot REST API using Clean Architecture, PostgreSQL, Redis, JWT, Flyway, OpenAPI, and validation.
- `frontend`: React/Next.js dashboard client.
- `mobile`: Flutter client shell for Android and iOS.
- `docker-compose.yml`: Local production-like stack wiring PostgreSQL, Redis, backend, and frontend.

## Implementation Order

1. Database schema: `backend/src/main/resources/db/migration/V1__initial_schema.sql`
2. API contracts: `backend/src/main/resources/openapi/investment-api.yaml`
3. Services: `backend/src/main/java/com/acme/investment/application`
4. Frontend: `frontend`
5. Tests: `backend/src/test`, `frontend/__tests__`, `mobile/test`

## Local Development

Backend:

```powershell
cd backend
mvn test
mvn spring-boot:run
```

Frontend:

```powershell
cd frontend
npm install
npm test
npm run dev
```

Mobile:

```powershell
cd mobile
flutter test
flutter run
```

Docker:

```powershell
docker compose up --build
```

## Isolated Run Mode

Use this mode when you want this repo to run alongside another copy of the project without port conflicts.

Ports for this repo:

- Frontend: `3002`
- Backend: shared `8080`
- PostgreSQL / Redis: shared through app `3000` backend

Quick start on Windows:

```powershell
.\start-this-app-isolated.ps1
```

Docker alternative:

```powershell
.\start-this-app-docker.cmd
```

Recommended split when running two app copies side by side:

- Original app: frontend `3000` or `3001`, backend `8080`
- This repo: frontend `3002`, same backend `8080`

Start both project copies from this machine:

```powershell
.\start-both-apps.ps1
```

## Deployment

The backend is packaged as a container and expects PostgreSQL, Redis, JWT secret, and OpenAI API key through environment variables. Production deployments should terminate TLS at an ingress/load balancer, run database migrations during release, and restrict outbound AI/news calls through approved provider integrations.

## Risk Controls

- AI analysis requires citations and source links.
- News summaries require source, publication date, summary, and link.
- Production code does not seed fake financial data.
- JWT protects API endpoints except authentication and OpenAPI docs.
- Validation is applied at request DTO boundaries.

