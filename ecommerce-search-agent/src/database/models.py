from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func, Integer, Boolean, Float
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all database models."""


class Category(Base):
    """Category model for product categorization - matches backend schema."""
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # CUID from backend
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image: Mapped[str] = mapped_column(String, nullable=False)
    productCount: Mapped[int] = mapped_column("productCount", Integer, default=0)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    """Product model for e-commerce items - matches backend schema."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    originalPrice: Mapped[Optional[float]] = mapped_column("originalPrice", Float)
    image: Mapped[str] = mapped_column(String, nullable=False)
    images: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    rating: Mapped[float] = mapped_column(Float, default=0)
    reviews: Mapped[int] = mapped_column(Integer, default=0)
    inStock: Mapped[bool] = mapped_column("inStock", Boolean, default=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text)
    features: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    specifications: Mapped[Optional[dict]] = mapped_column(JSONB)
    categoryId: Mapped[str] = mapped_column("categoryId", String, ForeignKey("categories.id"))
    
    # Vector embedding for search
    vector: Mapped[Optional[List[float]]] = mapped_column(ARRAY(Float))
    
    createdAt: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        "updatedAt", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products") 