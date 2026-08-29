import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response'
import { AuthRequest } from '../middleware/auth'
import mongoose from 'mongoose'
import axios from 'axios'
import crypto from 'crypto'
import User from '../models/User'
import Payment from '../models/Payment'
import { completeWalletPayment } from '../services/wallet.service'

export const initializePayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(res, 'Not authenticated', 401)
        }
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return sendError(res, 'User not found', 404);
        }

        const amount = Number(req.body.amount);
        const amountInKobo = Math.round(amount * 100);

        const secretKey = process.env.PAYSTACK_SECRET_KEY

        if (!secretKey) {
            return sendError(
                res,
                'Paystack configuration is missing',
                500
            )
        }


        const reference =
            `WALLET_${Date.now()}_${crypto
                .randomBytes(4)
                .toString('hex')}`

        const payment = await Payment.create({
            user: user._id,
            reference,
            amount,
            currency: 'NGN',
            status: 'pending',
            paymentMethod: 'paystack',
        })

        const paystackResponse = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: user.email,
                amount: Math.round(amount * 100),
                currency: "NGN",
                reference,
                metadata: {
                    userId: user._id.toString(),
                    paymentId: payment._id.toString(),
                    purpose: 'wallet_funding',
                },
                callback_url:
                    process.env.PAYSTACK_CALLBACK_URL,
            },
            {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json'
                }
            }

        )

        if (!paystackResponse.data.status) {
            payment.status = 'failed'
            await payment.save()

            return sendError(
                res,
                'Failed to initialize payment',
                400
            )
        }

        return sendSuccess(
            res,
            {
                authorizationUrl:
                    paystackResponse.data.data.authorization_url,

                accessCode:
                    paystackResponse.data.data.access_code,

                reference:
                    paystackResponse.data.data.reference,
            },
            'Payment initialized successfully'
        )
    } catch (error: any) {
        console.error(
            'Initialize payment error:',
            error.response?.data || error
        )

        return sendError(
            res,
            'Failed to initialize payment',
            500
        )
    }
}



export const verifyPayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(
                res,
                'Not authenticated',
                401
            )
        }

        const reference =
            Array.isArray(req.params.reference)
                ? req.params.reference[0]
                : req.params.reference

        if (!reference) {
            return sendError(
                res,
                'Payment reference is required',
                400
            )
        }

        const payment = await Payment.findOne({
            reference,
            user: req.user.id,
        })

        if (!payment) {
            return sendError(
                res,
                'Payment not found',
                404
            )
        }

        if (payment.status === 'completed') {
            return sendSuccess(
                res,
                {
                    payment,
                    alreadyCompleted: true,
                },
                'Payment already verified'
            )
        }

        const secretKey =
            process.env.PAYSTACK_SECRET_KEY

        if (!secretKey) {
            return sendError(
                res,
                'Paystack configuration is missing',
                500
            )
        }

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                },
            }
        )

        const data = response.data.data

        if (data.status !== 'success') {
            return sendError(
                res,
                `Payment status: ${data.status}`,
                400
            )
        }

        const result =
            await completeWalletPayment({
                reference,
                paystackAmount: data.amount,
                currency: data.currency,
            })

        return sendSuccess(
            res,
            {
                payment: result.payment,
                wallet: result.wallet,
            },
            'Payment verified successfully'
        )
    } catch (error: any) {
        console.error(
            'Verify payment error:',
            error.response?.data || error
        )

        return sendError(
            res,
            'Failed to verify payment',
            500
        )
    }
}