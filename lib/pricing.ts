// lib/pricing.ts
// Authoritative shared pricing & delivery calculations for DirectRoots

export const FREE_DELIVERY_THRESHOLD = 500
export const STANDARD_DELIVERY_FEE = 40

export interface OrderPricing {
  subtotal: number
  deliveryFee: number
  grandTotal: number
  qualifiesForFreeDelivery: boolean
  amountNeededForFreeDelivery: number
}

export function calculateOrderPricing(
  items: Array<{ price: number | string; quantity: number | string }>
): OrderPricing {
  const rawSubtotal = items.reduce((sum, item) => {
    const p = typeof item.price === "number" ? item.price : parseFloat(String(item.price)) || 0
    const q = typeof item.quantity === "number" ? item.quantity : parseInt(String(item.quantity)) || 0
    return sum + p * q
  }, 0)

  const subtotal = Math.round(rawSubtotal * 100) / 100
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0
  const deliveryFee = qualifiesForFreeDelivery ? 0 : STANDARD_DELIVERY_FEE
  const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100
  const amountNeededForFreeDelivery = qualifiesForFreeDelivery
    ? 0
    : Math.max(0, Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100)

  return {
    subtotal,
    deliveryFee,
    grandTotal,
    qualifiesForFreeDelivery,
    amountNeededForFreeDelivery,
  }
}
