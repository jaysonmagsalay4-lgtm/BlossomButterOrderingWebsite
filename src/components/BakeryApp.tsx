'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

export type ProductView = {
  id: string
  name: string
  description: string
  price: number
  category: 'pastries' | 'cookies' | 'desserts'
  image: { url: string; alt: string; width?: number | null; height?: number | null } | null
}

type CartItem = ProductView & { quantity: number }
type Customer = { fullName: string; email: string; phone?: string; username?: string }
type Screen = 'welcome' | 'menu' | 'checkout' | 'confirmation'

const CART_KEY = 'bb-cart'
const FAVORITES_KEY = 'bb-favorites'
const CUSTOMER_KEY = 'bb-customer'
const ORDER_KEY = 'bb-last-order'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fallbackImages = [
  'https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=900&q=85',
]

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function localDate(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function prettyDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    bag: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a16.8 16.8 0 0 1-2.1 2.8M6.1 6.1C3.4 7.9 2 12 2 12s3.5 6 10 6a9.5 9.5 0 0 0 3.9-.8" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  }
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mx-auto flex max-w-xl items-center justify-center gap-2 px-5 py-7" aria-label={`Ordering step ${step} of 3`}>
      {['Menu', 'Checkout', 'Confirmation'].map((label, index) => (
        <div className="contents" key={label}>
          {index > 0 && <div className={`h-px w-8 sm:w-16 ${step > index ? 'bg-[#9b4e39]' : 'bg-[#dfd0bd]'}`} />}
          <div className={`flex items-center gap-2 text-xs font-bold tracking-wide ${step === index + 1 ? 'text-[#713526]' : 'text-[#9b8b79]'}`}>
            <span className={`grid size-7 place-items-center rounded-full ${step >= index + 1 ? 'bg-[#713526] text-white' : 'bg-[#eee4d6] text-[#8d7c68]'}`}>
              {step > index + 1 ? <Icon name="check" className="size-3.5" /> : index + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  required,
  autoComplete,
  inputMode,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
  required?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url'
  children?: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#40372f]">{label}{required && <span className="text-[#a94732]"> *</span>}</span>
      <span className="relative block">
        <input
          className={`h-12 w-full rounded-xl border bg-[#fffdfa] px-4 text-sm outline-none transition placeholder:text-[#a4998f] focus:border-[#a65a43] focus:ring-4 focus:ring-[#eacbc1]/60 ${error ? 'border-[#b34232]' : 'border-[#d9cbbd]'}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
        />
        {children}
      </span>
      {error && <span className="mt-1.5 block text-xs font-semibold text-[#a23628]">{error}</span>}
    </label>
  )
}

function AllergenNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#eadcc8] bg-[#fff8e9] p-4 text-sm leading-6 text-[#6c5846]">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f2d78d] font-bold text-[#68481f]">i</span>
      <p><strong className="text-[#43382e]">A note from our kitchen.</strong> Made in a kitchen that handles wheat, milk, eggs, soy and nuts. Please let us know about allergies before ordering.</p>
    </div>
  )
}

function Header({ cartCount, customer }: { cartCount: number; customer: Customer | null }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8dccd] bg-[#fffaf2]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Blossom and Butter home">
          <span className="grid size-10 place-items-center rounded-full bg-[#f1c7b9] text-[#703c2c] transition group-hover:rotate-6">
            <svg aria-hidden="true" className="size-6" viewBox="0 0 32 32" fill="none"><path d="M16 9c-4-8-11-3-7 3-8-1-7 7-1 7-4 7 5 10 8 4 3 6 12 3 8-4 7 0 7-8-1-7-6-3-7-7 0-10-8-6-8 1Z" fill="currentColor" opacity=".9"/><circle cx="16" cy="16" r="4" fill="#F8E7A4"/></svg>
          </span>
          <span>
            <span className="font-display block text-[21px] leading-none text-[#543126]">Blossom & Butter</span>
            <span className="mt-1 hidden text-[9px] font-bold uppercase tracking-[.18em] text-[#a57260] sm:block">Freshly baked happiness</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#5d5146] md:flex" aria-label="Main navigation">
          <Link className="hover:text-[#8d4938]" href="/">Home</Link>
          <Link className="hover:text-[#8d4938]" href="/#our-bakery">Our bakery</Link>
          <Link className="hover:text-[#8d4938]" href="/order-online">Order online</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden rounded-full px-3 py-2 text-sm font-bold text-[#6f4638] hover:bg-[#f6e7dc] sm:block">
            {customer ? `Hello, ${customer.fullName.split(' ')[0]}!` : 'Log in'}
          </Link>
          <Link href="/checkout" className="flex h-10 items-center gap-2 rounded-full bg-[#713b2d] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#5f3025]">
            <Icon name="bag" className="size-4" /> Cart ({cartCount})
          </Link>
          <button className="grid size-10 place-items-center rounded-full md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-[#eadfce] bg-[#fffaf2] px-5 py-4 text-sm font-bold md:hidden">
          <Link onClick={() => setOpen(false)} className="block py-3" href="/">Home</Link>
          <Link onClick={() => setOpen(false)} className="block py-3" href="/#our-bakery">Our bakery</Link>
          <Link onClick={() => setOpen(false)} className="block py-3" href="/order-online">Order online</Link>
        </nav>
      )}
    </header>
  )
}

function Footer({ welcome = false }: { welcome?: boolean }) {
  return (
    <footer className="border-t border-[#e6d8c6] bg-[#f6eddf] px-5 py-8 text-center text-sm text-[#715f50]">
      {welcome && <p className="font-display mb-4 text-xl text-[#6f4032]">Made with love. Worth coming back for.</p>}
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>A little happiness, baked fresh.</span><span aria-hidden="true">·</span>
        <a className="underline decoration-[#b9927f] underline-offset-4" href="mailto:blossom&butter@gmail.com">blossom&butter@gmail.com</a><span aria-hidden="true">·</span>
        <span>© 2026 Blossom & Butter</span>
      </p>
    </footer>
  )
}

function Welcome({ onCustomer }: { onCustomer: (customer: Customer | null) => void }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (!emailPattern.test(form.email) || form.password.length < 8) {
      setMessage('Use a valid email and at least 8 password characters.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/account/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, remember }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(result.user))
      onCustomer(result.user)
      router.push('/order-online')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main className="relative overflow-hidden bg-[#fffaf2]">
        <div className="pointer-events-none absolute -left-24 top-36 size-64 rounded-full bg-[#f9dcca]/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-10 size-80 rounded-full bg-[#f7e8a8]/45 blur-3xl" />
        <div className="mx-auto grid min-h-[calc(100vh-74px)] max-w-[1180px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <section className="relative">
            <div className="mb-9 inline-flex items-center gap-2 rounded-full border border-[#e8cbbb] bg-white/70 px-4 py-2 text-[11px] font-extrabold tracking-[.18em] text-[#9a503c]">
              <span className="size-1.5 rounded-full bg-[#d7936f]" /> YOUR DAILY DOSE OF DELIGHT
            </div>
            <h1 className="font-display max-w-[650px] text-5xl leading-[1.04] text-[#5b3125] sm:text-6xl lg:text-[72px]">
              A little happiness, <span className="text-[#bd6d52]">baked just for you.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#6e5d50]">Buttery layers, sweet little moments, and your favorite treats waiting right around the corner.</p>
            <div id="our-bakery" className="mt-10 grid grid-cols-3 gap-3">
              {['Baked every morning', 'Local ingredients', 'Pickup, made easy'].map((item, i) => (
                <div key={item} className="rounded-2xl border border-white/80 bg-white/55 p-4 text-center text-xs font-bold leading-5 text-[#6a4a3e] shadow-sm backdrop-blur">
                  <span className="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-[#f6dfca] text-[#a75c44]">{['01', '02', '03'][i]}</span>{item}
                </div>
              ))}
            </div>
          </section>
          <section className="relative mx-auto w-full max-w-[480px]">
            <div className="absolute -inset-3 rotate-2 rounded-[36px] bg-[#efc8b5]/45" />
            <div className="relative rounded-[30px] border border-white bg-[#fffefd] p-7 shadow-[0_28px_70px_rgba(92,54,38,.14)] sm:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#b05e46]">{mode === 'login' ? 'Welcome back!' : 'Join our bakery'}</p>
              <h2 className="font-display mt-2 text-4xl text-[#543126]">{mode === 'login' ? 'Hello again, sweet thing.' : 'Save your favorites.'}</h2>
              <p className="mt-3 text-sm leading-6 text-[#77675b]">{mode === 'login' ? 'Log in for quicker checkout and more sweet moments.' : 'Create an account and keep your go-to pastry list close.'}</p>
              <form onSubmit={submit} className="mt-7 space-y-5">
                {mode === 'signup' && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} placeholder="Jamie Lee" required />
                    <Field label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} placeholder="jamiesweets" required />
                  </div>
                )}
                <Field label="Email address" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="you@example.com" type="email" autoComplete="email" required error={form.email && !emailPattern.test(form.email) ? 'Enter a valid email address.' : undefined} />
                <Field label="Password" value={form.password} onChange={(password) => setForm({ ...form, password })} placeholder="At least 8 characters" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required error={form.password && form.password.length < 8 ? 'Use at least 8 characters.' : undefined}>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#826d61] hover:bg-[#f5e8df]" aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button>
                </Field>
                {mode === 'login' && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 font-semibold text-[#66564b]"><input checked={remember} onChange={(e) => setRemember(e.target.checked)} type="checkbox" className="size-4 accent-[#8d4938]" /> Remember me</label>
                    <button type="button" onClick={() => setMessage('Please email us and we’ll help you get back in.')} className="font-bold text-[#9a4f3a] underline underline-offset-4">Forgot password?</button>
                  </div>
                )}
                {message && <p role="alert" className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm font-semibold text-[#9d412f]">{message}</p>}
                <button disabled={loading} className="btn-primary w-full">{loading ? 'One sweet moment…' : mode === 'login' ? 'Log in' : 'Create my account'} <Icon name="arrow" className="size-4" /></button>
              </form>
              <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#a39589]"><span className="h-px flex-1 bg-[#e9ded3]" />or<span className="h-px flex-1 bg-[#e9ded3]" /></div>
              <div className="space-y-3">
                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="btn-secondary w-full">{mode === 'login' ? 'New to our bakery? Sign up' : 'Already a regular? Log in'}</button>
                <button onClick={() => { onCustomer(null); router.push('/order-online') }} className="w-full rounded-full px-5 py-3 text-sm font-bold text-[#755144] hover:bg-[#f8eee7]">Just here for something delicious? <span className="underline underline-offset-4">Order as a guest</span></button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer welcome />
    </>
  )
}

function Quantity({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex h-10 items-center rounded-full border border-[#ddcfc0] bg-[#fffdfa]">
      <button onClick={() => onChange(Math.max(1, value - 1))} className="grid size-10 place-items-center rounded-full hover:bg-[#f4e6da]" aria-label="Decrease quantity"><Icon name="minus" className="size-4" /></button>
      <span className="w-7 text-center text-sm font-extrabold">{value}</span>
      <button onClick={() => onChange(Math.min(12, value + 1))} className="grid size-10 place-items-center rounded-full hover:bg-[#f4e6da]" aria-label="Increase quantity"><Icon name="plus" className="size-4" /></button>
    </div>
  )
}

function Menu({ products, cart, setCart, favorites, setFavorites, pickup, setPickup }: {
  products: ProductView[]
  cart: CartItem[]
  setCart: (cart: CartItem[]) => void
  favorites: string[]
  setFavorites: (favorites: string[]) => void
  pickup: { date: string; time: string }
  setPickup: (pickup: { date: string; time: string }) => void
}) {
  const [tab, setTab] = useState('all')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [changing, setChanging] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')
  const filtered = products.filter((product) => tab === 'all' || product.category === tab)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function add(product: ProductView, quantity = 1) {
    const existing = cart.find((item) => item.id === product.id)
    if (existing) setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: Math.min(24, item.quantity + quantity) } : item))
    else setCart([...cart, { ...product, quantity }])
  }

  function quickAddItem() {
    const product = products.find((item) => item.name.toLowerCase() === quickAdd.trim().toLowerCase())
    if (product) {
      add(product)
      setQuickAdd('')
    }
  }

  return (
    <>
      <main className="bg-[#fffaf2] pb-36">
        <Stepper step={1} />
        <section className="mx-auto max-w-[1240px] px-5 lg:px-8">
          <div className="grid items-end gap-8 border-b border-[#e5d7c7] pb-9 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Fresh from our oven</p>
              <h1 className="font-display mt-3 text-5xl text-[#573025] sm:text-6xl">Choose your happy.</h1>
              <p className="mt-4 text-lg text-[#756458]">Your favorite pastries, baked with love. Order ahead for pickup.</p>
            </div>
            <div className="relative rounded-2xl border border-[#ead2be] bg-[#fff2e5] p-4 sm:min-w-[420px]">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#f0cbb3] text-[#81442f]"><Icon name="map" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#a25b45]">Pickup at Blossom & Butter</p>
                  <p className="mt-1 text-sm font-bold text-[#514137]">{prettyDate(pickup.date)} · {pickup.time}</p>
                </div>
                <button onClick={() => setChanging(!changing)} className="text-sm font-extrabold text-[#8f4634] underline underline-offset-4">Change</button>
              </div>
              {changing && (
                <div className="mt-4 grid gap-3 border-t border-[#e7cdbb] pt-4 sm:grid-cols-2">
                  <input aria-label="Pickup date" type="date" min={localDate()} max={localDate(14)} value={pickup.date} onChange={(e) => setPickup({ ...pickup, date: e.target.value })} className="field-compact" />
                  <select aria-label="Pickup time" value={pickup.time} onChange={(e) => setPickup({ ...pickup, time: e.target.value })} className="field-compact">
                    {['8:00–9:00 AM', '9:00–10:00 AM', '10:00–11:00 AM', '11:00 AM–12:00 PM', '12:00–1:00 PM', '1:00–2:00 PM', '2:00–3:00 PM', '3:00–4:00 PM'].map((time) => <option key={time}>{time}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Treat categories">
              {[['all', 'All treats'], ['pastries', 'Pastries'], ['cookies', 'Cookies'], ['desserts', 'Desserts']].map(([value, label]) => (
                <button key={value} onClick={() => setTab(value)} role="tab" aria-selected={tab === value} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-extrabold transition ${tab === value ? 'bg-[#6f392c] text-white shadow-sm' : 'border border-[#decfbd] bg-white text-[#6c5a4d] hover:border-[#b8836d]'}`}>{label}</button>
              ))}
            </div>
            <div className="flex max-w-md items-center gap-2 rounded-2xl border border-[#dfcebc] bg-white p-2 pl-4 shadow-sm">
              <label className="sr-only" htmlFor="quick-add">Type a treat to add to cart</label>
              <input id="quick-add" list="treats" value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAddItem()} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a8c80]" placeholder="Type a treat to quick add…" />
              <datalist id="treats">{products.map((product) => <option key={product.id} value={product.name} />)}</datalist>
              <button onClick={quickAddItem} disabled={!products.some((item) => item.name.toLowerCase() === quickAdd.trim().toLowerCase())} className="rounded-xl bg-[#efc781] px-4 py-2 text-xs font-extrabold text-[#5c3c24] disabled:cursor-not-allowed disabled:opacity-40">Add</button>
            </div>
          </div>
          <div className="mt-11 flex items-end justify-between">
            <div><p className="eyebrow">Small joys, big flavor</p><h2 className="font-display mt-2 text-4xl text-[#56352a]">Everyday favorites</h2></div>
            <p className="text-sm font-bold text-[#927f6e]">{filtered.length} treats</p>
          </div>
          {filtered.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#d9c8b6] bg-white p-12 text-center"><p className="font-display text-3xl text-[#664237]">The pastry case is being filled.</p><p className="mt-2 text-[#7b6a5d]">Please check back in a little while.</p></div>
          ) : (
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product, index) => {
                const quantity = quantities[product.id] || 1
                const favorite = favorites.includes(product.id)
                const image = product.image?.url || fallbackImages[index % fallbackImages.length]
                return (
                  <article key={product.id} className="group overflow-hidden rounded-[26px] border border-[#eadfd1] bg-[#fffefd] shadow-[0_8px_26px_rgba(89,57,40,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(89,57,40,.12)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f4e8d8]">
                      <Image src={image} alt={product.image?.alt || product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
                      <button onClick={() => setFavorites(favorite ? favorites.filter((id) => id !== product.id) : [...favorites, product.id])} className={`absolute right-4 top-4 grid size-10 place-items-center rounded-full backdrop-blur transition ${favorite ? 'bg-[#9d4d3b] text-white' : 'bg-white/90 text-[#75483a] hover:bg-white'}`} aria-label={favorite ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}>
                        <Icon name="heart" className={`size-5 ${favorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-[26px] leading-8 text-[#50342b]">{product.name}</h3>
                        <span className="rounded-full bg-[#f8e8cd] px-3 py-1 text-sm font-extrabold text-[#7d4b2c]">{money(product.price)}</span>
                      </div>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-[#7c6b5f]">{product.description}</p>
                      <div className="mt-5 flex items-center gap-3">
                        <Quantity value={quantity} onChange={(value) => setQuantities({ ...quantities, [product.id]: value })} />
                        <button onClick={() => add(product, quantity)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#724033] px-4 text-sm font-extrabold text-white transition hover:bg-[#5d3026]"><Icon name="bag" className="size-4" /> Add to cart</button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <div className="mt-10"><AllergenNotice /></div>
          {favorites.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4cfc7] bg-[#fff4ef] p-5">
              <p className="text-sm font-bold text-[#6b493d]"><Icon name="heart" className="mr-2 inline size-4 fill-current text-[#a95845]" /> Your saved shopping list has {favorites.length} favorite {favorites.length === 1 ? 'treat' : 'treats'}.</p>
              <button onClick={() => products.filter((product) => favorites.includes(product.id)).forEach((product) => add(product))} className="text-sm font-extrabold text-[#8c4636] underline underline-offset-4">Add saved list to cart</button>
            </div>
          )}
        </section>
      </main>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4d4c2] bg-[#fffdf9]/95 px-5 py-4 shadow-[0_-15px_40px_rgba(76,51,37,.12)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-display text-xl text-[#543329]">{count} {count === 1 ? 'item' : 'items'} · {money(subtotal)}</p><p className="text-xs text-[#7e6e62]">A lovely little box awaits. Tax at checkout.</p></div>
            <Link href="/checkout" className="btn-primary">View cart & checkout <Icon name="arrow" className="size-4" /></Link>
          </div>
        </div>
      )}
    </>
  )
}

type OrderDetails = {
  orderNumber: string
  customerName: string
  email: string
  phone: string
  pickupDate: string
  pickupWindow: string
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  paymentLast4: string
}

function Checkout({ cart, setCart, customer, pickup, setPickup, onOrder }: {
  cart: CartItem[]
  setCart: (cart: CartItem[]) => void
  customer: Customer | null
  pickup: { date: string; time: string }
  setPickup: (pickup: { date: string; time: string }) => void
  onOrder: (order: OrderDetails) => void
}) {
  const router = useRouter()
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [form, setForm] = useState({
    fullName: customer?.fullName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    notes: '',
    cardName: customer?.fullName || '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    zip: '',
  })
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = subtotal + tax
  const digits = form.cardNumber.replace(/\D/g, '')
  const valid = form.fullName.trim().length >= 2 && emailPattern.test(form.email) && form.phone.replace(/\D/g, '').length >= 10 && pickup.date >= localDate() && Boolean(pickup.time) && form.cardName.trim().length >= 2 && digits.length >= 15 && digits.length <= 16 && /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(form.expiry) && /^\d{3,4}$/.test(form.cvc) && form.zip.trim().length >= 4 && cart.length > 0

  function update(name: string, value: string) {
    if (name === 'cardNumber') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    if (name === 'expiry') value = value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1 / $2')
    if (name === 'cvc') value = value.replace(/\D/g, '').slice(0, 4)
    setForm({ ...form, [name]: value })
  }

  async function placeOrder() {
    setAttempted(true)
    if (!valid) return
    setSubmitting(true)
    setServerError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.fullName,
          email: form.email,
          phone: form.phone,
          pickupDate: `${pickup.date}T12:00:00`,
          pickupWindow: pickup.time,
          notes: form.notes,
          paymentLast4: digits.slice(-4),
          items: cart.map((item) => ({ product: item.id, name: item.name, quantity: item.quantity, unitPrice: item.price })),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      onOrder({
        orderNumber: `#${result.order.orderNumber}`,
        customerName: form.fullName,
        email: form.email,
        phone: form.phone,
        pickupDate: pickup.date,
        pickupWindow: pickup.time,
        items: cart,
        subtotal: result.order.subtotal ?? subtotal,
        tax: result.order.tax ?? tax,
        total: result.order.total ?? total,
        paymentLast4: digits.slice(-4),
      })
      setCart([])
      router.push('/confirmation')
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return <main className="grid min-h-[65vh] place-items-center bg-[#fffaf2] px-5 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#f3dfc6] text-[#754634]"><Icon name="bag" className="size-7" /></span><h1 className="font-display mt-5 text-4xl text-[#563329]">Your little box is empty.</h1><p className="mt-3 text-[#77675b]">Let’s find something lovely to put inside.</p><Link href="/order-online" className="btn-primary mt-7">Browse the pastry case</Link></div></main>
  }

  return (
    <main className="bg-[#fffaf2] pb-20">
      <Stepper step={2} />
      <section className="mx-auto max-w-[1180px] px-5 lg:px-8">
        <div className="mb-10"><p className="eyebrow">You’re nearly there</p><h1 className="font-display mt-2 text-5xl text-[#563127] sm:text-6xl">Almost baked and boxed.</h1><p className="mt-4 text-lg text-[#77665a]">A few details, then we’ll take care of the sweet part.</p></div>
        <div className="grid gap-8 lg:grid-cols-[1fr_410px] lg:items-start">
          <div className="space-y-6">
            <section className="checkout-card">
              <div className="section-number">1</div><div><h2 className="section-title">Customer information</h2><p className="section-copy">We’ll use this to send your order confirmation.</p></div>
              {!customer && <p className="col-span-full mt-1 rounded-xl bg-[#fff3e7] p-3 text-sm text-[#735344]">Already have an account? <Link href="/" className="font-extrabold underline underline-offset-4">Log in</Link> for a quicker checkout.</p>}
              <div className="col-span-full mt-3 grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required value={form.fullName} onChange={(v) => update('fullName', v)} placeholder="Jamie Lee" error={attempted && form.fullName.trim().length < 2 ? 'Your name is required.' : undefined} />
                <Field label="Email address" required value={form.email} onChange={(v) => update('email', v)} placeholder="you@example.com" type="email" error={attempted && !emailPattern.test(form.email) ? 'Enter a valid email.' : undefined} />
                <Field label="Phone number" required value={form.phone} onChange={(v) => update('phone', v)} placeholder="(555) 123-4567" type="tel" error={attempted && form.phone.replace(/\D/g, '').length < 10 ? 'Enter a valid phone number.' : undefined} />
              </div>
            </section>
            <section className="checkout-card">
              <div className="section-number">2</div><div><h2 className="section-title">Pickup details</h2><p className="section-copy">Blossom & Butter · In-store pickup · Main counter</p></div>
              <div className="col-span-full mt-3 grid gap-5 sm:grid-cols-2">
                <label><span className="field-label">Pickup date *</span><input className="field" type="date" min={localDate()} max={localDate(14)} value={pickup.date} onChange={(e) => setPickup({ ...pickup, date: e.target.value })} /></label>
                <label><span className="field-label">Pickup time window *</span><select className="field" value={pickup.time} onChange={(e) => setPickup({ ...pickup, time: e.target.value })}>{['8:00–9:00 AM', '9:00–10:00 AM', '10:00–11:00 AM', '11:00 AM–12:00 PM', '12:00–1:00 PM', '1:00–2:00 PM', '2:00–3:00 PM', '3:00–4:00 PM'].map((time) => <option key={time}>{time}</option>)}</select></label>
              </div>
            </section>
            <section className="checkout-card">
              <div className="section-number">3</div><div><h2 className="section-title">Order notes <span className="text-base font-normal text-[#968779]">(optional)</span></h2><p className="section-copy">We’ll pack your treats fresh for your selected pickup time.</p></div>
              <label className="col-span-full mt-3"><span className="sr-only">Order notes</span><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className="min-h-28 w-full resize-y rounded-xl border border-[#d9cbbd] bg-[#fffdfa] p-4 text-sm outline-none focus:border-[#a65a43] focus:ring-4 focus:ring-[#eacbc1]/60" placeholder="Anything we should know?" maxLength={500} /></label>
            </section>
            <section className="checkout-card">
              <div className="section-number">4</div><div><h2 className="section-title">Payment</h2><p className="section-copy">Credit or debit card <span className="ml-2 rounded bg-[#1a3f85] px-1.5 py-0.5 text-[10px] font-bold text-white">VISA</span> <span className="ml-1 rounded bg-[#e9d7b9] px-1.5 py-0.5 text-[10px] font-bold text-[#563823]">MC</span></p></div>
              <div className="col-span-full mt-3 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Name on card" required value={form.cardName} onChange={(v) => update('cardName', v)} placeholder="Jamie Lee" error={attempted && form.cardName.trim().length < 2 ? 'Name on card is required.' : undefined} /></div>
                <div className="sm:col-span-2"><Field label="Card number" required value={form.cardNumber} onChange={(v) => update('cardNumber', v)} placeholder="1234 5678 9012 3456" inputMode="numeric" error={attempted && (digits.length < 15 || digits.length > 16) ? 'Enter a valid card number.' : undefined} /></div>
                <Field label="Expiry (MM / YY)" required value={form.expiry} onChange={(v) => update('expiry', v)} placeholder="MM / YY" error={attempted && !/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(form.expiry) ? 'Use MM / YY.' : undefined} />
                <Field label="Security code (CVC)" required value={form.cvc} onChange={(v) => update('cvc', v)} placeholder="123" type="password" error={attempted && !/^\d{3,4}$/.test(form.cvc) ? 'Enter 3 or 4 digits.' : undefined} />
                <Field label="Billing ZIP / postal code" required value={form.zip} onChange={(v) => update('zip', v)} placeholder="90210" error={attempted && form.zip.trim().length < 4 ? 'ZIP / postal code is required.' : undefined} />
              </div>
              <p className="col-span-full mt-1 flex items-center gap-2 text-xs font-semibold text-[#6f655c]"><span className="grid size-5 place-items-center rounded-full bg-[#d9ead9] text-[#426842]"><Icon name="check" className="size-3" /></span>Your payment details are encrypted and secure. Card details are validated in your browser and never stored by Blossom & Butter.</p>
            </section>
          </div>
          <aside className="sticky top-24 rounded-[26px] border border-[#e4d6c6] bg-[#fffefd] p-6 shadow-[0_20px_50px_rgba(83,53,37,.1)]">
            <div className="flex items-center justify-between"><h2 className="font-display text-3xl text-[#54342a]">Your little box</h2><span className="rounded-full bg-[#f3dfc4] px-3 py-1 text-xs font-extrabold text-[#6b4632]">{itemCount} items</span></div>
            <div className="mt-6 max-h-[330px] space-y-5 overflow-auto pr-1">
              {cart.map((item, index) => (
                <div key={item.id} className="flex gap-3 border-b border-[#eee3d8] pb-5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#f2e5d7]"><Image fill sizes="64px" className="object-cover" src={item.image?.url || fallbackImages[index % fallbackImages.length]} alt={item.image?.alt || item.name} /></div>
                  <div className="min-w-0 flex-1"><p className="font-display text-lg leading-5 text-[#54372d]">{item.name}</p><p className="mt-1 text-xs text-[#88786c]">Qty {item.quantity} · {money(item.price)} each</p><button onClick={() => setCart(cart.filter((product) => product.id !== item.id))} className="mt-1 text-xs font-bold text-[#a04e3b] underline underline-offset-2">Remove</button></div>
                  <p className="text-sm font-extrabold text-[#594237]">{money(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <Link href="/order-online" className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-[#954b38] underline underline-offset-4"><Icon name="plus" className="size-4" /> Add more</Link>
            <div className="mt-6 space-y-3 border-t border-[#ded0c1] pt-5 text-sm">
              <div className="flex justify-between text-[#75675d]"><span>Subtotal ({itemCount} items)</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-[#75675d]"><span>Tax (8%)</span><span>{money(tax)}</span></div>
              <div className="flex justify-between text-[#75675d]"><span>Pickup</span><span className="font-bold text-[#517249]">Free</span></div>
              <div className="flex justify-between border-t border-[#e4d8cb] pt-4 font-display text-2xl text-[#50362e]"><span>Total</span><span>{money(total)}</span></div>
            </div>
            {serverError && <p className="mt-4 rounded-xl bg-[#fff0e8] p-3 text-sm font-semibold text-[#9d412f]">{serverError}</p>}
            <button disabled={!valid || submitting} onClick={placeOrder} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-45">{submitting ? 'Boxing your order…' : `Place order · ${money(total)}`}</button>
            {attempted && !valid && <p className="mt-2 text-center text-xs font-semibold text-[#a23628]">Please complete the highlighted fields.</p>}
            <p className="mt-4 text-center text-[11px] leading-5 text-[#8b7b70]">By placing your order, you agree to our <a href="#" className="underline">Terms & Privacy Policy</a>. Please collect your treats within your pickup window.</p>
            <AllergenNotice />
          </aside>
        </div>
        <a className="mt-10 block text-center text-sm font-bold text-[#744d3e] underline underline-offset-4" href="mailto:blossom&butter@gmail.com">Need a hand with your order? Email blossom&butter@gmail.com.</a>
      </section>
    </main>
  )
}

function Confirmation({ order }: { order: OrderDetails | null }) {
  const router = useRouter()
  if (!order) return <main className="grid min-h-[65vh] place-items-center bg-[#fffaf2] px-5 text-center"><div><h1 className="font-display text-4xl text-[#563329]">No recent order found.</h1><Link href="/order-online" className="btn-primary mt-6">Back to the bakery menu</Link></div></main>
  const confirmedOrder = order

  function downloadCalendar() {
    const start = new Date(`${confirmedOrder.pickupDate}T10:00:00`)
    const end = new Date(`${confirmedOrder.pickupDate}T11:00:00`)
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Blossom & Butter//Pickup//EN', 'BEGIN:VEVENT', `UID:${confirmedOrder.orderNumber.replace('#', '')}@blossomandbutter`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, 'SUMMARY:Blossom & Butter pickup', `DESCRIPTION:Pickup ${confirmedOrder.orderNumber} at the main counter.`, 'LOCATION:Blossom & Butter · Main counter', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `blossom-butter-${confirmedOrder.orderNumber.replace('#', '')}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="bg-[#fffaf2] pb-20">
      <Stepper step={3} />
      <section className="mx-auto max-w-[920px] px-5 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#e3edcf] text-[#537042] shadow-[0_0_0_12px_#f2f6e8]"><Icon name="check" className="size-9" /></div>
        <p className="eyebrow mt-10">Freshly confirmed</p>
        <h1 className="font-display mt-3 text-5xl leading-tight text-[#573127] sm:text-6xl">A little happiness is on its way!</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#746257]">Thank you, <strong className="text-[#5c3b31]">{order.customerName}</strong>. Your order is confirmed. We’ve sent the details to <strong className="text-[#5c3b31]">{order.email}</strong>.</p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#dfcbb8] bg-white px-5 py-3 text-sm font-bold text-[#695145]"><span>Order {order.orderNumber}</span><span className="size-1 rounded-full bg-[#c1947e]" /><span>See you at the bakery!</span></div>
        <div className="mt-10 grid gap-6 text-left lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[28px] border border-[#e5d8ca] bg-white p-7 shadow-[0_18px_50px_rgba(75,48,34,.08)]">
            <h2 className="font-display text-3xl text-[#52362d]">Your sweet selection</h2>
            <div className="mt-6 space-y-4">
              {order.items.map((item) => <div key={item.id} className="flex justify-between gap-5 border-b border-[#eee4da] pb-4"><div><p className="font-bold text-[#5f473d]">{item.name}</p><p className="mt-1 text-xs text-[#8e7e72]">Qty {item.quantity} · {money(item.price)} each</p></div><p className="font-extrabold text-[#5b4238]">{money(item.price * item.quantity)}</p></div>)}
            </div>
            <div className="mt-5 space-y-2 text-sm text-[#75675d]"><div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></div><div className="flex justify-between"><span>Pickup</span><span>Free</span></div><div className="flex justify-between border-t border-[#e5dbd0] pt-3 font-display text-2xl text-[#51372e]"><span>Total</span><span>{money(order.total)}</span></div></div>
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-[#f2f7eb] p-3 text-xs font-bold text-[#557047]"><Icon name="check" className="size-4" /> Paid · Visa ending in {order.paymentLast4}</p>
          </section>
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#e6d4bf] bg-[#fff4df] p-7">
              <span className="grid size-10 place-items-center rounded-full bg-[#efd1a5] text-[#764a2f]"><Icon name="map" /></span>
              <h2 className="font-display mt-5 text-3xl text-[#573b2e]">Pickup details</h2>
              <div className="mt-5 space-y-4 text-sm text-[#6f5a4a]"><p className="flex gap-3"><Icon name="calendar" className="size-5 shrink-0" /><strong>{prettyDate(order.pickupDate)}</strong></p><p className="flex gap-3"><Icon name="clock" className="size-5 shrink-0" /><strong>{order.pickupWindow}</strong></p><p className="flex gap-3"><Icon name="map" className="size-5 shrink-0" />In-store pickup · Main counter</p></div>
            </section>
            <div className="rounded-[24px] bg-[#754235] p-6 text-white"><p className="font-display text-2xl">Ready when you are.</p><p className="mt-2 text-sm leading-6 text-[#f5ded4]">Just give us your name, {order.customerName.split(' ')[0]}, and order number {order.orderNumber}. We’ll have your treats ready to go.</p></div>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={downloadCalendar} className="btn-primary"><Icon name="calendar" className="size-4" /> Add pickup to calendar</button><button onClick={() => router.push('/order-online')} className="btn-secondary">Back to the bakery menu</button></div>
        <p className="font-display mt-12 text-2xl text-[#865344]">Good things come in pastry boxes.</p>
      </section>
    </main>
  )
}

export default function BakeryApp({ screen, products = [] }: { screen: Screen; products?: ProductView[] }) {
  const [cart, setCartState] = useState<CartItem[]>([])
  const [favorites, setFavoritesState] = useState<string[]>([])
  const [customer, setCustomerState] = useState<Customer | null>(null)
  const [order, setOrderState] = useState<OrderDetails | null>(null)
  const [pickup, setPickupState] = useState({ date: localDate(), time: '10:00–11:00 AM' })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let savedCustomer: Customer | null = null
    try {
      setCartState(JSON.parse(localStorage.getItem(CART_KEY) || '[]'))
      setFavoritesState(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'))
      savedCustomer = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null')
      setCustomerState(savedCustomer)
      setOrderState(JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'))
      const savedPickup = JSON.parse(localStorage.getItem('bb-pickup') || 'null')
      if (savedPickup?.date >= localDate()) setPickupState(savedPickup)
    } catch { /* Ignore stale browser data. */ }
    if (savedCustomer) {
      fetch('/api/favorites')
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (Array.isArray(data?.productIds)) {
            setFavoritesState(data.productIds)
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(data.productIds))
          }
        })
        .catch(() => undefined)
    }
    setReady(true)
  }, [])

  function setCart(value: CartItem[]) { setCartState(value); localStorage.setItem(CART_KEY, JSON.stringify(value)) }
  function setFavorites(value: string[]) {
    setFavoritesState(value)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(value))
    if (customer) {
      fetch('/api/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: value }),
      }).catch(() => undefined)
    }
  }
  function setCustomer(value: Customer | null) { setCustomerState(value); value ? localStorage.setItem(CUSTOMER_KEY, JSON.stringify(value)) : localStorage.removeItem(CUSTOMER_KEY) }
  function setPickup(value: { date: string; time: string }) { setPickupState(value); localStorage.setItem('bb-pickup', JSON.stringify(value)) }
  function setOrder(value: OrderDetails) { setOrderState(value); localStorage.setItem(ORDER_KEY, JSON.stringify(value)) }
  const count = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  return (
    <div className={`min-h-screen bg-[#fffaf2] text-[#3d342d] transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <Header cartCount={count} customer={customer} />
      {screen === 'welcome' && <Welcome onCustomer={setCustomer} />}
      {screen === 'menu' && <Menu products={products} cart={cart} setCart={setCart} favorites={favorites} setFavorites={setFavorites} pickup={pickup} setPickup={setPickup} />}
      {screen === 'checkout' && <Checkout cart={cart} setCart={setCart} customer={customer} pickup={pickup} setPickup={setPickup} onOrder={setOrder} />}
      {screen === 'confirmation' && <Confirmation order={order} />}
      {screen !== 'welcome' && <Footer />}
    </div>
  )
}
