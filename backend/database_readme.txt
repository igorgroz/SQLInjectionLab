qlinjproject=# \du
                                     List of roles
   Role name   |                         Attributes                         | Member of 
---------------+------------------------------------------------------------+-----------
 igorgrozdanov | Superuser, Create role, Create DB, Replication, Bypass RLS | {}
 sql_lab_user  |                                                            | {}

 

Schema |     Name     | Type  |     Owner     
--------+--------------+-------+---------------
 public | clothes      | table | igorgrozdanov
 public | user_clothes | table | igorgrozdanov
 public | users        | table | igorgrozdanov

sqlinjproject=# select * from users;
 userid |  name   | surname  
--------+---------+----------
      1 | John    | Doe
      2 | Jane    | Smith
      3 | Alice   | Johnson
      4 | Bob     | Brown
      5 | Charlie | Williams
(5 rows)

sqlinjproject=# select * from user_clothes;
 id | userid | clothid 
----+--------+---------
  1 |      1 |       1
 68 |      1 |       5
  3 |      2 |       3
  4 |      2 |       4
  5 |      3 |       5
  6 |      3 |       6
  7 |      4 |       7
  8 |      4 |       8
  9 |      5 |       9
 10 |      5 |      10
 69 |      1 |       8
 42 |      3 |       2
 44 |      3 |       3
 53 |      3 |       7
(14 rows)

sqlinjproject=# select * from clothes;
 clothid | description | color | brand  |   size   | material  
---------+-------------+-------+--------+----------+-----------
       1 | T-Shirt     | Red   | Nike   | M        | Cotton
       2 | Jeans       | Blue  | Levis  | 32       | Denim
       3 | Jacket      | Black | Adidas | L        | Polyester
       4 | Sweater     | Green | Uniqlo | M        | Wool
       5 | Hat         | Black | Puma   | One Size | Cotton
       6 | Scarf       | Red   | Gucci  | One Size | Silk
       7 | Shoes       | White | Adidas | 9        | Leather
       8 | Socks       | Gray  | HM     | M        | Cotton
       9 | Sneakers    | White | Nike   | 10       | Leather
      10 | Shorts      | Black | Zara   | M        | Polyester