import mongoose, {
    Schema,
    Document,
    Types,
} from 'mongoose'

export interface IMessage extends Document {
    job: Types.ObjectId
    client: Types.ObjectId
    artisan: Types.ObjectId
    request: Types.ObjectId

    sender: Types.ObjectId
    receiver: Types.ObjectId

    text: string

    read: boolean
    role: string

    createdAt: Date
    updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
    {
        job: {
            type: Schema.Types.ObjectId,
            ref: 'Job',

            index: true,
        },

        request: {
            type: Schema.Types.ObjectId,
            ref: 'Request',

            index: true,
        },

        client: {
            type: Schema.Types.ObjectId,
            ref: 'User',

            index: true,
        },

        artisan: {
            type: Schema.Types.ObjectId,
            ref: 'User',

            index: true,
        },

        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',

        },

        receiver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        text: {
            type: String,
            required: true,
            trim: true,
        },

        role: {
            type: String,
            trim: true,
        },

        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

MessageSchema.index({
    job: 1,
    createdAt: 1,
})

export default mongoose.model<IMessage>(
    'Message',
    MessageSchema
)


