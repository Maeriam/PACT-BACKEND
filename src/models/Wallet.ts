import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IWallet extends Document {
  user: Types.ObjectId
  balance: number
  pendingBalance: number
  totalEarnings: number
}

const WalletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    pendingBalance: {
      type: Number,
      default: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IWallet>('Wallet', WalletSchema)