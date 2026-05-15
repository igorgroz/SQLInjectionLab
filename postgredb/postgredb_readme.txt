Check the db owner. On mac usually the user that is Mac user that created the postgre db for example 
namesurname

>psql -U namesurname -d devseclab                       3s 11:33:53

devseclab=# \du
                                     List of roles
   Role name   |                         Attributes                         | Member of 
---------------+------------------------------------------------------------+-----------
 namesurname | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
 sql_lab_user  |  

To create dump
>pg_dump -U namesurname -h localhost --no-owner --no-privileges -d devseclab > dump.sql

To restore in the db container:
docker exec -i sqlinj-db psql -U sql_lab_user -d devseclab < dump.sql

To verify dump:
docker exec -it sqlinj-db psql -U sql_lab_user -d devseclab

To connect to postgresql inside a container:
psql -U sql_lab_user -d devseclab  