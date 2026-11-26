import config from '@payload-config'
import { appAuth } from '@/lib/app-auth'
import { getPayload } from 'payload'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (username.length < 2 || fullName.length < 2) {
    return Response.json({ error: 'Add your name and a username.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return Response.json({ error: 'Use a valid email and at least 8 password characters.' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: await config, key: 'blossom-butter-app' })
    await payload.create({
      collection: 'users',
      data: { email, password, username, fullName },
      overrideAccess: false,
    })
    const user = await appAuth.login(email, password)
    return Response.json({
      user: { email: user.email, fullName: user.fullName, phone: user.phone, username: user.username },
    })
  } catch {
    return Response.json({ error: 'An account with those details may already exist.' }, { status: 409 })
  }
}
