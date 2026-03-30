---
name: "Stripe Payments"
description: "Intégration Stripe complète pour les paiements uniques et récurrents, webhooks, gestion clients"
activation: "stripe, payment, checkout, subscription, invoice, refund, billing"
projects: ["consulat.ga", "digitalium.io", "evenement.ga", "foot.cd"]
---

# Stripe Payment Integration

Skill complet pour intégrer Stripe dans l'ecosysteme OkaTech. Couvre paiements uniques, abonnements, webhooks, et gestion clients.

## Installation et Configuration Initiale

### Dépendances

```bash
npm install stripe @stripe/react-stripe-js @stripe/js
```

### Variables d'environnement

```env
# Public key (sécurisée, peut être exposée)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

# Secret key (JAMAIS exposer)
STRIPE_SECRET_KEY=sk_live_...

# Webhook secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Provider React

```typescript
// src/providers/StripeProvider.tsx
import { loadStripe } from '@stripe/js'
import { Elements } from '@stripe/react-stripe-js'
import type { ReactNode } from 'react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '')

export function StripeProvider({ children }: { children: ReactNode }) {
  return <Elements stripe={stripePromise}>{children}</Elements>
}
```

## Paiements Uniques avec Checkout Sessions

### Créer une session de paiement (Backend)

**Convex (customFunctions):**

```typescript
// convex/payments.ts
import { v } from 'convex/values'
import Stripe from 'stripe'
import { authMutation } from '@/lib/customFunctions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const createCheckoutSession = authMutation({
  args: {
    productId: v.string(),
    quantity: v.optional(v.number()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Récupérer les détails produit (depuis votre base)
    const product = await ctx.db
      .query('products')
      .filter((q) => q.eq(q.field('stripeProductId'), args.productId))
      .first()

    if (!product) throw new Error('Produit non trouvé')

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.stripePriceId,
          quantity: args.quantity || 1,
        },
      ],
      mode: 'payment',
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        userId: user.id,
        documentId: product.documentId || '',
      },
    })

    return { sessionId: session.id }
  },
})
```

**Express (Alternative):**

```typescript
// routes/payments.ts
import express from 'express'
import Stripe from 'stripe'
import { requireAuth } from '@/middleware/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const router = express.Router()

router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { productId, quantity, successUrl, cancelUrl } = req.body
    const userId = req.user.id

    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: productId,
          quantity: quantity || 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    })

    res.json({ sessionId: session.id })
  } catch (error) {
    res.status(500).json({ error: 'Erreur création session' })
  }
})

export default router
```

### Redirection vers Checkout

```typescript
// src/hooks/useStripeCheckout.ts
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { loadStripe } from '@stripe/js'

export function useStripeCheckout() {
  const createCheckout = useMutation(api.payments.createCheckoutSession)

  const handleCheckout = async (
    productId: string,
    quantity?: number
  ) => {
    try {
      const { sessionId } = await createCheckout({
        productId,
        quantity,
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/payment-cancelled`,
      })

      const stripe = await loadStripe(
        import.meta.env.VITE_STRIPE_PUBLIC_KEY!
      )
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Erreur checkout:', error)
    }
  }

  return { handleCheckout }
}
```

### Composant Checkout Button

```tsx
// src/components/payment/CheckoutButton.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  productId: string
  quantity?: number
  children?: React.ReactNode
}

export function CheckoutButton({
  productId,
  quantity = 1,
  children = 'Payer maintenant',
}: CheckoutButtonProps) {
  const { handleCheckout } = useStripeCheckout()
  const [loading, setLoading] = useState(false)

  const onClickPay = async () => {
    setLoading(true)
    try {
      await handleCheckout(productId, quantity)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={onClickPay} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}
```

## Abonnements Récurrents

### Créer un abonnement

```typescript
// convex/subscriptions.ts
export const createSubscription = authMutation({
  args: {
    priceId: v.string(),
    // Pour auto-renouvellement
    autoRenew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Créer ou récupérer le client Stripe
    let customerId: string
    const existingCustomer = await ctx.db
      .query('stripeCustomers')
      .filter((q) => q.eq(q.field('userId'), user.id))
      .first()

    if (existingCustomer) {
      customerId = existingCustomer.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await ctx.db.insert('stripeCustomers', {
        userId: user.id,
        stripeCustomerId: customerId,
        email: user.email,
      })
    }

    // Créer l'abonnement
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: args.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { userId: user.id },
    })

    // Sauvegarder en base
    await ctx.db.insert('subscriptions', {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: args.priceId,
      status: subscription.status,
      createdAt: new Date().toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    }
  },
})
```

### Annuler un abonnement

```typescript
export const cancelSubscription = authMutation({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Vérifier propriété
    const subscription = await ctx.db
      .query('subscriptions')
      .filter((q) => q.eq(q.field('stripeSubscriptionId'), args.subscriptionId))
      .first()

    if (!subscription || subscription.userId !== user.id) {
      throw new Error('Abonnement non trouvé ou non autorisé')
    }

    const cancelled = await stripe.subscriptions.cancel(args.subscriptionId)

    // Mettre à jour en base
    await ctx.db.patch(subscription._id, {
      status: 'canceled',
      cancelledAt: new Date().toISOString(),
    })

    return { status: cancelled.status }
  },
})
```

## Webhooks

### Vérification de signature et traitement

**Convex (httpAction):**

```typescript
// convex/webhooks.ts
import { httpAction } from './_generated/server'
import { v } from 'convex/values'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export const handleStripeWebhook = httpAction(
  v.object({ body: v.bytes(), headers: v.object({}) }),
  async (ctx, args) => {
    const signature = args.headers['stripe-signature'] as string

    if (!signature) {
      return new Response('Signature manquante', { status: 400 })
    }

    let event: Stripe.Event

    try {
      const body = new TextDecoder().decode(args.body)
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Erreur webhook signature:', err)
      return new Response('Signature invalide', { status: 403 })
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(ctx, event.data.object)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(ctx, event.data.object)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(ctx, event.data.object)
          break

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(ctx, event.data.object)
          break

        case 'charge.refunded':
          await handleChargeRefunded(ctx, event.data.object)
          break
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
      })
    } catch (error) {
      console.error('Erreur traitement webhook:', error)
      return new Response('Erreur traitement', { status: 500 })
    }
  }
)

async function handlePaymentSucceeded(
  ctx: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const userId = paymentIntent.metadata?.userId
  if (!userId) return

  await ctx.db.insert('payments', {
    userId,
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'succeeded',
    metadata: paymentIntent.metadata,
    createdAt: new Date(paymentIntent.created * 1000).toISOString(),
  })
}

async function handleSubscriptionUpdated(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const sub = await ctx.db
    .query('subscriptions')
    .filter((q) =>
      q.eq(q.field('stripeSubscriptionId'), subscription.id)
    )
    .first()

  if (sub) {
    await ctx.db.patch(sub._id, {
      status: subscription.status,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
  }
}

async function handleSubscriptionDeleted(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const sub = await ctx.db
    .query('subscriptions')
    .filter((q) =>
      q.eq(q.field('stripeSubscriptionId'), subscription.id)
    )
    .first()

  if (sub) {
    await ctx.db.patch(sub._id, {
      status: 'canceled',
      cancelledAt: new Date().toISOString(),
    })
  }
}

async function handleInvoicePaymentSucceeded(
  ctx: any,
  invoice: Stripe.Invoice
) {
  // Marquer facture comme payée
  console.log('Facture payée:', invoice.id)
}

async function handleChargeRefunded(ctx: any, charge: Stripe.Charge) {
  const payment = await ctx.db
    .query('payments')
    .filter((q) => q.eq(q.field('stripePaymentIntentId'), charge.payment_intent))
    .first()

  if (payment) {
    await ctx.db.patch(payment._id, {
      status: 'refunded',
      refundedAmount: charge.refunded,
      refundedAt: new Date().toISOString(),
    })
  }
}
```

**Express:**

```typescript
// routes/webhooks.ts
import express from 'express'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const router = express.Router()
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Middleware spécial : stripe.raw pour POST non-JSON
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      )

      // Traiter événements
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent
        console.log('Paiement réussi:', pi.id)
      }

      res.json({ received: true })
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err}`)
    }
  }
)

export default router
```

### Déploiement Webhook

Pour développement local avec Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Récupère le signing secret et l'ajoute à .env.local
```

## Gestion Clients

### Créer ou mettre à jour un client

```typescript
// convex/customers.ts
export const createOrUpdateCustomer = authMutation({
  args: {
    phone: v.optional(v.string()),
    address: v.optional(
      v.object({
        line1: v.string(),
        line2: v.optional(v.string()),
        city: v.string(),
        state: v.optional(v.string()),
        postal_code: v.string(),
        country: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Chercher ou créer client
    let customer = await ctx.db
      .query('stripeCustomers')
      .filter((q) => q.eq(q.field('userId'), user.id))
      .first()

    if (customer) {
      // Mettre à jour
      const updated = await stripe.customers.update(
        customer.stripeCustomerId,
        {
          name: user.name || undefined,
          email: user.email,
          phone: args.phone,
          address: args.address,
          metadata: { userId: user.id },
        }
      )

      await ctx.db.patch(customer._id, {
        phone: args.phone,
        address: args.address,
        updatedAt: new Date().toISOString(),
      })

      return { customerId: updated.id }
    } else {
      // Créer nouveau
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: args.phone,
        address: args.address,
        metadata: { userId: user.id },
      })

      await ctx.db.insert('stripeCustomers', {
        userId: user.id,
        stripeCustomerId: newCustomer.id,
        email: user.email,
        phone: args.phone,
        address: args.address,
        createdAt: new Date().toISOString(),
      })

      return { customerId: newCustomer.id }
    }
  },
})
```

## Payment Intents pour Flux Personnalisés

### Créer un Payment Intent

```typescript
export const createPaymentIntent = authMutation({
  args: {
    amount: v.number(), // en centimes
    currency: v.string(), // "xaf", "eur", "usd"
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    const intent = await stripe.paymentIntents.create({
      amount: args.amount,
      currency: args.currency,
      description: args.description,
      metadata: { userId: user.id },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      clientSecret: intent.client_secret,
      intentId: intent.id,
    }
  },
})
```

### Composant Payment Form (Elements)

```tsx
// src/components/payment/PaymentForm.tsx
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface PaymentFormProps {
  clientSecret: string
  amount: number
  onSuccess?: () => void
}

export function PaymentForm({
  clientSecret,
  amount,
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        }
      )

      if (error) {
        toast({
          title: 'Erreur paiement',
          description: error.message,
          variant: 'destructive',
        })
      } else if (
        paymentIntent &&
        paymentIntent.status === 'succeeded'
      ) {
        toast({
          title: 'Succès',
          description: 'Paiement effectué avec succès',
        })
        onSuccess?.()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
              },
            },
          }}
        />
      </div>

      <div className="text-sm text-gray-600">
        Montant: {(amount / 100).toFixed(2)} EUR
      </div>

      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? 'Traitement...' : 'Payer'}
      </Button>
    </form>
  )
}
```

## Gestion Devises (XAF, EUR, USD)

```typescript
// lib/stripe-currencies.ts
export const SUPPORTED_CURRENCIES = {
  xaf: {
    name: 'Franc CFA BEAC',
    symbol: 'FCFA',
    locale: 'fr-CM',
  },
  eur: {
    name: 'Euro',
    symbol: '€',
    locale: 'fr-FR',
  },
  usd: {
    name: 'Dollar américain',
    symbol: '$',
    locale: 'en-US',
  },
} as const

export function formatPrice(
  amount: number, // en centimes
  currency: keyof typeof SUPPORTED_CURRENCIES = 'xaf'
): string {
  const formatter = new Intl.NumberFormat(
    SUPPORTED_CURRENCIES[currency].locale,
    {
      style: 'currency',
      currency: currency.toUpperCase(),
    }
  )

  return formatter.format(amount / 100)
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  // À implémenter avec taux de change API
  // Pour développement, utiliser taux fixe
  const rates: Record<string, Record<string, number>> = {
    xaf: { eur: 0.00152, usd: 0.00167 },
    eur: { xaf: 656, usd: 1.1 },
    usd: { xaf: 598, eur: 0.91 },
  }

  if (fromCurrency === toCurrency) return amount

  const rate = rates[fromCurrency.toLowerCase()]?.[toCurrency.toLowerCase()]
  if (!rate) throw new Error('Conversion non supportée')

  return Math.round(amount * rate)
}
```

## Génération Factures

```typescript
export const generateInvoice = authMutation({
  args: {
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    const payment = await ctx.db
      .query('payments')
      .filter((q) => q.eq(q.field('_id'), args.paymentId))
      .first()

    if (!payment || payment.userId !== user.id) {
      throw new Error('Paiement non trouvé')
    }

    // Créer facture Stripe
    if (payment.stripePaymentIntentId) {
      const invoices = await stripe.invoices.list({
        limit: 1,
        metadata: { paymentIntentId: payment.stripePaymentIntentId },
      })

      if (invoices.data.length > 0) {
        return { invoiceUrl: invoices.data[0].hosted_invoice_url }
      }
    }

    return { invoiceUrl: null }
  },
})
```

## Remboursements

```typescript
export const refundPayment = authMutation({
  args: {
    paymentIntentId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Non authentifié')

    // Vérifier propriété
    const payment = await ctx.db
      .query('payments')
      .filter((q) =>
        q.eq(q.field('stripePaymentIntentId'), args.paymentIntentId)
      )
      .first()

    if (!payment || payment.userId !== user.id) {
      throw new Error('Non autorisé')
    }

    // Créer remboursement
    const refund = await stripe.refunds.create({
      payment_intent: args.paymentIntentId,
      reason: args.reason as Stripe.RefundCreateParams.Reason,
    })

    await ctx.db.patch(payment._id, {
      status: 'refunded',
      refundId: refund.id,
      refundedAt: new Date().toISOString(),
    })

    return { refundId: refund.id, status: refund.status }
  },
})
```

## Considérations Sécurité

### PCI Compliance

- Jamais logger les numéros de carte complets
- Toujours utiliser Stripe Elements ou Payment Methods API
- Jamais stocker directement les données de carte
- Utiliser Stripe.js chiffré côté client
- Server-side: utiliser uniquement stripePaymentMethodId, jamais les détails bruts

### Anti-patterns à éviter

```typescript
// ❌ JAMAIS
const payment = await createPaymentWithRawCard({
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/25',
  cvc: '123',
})

// ❌ JAMAIS
console.log('Paiement:', JSON.stringify(paymentIntent))
// Cela pourrait exposer les données

// ✅ À faire
const { clientSecret } = await createPaymentIntent({
  amount: 1000,
  currency: 'xaf',
})
// Elements gère les données sensibles côté client

// ✅ À faire
const refund = await stripe.refunds.create({
  payment_intent: intentId,
})
// Côté serveur, utiliser seulement les IDs
```

### Vérification CSRF pour webhooks

Les webhooks Stripe sont déjà vérifiés via signature. Toujours vérifier la signature avant de traiter:

```typescript
// ✅ BON
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)

// ❌ JAMAIS
const event = JSON.parse(body) // Sans signature!
```

## Gestion Erreurs et Retry

```typescript
export async function handleStripeError(error: unknown) {
  if (error instanceof Stripe.errors.CardError) {
    // Erreur de carte spécifique (declined, etc.)
    return {
      type: 'card_error',
      message: error.message,
      code: error.code,
    }
  } else if (error instanceof Stripe.errors.RateLimitError) {
    // Trop de requêtes, attendre et réessayer
    return { type: 'rate_limit', message: 'Trop de requêtes, réessayez' }
  } else if (error instanceof Stripe.errors.AuthenticationError) {
    // Problème auth Stripe
    return { type: 'auth_error', message: 'Erreur authentification Stripe' }
  } else if (error instanceof Stripe.errors.APIConnectionError) {
    // Problème connexion, retry avec backoff exponentiel
    return { type: 'connection_error', message: 'Connexion Stripe échouée' }
  }

  return { type: 'unknown', message: 'Erreur inconnue' }
}

// Retry avec backoff exponentiel
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Retries exhausted')
}
```

## Tests

```typescript
// tests/stripe.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Stripe from 'stripe'

describe('Stripe Integration', () => {
  let stripe: Stripe

  beforeEach(() => {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
  })

  it('devrait créer une session de paiement', async () => {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: 'price_test', quantity: 1 }],
      mode: 'payment',
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    })

    expect(session.id).toBeDefined()
  })

  it('devrait vérifier une signature webhook', () => {
    const secret = 'whsec_test'
    const event = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    }

    const signature = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(event),
      secret,
    })

    expect(() => {
      stripe.webhooks.constructEvent(
        JSON.stringify(event),
        signature,
        secret
      )
    }).not.toThrow()
  })
})
```

## Ressources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Library](https://stripe.com/docs/stripe-js/react)
- [Convex Stripe Integration](https://docs.convex.dev/functions/actions)
- [PCI Compliance](https://stripe.com/docs/compliance/pci)
