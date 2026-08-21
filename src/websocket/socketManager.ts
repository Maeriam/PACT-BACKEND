import { WebSocket } from 'ws'

const onlineUsers = new Map<
    string,
    Set<WebSocket>
>()

export const addUserSocket = (
    userId: string,
    socket: WebSocket
) => {
    const userSockets =
        onlineUsers.get(userId)

    if (userSockets) {
        userSockets.add(socket)
    } else {
        onlineUsers.set(
            userId,
            new Set([socket])
        )
    }
}

export const removeUserSocket = (
    userId: string,
    socket: WebSocket
) => {
    const userSockets =
        onlineUsers.get(userId)

    if (!userSockets) {
        return
    }

    userSockets.delete(socket)

    if (userSockets.size === 0) {
        onlineUsers.delete(userId)
    }
}

export const sendToUser = (
    userId: string,
    data: any
) => {
    const userSockets =
        onlineUsers.get(userId)

    if (!userSockets) {
        return false
    }

    const payload =
        JSON.stringify(data)

    for (const socket of userSockets) {
        if (
            socket.readyState ===
            WebSocket.OPEN
        ) {
            socket.send(payload)
        }
    }

    return true
}

export const isUserOnline = (
    userId: string
) => {
    return onlineUsers.has(userId)
}