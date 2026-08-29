import mongoose, {
    Schema,
    Document,
    Types,
} from 'mongoose'

export interface IBankAccount
    extends Document {

    user: Types.ObjectId

    bankName: string

    accountNumber: string
    accountName: string
    verified: boolean
}

const BankAccountSchema =
    new Schema<IBankAccount>(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                unique: true,
            },


            bankName: {
                type: String,
                required: true,
            },

            accountNumber: {
                type: String,
                required: true,
            },

            accountName: {
                type: String,
                required: true,
            },


            verified: {
                type: Boolean,
                default: false,
            },
        },
        {
            timestamps: true,
        }
    )

export default mongoose.model<IBankAccount>(
    'BankAccount',
    BankAccountSchema
)
