import { appAuth } from '@/lib/app-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const remember = body?.remember === true

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return Response.json({ error: 'Enter a valid email and password.' }, { status: 400 })
  }

  try {
    const user = await appAuth.login(email, password, remember)
    return Response.json({
      user: { email: user.email, fullName: user.fullName, phone: user.phone, username: user.username },
    })
  } catch {
    return Response.json({ error: 'That email and password do not match.' }, { status: 401 })
  }
}
