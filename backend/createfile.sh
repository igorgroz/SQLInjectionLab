#!/bin/bash

# Define the files
FILES=(
  "index.js"
  "secureRoutes.js"
  "insecureRoutes.js"
  "secureGraphQL.js"
  "insecureGraphQL.js"
  "db.js"
  ".env"
  "package.json"
)

# Loop through files and create if missing
for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    touch "$FILE"
    echo "Created: $FILE"
  else
    echo "Exists: $FILE"
  fi
done
