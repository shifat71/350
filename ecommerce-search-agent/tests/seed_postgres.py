import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
import uuid
import os
from datetime import datetime

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
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    image = Column(Text)
    productCount = Column(Integer, default=0)
    featured = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    originalPrice = Column(Float)
    image = Column(Text)
    images = Column(JSON)
    rating = Column(Float)
    reviews = Column(Integer)
    inStock = Column(Boolean)
    stock = Column(Integer)
    description = Column(Text)
    features = Column(JSON)
    specifications = Column(JSON)
    category_id = Column(String, ForeignKey("categories.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False)
    password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    user_type = Column(String)
    avatar = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Address(Base):
    __tablename__ = "addresses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    street = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    country = Column(String)
    is_default = Column(Boolean)
    user_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String)
    subtotal = Column(Float)
    tax = Column(Float)
    shipping = Column(Float)
    total = Column(Float)
    user_id = Column(String, ForeignKey("users.id"))
    address_id = Column(String, ForeignKey("addresses.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quantity = Column(Integer)
    price = Column(Float)
    product_id = Column(String, ForeignKey("products.id"))
    order_id = Column(String, ForeignKey("orders.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quantity = Column(Integer)
    user_id = Column(String, ForeignKey("users.id"))
    product_id = Column(String, ForeignKey("products.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rating = Column(Integer)
    title = Column(String)
    comment = Column(Text)
    helpful = Column(Integer)
    verified = Column(Boolean)
    user_id = Column(String, ForeignKey("users.id"))
    product_id = Column(String, ForeignKey("products.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        # Insert demo categories
        electronics = Category(
            name='Electronics',
            description='Latest gadgets and tech products',
            image='https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=300&fit=crop&crop=center',
            productCount=4,
            featured=True,
        )
        home = Category(
            name='Home & Garden',
            description='Everything for your home and garden',
            image='https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&h=300&fit=crop&crop=center',
            productCount=2,
            featured=True,
        )
        fashion = Category(
            name='Fashion',
            description='Trendy clothing and accessories',
            image='https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=500&h=300&fit=crop&crop=center',
            productCount=0,
            featured=True,
        )
        furniture = Category(
            name='Furniture',
            description='Comfortable and stylish furniture',
            image='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=300&fit=crop&crop=center',
            productCount=1,
            featured=False,
        )
        session.add_all([electronics, home, fashion, furniture])
        await session.flush()

        # Insert demo products (using electronics and home categories as example)
        products = [
            Product(
                name='Premium Wireless Headphones',
                price=199.99,
                originalPrice=249.99,
                image='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop'
                ],
                rating=4.8,
                reviews=234,
                inStock=True,
                stock=50,
                description='Experience premium sound quality with our latest wireless headphones featuring active noise cancellation, 30-hour battery life, and premium comfort padding.',
                features=[
                    'Active Noise Cancellation',
                    '30-hour battery life',
                    'Premium comfort padding',
                    'Bluetooth 5.0 connectivity',
                    'Quick charge technology'
                ],
                specifications={
                    'Battery Life': '30 hours',
                    'Wireless Range': '10 meters',
                    'Weight': '280g',
                    'Charging Time': '2 hours',
                    'Driver Size': '40mm'
                },
                category_id=electronics.id,
            ),
            Product(
                name='Smart Fitness Watch',
                price=299,
                image='https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800&h=600&fit=crop'
                ],
                rating=4.5,
                reviews=189,
                inStock=True,
                stock=30,
                description='Track your fitness goals with this advanced smartwatch featuring heart rate monitoring, GPS tracking, and waterproof design.',
                features=[
                    'Heart rate monitoring',
                    'GPS tracking',
                    'Waterproof design',
                    '7-day battery life',
                    'Sleep tracking'
                ],
                specifications={
                    'Display': '1.4" AMOLED',
                    'Battery Life': '7 days',
                    'Water Resistance': '5ATM',
                    'Connectivity': 'Bluetooth 5.0, WiFi',
                    'Sensors': 'Heart rate, GPS, Accelerometer',
                    'Weight': '45g'
                },
                category_id=electronics.id,
            ),
            Product(
                name='Professional Camera Lens',
                price=899,
                image='https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop'
                ],
                rating=4.9,
                reviews=67,
                inStock=False,
                stock=0,
                description='Professional-grade camera lens with exceptional optical quality and versatile focal range for photographers.',
                features=[
                    'Superior optical quality',
                    'Versatile focal range',
                    'Weather-sealed construction',
                    'Fast autofocus'
                ],
                specifications={
                    'Focal Length': '24-70mm',
                    'Aperture': 'f/2.8',
                    'Weight': '805g',
                    'Filter Size': '82mm'
                },
                category_id=electronics.id,
            ),
            Product(
                name='Wireless Mechanical Keyboard',
                price=199,
                image='https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&h=600&fit=crop'
                ],
                rating=4.8,
                reviews=156,
                inStock=True,
                stock=40,
                description='Premium wireless mechanical keyboard with RGB lighting and custom switches.',
                features=[
                    'RGB backlighting',
                    'Custom mechanical switches',
                    'Wireless connectivity',
                    'Long battery life'
                ],
                specifications={
                    'Switch Type': 'Custom Mechanical',
                    'Battery Life': '40 hours',
                    'Connection': 'Wireless 2.4GHz + Bluetooth',
                    'Layout': 'Full-size'
                },
                category_id=electronics.id,
            ),
            Product(
                name='Organic Coffee Beans',
                price=24.99,
                image='https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop'
                ],
                rating=4.3,
                reviews=89,
                inStock=True,
                stock=100,
                description='Premium organic coffee beans sourced directly from sustainable farms.',
                features=[
                    'Organic certified',
                    'Fair trade',
                    'Single origin',
                    'Medium roast'
                ],
                specifications={
                    'Origin': 'Colombia',
                    'Roast Level': 'Medium',
                    'Weight': '1 lb',
                    'Certification': 'Organic, Fair Trade'
                },
                category_id=home.id,
            ),
            Product(
                name='Minimalist Desk Lamp',
                price=89,
                originalPrice=120,
                image='https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=600&fit=crop'
                ],
                rating=4.6,
                reviews=78,
                inStock=True,
                stock=25,
                description='Sleek and modern desk lamp with adjustable brightness and USB charging port.',
                features=[
                    'Adjustable brightness',
                    'USB charging port',
                    'Touch controls',
                    'Energy efficient LED'
                ],
                specifications={
                    'Light Source': 'LED',
                    'Color Temperature': '3000K-6000K',
                    'Power': '12W',
                    'USB Output': '5V/1A'
                },
                category_id=home.id,
            ),
            Product(
                name='Ergonomic Office Chair',
                price=349,
                image='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop&crop=center',
                images=[
                    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
                ],
                rating=4.5,
                reviews=123,
                inStock=True,
                stock=15,
                description='Comfortable ergonomic office chair with lumbar support and adjustable height.',
                features=[
                    'Lumbar support',
                    'Adjustable height',
                    'Breathable mesh',
                    '360-degree swivel'
                ],
                specifications={
                    'Material': 'Mesh and fabric',
                    'Weight Capacity': '300 lbs',
                    'Height Range': '42-46 inches',
                    'Warranty': '5 years'
                },
                category_id=furniture.id,
            ),
        ]
        session.add_all(products)
        await session.commit()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed()) 