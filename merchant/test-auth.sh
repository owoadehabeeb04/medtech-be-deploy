#!/bin/bash

echo "=== Testing Merchant API Authentication ==="
echo ""

# Change these to your actual credentials
EMAIL="your@email.com"
PASSWORD="yourpassword"

echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo ""
    echo "❌ Login failed! Please check your credentials."
    exit 1
fi

echo ""
echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

echo "2. Testing Products endpoint..."
PRODUCTS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/merchant/products \
  -H "Authorization: Bearer $TOKEN")

echo "$PRODUCTS_RESPONSE" | jq '.'
echo ""

echo "3. Testing Discounts endpoint..."
DISCOUNTS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/merchant/discounts \
  -H "Authorization: Bearer $TOKEN")

echo "$DISCOUNTS_RESPONSE" | jq '.'
echo ""

echo "4. Testing Settings endpoint..."
SETTINGS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/merchant/settings \
  -H "Authorization: Bearer $TOKEN")

echo "$SETTINGS_RESPONSE" | jq '.'
echo ""

echo "=== Test Complete ==="
