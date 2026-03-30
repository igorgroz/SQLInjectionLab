=============================================================
 SQLInjectionLab — Start / Stop / Rebuild Guide
=============================================================

-------------------------------------------------------------
 LOCAL MAC ENVIRONMENT
-------------------------------------------------------------

FIRST TIME / CLEAN START (build containers + restore DB)
  cd <project root>  # where docker-compose.yml lives
  docker compose down -v
  docker compose up --build

NORMAL START (containers already built)
  docker compose up -d

STOP (keep data)
  docker compose down

STOP AND WIPE DATA (full reset incl. DB volumes)
  docker compose down -v

REBUILD A SINGLE SERVICE (e.g. after code change)
  docker compose build frontend
  docker compose up -d frontend

REBUILD ALL
  docker compose down
  docker compose up --build

RESTORE DB FROM DUMP (if DB is empty)
  docker exec -i sqlinj-db psql -U sql_lab_user -d sqlinjproject < postgredb/dump.sql

SHELL INTO A CONTAINER
  docker exec -it sqlinj-db sh
  docker exec -it sqlinj-backend sh
  docker exec -it sqlinj-frontend sh

VIEW LOGS
  docker logs sqlinj-backend --tail 50
  docker logs sqlinj-frontend --tail 50

ACCESS
  Frontend:  http://localhost:3000
  Backend:   http://localhost:5001
  DB:        localhost:5432


-------------------------------------------------------------
 GITHUB CODESPACES
-------------------------------------------------------------

FIRST TIME / CLEAN START
  1. Open repo on GitHub → Code → Codespaces → New codespace
  2. Once Codespace is ready, open the terminal and run:
       docker compose up --build -d
  3. Set ports to public (required after every container restart):
       gh codespace ports visibility 3000:public 5001:public \
         --codespace "$CODESPACE_NAME"
  4. Access via the Codespaces forwarded URLs:
       Frontend:  https://<codespace-name>-3000.app.github.dev
       Backend:   https://<codespace-name>-5001.app.github.dev
  5. Get your exact URLs:
       echo "https://${CODESPACE_NAME}-3000.app.github.dev"
       echo "https://${CODESPACE_NAME}-5001.app.github.dev"

NORMAL START (resuming an existing Codespace)
  docker compose up -d
  gh codespace ports visibility 3000:public 5001:public \
    --codespace "$CODESPACE_NAME"

STOP CONTAINERS (keep Codespace running)
  docker compose down

REBUILD A SINGLE SERVICE
  docker compose build frontend
  docker compose up -d frontend
  gh codespace ports visibility 3000:public 5001:public \
    --codespace "$CODESPACE_NAME"

REBUILD ALL
  docker compose down
  docker compose up --build -d
  gh codespace ports visibility 3000:public 5001:public \
    --codespace "$CODESPACE_NAME"

RESTORE DB FROM DUMP
  docker exec -i sqlinj-db psql -U sql_lab_user -d sqlinjproject < postgredb/dump.sql

VIEW LOGS
  docker logs sqlinj-backend --tail 50
  docker logs sqlinj-frontend --tail 50


-------------------------------------------------------------
 STOPPING / MANAGING CODESPACES  *** PAID ENVIRONMENT ***
-------------------------------------------------------------

Codespaces charges for both COMPUTE (while running) and
STORAGE (while the codespace exists). Always stop or delete
when not in use.

STOP A CODESPACE (stops billing for compute, keeps storage)
  Option A — VS Code: Click the green bottom-left corner →
             "Stop Current Codespace"
  Option B — Browser: github.com/codespaces → find your
             codespace → "..." → Stop codespace
  Option C — CLI:
             gh codespace stop --codespace "$CODESPACE_NAME"

DELETE A CODESPACE (stops all billing, data is lost)
  Option A — Browser: github.com/codespaces → "..." → Delete
  Option B — CLI:
             gh codespace delete --codespace "$CODESPACE_NAME"

LIST ALL YOUR CODESPACES (check what's running/billing)
  gh codespace list

CHECK USAGE AND BILLING
  github.com → Settings → Billing → Codespaces

TIPS TO MINIMISE COST
  - Always stop the Codespace when done, don't just close the tab
  - Set auto-stop timeout: github.com → Settings →
    Codespaces → Default idle timeout (set to 30 min)
  - Delete Codespaces you no longer need
  - Free tier includes 120 core-hours/month on 2-core machines
    (approx 60 hours of active use)


-------------------------------------------------------------
 ENTRA ID (MSAL) — REDIRECT URI REMINDER
-------------------------------------------------------------

When Codespaces creates a new environment the URL changes.
If login redirects fail (AADSTS50011 error) you need to add
the new frontend URL as a redirect URI in Entra:

  Azure Portal → App Registrations → SQLInjFrontend
  → Authentication → Add redirect URI:
  https://<new-codespace-name>-3000.app.github.dev

The localhost URI (http://localhost:3000) covers local Mac
and never needs updating.
