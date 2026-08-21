import { WebSocket } from 'ws'
import { verifyToken } from '../utils/jwt'

export interface AuthenticatedSocket
    extends WebSocket {
    user?: {
        id: string
        role: 'client' | 'artisan'
    }
}

export const authenticateSocket = (
    socket: AuthenticatedSocket,
    token: string
) => {
    const decoded = verifyToken(token)

    if (
        !decoded ||
        typeof decoded === 'string' ||
        typeof decoded.id !== 'string' ||
        (decoded.role !== 'client' && decoded.role !== 'artisan')
    ) {
        return false
    }

    socket.user = {
        id: decoded.id,
        role: decoded.role,
    }

    return true
}