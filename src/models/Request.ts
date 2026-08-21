import mongoose, {
    Schema,
    Document,
    Types,
} from 'mongoose'

export interface IRequest extends Document {
    job: Types.ObjectId
    client: Types.ObjectId
    artisan: Types.ObjectId

    message?: string

    client_price?: number
    artisan_price?: number
    final_price?: number
    agreement?: string
    agreementStatus: 'pending' | 'generated' | 'accepted'

    status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'cancelled'
    | 'negotiating'

    createdAt: Date
    updatedAt: Date
}

const RequestSchema = new Schema<IRequest>(
    {
        job: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },

        client: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        artisan: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        message: {
            type: String,
            trim: true,
        },

        client_price: {
            type: Number,
            min: 0,
        },

        artisan_price: {
            type: Number,
            min: 0,
        },

        final_price: {
            type: Number,
            min: 0,
        },

        agreement: {
            type: String,
            trim: true,
        },

        agreementStatus: {
            type: String,
            enum: ['pending', 'generated', 'accepted'],
            default: 'pending',
        },

        status: {
            type: String,
            enum: [
                'pending',
                'accepted',
                'rejected',
                'cancelled',
                'negotiating',
            ],
            default: 'pending',
            index: true,
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.model<IRequest>(
    'Request',
    RequestSchema
)
