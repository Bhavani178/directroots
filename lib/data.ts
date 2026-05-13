import type { Product } from "./cart-context"

export const mockProducts: Product[] = [
  
  {
    id: "1",
    name: "Fresh Tomatoes",
    price: 20,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1546470427-227c7369a9b8?w=400&h=400&fit=crop",
    farmer: "Patil Farms",
    farmerId: "f1",
    category: "Vegetables",
    description:
      "Fresh tomatoes harvested directly from farms in Badami. Eligible for eco-group delivery.",
    stock: 50,
  },

  {
    id: "2",
    name: "Organic Mangoes",
    price: 120,
    unit: "dozen",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop",
    farmer: "Shivappa Orchards",
    farmerId: "f2",
    category: "Fruits",
    description:
      "Sweet organic mangoes delivered fresh from local orchards.",
    stock: 35,
  },

  {
    id: "3",
    name: "Groundnuts",
    price: 70,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1566897819059-db42e135fa69?w=400&h=400&fit=crop",
    farmer: "Mahesh Farms",
    farmerId: "f3",
    category: "Organic",
    description:
      "Protein-rich groundnuts grown using sustainable farming methods.",
    stock: 40,
  },

  {
    id: "4",
    name: "Bamboo Basket",
    price: 300,
    unit: "piece",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=400&fit=crop",
    farmer: "Lakshmi Handicrafts",
    farmerId: "f4",
    category: "Handicrafts",
    description:
      "Handmade bamboo basket crafted by rural artisans.",
    stock: 15,
  },

  {
    id: "5",
    name: "Organic Jaggery",
    price: 90,
    unit: "kg",
    image:
      "https://images.unsplash.com/photo-1615485925873-7ecbbe90d38b?w=400&h=400&fit=crop",
    farmer: "Village Naturals",
    farmerId: "f5",
    category: "Village Products",
    description:
      "Traditional chemical-free jaggery made from fresh sugarcane.",
    stock: 25,
  },
]


export const categories = [
  "All",
  "Vegetables",
  "Fruits",
  "Organic",
  "Handicrafts",
  "Village Products",
  "Dairy",
]


 export const farmers = [
  {
    id: "f1",
    name: "Patil Farms",
    location: "Badami, Karnataka",
    distance: "3 km",
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=400&fit=crop",
    rating: 4.9,
    products: 18,
    description:
      "Family-owned farm supplying fresh vegetables directly to customers.",
  },

  {
    id: "f2",
    name: "Shivappa Orchards",
    location: "Bagalkot, Karnataka",
    distance: "7 km",
    image:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop",
    rating: 4.8,
    products: 12,
    description:
      "Local orchard known for naturally grown mangoes and seasonal fruits.",
  },

  {
    id: "f3",
    name: "Mahesh Farms",
    location: "Ilkal, Karnataka",
    distance: "5 km",
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=400&h=400&fit=crop",
    rating: 4.7,
    products: 20,
    description:
      "Sustainable farm producing groundnuts, millets, and organic crops.",
  },

  {
    id: "f4",
    name: "Lakshmi Handicrafts",
    location: "Badami, Karnataka",
    distance: "2 km",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?w=400&h=400&fit=crop",
    rating: 5.0,
    products: 10,
    description:
      "Women-led artisan group creating handmade bamboo and village crafts.",
  },

  {
    id: "f5",
    name: "Village Naturals",
    location: "Hubli, Karnataka",
    distance: "12 km",
    image:
      "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=400&h=400&fit=crop",
    rating: 4.8,
    products: 15,
    description:
      "Traditional village products including jaggery and homemade foods.",
  },
]