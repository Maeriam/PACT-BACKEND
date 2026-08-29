import mongoose from 'mongoose'
import Wallet from '../models/Wallet'
import Transaction from '../models/Transaction'
import Payment from '../models/Payment'

interface CompletePaymentParams {
    reference: string
    paystackAmount: number
    currency: string
}

export const completeWalletPayment = async ({
    reference,
    paystackAmount,
    currency,
}: CompletePaymentParams) => {
    const session = await mongoose.startSession()

    try {
        session.startTransaction()

        const payment = await Payment.findOne({
            reference,
        }).session(session)

        if (!payment) {
            throw new Error('Payment record not found')
        }

        if (payment.status === 'completed') {
            await session.commitTransaction()

            return {
                alreadyCompleted: true,
                payment,
            }
        }

        const expectedAmount = Math.round(
            payment.amount * 100
        )

        if (paystackAmount !== expectedAmount) {
            payment.status = 'failed'
            await payment.save({ session })

            throw new Error(
                'Payment amount does not match'
            )
        }

        if (currency !== payment.currency) {
            payment.status = 'failed'
            await payment.save({ session })

            throw new Error(
                'Payment currency does not match'
            )
        }

        const wallet = await Wallet.findOneAndUpdate(
            { user: payment.user },
            {
                $inc: {
                    balance: payment.amount,
                },
            },
            {
                new: true,
                upsert: true,
                session,
            }
        )

        if (!wallet) {
            throw new Error('Failed to update wallet')
        }

        payment.status = 'completed'
        payment.paymentMethod = 'paystack'

        await payment.save({ session })

        await Transaction.create(
            [
                {
                    user: payment.user,
                    title: 'Wallet funded',
                    description: 'Wallet funded through Paystack',
                    reference: `WALLET_CREDIT_${payment.reference}`,
                    amount: payment.amount,
                    type: 'credit',
                    status: 'completed',
                    paymentMethod: 'paystack',
                    metadata: {
                        paymentId: payment._id,
                        paystackReference: payment.reference,
                    },
                },
            ],
            { session }
        )

        await session.commitTransaction()

        return {
            alreadyCompleted: false,
            payment,
            wallet,
        }
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        await session.endSession()
    }
}