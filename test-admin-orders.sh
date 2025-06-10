#!/bin/bash

# Quick test script to verify the admin orders functionality
echo "🔍 Testing Admin Orders Functionality"
echo "====================================="

BASE_URL="http://localhost:3001/api"

# Step 1: Login as admin
echo "1. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')

TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Admin login successful"
    echo "Token: ${TOKEN:0:20}..."
else
    echo "❌ Admin login failed"
    echo "Response: $ADMIN_RESPONSE"
    exit 1
fi

# Step 2: Test orders endpoint
echo ""
echo "2. Testing orders retrieval..."
ORDERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/orders")

if echo "$ORDERS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    ORDER_COUNT=$(echo "$ORDERS_RESPONSE" | jq -r '.orders | length')
    echo "✅ Orders retrieved successfully"
    echo "Found $ORDER_COUNT orders"
    
    # Show first order details if any exist
    if [ "$ORDER_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample order:"
        echo "$ORDERS_RESPONSE" | jq -r '.orders[0] | "ID: \(.id), Status: \(.status), Total: $\(.total)"'
    fi
else
    echo "❌ Orders retrieval failed"
    echo "Response: $ORDERS_RESPONSE"
    exit 1
fi

# Step 3: Test sales statistics
echo ""
echo "3. Testing sales statistics..."
STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/admin/analytics/sales")

if echo "$STATS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    TOTAL_ORDERS=$(echo "$STATS_RESPONSE" | jq -r '.stats.totalOrders')
    PENDING_ORDERS=$(echo "$STATS_RESPONSE" | jq -r '.stats.pendingOrders')
    TOTAL_REVENUE=$(echo "$STATS_RESPONSE" | jq -r '.stats.totalRevenue')
    
    echo "✅ Sales statistics retrieved successfully"
    echo "Total Orders: $TOTAL_ORDERS"
    echo "Pending Orders: $PENDING_ORDERS"
    echo "Total Revenue: \$$TOTAL_REVENUE"
else
    echo "❌ Sales statistics retrieval failed"
    echo "Response: $STATS_RESPONSE"
    exit 1
fi

echo ""
echo "🎉 All admin functionality tests passed!"
echo ""
echo "Frontend URLs to test:"
echo "- Admin Login: http://localhost:3000/admin/login"
echo "- Admin Dashboard: http://localhost:3000/admin/dashboard"
echo "- Order Management: http://localhost:3000/admin/orders"
echo ""
echo "Use credentials: admin@example.com / admin123"
