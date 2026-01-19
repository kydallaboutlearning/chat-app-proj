import { io, type Socket } from 'socket.io-client'

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export function createSocket(token: string): Socket {
  return io(baseURL, {
    auth: { token },
    transports: ['websocket'],
  })
}

