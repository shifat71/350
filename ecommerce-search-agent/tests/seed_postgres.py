import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY, FLOAT
from sqlalchemy.ext.declarative import declarative_base
import uuid
import os
from datetime import datetime
from typing import List, Optional
from sqlalchemy.sql import text

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = (
    os.getenv("DATABASE_URL") or
    f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'postgres')}:{os.environ.get('POSTGRES_PASSWORD', 'postgres')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5432')}/{os.environ.get('POSTGRES_DB', 'postgres')}"
)

Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"
    id = Column(PGUUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(PGUUID, ForeignKey("categories.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"
    id = Column(PGUUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(String, nullable=False)
    category_id = Column(PGUUID, ForeignKey("categories.id"))
    stock_quantity = Column(Integer, default=0)
    image_url = Column(Text)
    product_metadata = Column(JSONB)
    embedding = Column(ARRAY(FLOAT), name="vector")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProductFeature(Base):
    __tablename__ = "product_features"
    id = Column(PGUUID, primary_key=True, default=uuid.uuid4)
    product_id = Column(PGUUID, ForeignKey("products.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SearchLog(Base):
    __tablename__ = "search_logs"
    id = Column(PGUUID, primary_key=True, default=uuid.uuid4)
    query = Column(Text, nullable=False)
    query_type = Column(String(20), nullable=False)
    results_count = Column(Integer, nullable=False)
    processing_time_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Drop all tables with CASCADE
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Insert demo categories
        electronics = Category(
            name='Electronics',
            description='Latest gadgets and tech products',
        )
        home = Category(
            name='Home & Garden',
            description='Everything for your home and garden',
        )
        fashion = Category(
            name='Fashion',
            description='Trendy clothing and accessories',
        )
        furniture = Category(
            name='Furniture',
            description='Comfortable and stylish furniture',
        )
        session.add_all([electronics, home, fashion, furniture])
        await session.flush()

        # Insert demo products
        products = [
            Product(
                name='Premium Wireless Headphones',
                price='199.99',
                description='Experience premium sound quality with our latest wireless headphones featuring active noise cancellation, 30-hour battery life, and premium comfort padding.',
                category_id=electronics.id,
                stock_quantity=50,
                image_url='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.8,
                    'reviews': 234,
                    'features': [
                        'Active Noise Cancellation',
                        '30-hour battery life',
                        'Premium comfort padding',
                        'Bluetooth 5.0 connectivity',
                        'Quick charge technology'
                    ],
                    'specifications': {
                        'Battery Life': '30 hours',
                        'Wireless Range': '10 meters',
                        'Weight': '280g',
                        'Charging Time': '2 hours',
                        'Driver Size': '40mm'
                    }
                }
            ),
            Product(
                name='Smart Fitness Watch',
                price='299.99',
                description='Track your fitness goals with this advanced smartwatch featuring heart rate monitoring, GPS tracking, and waterproof design.',
                category_id=electronics.id,
                stock_quantity=30,
                image_url='https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.5,
                    'reviews': 189,
                    'features': [
                        'Heart rate monitoring',
                        'GPS tracking',
                        'Waterproof design',
                        '7-day battery life',
                        'Sleep tracking'
                    ],
                    'specifications': {
                        'Display': '1.4" AMOLED',
                        'Battery Life': '7 days',
                        'Water Resistance': '5ATM',
                        'Connectivity': 'Bluetooth 5.0, WiFi',
                        'Sensors': 'Heart rate, GPS, Accelerometer',
                        'Weight': '45g'
                    }
                }
            ),
            Product(
                name='Ergonomic Office Chair',
                price='149.99',
                description='Stay comfortable during long work hours with this ergonomic office chair featuring lumbar support and adjustable height.',
                category_id=furniture.id,
                stock_quantity=20,
                image_url='https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.6,
                    'reviews': 98,
                    'features': [
                        'Lumbar support',
                        'Adjustable height',
                        'Breathable mesh back',
                        '360-degree swivel',
                        'Padded armrests'
                    ],
                    'specifications': {
                        'Material': 'Mesh/Fabric',
                        'Weight Capacity': '120kg',
                        'Color': 'Black',
                        'Warranty': '2 years'
                    }
                }
            ),
            Product(
                name='Modern Sofa',
                price='499.99',
                description='A stylish and comfortable modern sofa perfect for any living room.',
                category_id=furniture.id,
                stock_quantity=10,
                image_url='https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.7,
                    'reviews': 76,
                    'features': [
                        'High-density foam',
                        'Removable covers',
                        'Solid wood frame',
                        'Easy assembly'
                    ],
                    'specifications': {
                        'Seating Capacity': '3',
                        'Material': 'Fabric/Wood',
                        'Color': 'Gray',
                        'Dimensions': '200x90x85cm'
                    }
                }
            ),
            Product(
                name='Stainless Steel Cookware Set',
                price='89.99',
                description='10-piece stainless steel cookware set for all your kitchen needs.',
                category_id=home.id,
                stock_quantity=40,
                image_url='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.4,
                    'reviews': 120,
                    'features': [
                        'Induction compatible',
                        'Dishwasher safe',
                        'Tempered glass lids',
                        'Oven safe up to 400F'
                    ],
                    'specifications': {
                        'Pieces': '10',
                        'Material': 'Stainless Steel',
                        'Warranty': '5 years'
                    }
                }
            ),
            Product(
                name='Cordless Vacuum Cleaner',
                price='159.99',
                description='Lightweight cordless vacuum cleaner with powerful suction and long battery life.',
                category_id=home.id,
                stock_quantity=25,
                image_url='https://images.unsplash.com/photo-1464983953574-0892a716854b?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.3,
                    'reviews': 87,
                    'features': [
                        'Powerful suction',
                        'Long battery life',
                        'HEPA filter',
                        'Easy to empty dustbin'
                    ],
                    'specifications': {
                        'Battery Life': '40 minutes',
                        'Weight': '2.5kg',
                        'Warranty': '1 year'
                    }
                }
            ),
            Product(
                name="Men's Running Shoes",
                price='79.99',
                description='Lightweight and comfortable running shoes for men, designed for performance.',
                category_id=fashion.id,
                stock_quantity=60,
                image_url='https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.2,
                    'reviews': 150,
                    'features': [
                        'Breathable mesh',
                        'Cushioned sole',
                        'Non-slip grip',
                        'Lightweight design'
                    ],
                    'specifications': {
                        'Material': 'Mesh/Rubber',
                        'Sizes': '7-12',
                        'Color': 'Blue/Black'
                    }
                }
            ),
            Product(
                name="Women's Handbag",
                price='59.99',
                description='Elegant and spacious handbag for women, perfect for daily use.',
                category_id=fashion.id,
                stock_quantity=35,
                image_url='https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.5,
                    'reviews': 110,
                    'features': [
                        'Multiple compartments',
                        'Adjustable strap',
                        'Water-resistant material'
                    ],
                    'specifications': {
                        'Material': 'PU Leather',
                        'Color': 'Red',
                        'Dimensions': '30x12x25cm'
                    }
                }
            ),
            Product(
                name='Bluetooth Speaker',
                price='39.99',
                description='Portable Bluetooth speaker with deep bass and 12-hour playtime.',
                category_id=electronics.id,
                stock_quantity=80,
                image_url='https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.1,
                    'reviews': 210,
                    'features': [
                        'Deep bass',
                        '12-hour playtime',
                        'Water-resistant',
                        'Built-in microphone'
                    ],
                    'specifications': {
                        'Battery Life': '12 hours',
                        'Weight': '500g',
                        'Color': 'Black'
                    }
                }
            ),
            Product(
                name='LED Desk Lamp',
                price='24.99',
                description='Adjustable LED desk lamp with touch controls and USB charging port.',
                category_id=home.id,
                stock_quantity=70,
                image_url='https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&h=500&fit=crop&crop=center',
                product_metadata={
                    'rating': 4.6,
                    'reviews': 95,
                    'features': [
                        'Touch controls',
                        'USB charging port',
                        'Adjustable brightness',
                        'Energy efficient'
                    ],
                    'specifications': {
                        'Power': '8W',
                        'Color': 'White',
                        'Warranty': '18 months'
                    }
                }
            )
        ]
        session.add_all(products)
        await session.commit()
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed()) 