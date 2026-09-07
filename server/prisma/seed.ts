import { PrismaClient, UserRole, ProductUnit, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Kusum Beach database seed...');

  // =============================================
  // CREATE CATEGORIES
  // =============================================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Beer' },
      update: {},
      create: { name: 'Beer', description: 'All beer varieties', icon: '🍺' },
    }),
    prisma.category.upsert({
      where: { name: 'Spirits' },
      update: {},
      create: { name: 'Spirits', description: 'Whiskey, Vodka, Rum, etc.', icon: '🥃' },
    }),
    prisma.category.upsert({
      where: { name: 'Cocktails' },
      update: {},
      create: { name: 'Cocktails', description: 'Mixed drinks', icon: '🍹' },
    }),
    prisma.category.upsert({
      where: { name: 'Soft Drinks' },
      update: {},
      create: { name: 'Soft Drinks', description: 'Non-alcoholic beverages', icon: '🥤' },
    }),
    prisma.category.upsert({
      where: { name: 'Water' },
      update: {},
      create: { name: 'Water', description: 'Bottled water', icon: '💧' },
    }),
    prisma.category.upsert({
      where: { name: 'Juices' },
      update: {},
      create: { name: 'Juices', description: 'Fresh and packaged juices', icon: '🧃' },
    }),
    prisma.category.upsert({
      where: { name: 'Energy Drinks' },
      update: {},
      create: { name: 'Energy Drinks', description: 'Energy and sports drinks', icon: '⚡' },
    }),
    prisma.category.upsert({
      where: { name: 'Mixers' },
      update: {},
      create: { name: 'Mixers', description: 'Tonic, soda, ginger ale, etc.', icon: '🔄' },
    }),
    prisma.category.upsert({
      where: { name: 'Snacks' },
      update: {},
      create: { name: 'Snacks', description: 'Food and snacks', icon: '🍿' },
    }),
    prisma.category.upsert({
      where: { name: 'Wine' },
      update: {},
      create: { name: 'Wine', description: 'Red, white, and sparkling wines', icon: '🍷' },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // =============================================
  // CREATE DEFAULT ADMIN USER
  // =============================================
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Kusum Beach Admin',
      phone: '0244123456',
      email: 'admin@kusumbeach.com',
      role: UserRole.owner,
      isActive: true,
    },
  });

  console.log(`✅ Created admin user (username: admin, password: admin123)`);

  // =============================================
  // CREATE SAMPLE PRODUCTS
  // =============================================
  const products = [
    // Beers (categoryId = 1)
    { name: 'Star Beer', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 20.00, buyingPrice: 12.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Accra Brewery', stockQuantity: 100 },
    { name: 'Club Beer', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 20.00, buyingPrice: 12.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Accra Brewery', stockQuantity: 100 },
    { name: 'Guinness', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 25.00, buyingPrice: 16.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Guinness Ghana', stockQuantity: 60 },
    { name: 'Gulder', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 20.00, buyingPrice: 12.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Accra Brewery', stockQuantity: 60 },
    { name: 'Heineken', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 30.00, buyingPrice: 20.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Heineken Ghana', stockQuantity: 40 },
    { name: 'Budweiser', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 28.00, buyingPrice: 18.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Budweiser Ghana', stockQuantity: 40 },
    { name: 'Castle Milk Stout', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 25.00, buyingPrice: 16.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Guinness Ghana', stockQuantity: 50 },
    { name: 'Eagle Lager', categoryId: 1, unit: ProductUnit.Bottle, sellingPrice: 18.00, buyingPrice: 11.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Accra Brewery', stockQuantity: 80 },
    
    // Spirits (categoryId = 2)
    { name: 'Jameson Whiskey', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 25.00, buyingPrice: 15.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Distell Ghana', stockQuantity: 50 },
    { name: 'Jack Daniels', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 35.00, buyingPrice: 22.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Distell Ghana', stockQuantity: 40 },
    { name: 'Johnnie Walker Black', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 40.00, buyingPrice: 25.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'Distell Ghana', stockQuantity: 30 },
    { name: 'Hennessy VS', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 30.00, buyingPrice: 18.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Distell Ghana', stockQuantity: 35 },
    { name: 'Bacardi Rum', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 20.00, buyingPrice: 12.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Distell Ghana', stockQuantity: 45 },
    { name: 'Absolut Vodka', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 25.00, buyingPrice: 15.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Distell Ghana', stockQuantity: 35 },
    { name: 'Gordon\'s Gin', categoryId: 2, unit: ProductUnit.Shot, sellingPrice: 22.00, buyingPrice: 14.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Distell Ghana', stockQuantity: 35 },
    { name: 'Orijin', categoryId: 2, unit: ProductUnit.Bottle, sellingPrice: 15.00, buyingPrice: 9.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Guinness Ghana', stockQuantity: 50 },
    
    // Cocktails (categoryId = 3)
    { name: 'Pina Colada', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 30.00, buyingPrice: 18.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'In-house', stockQuantity: 0 },
    { name: 'Mojito', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 35.00, buyingPrice: 22.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'In-house', stockQuantity: 0 },
    { name: 'Margarita', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 35.00, buyingPrice: 22.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'In-house', stockQuantity: 0 },
    { name: 'Sex on the Beach', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 40.00, buyingPrice: 25.00, reorderLevel: 8, reorderQuantity: 16, supplier: 'In-house', stockQuantity: 0 },
    { name: 'Long Island', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 45.00, buyingPrice: 28.00, reorderLevel: 8, reorderQuantity: 16, supplier: 'In-house', stockQuantity: 0 },
    { name: 'Strawberry Daiquiri', categoryId: 3, unit: ProductUnit.Glass, sellingPrice: 35.00, buyingPrice: 22.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'In-house', stockQuantity: 0 },
    
    // Soft Drinks (categoryId = 4)
    { name: 'Coca-Cola', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 50, reorderQuantity: 100, supplier: 'Coca-Cola Ghana', stockQuantity: 150 },
    { name: 'Fanta Orange', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 40, reorderQuantity: 80, supplier: 'Coca-Cola Ghana', stockQuantity: 120 },
    { name: 'Sprite', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 40, reorderQuantity: 80, supplier: 'Coca-Cola Ghana', stockQuantity: 120 },
    { name: 'Schweppes Bitter Lemon', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Coca-Cola Ghana', stockQuantity: 60 },
    { name: 'Schweppes Ginger Ale', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Coca-Cola Ghana', stockQuantity: 60 },
    { name: 'Krest', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Coca-Cola Ghana', stockQuantity: 60 },
    { name: 'Pepsi', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 40, reorderQuantity: 80, supplier: 'Pepsi Ghana', stockQuantity: 100 },
    { name: 'Mirinda', categoryId: 4, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Pepsi Ghana', stockQuantity: 80 },
    
    // Water (categoryId = 5)
    { name: 'Voltic Water 500ml', categoryId: 5, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 50, reorderQuantity: 100, supplier: 'Voltic Ghana', stockQuantity: 150 },
    { name: 'Voltic Water 1L', categoryId: 5, unit: ProductUnit.Bottle, sellingPrice: 8.00, buyingPrice: 5.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Voltic Ghana', stockQuantity: 80 },
    { name: 'Voltic Water 1.5L', categoryId: 5, unit: ProductUnit.Bottle, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Voltic Ghana', stockQuantity: 60 },
    { name: 'Nestle Water 500ml', categoryId: 5, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Nestle Ghana', stockQuantity: 80 },
    { name: 'Aqua Safina 500ml', categoryId: 5, unit: ProductUnit.Bottle, sellingPrice: 4.00, buyingPrice: 2.50, reorderLevel: 30, reorderQuantity: 60, supplier: 'Aqua Safina', stockQuantity: 80 },
    
    // Juices (categoryId = 6)
    { name: 'Chivita Orange', categoryId: 6, unit: ProductUnit.Carton, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Chivita Ghana', stockQuantity: 50 },
    { name: 'Chivita Pineapple', categoryId: 6, unit: ProductUnit.Carton, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Chivita Ghana', stockQuantity: 50 },
    { name: 'Chivita Mango', categoryId: 6, unit: ProductUnit.Carton, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Chivita Ghana', stockQuantity: 50 },
    { name: 'Fan Ice', categoryId: 6, unit: ProductUnit.Cup, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Fan Milk', stockQuantity: 70 },
    { name: 'Fan Yoghurt', categoryId: 6, unit: ProductUnit.Cup, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Fan Milk', stockQuantity: 50 },
    { name: 'Fresh Coconut Water', categoryId: 6, unit: ProductUnit.Cup, sellingPrice: 10.00, buyingPrice: 5.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Local Supplier', stockQuantity: 30 },
    { name: 'Fresh Fruit Juice', categoryId: 6, unit: ProductUnit.Glass, sellingPrice: 15.00, buyingPrice: 8.00, reorderLevel: 10, reorderQuantity: 20, supplier: 'In-house', stockQuantity: 0 },
    
    // Energy Drinks (categoryId = 7)
    { name: 'Lucozade', categoryId: 7, unit: ProductUnit.Bottle, sellingPrice: 12.00, buyingPrice: 7.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Lucozade Ghana', stockQuantity: 50 },
    { name: 'Red Bull', categoryId: 7, unit: ProductUnit.Can, sellingPrice: 15.00, buyingPrice: 9.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Red Bull Ghana', stockQuantity: 40 },
    { name: 'Monster Energy', categoryId: 7, unit: ProductUnit.Can, sellingPrice: 18.00, buyingPrice: 11.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Monster Ghana', stockQuantity: 40 },
    { name: 'Predator', categoryId: 7, unit: ProductUnit.Bottle, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Predator Ghana', stockQuantity: 50 },
    
    // Mixers (categoryId = 8)
    { name: 'Tonic Water', categoryId: 8, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Coca-Cola Ghana', stockQuantity: 50 },
    { name: 'Bitter Lemon', categoryId: 8, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Coca-Cola Ghana', stockQuantity: 40 },
    { name: 'Ginger Ale', categoryId: 8, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 15, reorderQuantity: 30, supplier: 'Coca-Cola Ghana', stockQuantity: 40 },
    { name: 'Soda Water', categoryId: 8, unit: ProductUnit.Bottle, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Coca-Cola Ghana', stockQuantity: 50 },
    
    // Snacks (categoryId = 9)
    { name: 'Plantain Chips', categoryId: 9, unit: ProductUnit.Pack, sellingPrice: 10.00, buyingPrice: 6.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Local Supplier', stockQuantity: 50 },
    { name: 'Groundnuts', categoryId: 9, unit: ProductUnit.Pack, sellingPrice: 5.00, buyingPrice: 3.00, reorderLevel: 30, reorderQuantity: 60, supplier: 'Local Supplier', stockQuantity: 70 },
    { name: 'Cookies', categoryId: 9, unit: ProductUnit.Pack, sellingPrice: 8.00, buyingPrice: 5.00, reorderLevel: 20, reorderQuantity: 40, supplier: 'Local Supplier', stockQuantity: 50 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        status: product.stockQuantity > 0 ? ProductStatus.active : ProductStatus.out_of_stock,
      },
    });
  }

  console.log(`✅ Created ${products.length} products`);

  // =============================================
  // CREATE SYSTEM SETTINGS
  // =============================================
  const settings = [
    { settingKey: 'tax_rate', settingValue: '0.00', description: 'Tax rate applied to all sales (VAT/NHIL)' },
    { settingKey: 'default_currency', settingValue: 'GHS', description: 'Currency symbol' },
    { settingKey: 'low_stock_alert_enabled', settingValue: 'true', description: 'Enable/disable low stock alerts' },
    { settingKey: 'alert_check_interval', settingValue: '60', description: 'Minutes between alert checks' },
    { settingKey: 'auto_sync_interval', settingValue: '300', description: 'Seconds between data syncs' },
    { settingKey: 'receipt_footer', settingValue: 'Thank you for visiting Kusum Beach!', description: 'Footer text on receipts' },
    { settingKey: 'business_name', settingValue: 'Kusum Beach Resort', description: 'Business name' },
    { settingKey: 'business_phone', settingValue: '0244123456', description: 'Business phone number' },
    { settingKey: 'business_email', settingValue: 'info@kusumbeach.com', description: 'Business email' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.create({
      data: setting,
    });
  }

  console.log(`✅ Created ${settings.length} system settings`);

  console.log('\n🎉 Kusum Beach database seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('\n⚠️  IMPORTANT: Change the default admin password immediately after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
