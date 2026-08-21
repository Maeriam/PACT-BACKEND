import { Server } from 'http'
import { WebSocketServer } from 'ws'

import {
    AuthenticatedSocket,
    authenticateSocket,
} from './auth'

import {
    addUserSocket,
    removeUserSocket,
    sendToUser,
} from './socketManager'

import {
    createMessage,
} from '../services/message.service'

import { createNotification } from '../utils/notification'

import Request from '../models/Request'
import User from '../models/User'

export const initializeWebSocket = (
    server: Server
) => {
    const wss = new WebSocketServer({
        server,
    })

    wss.on(
        'connection',
        async (
            socket: AuthenticatedSocket,
            request
        ) => {
            try {
                const url = new URL(
                    request.url || '',
                    `http://${request.headers.host}`
                )

                const token =
                    url.searchParams.get('token')

                if (!token) {
                    socket.close(
                        1008,
                        'Authentication required'
                    )

                    return
                }

                const authenticated =
                    authenticateSocket(
                        socket,
                        token
                    )

                if (!authenticated) {
                    socket.close(
                        1008,
                        'Invalid token'
                    )

                    return
                }

                const userId =
                    socket.user!.id

                addUserSocket(
                    userId,
                    socket
                )

                console.log(
                    `WebSocket connected: ${userId}`
                )

                socket.send(
                    JSON.stringify({
                        type: 'connected',
                        message:
                            'WebSocket connected successfully',
                    })
                )

                socket.on(
                    'message',
                    async (rawData) => {
                        try {
                            const data =
                                JSON.parse(
                                    rawData.toString()
                                )

                            await handleSocketMessage(
                                socket,
                                data
                            )
                        } catch (error) {
                            console.error(
                                'Socket message error:',
                                error
                            )

                            socket.send(
                                JSON.stringify({
                                    type: 'error',
                                    message:
                                        'Invalid WebSocket message',
                                })
                            )
                        }
                    }
                )

                socket.on(
                    'close',
                    () => {
                        removeUserSocket(
                            userId,
                            socket
                        )

                        console.log(
                            `WebSocket disconnected: ${userId}`
                        )
                    }
                )

                socket.on(
                    'error',
                    (error) => {
                        console.error(
                            `WebSocket error: ${userId}`,
                            error
                        )
                    }
                )
            } catch (error) {
                console.error(
                    'WebSocket connection error:',
                    error
                )

                socket.close(
                    1011,
                    'Server error'
                )
            }
        }
    )

    return wss
}


const handleSocketMessage = async (
    socket: AuthenticatedSocket,
    data: any
) => {
    if (!socket.user) return

    switch (data.type) {
        case 'message':
            await handleNewMessage(
                socket,
                data
            )
            break

        case 'typing':
            await handleTyping(
                socket,
                data
            )
            break

        case 'stop_typing':
            await handleStopTyping(
                socket,
                data
            )
            break

        default:
            socket.send(
                JSON.stringify({
                    type: 'error',
                    message:
                        'Unknown event type',
                })
            )
    }
}

const handleNewMessage = async (
    socket: AuthenticatedSocket,
    data: any
) => {
    const {
        requestId,
        text,
    } = data

    if (!requestId || !text) {
        socket.send(
            JSON.stringify({
                type: 'error',
                message:
                    'requestId and text are required',
            })
        )

        return
    }

    try {
        const {
            message,
            receiverId,
        } = await createMessage({
            requestId,
            senderId:
                socket.user!.id,
            text,
        })

        const messageData = {
            id: message._id,
            requestId: message.request,
            jobId: message.job,

            sender: message.sender,
            receiver: message.receiver,

            text: message.text,

            read: message.read,

            createdAt:
                message.createdAt,
        }

        // Confirm to sender
        socket.send(
            JSON.stringify({
                type: 'message_sent',
                message: messageData,
            })
        )

        // Send to receiver
        const receiverOnline =
            sendToUser(
                receiverId,
                {
                    type: 'new_message',
                    message: messageData,
                }
            )

        // Receiver is offline
        if (!receiverOnline) {
            const sender =
                await User.findById(
                    socket.user!.id
                ).select(
                    'firstName lastName'
                )

            const senderName = sender
                ? `${sender.firstName} ${sender.lastName}`
                : 'Someone'

            await createNotification({
                user: receiverId,

                title: 'New message',

                message:
                    `${senderName} sent you a message`,

                type: 'Message',

                data: {
                    requestId:
                        message.request,

                    jobId:
                        message.job,

                    messageId:
                        message._id,
                },
            })
        }
    } catch (error: any) {
        console.error(
            'Message creation error:',
            error
        )

        socket.send(
            JSON.stringify({
                type: 'error',
                message:
                    error.message ||
                    'Failed to send message',
            })
        )
    }
}

const handleTyping = async (
    socket: AuthenticatedSocket,
    data: any
) => {
    const { requestId } = data

    if (!requestId) return

    try {
        const receiverId =
            await getRequestReceiver(
                requestId,
                socket.user!.id
            )

        sendToUser(
            receiverId,
            {
                type: 'typing',

                requestId,

                userId:
                    socket.user!.id,
            }
        )
    } catch {
        // Ignore invalid typing events
    }
}


const handleStopTyping = async (
    socket: AuthenticatedSocket,
    data: any
) => {
    const { requestId } = data

    if (!requestId) return

    try {
        const receiverId =
            await getRequestReceiver(
                requestId,
                socket.user!.id
            )

        sendToUser(
            receiverId,
            {
                type: 'stop_typing',

                requestId,

                userId:
                    socket.user!.id,
            }
        )
    } catch {
        // Ignore invalid events
    }
}

const getRequestReceiver = async (
    requestId: string,
    userId: string
) => {
    const request =
        await Request.findById(
            requestId
        )

    if (!request) {
        throw new Error(
            'Request not found'
        )
    }

    const isClient =
        request.client.toString() === userId

    const isArtisan =
        request.artisan.toString() === userId

    if (!isClient && !isArtisan) {
        throw new Error(
            'You are not a participant'
        )
    }

    const receiver = isClient
        ? request.artisan
        : request.client

    return receiver.toString()
}


