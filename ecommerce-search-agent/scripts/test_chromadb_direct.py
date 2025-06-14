#!/usr/bin/env python3
"""
Simple test to verify ChromaDB search works with integer IDs.
"""

import chromadb
from dotenv import load_dotenv

load_dotenv()

def test_chromadb_search():
    """Test ChromaDB search directly."""
    try:
        print("Testing ChromaDB search...")
        
        # Connect to ChromaDB
        client = chromadb.PersistentClient(path="./chroma_db")
        collection = client.get_collection("products")
        
        # Check collection count
        count = collection.count()
        print(f"ChromaDB has {count} products")
        
        # Test search
        results = collection.query(
            query_texts=["wireless headphones"],
            n_results=3
        )
        
        print(f"Search returned {len(results['ids'][0])} results")
        
        # Display results
        for i, (doc_id, metadata, distance) in enumerate(zip(
            results['ids'][0], 
            results['metadatas'][0], 
            results['distances'][0]
        )):
            print(f"Result {i+1}:")
            print(f"  ID: {doc_id} (type: {type(doc_id)})")
            print(f"  Backend ID: {metadata['backend_id']} (type: {type(metadata['backend_id'])})")
            print(f"  Name: {metadata['name']}")
            print(f"  Price: ${metadata['price']}")
            print(f"  Distance: {distance:.4f}")
            print()
        
        return True
        
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_chromadb_search()
