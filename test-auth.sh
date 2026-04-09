TEMP=$(curl -s -X POST http://localhost:3000/api/dev/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"iasted@me.com"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['tempPassword'])")
echo "Temp: $TEMP"

curl -i -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"email\":\"iasted@me.com\",\"password\":\"$TEMP\"}"
