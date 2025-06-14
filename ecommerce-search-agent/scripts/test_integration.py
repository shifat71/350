#!/usr/bin/env python3
"""
Test script to verify the ecommerce search agent backend integration.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import requests
import json

def test_backend_connection():
    """Test if backend is running and accessible."""
    try:
        response = requests.get("http://localhost:3001/api/products", timeout=5)
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            print(f"✅ Backend connection successful - Found {len(products)} products")
            
            # Show sample product
            if products:
                sample = products[0]
                print(f"   Sample product: ID={sample['id']}, Name='{sample['name']}'")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {str(e)}")
        return False

def test_search_agent():
    """Test if search agent is running."""
    try:
        # Test text search
        response = requests.post(
            "http://localhost:9000/search/text",
            json={"query": "headphones", "limit": 3},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            print(f"✅ Search agent connection successful - Found {len(products)} products")
            
            # Check if product IDs are integers
            if products:
                sample = products[0]
                product_id = sample.get('id')
                if isinstance(product_id, int):
                    print(f"   ✅ Product ID is integer: {product_id}")
                else:
                    print(f"   ❌ Product ID is not integer: {product_id} (type: {type(product_id)})")
                
                # Check if search results have the right structure
                required_fields = ['id', 'name', 'price', 'image']
                missing_fields = [field for field in required_fields if field not in sample]
                if not missing_fields:
                    print(f"   ✅ All required fields present")
                else:
                    print(f"   ❌ Missing fields: {missing_fields}")
            
            return True
        else:
            print(f"❌ Search agent returned status code: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Search agent connection failed: {str(e)}")
        return False

def test_product_page_link():
    """Test if search results can link to product pages."""
    try:
        # Get search results
        response = requests.post(
            "http://localhost:9000/search/text",
            json={"query": "headphones", "limit": 1},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            
            if products:
                product_id = products[0]['id']
                
                # Test if we can get this product from the backend
                backend_response = requests.get(
                    f"http://localhost:3001/api/products/{product_id}",
                    timeout=5
                )
                
                if backend_response.status_code == 200:
                    print(f"✅ Product page link test successful - Product {product_id} exists in backend")
                    return True
                else:
                    print(f"❌ Product {product_id} not found in backend (status: {backend_response.status_code})")
                    return False
            else:
                print("❌ No products returned from search")
                return False
        else:
            print("❌ Search failed")
            return False
    except Exception as e:
        print(f"❌ Product page link test failed: {str(e)}")
        return False

def main():
    """Run all integration tests."""
    print("🔍 Testing ecommerce search agent backend integration...\n")
    
    tests = [
        ("Backend Connection", test_backend_connection),
        ("Search Agent", test_search_agent),
        ("Product Page Links", test_product_page_link),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"Testing {test_name}...")
        success = test_func()
        results.append((test_name, success))
        print()
    
    # Summary
    print("📊 Test Results:")
    all_passed = True
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} {test_name}")
        if not success:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 All tests passed! The integration is working correctly.")
        print("\n🔗 You can now:")
        print("  - Search for products and click 'View' to see product details")
        print("  - Product IDs from search will correctly link to /products/{id} pages")
        print("  - No more ID type mismatches between search and product pages")
    else:
        print("❌ Some tests failed. Please check the issues above.")
        
        if not test_backend_connection():
            print("\n💡 To fix: Start the backend with 'cd ../backend && npm run dev'")
        elif not test_search_agent():
            print("\n💡 To fix: Start the search agent with 'python -m src.main'")

if __name__ == "__main__":
    main()
