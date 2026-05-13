import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Leaf,
  Truck,
  Shield,
  MapPin,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { farmers } from "@/lib/data"

const features = [
  {
    icon: Leaf,
    title: "100% Fresh & Organic",
    description:
      "All products are grown locally using sustainable farming practices with no harmful chemicals.",
  },
  {
    icon: Truck,
    title: "Same Day Delivery",
    description:
      "Order before noon and get your fresh produce delivered to your doorstep the same day.",
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description:
      "Every product goes through quality checks. Not satisfied? Get a full refund, no questions asked.",
  },
  {
    icon: MapPin,
    title: "Support Local Farmers",
    description:
      "Your purchase directly supports local farming families and strengthens the community.",
  },
]

const stats = [
  { value: "500+", label: "Local Farmers" },
  { value: "10K+", label: "Happy Customers" },
  { value: "50K+", label: "Products Delivered" },
  { value: "25mi", label: "Delivery Radius" },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-secondary/50 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Leaf className="h-4 w-4" />
                Farm Fresh, Locally Sourced
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                DirectRoots: Hyperlocal Trade for Farmers & Artisans
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                Buy fresh farm produce and handmade village products directly from local farmers and artisans while supporting eco-friendly grouped delivery.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/marketplace">
                  <Button size="lg" className="gap-2">
                    Shop Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/farmer">
                  <Button size="lg" variant="outline">
                    Become a Seller
                  </Button>
                </Link>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative aspect-square overflow-hidden rounded-3xl">
                <Image
                  src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=800&fit=crop"
                  alt="Fresh farm produce"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-card p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Free Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Free delivery on orders above ₹500
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose DirectRoots?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We make it easy to eat fresh, support local, and live sustainably.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-0 bg-secondary/30 text-center"
              >
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      <section className="bg-green-50 py-16 lg:py-20">
  <div className="mx-auto max-w-7xl px-4 lg:px-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold tracking-tight text-green-900">
        Smart Eco Delivery
      </h2>

      <p className="mx-auto mt-4 max-w-2xl text-green-700">
        DirectRoots groups nearby farm pickups and customer deliveries
        together to reduce fuel consumption, delivery costs, and pollution.
      </p>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">
          🚚 Route Grouping
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Nearby farm orders are intelligently grouped into a single delivery route.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">
          🌱 Lower Pollution
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Fewer delivery trips means reduced fuel usage and lower carbon emissions.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">
          ⚡ Faster Local Delivery
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hyperlocal delivery helps customers receive fresher products quickly.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* Featured Farmers Section */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Meet Our Farmers
              </h2>
              <p className="mt-2 text-muted-foreground">
                The passionate people behind your food.
              </p>
            </div>
            <Link href="/marketplace">
              <Button variant="outline" className="gap-2">
                View All Farmers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {farmers.map((farmer) => (
              <Card
                key={farmer.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={farmer.image}
                    alt={farmer.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{farmer.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {farmer.location} • {farmer.distance}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="text-sm font-medium">
                        {farmer.rating}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {farmer.products} products
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to Taste the Difference?
              </h2>
              <p className="mt-4 text-lg opacity-90">
                Join thousands of families who have made the switch to fresh,
                local produce. Start your farm-to-table journey today.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/marketplace">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                  >
                    Start Shopping
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          </div>
        </div>
      </section>
    </div>
  )
}
