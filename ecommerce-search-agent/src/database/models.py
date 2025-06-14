from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID, ARRAY, FLOAT
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all database models."""


class Category(Base):
    """Category model for product categorization."""
    __tablename__ = "categories"

    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    parent_id: Mapped[Optional[UUID]] = mapped_column(PGUUID, ForeignKey("categories.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    parent: Mapped[Optional["Category"]] = relationship(
        "Category", remote_side=[id], backref="children"
    )
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    """Product model for e-commerce items."""
    __tablename__ = "products"

    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    price: Mapped[float] = mapped_column(FLOAT, nullable=False)
    category_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("categories.id"))
    stock_quantity: Mapped[int] = mapped_column(default=0)
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    product_metadata: Mapped[Optional[dict]] = mapped_column(JSONB)
    embedding: Mapped[Optional[List[float]]] = mapped_column(ARRAY(FLOAT), name="vector")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    features: Mapped[List["ProductFeature"]] = relationship(
        "ProductFeature", back_populates="product", cascade="all, delete-orphan"
    )


class ProductFeature(Base):
    """Product feature model for additional product attributes."""
    __tablename__ = "product_features"

    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    product_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("products.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="features")


class SearchLog(Base):
    """Search log model for tracking search queries and performance."""
    __tablename__ = "search_logs"

    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    query_type: Mapped[str] = mapped_column(String(20), nullable=False)
    results_count: Mapped[int] = mapped_column(nullable=False)
    processing_time_ms: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    ) 