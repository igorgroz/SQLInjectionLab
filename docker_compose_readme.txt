Clean start of the lab in docker compose ie build containers and restore intial DB from dump.
From the root folder wher docker-compose.yml exist run following

>docker compose down -v
>docker compose up --build

Best is to have the db init to restore from dump on sqlinj-db container start.
To manualy restore db from dump, ensure the containers are up and running then restore DB from dump as its empty
>docker exec -i sqlinj-db psql -U sql_lab_user -d sqlinjproject < postgredb/dump.sql

To go into a shell of a container for example sqlinj-db container run following:
docker exec -it sqlinj-db sh 

In codespace:
cp backend/.env.example backend/.env

