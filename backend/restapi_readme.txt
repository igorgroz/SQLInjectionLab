Vulnerable GET (/users/:userid/clothes):

Uses direct string interpolation in the SQL query, making it vulnerable to SQL injection.
Secure GET (/users/:userid/safe-clothes):

Uses parameterized queries with $1 to prevent SQL injection.
Vulnerable POST (/users/:userid/clothes):

Directly includes userid and clothid in the SQL query, making it vulnerable to SQL injection.
Secure POST (/users/:userid/safe-clothes):

Uses parameterized queries to safely insert data.
Vulnerable PUT (/users/:userid/clothes/:clothid):

Directly includes userid, clothid, and newClothid in the SQL query, leading to SQL injection vulnerability.
Secure PUT (/users/:userid/safe-clothes/:clothid):

Uses parameterized queries to safely update the user's cloth.
Vulnerable DELETE (/users/:userid/clothes/:clothid):

Directly includes userid and clothid in the SQL query, making it vulnerable to SQL injection.
Secure DELETE (/users/:userid/safe-clothes/:clothid):

Uses parameterized queries to safely delete a user's cloth.
How to Test:
Vulnerable Endpoints: Try injecting malicious SQL queries into the userid and clothid parameters, for example:
GET http://localhost:5001/users/1/clothes?userid=1; DELETE FROM user_clothes; --
POST http://localhost:5001/users/1/clothes { "clothid": "1; DROP TABLE user_clothes; --" }
Safe Endpoints: The safe versions (safe-clothes) will not be vulnerable to SQL injection because they use parameterized queries.