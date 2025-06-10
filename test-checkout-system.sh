#!/bin/bash

# Test script for comprehensive checkout and order management system
# This script tests the complete workflow from cart to admin approval

echo "🚀 Starting comprehensive checkout and order management test..."

API_BASE="http://localhost:3001/api"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
USER_EMAIL="testuser@example.com"
USER_PASSWORD="password123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Test 1: Admin Authentication
echo -e "\n${YELLOW}=== Test 1: Admin Authentication ===${NC}"
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | \
  jq -r '.token // empty')

if [ -n "$ADMIN_TOKEN" ]; then
    log_info "Admin authentication successful"
else
    log_error "Admin authentication failed"
    exit 1
fi

# Test 2: User Authentication
echo -e "\n${YELLOW}=== Test 2: User Authentication ===${NC}"
USER_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" | \
  jq -r '.token // empty')

if [ -n "$USER_TOKEN" ]; then
    log_info "User authentication successful"
else
    log_warning "User authentication failed, trying to register..."
    
    # Try to register user
    REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\"}")
    
    if echo "$REGISTER_RESPONSE" | jq -e '.success // false' > /dev/null; then
        log_info "User registration successful"
        # Try login again
        USER_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
          -H "Content-Type: application/json" \
          -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" | \
          jq -r '.token // empty')
        
        if [ -n "$USER_TOKEN" ]; then
            log_info "User login after registration successful"
        else
            log_error "User login after registration failed"
            exit 1
        fi
    else
        log_error "User registration failed"
        exit 1
    fi
fi

# Test 3: Get Products
echo -e "\n${YELLOW}=== Test 3: Get Products ===${NC}"
PRODUCTS_RESPONSE=$(curl -s "$API_BASE/products?limit=5")
PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | jq -r '.products[0].id // empty')

if [ -n "$PRODUCT_ID" ]; then
    log_info "Found product with ID: $PRODUCT_ID"
else
    log_error "No products found"
    exit 1
fi

# Test 4: Add to Cart
echo -e "\n${YELLOW}=== Test 4: Add to Cart ===${NC}"
ADD_CART_RESPONSE=$(curl -s -X POST "$API_BASE/cart/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d "{\"productId\":$PRODUCT_ID,\"quantity\":2}")

if echo "$ADD_CART_RESPONSE" | jq -e '.success // false' > /dev/null; then
    log_info "Added product to cart successfully"
else
    log_error "Failed to add product to cart"
    exit 1
fi

# Test 5: Get Cart
echo -e "\n${YELLOW}=== Test 5: Get Cart ===${NC}"
CART_RESPONSE=$(curl -s "$API_BASE/cart" \
  -H "Authorization: Bearer $USER_TOKEN")

CART_TOTAL=$(echo "$CART_RESPONSE" | jq -r '.total // empty')
if [ -n "$CART_TOTAL" ]; then
    log_info "Cart retrieved successfully. Total: \$$CART_TOTAL"
else
    log_error "Failed to retrieve cart"
    exit 1
fi

# Test 6: Checkout
echo -e "\n${YELLOW}=== Test 6: Checkout ===${NC}"
CHECKOUT_RESPONSE=$(curl -s -X POST "$API_BASE/orders/create-checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "customerInfo": {
      "firstName": "Test",
      "lastName": "User",
      "email": "testuser@example.com",
      "mobile": "+1234567890"
    },
    "shippingAddress": {
      "firstName": "Test",
      "lastName": "User",
      "street": "123 Test Street",
      "city": "Test City",
      "state": "Test State",
      "zipCode": "12345",
      "country": "USA"
    }
  }')

ORDER_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.order.id // empty')
if [ -n "$ORDER_ID" ]; then
    log_info "Checkout successful. Order ID: $ORDER_ID"
else
    log_error "Checkout failed"
    echo "Response: $CHECKOUT_RESPONSE"
    exit 1
fi

# Test 7: Get Orders (Admin)
echo -e "\n${YELLOW}=== Test 7: Get Orders (Admin) ===${NC}"
ORDERS_RESPONSE=$(curl -s "$API_BASE/admin/orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ORDERS_RESPONSE" | jq -e '.success // false' > /dev/null; then
    PENDING_ORDERS=$(echo "$ORDERS_RESPONSE" | jq -r '.orders | map(select(.status == "PENDING")) | length')
    log_info "Retrieved orders successfully. Pending orders: $PENDING_ORDERS"
else
    log_error "Failed to retrieve orders"
    exit 1
fi

# Test 8: Approve Order
echo -e "\n${YELLOW}=== Test 8: Approve Order ===${NC}"
APPROVE_RESPONSE=$(curl -s -X POST "$API_BASE/admin/orders/$ORDER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$APPROVE_RESPONSE" | jq -e '.success // false' > /dev/null; then
    log_info "Order approved successfully"
else
    log_error "Failed to approve order"
    echo "Response: $APPROVE_RESPONSE"
    exit 1
fi

# Test 9: Get Sales Statistics
echo -e "\n${YELLOW}=== Test 9: Get Sales Statistics ===${NC}"
SALES_STATS_RESPONSE=$(curl -s "$API_BASE/admin/analytics/sales" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SALES_STATS_RESPONSE" | jq -e '.success // false' > /dev/null; then
    TOTAL_ORDERS=$(echo "$SALES_STATS_RESPONSE" | jq -r '.stats.totalOrders // 0')
    TOTAL_REVENUE=$(echo "$SALES_STATS_RESPONSE" | jq -r '.stats.totalRevenue // 0')
    log_info "Sales statistics retrieved. Total Orders: $TOTAL_ORDERS, Total Revenue: \$$TOTAL_REVENUE"
else
    log_error "Failed to retrieve sales statistics"
    exit 1
fi

# Test 10: Update Order Status
echo -e "\n${YELLOW}=== Test 10: Update Order Status ===${NC}"
UPDATE_STATUS_RESPONSE=$(curl -s -X PUT "$API_BASE/admin/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "SHIPPED"}')

if echo "$UPDATE_STATUS_RESPONSE" | jq -e '.success // false' > /dev/null; then
    log_info "Order status updated to SHIPPED successfully"
else
    log_error "Failed to update order status"
    exit 1
fi

echo -e "\n${GREEN}🎉 All tests completed successfully!${NC}"
echo -e "${GREEN}The complete checkout and order management system is working correctly.${NC}"

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "✓ Admin authentication"
echo -e "✓ User authentication"
echo -e "✓ Product retrieval"
echo -e "✓ Add to cart"
echo -e "✓ Cart management"
echo -e "✓ Checkout process"
echo -e "✓ Order management"
echo -e "✓ Order approval"
echo -e "✓ Sales statistics"
echo -e "✓ Order status updates"

echo -e "\n${GREEN}All features of the comprehensive checkout and order management system are working!${NC}"
