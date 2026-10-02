#!/bin/bash
# ManageRepairStore — development environment setup
# Ported idea from ABAGAS dev-setup.sh, adapted to the MRS dev loop:
# docker compose (postgres) -> pnpm install -> migrations -> demo seed.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    🚀 ManageRepairStore Development Environment Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Step 1: PostgreSQL
echo -e "${YELLOW}📦 Step 1: Starting PostgreSQL with Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

cd "$PROJECT_DIR"
docker compose up -d postgres
echo -e "${GREEN}✓ PostgreSQL is running${NC}\n"

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec mrs-postgres pg_isready -U postgres &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}\n"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 1
done

# Step 2: Backend
echo -e "${YELLOW}📦 Step 2: Installing backend dependencies + running migrations...${NC}"
cd "$PROJECT_DIR/2BACK"
pnpm install
pnpm migration:run
echo -e "${GREEN}✓ Backend ready (schema via migrations)${NC}\n"

# Step 3: Frontend
echo -e "${YELLOW}📦 Step 3: Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/1FRONT"
pnpm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}\n"

# Step 4: Demo data (synthetic)
echo -e "${YELLOW}🌱 Step 4: Seeding synthetic demo data...${NC}"
cd "$PROJECT_DIR/2BACK"
pnpm seed
echo -e "${GREEN}✓ Demo data ready${NC}\n"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}\n"
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   ${YELLOW}Terminal 1 (Backend):${NC}  cd 2BACK && pnpm start:dev"
echo -e "   ${YELLOW}Terminal 2 (Frontend):${NC} cd 1FRONT && pnpm start"
echo ""
echo -e "${BLUE}📝 Configuration:${NC}"
echo -e "   ${YELLOW}Database:${NC} PostgreSQL on localhost:5433 (mrs-postgres container)"
echo -e "   ${YELLOW}Backend:${NC}  http://localhost:3000"
echo -e "   ${YELLOW}Frontend:${NC} http://localhost:4200 (proxies /api to the backend)"
echo -e "   ${YELLOW}Swagger:${NC}  http://localhost:3000/api-docs"
echo -e "   ${YELLOW}Demo logins:${NC} admin@demo.example / clerk@demo.example / bodega@demo.example — password Demo1234!"
echo ""
echo -e "${BLUE}🛑 To stop Docker:${NC} docker compose down"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"