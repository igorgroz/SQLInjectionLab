Clean statr of the lab in docker compose ie build containers and restore intial DB from dump.

docker compose down -v
docker compose up --build
docker exec -i sqlinj-db psql -U sql_lab_user -d sqlinjproject < postgredb/dump.sql