import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITransaction extends Document {
    user: Types.ObjectId;
    title: string;
    description?: string;
    reference: string;
    amount: number;
    type: "credit" | "debit";
    status: "pending" | "completed" | "failed" | "cancelled";
    paymentMethod?: "wallet" | "paystack" | "bank_transfer" | "card" | "cash";
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        reference: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["pending", "completed", "failed", "cancelled"],
            default: "pending",
            index: true,
        },

        paymentMethod: {
            type: String,
            enum: ["wallet", "paystack", "bank_transfer", "card", "cash"],
        },

        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ITransaction>(
    "Transaction",
    TransactionSchema
);


