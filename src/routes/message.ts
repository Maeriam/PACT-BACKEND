import { Router } from 'express'

import {
    getRequestMessages,
    markRequestMessagesRead,
} from '../controllers/message'

import { protect } from '../middleware/auth'

const router = Router()

router.get(
    '/requests/:requestId/messages',
    protect,
    getRequestMessages
)

router.patch(
    '/requests/:requestId/messages/read',
    protect,
    markRequestMessagesRead
)

export default router