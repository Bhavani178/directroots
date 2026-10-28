// prisma/seed.ts
// Run with: npx tsx prisma/seed.ts

import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // ─── Hash passwords (supports environment variable overrides) ──────────────
  const adminPassword    = process.env.SEED_ADMIN_PASSWORD || "Admin@123"
  const farmerPassword   = process.env.SEED_FARMER_PASSWORD || "Farmer@123"
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD || "Customer@123"

  const adminHash    = await bcrypt.hash(adminPassword,    10)
  const farmerHash   = await bcrypt.hash(farmerPassword,   10)
  const customerHash = await bcrypt.hash(customerPassword, 10)

  // ─── 1. ADMIN ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@directroots.com" },
    update: {},
    create: {
      name: "DirectRoots Admin",
      email: "admin@directroots.com",
      password: adminHash,
      role: "ADMIN",
      bio: "Platform administrator with full access.",
    },
  })
  console.log("✅ Admin created:", admin.email)

  // ─── 2. FARMERS / ARTISANS ───────────────────────────────────────────────────
  const farmerData = [
    {
      name: "Ramesh Patil",
      email: "ramesh@directroots.com",
      role: "FARMER" as const,
      farmName: "Patil Organic Farm",
      bio: "3rd generation farmer from Bidar growing certified organic vegetables and millets since 1995.",
      address: "Bidar, Karnataka",
      lat: 17.9134, lng: 77.5199,
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    },
    {
      name: "Savita Kulkarni",
      email: "savita@directroots.com",
      role: "FARMER" as const,
      farmName: "Kulkarni Dairy Farm",
      bio: "Running a small ethical dairy in Humnabad with 12 desi cows. Fresh milk daily.",
      address: "Humnabad, Bidar District",
      lat: 17.7745, lng: 76.9762,
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    },
    {
      name: "Mahesh Desai",
      email: "mahesh@directroots.com",
      role: "FARMER" as const,
      farmName: "Green Roots Farm",
      bio: "Specialising in exotic vegetables and seasonal fruits. Zero pesticide farming.",
      address: "Bidar, Karnataka",
      lat: 17.9250, lng: 77.5300,
      profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    },
    {
      name: "Laxmi Bai",
      email: "laxmi@directroots.com",
      role: "FARMER" as const,
      farmName: "Laxmi Spice Garden",
      bio: "Growing traditional Karnataka spices and herbs on 5 acres in Basavakalyan.",
      address: "Basavakalyan, Bidar District",
      lat: 17.8740, lng: 76.9510,
      profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    },
    {
      name: "Suresh Reddy",
      email: "suresh@directroots.com",
      role: "FARMER" as const,
      farmName: "Reddy Millet Farm",
      bio: "Millet revolution farmer — jowar, bajra, ragi. Supplying bulk and retail since 2010.",
      address: "Aurad, Bidar District",
      lat: 17.5420, lng: 77.1950,
      profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    },
    {
      name: "Fatima Begum",
      email: "fatima@directroots.com",
      role: "ARTISAN" as const,
      farmName: "Begum Crafts Studio",
      bio: "Master artisan of Bidriware — the 500-year-old zinc-copper craft unique to Bidar.",
      address: "Bidar Old Town, Karnataka",
      lat: 17.9120, lng: 77.5150,
      profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    },
    {
      name: "Prakash Nayak",
      email: "prakash@directroots.com",
      role: "FARMER" as const,
      farmName: "Nayak Fruit Orchards",
      bio: "Seasonal fruit orchard — mangoes, sapota, guava and pomegranate grown naturally.",
      address: "Chitguppa, Bidar District",
      lat: 17.7980, lng: 77.6530,
      profileImage: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&q=80",
    },
    {
      name: "Anand Kadam",
      email: "anand@directroots.com",
      role: "FARMER" as const,
      farmName: "Kadam Organic Grains",
      bio: "Producing heirloom rice and pulse varieties using traditional Deccan farming methods.",
      address: "Udgir, Latur District",
      lat: 18.3930, lng: 77.1190,
      profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
    },
  ]

  const farmers: Record<string, number> = {}
  for (const f of farmerData) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: {
        name: f.name,
        email: f.email,
        password: farmerHash,
        role: f.role,
        farmName: f.farmName,
        bio: f.bio,
        address: f.address,
        lat: f.lat,
        lng: f.lng,
        profileImage: f.profileImage,
      },
    })
    farmers[f.email] = user.id
    console.log(`✅ Farmer/Artisan: ${f.name}`)
  }

  // ─── 3. CUSTOMERS ────────────────────────────────────────────────────────────
  const customerData = [
    { name: "Priya Sharma",    email: "priya@gmail.com",   address: "Bidar, Karnataka",         lat: 17.9200, lng: 77.5250 },
    { name: "Ravi Kumar",      email: "ravi@gmail.com",    address: "Bidar, Karnataka",         lat: 17.9100, lng: 77.5180 },
    { name: "Anjali Desai",    email: "anjali@gmail.com",  address: "Humnabad, Karnataka",      lat: 17.7760, lng: 76.9780 },
    { name: "Kiran Reddy",     email: "kiran@gmail.com",   address: "Basavakalyan, Karnataka",  lat: 17.8720, lng: 76.9490 },
    { name: "Meena Patil",     email: "meena@gmail.com",   address: "Bidar, Karnataka",         lat: 17.9300, lng: 77.5100 },
    { name: "Sanjay Naik",     email: "sanjay@gmail.com",  address: "Bidar, Karnataka",         lat: 17.9050, lng: 77.5220 },
    { name: "Deepa Kulkarni",  email: "deepa@gmail.com",   address: "Aurad, Karnataka",         lat: 17.5450, lng: 77.2010 },
    { name: "Vinod Gowda",     email: "vinod@gmail.com",   address: "Chitguppa, Karnataka",     lat: 17.7960, lng: 77.6510 },
    { name: "Sunita Rao",      email: "sunita@gmail.com",  address: "Bidar, Karnataka",         lat: 17.9180, lng: 77.5280 },
    { name: "Arun Joshi",      email: "arun@gmail.com",    address: "Bidar, Karnataka",         lat: 17.9090, lng: 77.5160 },
  ]

  for (const c of customerData) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        name: c.name,
        email: c.email,
        password: customerHash,
        role: "CUSTOMER",
        address: c.address,
        lat: c.lat,
        lng: c.lng,
      },
    })
    console.log(`✅ Customer: ${c.name}`)
  }

  // ─── 4. PRODUCTS ─────────────────────────────────────────────────────────────
  const R = farmers // alias

  const products = [
    // ── VEGETABLES (Ramesh Patil) ───────────────────────────────────────────────
    { name: "Organic Tomato",         category: "Vegetables", price: 30,  unit: "kg",     stock: 120, isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Fresh vine-ripened organic tomatoes from Bidar. Grown without pesticides.", imageUrl: "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400&q=80" },
    { name: "Red Onion",              category: "Vegetables", price: 25,  unit: "kg",     stock: 200, isOrganic: false, farmerId: R["ramesh@directroots.com"], description: "Fresh red onions directly from the farm. Pungent and flavourful.", imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&q=80" },
    { name: "Potato",                 category: "Vegetables", price: 20,  unit: "kg",     stock: 300, isOrganic: false, farmerId: R["ramesh@directroots.com"], description: "Fresh farm potatoes — perfect for sabzi, fries or curries.", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
    { name: "Brinjal (Eggplant)",     category: "Vegetables", price: 28,  unit: "kg",     stock: 80,  isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Tender purple brinjal, great for bharit and curries.", imageUrl: "https://images.unsplash.com/photo-1659261200833-ec8761558af7?w=400&q=80" },
    { name: "Okra (Lady Finger)",     category: "Vegetables", price: 35,  unit: "kg",     stock: 60,  isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Crisp fresh okra picked daily. Perfect for bhindi masala.", imageUrl: "https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=400&q=80" },
    { name: "Green Capsicum",         category: "Vegetables", price: 40,  unit: "kg",     stock: 50,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Crunchy green bell peppers grown in poly-house.", imageUrl: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80" },
    { name: "Carrot",                 category: "Vegetables", price: 30,  unit: "kg",     stock: 90,  isOrganic: true,  farmerId: R["mahesh@directroots.com"],  description: "Sweet orange carrots packed with beta-carotene.", imageUrl: "https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400&q=80" },
    { name: "Beetroot",               category: "Vegetables", price: 25,  unit: "kg",     stock: 70,  isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Deep red beetroot — great for salads, halwa, and juice.", imageUrl: "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=400&q=80" },
    { name: "Cabbage",                category: "Vegetables", price: 18,  unit: "piece",  stock: 100, isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Fresh firm cabbage heads from Green Roots Farm.", imageUrl: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&q=80" },
    { name: "Fresh Spinach (Palak)",  category: "Vegetables", price: 20,  unit: "bundle", stock: 80,  isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Tender leafy spinach, washed and freshly bundled.", imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80" },
    { name: "Fenugreek (Methi)",      category: "Vegetables", price: 15,  unit: "bundle", stock: 60,  isOrganic: true,  farmerId: R["laxmi@directroots.com"],  description: "Fragrant fresh methi leaves — essential for parathas and dal.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Fresh Coriander",        category: "Vegetables", price: 10,  unit: "bundle", stock: 120, isOrganic: true,  farmerId: R["laxmi@directroots.com"],  description: "Lush green coriander bundles for garnishing and chutney.", imageUrl: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&q=80" },
    { name: "Radish (Mooli)",         category: "Vegetables", price: 20,  unit: "bundle", stock: 40,  isOrganic: false, farmerId: R["ramesh@directroots.com"], description: "Crisp white radish, mild and refreshing in salads.", imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&q=80" },
    { name: "Green Peas (Fresh)",     category: "Vegetables", price: 60,  unit: "kg",     stock: 50,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Freshly shelled green peas — seasonal delight.", imageUrl: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&q=80" },
    { name: "Bitter Gourd (Karela)",  category: "Vegetables", price: 32,  unit: "kg",     stock: 45,  isOrganic: true,  farmerId: R["ramesh@directroots.com"], description: "Farm fresh bitter gourd — a powerhouse of nutrition.", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80" },
    { name: "Bottle Gourd (Lauki)",   category: "Vegetables", price: 20,  unit: "piece",  stock: 60,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Large fresh bottle gourd perfect for kootu and halwa.", imageUrl: "https://images.unsplash.com/photo-1596097150534-6e8b697e2a50?w=400&q=80" },
    { name: "Drumstick (Moringa)",    category: "Vegetables", price: 40,  unit: "bundle", stock: 35,  isOrganic: true,  farmerId: R["mahesh@directroots.com"],  description: "Long fresh drumsticks — great for sambar and stir-fry.", imageUrl: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&q=80" },
    { name: "Cluster Beans (Gavar)",  category: "Vegetables", price: 28,  unit: "kg",     stock: 40,  isOrganic: false, farmerId: R["ramesh@directroots.com"], description: "Tender cluster beans, excellent for sabzi with peanuts.", imageUrl: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&q=80" },
    { name: "Curry Leaves",           category: "Vegetables", price: 10,  unit: "bundle", stock: 100, isOrganic: true,  farmerId: R["laxmi@directroots.com"],  description: "Fresh curry leaves from organic garden. Aromatic and essential.", imageUrl: "https://images.unsplash.com/photo-1601493700631-2851bdda4a94?w=400&q=80" },
    { name: "Sweet Corn",             category: "Vegetables", price: 15,  unit: "piece",  stock: 80,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Fresh sweet corn cobs, perfect roasted or boiled.", imageUrl: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80" },

    // ── FRUITS (Prakash Nayak) ───────────────────────────────────────────────────
    { name: "Alphonso Mango",         category: "Fruits", price: 200, unit: "dozen",  stock: 40,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "The king of mangoes — Alphonso variety from Bidar orchards, naturally ripened.", imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80" },
    { name: "Robusta Banana",         category: "Fruits", price: 40,  unit: "dozen",  stock: 100, isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Ripe yellow Robusta bananas, sweet and energy-rich.", imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80" },
    { name: "Papaya",                 category: "Fruits", price: 30,  unit: "piece",  stock: 60,  isOrganic: true,  farmerId: R["prakash@directroots.com"], description: "Fresh ripe papaya, rich in vitamins and great for digestion.", imageUrl: "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&q=80" },
    { name: "Guava",                  category: "Fruits", price: 50,  unit: "kg",     stock: 70,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Crunchy white-fleshed guava from Nayak orchards.", imageUrl: "https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400&q=80" },
    { name: "Pomegranate",            category: "Fruits", price: 80,  unit: "kg",     stock: 55,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Ruby red Bidar pomegranate — sweet, juicy and packed with antioxidants.", imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80" },
    { name: "Sapota (Chikoo)",        category: "Fruits", price: 60,  unit: "kg",     stock: 45,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Caramel-sweet Chikoo, freshly plucked from the orchard.", imageUrl: "https://images.unsplash.com/photo-1627994227671-de551e89e532?w=400&q=80" },
    { name: "Watermelon",             category: "Fruits", price: 25,  unit: "kg",     stock: 80,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Juicy summer watermelon, sweet and ice-cold refreshing.", imageUrl: "https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400&q=80" },
    { name: "Lemon",                  category: "Fruits", price: 40,  unit: "dozen",  stock: 90,  isOrganic: false, farmerId: R["laxmi@directroots.com"],  description: "Thin-skinned juicy lemons — high in vitamin C.", imageUrl: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400&q=80" },
    { name: "Coconut",                category: "Fruits", price: 30,  unit: "piece",  stock: 60,  isOrganic: false, farmerId: R["mahesh@directroots.com"],  description: "Fresh green tender coconuts — water and white flesh.", imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80" },
    { name: "Custard Apple (Sitafal)",category: "Fruits", price: 70,  unit: "kg",     stock: 30,  isOrganic: true,  farmerId: R["prakash@directroots.com"], description: "Creamy custard apple with tropical sweetness.", imageUrl: "https://images.unsplash.com/photo-1627582893327-bf0c4682e7d8?w=400&q=80" },

    // ── GRAINS & PULSES (Suresh Reddy + Anand Kadam) ────────────────────────────
    { name: "Jowar (Sorghum)",        category: "Grains & Pulses", price: 40,  unit: "kg", stock: 200, isOrganic: true,  farmerId: R["suresh@directroots.com"], description: "Whole grain jowar from Reddy Millet Farm. Gluten-free and nutritious.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Bajra (Pearl Millet)",   category: "Grains & Pulses", price: 35,  unit: "kg", stock: 150, isOrganic: true,  farmerId: R["suresh@directroots.com"], description: "Protein-rich bajra — used for rotis and khichdi.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
    { name: "Ragi (Finger Millet)",   category: "Grains & Pulses", price: 45,  unit: "kg", stock: 130, isOrganic: true,  farmerId: R["suresh@directroots.com"], description: "Iron-rich ragi flour from Deccan farms. Excellent for health.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Sona Masoori Rice",      category: "Grains & Pulses", price: 60,  unit: "kg", stock: 200, isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Light and aromatic Sona Masoori rice — ideal for everyday meals.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
    { name: "Wheat (Gehun)",          category: "Grains & Pulses", price: 30,  unit: "kg", stock: 300, isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Whole wheat grain — ground fresh for flour.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Toor Dal",               category: "Grains & Pulses", price: 90,  unit: "kg", stock: 100, isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Split pigeon peas — the base of every Indian dal.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Chana Dal",              category: "Grains & Pulses", price: 80,  unit: "kg", stock: 90,  isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Split Bengal gram — nutty flavour, high in protein.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Moong Dal",              category: "Grains & Pulses", price: 100, unit: "kg", stock: 80,  isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Split green gram — easy to digest, perfect for khichdi.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Urad Dal",               category: "Grains & Pulses", price: 95,  unit: "kg", stock: 70,  isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Black gram dal — essential for idli batter and dal makhani.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Horse Gram (Kulith)",    category: "Grains & Pulses", price: 70,  unit: "kg", stock: 60,  isOrganic: true,  farmerId: R["suresh@directroots.com"], description: "High-protein ancient legume. Great for rasam and salads.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },

    // ── DAIRY (Savita Kulkarni) ──────────────────────────────────────────────────
    { name: "Fresh Cow Milk",         category: "Dairy", price: 55,  unit: "litre",  stock: 50,  isOrganic: true,  farmerId: R["savita@directroots.com"], description: "Pure A2 cow milk from desi Gir cows. Delivered fresh every morning.", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80" },
    { name: "Natural Curd (Dahi)",    category: "Dairy", price: 60,  unit: "kg",     stock: 30,  isOrganic: true,  farmerId: R["savita@directroots.com"], description: "Thick set curd made from fresh cow milk. Probiotic-rich.", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80" },
    { name: "Farm Butter",            category: "Dairy", price: 180, unit: "250g",   stock: 20,  isOrganic: true,  farmerId: R["savita@directroots.com"], description: "Churned white butter from fresh cream. Pure and unsalted.", imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80" },
    { name: "Desi Ghee",              category: "Dairy", price: 650, unit: "litre",  stock: 15,  isOrganic: true,  farmerId: R["savita@directroots.com"], description: "Pure cow ghee made by the Bilona method. Golden, aromatic.", imageUrl: "https://images.unsplash.com/photo-1631557665668-c23e06e3a7b0?w=400&q=80" },
    { name: "Fresh Paneer",           category: "Dairy", price: 280, unit: "500g",   stock: 25,  isOrganic: true,  farmerId: R["savita@directroots.com"], description: "Soft fresh cottage cheese made from farm milk daily.", imageUrl: "https://images.unsplash.com/photo-1631557665668-c23e06e3a7b0?w=400&q=80" },
    { name: "Buttermilk (Chaas)",     category: "Dairy", price: 20,  unit: "litre",  stock: 40,  isOrganic: false, farmerId: R["savita@directroots.com"], description: "Cool, spiced buttermilk — perfect in summer.", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80" },

    // ── SPICES & HERBS (Laxmi Bai) ─────────────────────────────────────────────
    { name: "Red Chilli Powder",      category: "Spices & Herbs", price: 120, unit: "500g", stock: 60, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Sun-dried and ground Byadagi chilli — rich colour, medium heat.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80" },
    { name: "Turmeric Powder",        category: "Spices & Herbs", price: 80,  unit: "250g", stock: 80, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Pure Erode turmeric — high curcumin content, deep orange.", imageUrl: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&q=80" },
    { name: "Coriander Seeds",        category: "Spices & Herbs", price: 60,  unit: "250g", stock: 70, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Whole coriander seeds — citrusy and fragrant.", imageUrl: "https://images.unsplash.com/photo-1585114709344-1b87e7c32ba4?w=400&q=80" },
    { name: "Cumin Seeds (Jeera)",    category: "Spices & Herbs", price: 90,  unit: "250g", stock: 60, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Aromatic whole cumin seeds for tempering dals and curries.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Fenugreek Seeds (Methi)",category: "Spices & Herbs", price: 50,  unit: "250g", stock: 55, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Slightly bitter methi seeds — used in pickles and spice blends.", imageUrl: "https://images.unsplash.com/photo-1585114709344-1b87e7c32ba4?w=400&q=80" },
    { name: "Black Pepper",           category: "Spices & Herbs", price: 180, unit: "250g", stock: 40, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Whole black pepper — the king of spices from Karnataka hills.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Fresh Ginger",           category: "Spices & Herbs", price: 60,  unit: "250g", stock: 80, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Pungent fresh ginger root — good for teas, curries and health.", imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80" },
    { name: "Fresh Garlic",           category: "Spices & Herbs", price: 50,  unit: "250g", stock: 90, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Bold flavoured garlic bulbs freshly harvested.", imageUrl: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=400&q=80" },
    { name: "Green Cardamom (Elaichi)",category: "Spices & Herbs", price: 350, unit: "100g", stock: 30, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Fragrant green cardamom pods for sweets, chai, and biryani.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },

    // ── OILS & HONEY ────────────────────────────────────────────────────────────
    { name: "Cold-pressed Groundnut Oil", category: "Oils & Honey", price: 220, unit: "litre",  stock: 30, isOrganic: false, farmerId: R["suresh@directroots.com"], description: "Traditional wooden cold-pressed groundnut oil — nutty and unrefined.", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
    { name: "Sesame (Til) Oil",           category: "Oils & Honey", price: 280, unit: "500ml",  stock: 25, isOrganic: false, farmerId: R["suresh@directroots.com"], description: "Cold-pressed sesame oil — rich in antioxidants. Great for cooking.", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
    { name: "Raw Forest Honey",           category: "Oils & Honey", price: 350, unit: "500g",   stock: 20, isOrganic: true,  farmerId: R["mahesh@directroots.com"], description: "Unprocessed raw honey collected from wild forest bees in Bidar.", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80" },
    { name: "Organic Jaggery (Gul)",      category: "Oils & Honey", price: 80,  unit: "500g",   stock: 60, isOrganic: true,  farmerId: R["anand@directroots.com"],  description: "Pure cane jaggery — unrefined natural sweetener with iron.", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80" },
    { name: "Coconut Oil",                category: "Oils & Honey", price: 250, unit: "500ml",  stock: 20, isOrganic: false, farmerId: R["mahesh@directroots.com"], description: "Cold-pressed virgin coconut oil — pure and aromatic.", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
    { name: "Palm Sugar (Tadgola)",       category: "Oils & Honey", price: 120, unit: "500g",   stock: 25, isOrganic: true,  farmerId: R["anand@directroots.com"],  description: "Natural palm sugar — low glycemic, earthy sweet taste.", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80" },

    // ── HANDMADE CRAFTS (Fatima Begum) ──────────────────────────────────────────
    { name: "Bidriware Decorative Bowl",  category: "Handmade Crafts", price: 850,  unit: "piece", stock: 10, isHandmade: true, craftType: "Bidriware", farmerId: R["fatima@directroots.com"], description: "Hand-crafted Bidriware bowl — 500-year-old zinc-copper art form from Bidar.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80" },
    { name: "Bidriware Vase",             category: "Handmade Crafts", price: 1200, unit: "piece", stock: 8,  isHandmade: true, craftType: "Bidriware", farmerId: R["fatima@directroots.com"], description: "Elegant Bidriware flower vase with silver inlay on dark zinc base.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80" },
    { name: "Terracotta Planter Pot",     category: "Handmade Crafts", price: 150,  unit: "piece", stock: 25, isHandmade: true, craftType: "Pottery",   farmerId: R["fatima@directroots.com"], description: "Hand-thrown terracotta pot ideal for home plants and succulents.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80" },
    { name: "Bamboo Fruit Basket",        category: "Handmade Crafts", price: 280,  unit: "piece", stock: 20, isHandmade: true, craftType: "Bamboo",    farmerId: R["fatima@directroots.com"], description: "Handwoven bamboo basket — eco-friendly and sturdy for daily use.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
    { name: "Handloom Cotton Dupatta",    category: "Handmade Crafts", price: 450,  unit: "piece", stock: 15, isHandmade: true, craftType: "Textile",   farmerId: R["fatima@directroots.com"], description: "Handloom woven cotton dupatta in traditional Ilkal design.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
    { name: "Wooden Lacquerware Toy",     category: "Handmade Crafts", price: 200,  unit: "piece", stock: 18, isHandmade: true, craftType: "Woodwork",  farmerId: R["fatima@directroots.com"], description: "Colourful lacquerware wooden toy — traditional Channapatna craft.", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
    { name: "Clay Diya Set (12 pcs)",     category: "Handmade Crafts", price: 80,   unit: "set",   stock: 30, isHandmade: true, craftType: "Pottery",   farmerId: R["fatima@directroots.com"], description: "Hand-made clay diyas — perfect for festivals and home decor.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80" },
    { name: "Brass Ganesha Idol",         category: "Handmade Crafts", price: 650,  unit: "piece", stock: 12, isHandmade: true, craftType: "Metalwork", farmerId: R["fatima@directroots.com"], description: "Hand-cast brass Ganesha idol — auspicious and finely detailed.", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80" },

    // ── DRY FRUITS & NUTS ───────────────────────────────────────────────────────
    { name: "Raw Groundnuts (Moongphali)", category: "Dry Fruits & Nuts", price: 80,  unit: "kg",   stock: 100, isOrganic: false, farmerId: R["suresh@directroots.com"], description: "Fresh roasted groundnuts from the farm — great snack and chutney base.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Cashew (Kaju)",              category: "Dry Fruits & Nuts", price: 650, unit: "500g",  stock: 25,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Premium W320 cashew kernels from Coastal Karnataka.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Walnuts",                    category: "Dry Fruits & Nuts", price: 450, unit: "250g",  stock: 20,  isOrganic: false, farmerId: R["anand@directroots.com"],  description: "Rich in Omega-3, whole walnuts with shell removed.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Sunflower Seeds",            category: "Dry Fruits & Nuts", price: 90,  unit: "250g",  stock: 50,  isOrganic: true,  farmerId: R["suresh@directroots.com"], description: "Hulled sunflower seeds — healthy snack and salad topping.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
    { name: "Raisins (Kishmish)",         category: "Dry Fruits & Nuts", price: 180, unit: "250g",  stock: 35,  isOrganic: false, farmerId: R["prakash@directroots.com"], description: "Plump green raisins sun-dried from fresh grapes.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },

    // ── FLOWERS & PLANTS ────────────────────────────────────────────────────────
    { name: "Marigold Flower Bunch",      category: "Flowers & Plants", price: 30,  unit: "bunch",  stock: 60, isOrganic: false, farmerId: R["mahesh@directroots.com"], description: "Bright yellow-orange marigold bunches for puja and decoration.", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc05?w=400&q=80" },
    { name: "Rose Flower Bunch",          category: "Flowers & Plants", price: 50,  unit: "bunch",  stock: 40, isOrganic: false, farmerId: R["mahesh@directroots.com"], description: "Fresh red roses bundled — perfect for gifting and rituals.", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc05?w=400&q=80" },
    { name: "Jasmine Garland (Mogra)",    category: "Flowers & Plants", price: 40,  unit: "metre",  stock: 30, isOrganic: false, farmerId: R["mahesh@directroots.com"], description: "Fragrant jasmine garland — traditional and fresh.", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc05?w=400&q=80" },
    { name: "Tulsi (Holy Basil) Plant",   category: "Flowers & Plants", price: 60,  unit: "piece",  stock: 25, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Sacred Tulsi plant in an earthen pot — medicinal and auspicious.", imageUrl: "https://images.unsplash.com/photo-1526864470448-0ec8430e7090?w=400&q=80" },
    { name: "Aloe Vera Plant",            category: "Flowers & Plants", price: 80,  unit: "piece",  stock: 20, isOrganic: true,  farmerId: R["laxmi@directroots.com"], description: "Healthy Aloe vera plant — for skin care, juice and home use.", imageUrl: "https://images.unsplash.com/photo-1526864470448-0ec8430e7090?w=400&q=80" },

    // ── PICKLES & PROCESSED ─────────────────────────────────────────────────────
    { name: "Raw Mango Pickle (Avakaya)", category: "Pickles & Processed", price: 120, unit: "500g", stock: 30, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Spicy Andhra-style raw mango pickle in sesame oil. Home-made.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Lime Pickle",                category: "Pickles & Processed", price: 100, unit: "500g", stock: 25, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Tangy sun-cured lime pickle with mustard and chilli.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Mixed Vegetable Pickle",     category: "Pickles & Processed", price: 110, unit: "500g", stock: 20, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Assorted seasonal vegetable pickle in spiced mustard oil.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Tomato Chutney (Jarred)",    category: "Pickles & Processed", price: 90,  unit: "250g", stock: 35, isOrganic: false, farmerId: R["ramesh@directroots.com"], description: "Home-made spiced tomato chutney — goes with everything.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
    { name: "Groundnut Chutney Powder",   category: "Pickles & Processed", price: 80,  unit: "250g", stock: 40, isOrganic: false, farmerId: R["suresh@directroots.com"], description: "Dry peanut-chilli chutney powder — instant dip for idli and dosa.", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80" },
    { name: "Tamarind Paste",             category: "Pickles & Processed", price: 70,  unit: "250g", stock: 45, isOrganic: false, farmerId: R["laxmi@directroots.com"], description: "Pure deseeded tamarind paste — ready to use for sambar and rasam.", imageUrl: "https://images.unsplash.com/photo-1599909631049-b2c8e2a3c2d3?w=400&q=80" },
  ]

  let created = 0
  for (const p of products) {
    await prisma.product.create({
      data: {
        name:        p.name,
        category:    p.category,
        price:       p.price,
        unit:        p.unit,
        stock:       p.stock,
        description: p.description,
        imageUrl:    p.imageUrl,
        isOrganic:   p.isOrganic  ?? false,
        isHandmade:  p.isHandmade ?? false,
        craftType:   p.craftType  ?? null,
        farmerId:    p.farmerId,
      },
    })
    created++
    process.stdout.write(`\r✅ Products created: ${created}/${products.length}`)
  }

  console.log(`\n\n🎉 Seed complete!`)
  console.log(`   Admin:     admin@directroots.com / Admin@123`)
  console.log(`   Farmers:   ramesh@directroots.com ... / Farmer@123`)
  console.log(`   Customers: priya@gmail.com ... / Customer@123`)
  console.log(`   Products:  ${created} products across 10 categories`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
