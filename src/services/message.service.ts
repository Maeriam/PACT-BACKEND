import mongoose from 'mongoose'
import Message from '../models/Message'
import Request from '../models/Request'

interface CreateMessageParams {
    requestId: string
    senderId: string
    text: string
}

export const createMessage = async ({
    requestId,
    senderId,
    text,
}: CreateMessageParams) => {
    if (
        !mongoose.Types.ObjectId.isValid(requestId)
    ) {
        throw new Error('Invalid request ID')
    }

    const cleanText = text.trim()

    if (!cleanText) {
        throw new Error('Message cannot be empty')
    }

    if (cleanText.length > 2000) {
        throw new Error(
            'Message cannot exceed 2000 characters'
        )
    }

    const request =
        await Request.findById(requestId)

    if (!request) {
        throw new Error('Request not found')
    }

    if (
        request.status !== 'accepted' &&
        request.status !== 'negotiating'
    ) {
        throw new Error(
            'Messaging is not available for this request'
        )
    }

    const isClient =
        request.client.toString() === senderId

    const isArtisan =
        request.artisan.toString() === senderId

    if (!isClient && !isArtisan) {
        throw new Error(
            'You are not a participant in this request'
        )
    }

    const receiver = isClient
        ? request.artisan
        : request.client

    const role = isClient
        ? 'client'
        : 'artisan'

    const message = await Message.create({
        request: request._id,

        job: request.job,

        client: request.client,

        artisan: request.artisan,

        sender: senderId,

        receiver,

        role,
        text: cleanText,

        read: false,
    })

    return {
        message,
        receiverId: receiver.toString(),
    }
}