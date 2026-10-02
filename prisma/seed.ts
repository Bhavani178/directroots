/**
 * DirectRoots — Prisma Seed Script
 * Run with: npm run db:seed
 *
 * Creates:
 *  - 2 Farmer accounts (with lat/lng near Bengaluru area)
 *  - 1 Artisan account
 *  - 1 Customer account
 *  - 12 Products spread across all categories
 *  - 2 Sample orders (for delivery map testing)
 */

import { PrismaClient, Role, OrderStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding DirectRoots database...")

  // ── Clean existing data (order matters — children first) ────────────────
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
  console.log("  ✓ Cleared existing data")

  const hash = (pwd: string) => bcrypt.hash(pwd, 10)

  // ── Users ────────────────────────────────────────────────────────────────
  const [farmer1, farmer2, artisan, customer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Rajan Patil",
        email: "farmer@directroots.com",
        password: await hash("farmer123"),
        role: Role.FARMER,
        farmName: "Patil Organic Farms",
        bio: "Third-generation farmer from Badami, growing chemical-free vegetables and fruits for over 20 years. We believe in sustainable farming that nourishes both the soil and the community.",
        profileImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=400&fit=crop",
        address: "Badami, Bagalkot, Karnataka",
        lat: 15.9139,
        lng: 75.6752,
      },
    }),
    prisma.user.create({
      data: {
        name: "Shivamma Reddy",
        email: "farmer2@directroots.com",
        password: await hash("farmer123"),
        role: Role.FARMER,
        farmName: "Shivamma's Orchard",
        bio: "Family orchard specialising in seasonal fruits and traditional varieties that supermarkets don't carry. Our mangoes have been winning local prizes for 10 years.",
        profileImage: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop",
        address: "Ilkal, Bagalkot, Karnataka",
        lat: 15.9609,
        lng: 76.1133,
      },
    }),
    prisma.user.create({
      data: {
        name: "Kaveri Nayak",
        email: "artisan@directroots.com",
        password: await hash("artisan123"),
        role: Role.ARTISAN,
        farmName: "Kaveri Bamboo Crafts",
        bio: "Women-led artisan collective from Badami creating handmade bamboo and cane products using traditional Karnataka craft techniques passed down through generations.",
        profileImage: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=400&fit=crop",
        address: "Badami, Bagalkot, Karnataka",
        lat: 15.9200,
        lng: 75.6800,
      },
    }),
    prisma.user.create({
      data: {
        name: "Arjun Sharma",
        email: "customer@directroots.com",
        password: await hash("customer123"),
        role: Role.CUSTOMER,
        address: "Hubli, Karnataka",
        lat: 15.3647,
        lng: 75.1240,
      },
    }),
  ])
  console.log("  ✓ Created 4 users (2 farmers, 1 artisan, 1 customer)")

  // ── Products ─────────────────────────────────────────────────────────────
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const products = await prisma.product.createMany({
    data: [
      // ── Farmer 1 products ────────────────────────────────────────────────
      {
        farmerId: farmer1.id,
        name: "Organic Tomatoes",
        description: "Vine-ripened organic tomatoes grown without pesticides. Rich flavour from slow-maturing varieties. Perfect for curries, salads, and chutneys.",
        price: 45,
        stock: 80,
        imageUrl: "https://images.unsplash.com/photo-1546470427-227c7369a9b8?w=600&h=600&fit=crop",
        category: "Vegetables",
        unit: "kg",
        harvestDate: daysAgo(2),
        isOrganic: true,
      },
      {
        farmerId: farmer1.id,
        name: "Fresh Green Beans",
        description: "Tender green beans harvested early morning for maximum crunch. Great stir-fried or in sambar.",
        price: 55,
        stock: 40,
        imageUrl: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&h=600&fit=crop",
        category: "Vegetables",
        unit: "kg",
        harvestDate: daysAgo(1),
        isOrganic: true,
      },
      {
        farmerId: farmer1.id,
        name: "Groundnuts (Raw)",
        description: "Sun-dried raw groundnuts from our Karnataka fields. Protein-rich, naturally grown. Great for oil extraction or roasting.",
        price: 90,
        stock: 120,
        imageUrl: "https://images.unsplash.com/photo-1566897819059-db42e135fa69?w=600&h=600&fit=crop",
        category: "Grains & Cereals",
        unit: "kg",
        harvestDate: daysAgo(14),
        isOrganic: false,
      },
      {
        farmerId: farmer1.id,
        name: "Organic Jaggery",
        description: "Traditional chemical-free jaggery made from our farm's fresh sugarcane using wood-fire method. Rich in iron and minerals.",
        price: 95,
        stock: 50,
        imageUrl: "https://images.unsplash.com/photo-1615485925873-7ecbbe90d38b?w=600&h=600&fit=crop",
        category: "Village Products",
        unit: "kg",
        harvestDate: daysAgo(7),
        isOrganic: true,
      },
      {
        farmerId: farmer1.id,
        name: "Cold-Pressed Groundnut Oil",
        description: "Single-press groundnut oil extracted using a wooden expeller (ghana) without heat or chemicals. Retains full aroma and nutrients.",
        price: 220,
        stock: 30,
        imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=600&fit=crop",
        category: "Village Products",
        unit: "litre",
        isOrganic: true,
      },

      // ── Farmer 2 products ────────────────────────────────────────────────
      {
        farmerId: farmer2.id,
        name: "Badami Mangoes",
        description: "Karnataka's famous Badami (Alphonso) variety. Naturally ripened on the tree — no carbide. Intensely sweet with a smooth, fiberless flesh.",
        price: 150,
        stock: 60,
        imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&h=600&fit=crop",
        category: "Fruits",
        unit: "dozen",
        harvestDate: daysAgo(3),
        isOrganic: false,
      },
      {
        farmerId: farmer2.id,
        name: "Pomegranates",
        description: "Juicy Solapur variety pomegranates from our drip-irrigated orchard. Large, deep-red arils with sweet-tart flavour.",
        price: 120,
        stock: 45,
        imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=600&fit=crop",
        category: "Fruits",
        unit: "kg",
        harvestDate: daysAgo(4),
        isOrganic: false,
      },
      {
        farmerId: farmer2.id,
        name: "Chilli Powder (Home Ground)",
        description: "Sun-dried Byadagi chillies hand-ground on a stone grinder. Deep red colour, medium heat, intense aroma — no artificial colour.",
        price: 180,
        stock: 25,
        imageUrl: "https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=600&h=600&fit=crop",
        category: "Spices",
        unit: "kg",
        isOrganic: false,
      },
      {
        farmerId: farmer2.id,
        name: "Jowar (Sorghum)",
        description: "Traditional white jowar from our dry-land fields. Gluten-free, high in fibre. Use for bhakri, porridge, or cattle feed.",
        price: 40,
        stock: 200,
        imageUrl: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&h=600&fit=crop",
        category: "Grains & Cereals",
        unit: "kg",
        harvestDate: daysAgo(30),
        isOrganic: false,
      },

      // ── Artisan products ─────────────────────────────────────────────────
      {
        farmerId: artisan.id,
        name: "Handwoven Bamboo Basket",
        description: "Durable everyday basket woven from locally sourced bamboo strips. No synthetic materials. Ideal for shopping, storage, or gifting. Each piece is unique.",
        price: 320,
        stock: 15,
        imageUrl: "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=600&h=600&fit=crop",
        category: "Handicrafts",
        unit: "piece",
        isHandmade: true,
        craftType: "Bamboo",
      },
      {
        farmerId: artisan.id,
        name: "Cane Fruit Tray",
        description: "Elegant oval serving tray woven from natural cane. Food-safe, sturdy, and lightweight. A beautiful alternative to plastic trays.",
        price: 280,
        stock: 8,
        imageUrl: "https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=600&h=600&fit=crop",
        category: "Handicrafts",
        unit: "piece",
        isHandmade: true,
        craftType: "Bamboo",
      },
      {
        farmerId: artisan.id,
        name: "Natural Beeswax Candles (Set of 4)",
        description: "Hand-poured beeswax candles with cotton wicks. No paraffin, no synthetic fragrance. Warm amber glow and natural honey scent. Burns 2× longer than paraffin.",
        price: 240,
        stock: 20,
        imageUrl: "https://images.unsplash.com/photo-1603905581578-d8b3b43e10c4?w=600&h=600&fit=crop",
        category: "Village Products",
        unit: "piece",
        isHandmade: true,
        craftType: "Other",
      },
    ],
  })
  console.log(`  ✓ Created ${products.count} products`)

  // ── Sample Orders (for delivery map demo) ────────────────────────────────
  // Fetch created products to get real IDs
  const allProducts = await prisma.product.findMany({
    where: { farmerId: { in: [farmer1.id, farmer2.id] } },
    select: { id: true, price: true, farmerId: true },
  })

  const f1Products = allProducts.filter((p) => p.farmerId === farmer1.id)
  const f2Products = allProducts.filter((p) => p.farmerId === farmer2.id)

  // Order 1 — customer buying from farmer1
  const order1 = await prisma.order.create({
    data: {
      userId: customer.id,
      total: 180,
      status: OrderStatus.PREPARING,
      deliveryAddress: "15 Gandhi Nagar, Hubli, Karnataka",
      deliveryLat: 15.3500,
      deliveryLng: 75.1300,
      items: {
        create: [
          { productId: f1Products[0].id, quantity: 2, price: f1Products[0].price },
          { productId: f1Products[1].id, quantity: 1, price: f1Products[1].price },
        ],
      },
    },
  })

  // Order 2 — customer buying from farmer2
  const order2 = await prisma.order.create({
    data: {
      userId: customer.id,
      total: 300,
      status: OrderStatus.PENDING,
      deliveryAddress: "42 Nehru Road, Hubli, Karnataka",
      deliveryLat: 15.3700,
      deliveryLng: 75.1200,
      items: {
        create: [
          { productId: f2Products[0].id, quantity: 2, price: f2Products[0].price },
        ],
      },
    },
  })

  console.log(`  ✓ Created 2 sample orders (IDs: ${order1.id}, ${order2.id})`)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!\n")
  console.log("  Demo accounts:")
  console.log("    Farmer    → farmer@directroots.com     / farmer123")
  console.log("    Farmer 2  → farmer2@directroots.com    / farmer123")
  console.log("    Artisan   → artisan@directroots.com    / artisan123")
  console.log("    Customer  → customer@directroots.com   / customer123")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
