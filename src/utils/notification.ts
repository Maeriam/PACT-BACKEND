import Notification from '../models/Notification'
import { Types } from 'mongoose'

interface CreateNotificationParams {
    user: string | Types.ObjectId
    title: string
    message: string
    type: string
    data?: Record<string, any>
}

export const createNotification = async ({
    user,
    title,
    message,
    type = 'general',
    data = {},
}: CreateNotificationParams) => {
    return Notification.create({
        user,
        title,
        message,
        type,
        data,
    })
}