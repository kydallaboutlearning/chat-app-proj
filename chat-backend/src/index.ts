import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { PrismaClient as PrismaClientCtor, type PrismaClient as PrismaClientType } from './generated/prisma/client.js'
import { Server } from 'socket.io'
import { z } from 'zod'
import { PrismaPg } from '@prisma/adapter-pg'

dotenv.config()

const env = {
  PORT: process.env.PORT ?? '3001',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
}

if (!env.JWT_SECRET) {
  // Fail fast: JWT auth would be insecure/undefined otherwise.
  throw new Error('Missing env var JWT_SECRET')
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('Missing env var DATABASE_URL')
}

// Prisma v7 uses Driver Adapters (no Rust engine). For Postgres we use `@prisma/adapter-pg`.
const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma: PrismaClientType = new PrismaClientCtor({ adapter })
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined)

const app = express()

// Only create HTTP server and Socket.io if not in Vercel serverless environment
const isVercel = process.env.VERCEL === '1'
let httpServer: ReturnType<typeof createServer> | null = null
let io: Server | null = null

if (!isVercel) {
  httpServer = createServer(app)
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  })
}

app.use(cors({ origin: env.CLIENT_URL }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

type JwtPayload = { userId: string }

function generateToken(userId: string): string {
  return jwt.sign({ userId } satisfies JwtPayload, env.JWT_SECRET, {
    // jsonwebtoken types only accept a narrow "ms"-style string; env is runtime string.
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

function normalizeConversationPair(a: string, b: string): { user1Id: string; user2Id: string } {
  // Ensures a single canonical row per user-pair so @@unique([user1Id, user2Id]) is effective.
  return a < b ? { user1Id: a, user2Id: b } : { user1Id: b, user2Id: a }
}

type AuthenticatedRequest = express.Request & { user: { id: string; email: string; name: string; picture: string | null } }

async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)
  if (!decoded) return res.status(401).json({ error: 'Invalid token' })

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, picture: true },
  })
  if (!user) return res.status(401).json({ error: 'User not found' })

  ;(req as AuthenticatedRequest).user = user
  next()
}

function zodErrorToMessage(err: z.ZodError) {
  return err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join(', ')
}

// ==================== AUTH ROUTES ====================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const { email, password, name } = parsed.data
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const hashedPassword = await bcrypt.hash(password, 12)
    const picture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, picture },
      select: { id: true, email: true, name: true, picture: true },
    })

    const token = generateToken(user.id)
    res.status(201).json({ success: true, user, token })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

    const token = generateToken(user.id)
    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      token,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Login failed' })
  }
})

const googleSchema = z.object({
  credential: z.string().min(1),
})

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured' })
    }

    const parsed = googleSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const { credential } = parsed.data
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token' })

    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } })
    let isNewUser = false

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: payload.email } })

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, picture: payload.picture || user.picture },
        })
      } else {
        user = await prisma.user.create({
          data: {
            email: payload.email,
            name: payload.name || 'User',
            googleId: payload.sub,
            picture: payload.picture,
          },
        })
        isNewUser = true
      }
    }

    const token = generateToken(user.id)
    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      token,
      isNewUser,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Google authentication failed' })
  }
})

app.get('/api/auth/me', authenticate, (req, res) => {
  const { id, email, name, picture } = (req as AuthenticatedRequest).user
  res.json({ success: true, user: { id, email, name, picture } })
})

// ==================== USER ROUTES ====================

app.get('/api/users', authenticate, async (req, res) => {
  try {
    const { search } = req.query
    const userId = (req as AuthenticatedRequest).user.id

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        ...(search
          ? {
              OR: [
                { name: { contains: String(search), mode: 'insensitive' } },
                { email: { contains: String(search), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json({ success: true, users })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const id = String(req.params.id)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        isOnline: true,
        lastSeen: true,
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ success: true, user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// ==================== CONVERSATION ROUTES ====================

app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId, isArchived1: false },
          { user2Id: userId, isArchived2: false },
        ],
      },
      include: {
        user1: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
        user2: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    const formatted = conversations.map((conv) => {
      const isUser1 = conv.user1Id === userId
      const otherUser = isUser1 ? conv.user2 : conv.user1

      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.messages[0] || null,
        unreadCount: isUser1 ? conv.unreadCount1 : conv.unreadCount2,
        isArchived: isUser1 ? conv.isArchived1 : conv.isArchived2,
        isMuted: isUser1 ? conv.isMuted1 : conv.isMuted2,
        updatedAt: conv.lastMessageAt,
      }
    })

    res.json({ success: true, conversations: formatted })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

const createConversationSchema = z.object({
  userId: z.string().min(1),
})

app.post('/api/conversations', authenticate, async (req, res) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const userId = (req as AuthenticatedRequest).user.id
    const otherUserId = parsed.data.userId
    if (otherUserId === userId) return res.status(400).json({ error: 'Cannot create conversation with yourself' })

    const pair = normalizeConversationPair(userId, otherUserId)

    const existing = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: pair },
      include: {
        user1: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
        user2: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
      },
    })

    if (existing) {
      const isUser1 = existing.user1Id === userId
      const otherUser = isUser1 ? existing.user2 : existing.user1
      return res.status(200).json({ success: true, conversation: { id: existing.id, otherUser }, isNew: false })
    }

    const created = await prisma.conversation.create({
      data: pair,
      include: {
        user1: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
        user2: { select: { id: true, name: true, email: true, picture: true, isOnline: true } },
      },
    })

    const isUser1 = created.user1Id === userId
    const otherUser = isUser1 ? created.user2 : created.user1

    res.status(201).json({
      success: true,
      conversation: { id: created.id, otherUser },
      isNew: true,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

const patchConversationSchema = z.object({
  isArchived: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  markAsRead: z.boolean().optional(),
  markAsUnread: z.boolean().optional(),
})

app.patch('/api/conversations/:id', authenticate, async (req, res) => {
  try {
    const parsed = patchConversationSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const id = String(req.params.id)
    const userId = (req as AuthenticatedRequest).user.id
    const { isArchived, isMuted, markAsRead, markAsUnread } = parsed.data

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const isUser1 = conversation.user1Id === userId
    const updateData: Record<string, unknown> = {}

    if (isArchived !== undefined) updateData[isUser1 ? 'isArchived1' : 'isArchived2'] = isArchived
    if (isMuted !== undefined) updateData[isUser1 ? 'isMuted1' : 'isMuted2'] = isMuted

    if (markAsRead) {
      updateData[isUser1 ? 'unreadCount1' : 'unreadCount2'] = 0
      await prisma.message.updateMany({
        where: { conversationId: id, receiverId: userId, isRead: false },
        data: { isRead: true },
      })
    }

    if (markAsUnread) {
      updateData[isUser1 ? 'unreadCount1' : 'unreadCount2'] = 1
    }

    await prisma.conversation.update({ where: { id }, data: updateData })
    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update conversation' })
  }
})

app.delete('/api/conversations/:id', authenticate, async (req, res) => {
  try {
    const id = String(req.params.id)
    const userId = (req as AuthenticatedRequest).user.id

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.conversation.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete conversation' })
  }
})

// ==================== MESSAGE ROUTES ====================

app.get('/api/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId)
    const cursor = req.query.cursor ? String(req.query.cursor) : null
    const limit = req.query.limit ? Number(req.query.limit) : 50

    const userId = (req as AuthenticatedRequest).user.id
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const result = await prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = result.length > limit
    const slice = result.slice(0, limit)
    const nextCursor = hasMore ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null

    res.json({
      success: true,
      messages: slice.reverse(),
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
})

app.post('/api/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId)
    const parsed = sendMessageSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: zodErrorToMessage(parsed.error) })

    const senderId = (req as AuthenticatedRequest).user.id

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
    if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const receiverId = conversation.user1Id === senderId ? conversation.user2Id : conversation.user1Id

    const message = await prisma.message.create({
      data: {
        content: parsed.data.content,
        senderId,
        receiverId,
        conversationId,
      },
    })

    const isUser1Receiver = conversation.user1Id === receiverId
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        [isUser1Receiver ? 'unreadCount1' : 'unreadCount2']: { increment: 1 },
      },
    })

    if (io) {
      io.to(`user:${receiverId}`).emit('message:new', message)
    }

    res.status(201).json({ success: true, message })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// ==================== WEBSOCKET ====================
// Note: Socket.io requires persistent connections and won't work on Vercel serverless
// For production, deploy Socket.io server separately (Railway/Render recommended)

const socketIdToUserId = new Map<string, string>()
const userIdToSocketIds = new Map<string, Set<string>>()

if (io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))

    const decoded = verifyToken(token)
    if (!decoded) return next(new Error('Invalid token'))

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, picture: true },
    })
    if (!user) return next(new Error('User not found'))

    socket.data.user = user
    next()
  })

  io.on('connection', async (socket) => {
    const user = socket.data.user as { id: string; name: string }
    socketIdToUserId.set(socket.id, user.id)
    const setForUser = userIdToSocketIds.get(user.id) ?? new Set<string>()
    setForUser.add(socket.id)
    userIdToSocketIds.set(user.id, setForUser)

    socket.join(`user:${user.id}`)

    // First connection -> mark online
    if (setForUser.size === 1) {
      await prisma.user.update({ where: { id: user.id }, data: { isOnline: true } })
      socket.broadcast.emit('user:online', { userId: user.id, isOnline: true })
    }

    socket.on('message:send', async (data: unknown) => {
      const schema = z.object({
        conversationId: z.string().min(1),
        content: z.string().min(1).max(5000),
      })

      const parsed = schema.safeParse(data)
      if (!parsed.success) return socket.emit('message:error', { error: zodErrorToMessage(parsed.error) })

      try {
        const { conversationId, content } = parsed.data
        const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
        if (!conversation) return

        if (conversation.user1Id !== user.id && conversation.user2Id !== user.id) return

        const receiverId = conversation.user1Id === user.id ? conversation.user2Id : conversation.user1Id

        const message = await prisma.message.create({
          data: { content, senderId: user.id, receiverId, conversationId },
        })

        const isUser1Receiver = conversation.user1Id === receiverId
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            [isUser1Receiver ? 'unreadCount1' : 'unreadCount2']: { increment: 1 },
          },
        })

        if (io) {
          io.to(`user:${receiverId}`).emit('message:new', message)
        }
        socket.emit('message:sent', message)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('message:error', { error: 'Failed to send message' })
      }
    })

  socket.on('message:read', async (data: unknown) => {
    const schema = z.object({ conversationId: z.string().min(1) })
    const parsed = schema.safeParse(data)
    if (!parsed.success) return

    try {
      const { conversationId } = parsed.data
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
      if (!conversation) return
      if (conversation.user1Id !== user.id && conversation.user2Id !== user.id) return

      await prisma.message.updateMany({
        where: { conversationId, receiverId: user.id, isRead: false },
        data: { isRead: true },
      })

      const isUser1 = conversation.user1Id === user.id
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { [isUser1 ? 'unreadCount1' : 'unreadCount2']: 0 },
      })

      const otherUserId = isUser1 ? conversation.user2Id : conversation.user1Id
      io.to(`user:${otherUserId}`).emit('message:read', {
        conversationId,
        readBy: user.id,
        readAt: new Date(),
      })
    } catch (error) {
      console.error('Error marking messages read:', error)
    }
  })

    socket.on('typing:start', (data: unknown) => {
      const schema = z.object({ conversationId: z.string().min(1), receiverId: z.string().min(1) })
      const parsed = schema.safeParse(data)
      if (!parsed.success) return
      if (io) {
        io.to(`user:${parsed.data.receiverId}`).emit('user:typing', {
          conversationId: parsed.data.conversationId,
          userId: user.id,
          isTyping: true,
        })
      }
    })

    socket.on('typing:stop', (data: unknown) => {
      const schema = z.object({ conversationId: z.string().min(1), receiverId: z.string().min(1) })
      const parsed = schema.safeParse(data)
      if (!parsed.success) return
      if (io) {
        io.to(`user:${parsed.data.receiverId}`).emit('user:typing', {
          conversationId: parsed.data.conversationId,
          userId: user.id,
          isTyping: false,
        })
      }
    })

    socket.on('disconnect', async () => {
      socketIdToUserId.delete(socket.id)

      const sockets = userIdToSocketIds.get(user.id)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) userIdToSocketIds.delete(user.id)
      }

      // No remaining connections -> mark offline
      if (!userIdToSocketIds.has(user.id)) {
        const lastSeen = new Date()
        await prisma.user.update({ where: { id: user.id }, data: { isOnline: false, lastSeen } })
        socket.broadcast.emit('user:offline', { userId: user.id, isOnline: false, lastSeen })
      }
    })
  })
}

// ==================== START SERVER ====================
// Only start HTTP server if not on Vercel (Vercel handles routing)

if (!isVercel && httpServer) {
  const port = Number(env.PORT) || 3001
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
  })
}

// Export Express app for Vercel serverless functions
export default app

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`)
  try {
    io?.close()           // Use optional chaining
    httpServer?.close()   // Use optional chaining
    await prisma.$disconnect()
  } finally {
    process.exit(0)
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

