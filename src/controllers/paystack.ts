import { Request, Response } from 'express'
import { completeWalletPayment } from '../services/wallet.service'
import crypto from 'crypto'

export const paystackWebhook = async (
    req: Request,
    res: Response
) => {
    try {
        const secretKey =
            process.env.PAYSTACK_SECRET_KEY

        if (!secretKey) {
            return res.sendStatus(500)
        }

        const signature =
            req.headers['x-paystack-signature']

        if (!signature) {
            return res.sendStatus(401)
        }

        const hash = crypto
            .createHmac('sha512', secretKey)
            .update(JSON.stringify(req.body))
            .digest('hex')

        if (hash !== signature) {
            return res.sendStatus(401)
        }

        res.sendStatus(200)

        const event = req.body

        if (event.event !== 'charge.success') {
            return
        }

        const data = event.data

        if (!data?.reference) {
            return
        }

        await completeWalletPayment({
            reference: data.reference,
            paystackAmount: data.amount,
            currency: data.currency,
        })
    } catch (error) {
        console.error(
            'Paystack webhook error:',
            error
        )
    }
}
