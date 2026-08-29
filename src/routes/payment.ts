import express from "express";
import { initializePayment,verifyPayment } from "../controllers/payment";
import { paystackWebhook } from "../controllers/paystack";
import { protect } from '../middleware/auth'

const router = express.Router()

router.post(
    '/initialize',
    protect,
    initializePayment
)

router.get(
    '/verify/:reference',
    protect,
    verifyPayment
)

router.post(
    '/webhook/paystack',
    paystackWebhook
)

export default router