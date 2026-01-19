import { useEffect, useMemo } from 'react'
import type { Socket } from 'socket.io-client'

import { useAuthStore } from '../store/authStore'
import { createSocket } from '../utils/socket'

// Minimal hook scaffold. It only connects when token exists.
export function useSocket(): Socket | null {
  const token = useAuthStore((s) => s.token)

  const socket = useMemo(() => {
    if (!token) return null
    return createSocket(token)
  }, [token])

  useEffect(() => {
    if (!socket) return
    return () => {
      socket.disconnect()
    }
  }, [socket])

  return socket
}

