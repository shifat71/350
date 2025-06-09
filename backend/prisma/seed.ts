import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in correct order (dependencies first)
  try {
    await prisma.cartItem.deleteMany({});
    await prisma.address.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Cleared existing data');
  } catch (error) {
    console.log('⚠️ Error clearing data:', error instanceof Error ? error.message : String(error));
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      userType: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create categories
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Electronics',
      description: 'Latest gadgets andD tech products',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=300&fit=crop&crop=center',
      productCount: 4,
      featured: true,
    },
  });

  const homeCategory = await prisma.category.create({
    data: {
      name: 'Home & Garden',
      description: 'Everything for your home and garden',
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&h=300&fit=crop&crop=center',
      productCount: 2,
      featured: true,
    },
  });

  const fashionCategory = await prisma.category.create({
    data: {
      name: 'Fashion',
      description: 'Trendy clothing and accessories',
      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=500&h=300&fit=crop&crop=center',
      productCount: 0,
      featured: true,
    },
  });

  const furnitureCategory = await prisma.category.create({
    data: {
      name: 'Furniture',
      description: 'Comfortable and stylish furniture',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=300&fit=crop&crop=center',
      productCount: 1,
      featured: false,
    },
  });

  // Create products
  const products = [
    {
      name: 'Premium Wireless Headphones',
      price: 199.99,
      originalPrice: 249.99,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop'
      ],
      rating: 4.8,
      reviews: 234,
      inStock: true,
      stock: 50,
      description: 'Experience premium sound quality with our latest wireless headphones featuring active noise cancellation, 30-hour battery life, and premium comfort padding.',
      features: [
        'Active Noise Cancellation',
        '30-hour battery life',
        'Premium comfort padding',
        'Bluetooth 5.0 connectivity',
        'Quick charge technology'
      ],
      specifications: {
        'Battery Life': '30 hours',
        'Wireless Range': '10 meters',
        'Weight': '280g',
        'Charging Time': '2 hours',
        'Driver Size': '40mm'
      },
      categoryId: electronicsCategory.id,
    },
    {
      name: 'Smart Fitness Watch',
      price: 299,
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800&h=600&fit=crop'
      ],
      rating: 4.5,
      reviews: 189,
      inStock: true,
      stock: 30,
      description: 'Track your fitness goals with this advanced smartwatch featuring heart rate monitoring, GPS tracking, and waterproof design.',
      features: [
        'Heart rate monitoring',
        'GPS tracking',
        'Waterproof design',
        '7-day battery life',
        'Sleep tracking'
      ],
      specifications: {
        'Display': '1.4" AMOLED',
        'Battery Life': '7 days',
        'Water Resistance': '5ATM',
        'Connectivity': 'Bluetooth 5.0, WiFi',
        'Sensors': 'Heart rate, GPS, Accelerometer',
        'Weight': '45g'
      },
      categoryId: electronicsCategory.id,
    },
    {
      name: 'Professional Camera Lens',
      price: 899,
      image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop'
      ],
      rating: 4.9,
      reviews: 67,
      inStock: false,
      stock: 0,
      description: 'Professional-grade camera lens with exceptional optical quality and versatile focal range for photographers.',
      features: [
        'Superior optical quality',
        'Versatile focal range',
        'Weather-sealed construction',
        'Fast autofocus'
      ],
      specifications: {
        'Focal Length': '24-70mm',
        'Aperture': 'f/2.8',
        'Weight': '805g',
        'Filter Size': '82mm'
      },
      categoryId: electronicsCategory.id,
    },
    {
      name: 'Wireless Mechanical Keyboard',
      price: 199,
      image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&h=600&fit=crop'
      ],
      rating: 4.8,
      reviews: 156,
      inStock: true,
      stock: 40,
      description: 'Premium wireless mechanical keyboard with RGB lighting and custom switches.',
      features: [
        'RGB backlighting',
        'Custom mechanical switches',
        'Wireless connectivity',
        'Long battery life'
      ],
      specifications: {
        'Switch Type': 'Custom Mechanical',
        'Battery Life': '40 hours',
        'Connection': 'Wireless 2.4GHz + Bluetooth',
        'Layout': 'Full-size'
      },
      categoryId: electronicsCategory.id,
    },
    {
      name: 'Organic Coffee Beans',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop'
      ],
      rating: 4.3,
      reviews: 89,
      inStock: true,
      stock: 100,
      description: 'Premium organic coffee beans sourced directly from sustainable farms.',
      features: [
        'Organic certified',
        'Fair trade',
        'Single origin',
        'Medium roast'
      ],
      specifications: {
        'Origin': 'Colombia',
        'Roast Level': 'Medium',
        'Weight': '1 lb',
        'Certification': 'Organic, Fair Trade'
      },
      categoryId: homeCategory.id,
    },
    {
      name: 'Minimalist Desk Lamp',
      price: 89,
      originalPrice: 120,
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=600&fit=crop'
      ],
      rating: 4.6,
      reviews: 78,
      inStock: true,
      stock: 25,
      description: 'Sleek and modern desk lamp with adjustable brightness and USB charging port.',
      features: [
        'Adjustable brightness',
        'USB charging port',
        'Touch controls',
        'Energy efficient LED'
      ],
      specifications: {
        'Light Source': 'LED',
        'Color Temperature': '3000K-6000K',
        'Power': '12W',
        'USB Output': '5V/1A'
      },
      categoryId: homeCategory.id,
    },
    {
      name: 'Ergonomic Office Chair',
      price: 349,
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop&crop=center',
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
      ],
      rating: 4.5,
      reviews: 123,
      inStock: true,
      stock: 15,
      description: 'Comfortable ergonomic office chair with lumbar support and adjustable height.',
      features: [
        'Lumbar support',
        'Adjustable height',
        'Breathable mesh',
        '360-degree swivel'
      ],
      specifications: {
        'Material': 'Mesh and fabric',
        'Weight Capacity': '300 lbs',
        'Height Range': '42-46 inches',
        'Warranty': '5 years'
      },
      categoryId: furnitureCategory.id,
    },
  ];

  for (const productData of products) {
    await prisma.product.create({
      data: productData,
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${products.length} products across 4 categories.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
