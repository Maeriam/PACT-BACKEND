import mongoose, {
    Schema,
    Document,
    Types,
} from 'mongoose'

export interface IJob extends Document {
    artisan: Types.ObjectId
    client: Types.ObjectId
    request: Types.ObjectId
    
    service: string
    description: string

    state: string
    city: string
    address: string

    client_price: number
    artisan_price: number
    final_price?: number

    agreement: string
    agreementStatus: 'not_required' | 'generating' | 'ready' | 'failed'
    agreementGeneratedAt?: Date

    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'in_dispute' | 'negotiating'
}

const JobSchema = new Schema<IJob>(
    {
        artisan: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        client: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        request: {
            type: Schema.Types.ObjectId,
            ref: 'Request',
            index: true,
        },

        service: {
            type: String,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            trim: true,
        },

        address: {
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
            enum: ['not_required', 'generating', 'ready', 'failed'],
            default: 'not_required',
        },

        agreementGeneratedAt: {
            type: Date,
        },

        status: {
            type: String,
            enum: [
                'pending',
                'accepted',
                'in_progress',
                'completed',
                'cancelled',
                'in_dispute',
                'negotiating'
            ],
            default: 'pending',
            index: true,
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.model<IJob>(
    'Job',
    JobSchema
)
