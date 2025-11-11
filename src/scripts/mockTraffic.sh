#!/bin/bash

# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

# Function to cleanly exit
cleanup() {
  echo "Terminating background processes..."
  kill $pid1 $pid2 $pid3
  exit 0
}

# Trap SIGINT (Ctrl+C) to execute the cleanup function
trap cleanup SIGINT

# create account, buy pizzas, logout, login, logout
while true; do
  name=$(head /dev/urandom | tr -dc a-z0-9 | head -c 6)
  response=$(curl -X POST $host/api/auth -d "{\"name\":\"$name\", \"email\":\"$name@jwt.com\", \"password\":\"pass\"}" -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  curl -X POST $host/api/order -d '{"franchiseId": 1, "storeId":1, "items":[{"menuId": 1, "description": "Veggie", "price": 0.0038}]}' -H 'Content-Type: application/json' -H "Authorization: Bearer $token" > /dev/null
  curl -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  response3=$(curl -X PUT $host/api/auth -d "{\"email\":\"$name@jwt.com\", \"password\":\"pass\"}" -H 'Content-Type: application/json')
  token2=$(echo $response3 | jq -r '.token')
  curl -X DELETE $host/api/auth -H "Authorization: Bearer $token2" > /dev/null
  curl -X GET $host/api/crash > /dev/null
  sleep $((RANDOM % 2 + 1))
done &
pid1=$!

# update greeting
while true; do
  response4=$(curl -X PUT $host/api/auth -d "{\"email\":\"a@jwt.com\", \"password\":\"admin\"}" -H 'Content-Type: application/json')
  token3=$(echo $response4 | jq -r '.token')
  sleep 10
  items=$(jq -n '[range(21) | {"menuId":1, "description":"Veggie", "price":0.0038}]')
  curl -X POST $host/api/order -d "{\"franchiseId\": 1, \"storeId\":1, \"items\":$items}" -H 'Content-Type: application/json' -H "Authorization: Bearer $token3"

  sleep $((RANDOM % 9 + 2))
done &
pid2=$!

# reset greeting
while true; do
  curl -X PUT $host/api/auth -d "{\"email\":\"a@jwt.com\", \"password\":\"wrong\"}" -H 'Content-Type: application/json' > /dev/null
  sleep 10
  sleep $((RANDOM % 10 + 1))
done &
pid3=$!


# Wait for the background processes to complete
wait $pid1 $pid2 $pid3