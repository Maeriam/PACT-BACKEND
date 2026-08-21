import mongoose, { Schema, Document, Types } from 'mongoose'

export interface INotification extends Document {
    user: Types.ObjectId

    title: string
    message: string

    type: string

    isRead: boolean

    data?: Record<string, any>
}

const NotificationSchema = new Schema<INotification>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        title: {
            type: String,
            trim: true,
        },

        message: {
            type: String,
            trim: true,
        },

        type: {
            type: String,
            default: 'general',
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.model<INotification>(
    'Notification',
    NotificationSchema
)