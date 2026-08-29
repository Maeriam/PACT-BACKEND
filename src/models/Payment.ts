import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPayment extends Document {
    user: Types.ObjectId;
    subscriptionCode: string;
    reference: string;
    amount: number;
    currency: string
    status: "pending" | "completed" | "failed" | "cancelled";
    paymentMethod?: "wallet" | "paystack" | "bank_transfer" | "card" | "cash";
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {

        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        subscriptionCode: {
            type: String,
            trim: true,
        },

        reference: {
            type: String,
            trim: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
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

    },
    {
        timestamps: true,
    }
);


export default mongoose.model<IPayment>(
    "Payment",
    PaymentSchema
)