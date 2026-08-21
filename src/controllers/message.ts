import { Request, Response } from 'express'
import mongoose from 'mongoose'

import Message from '../models/Message'
import RequestModel from '../models/Request'

import {
    sendSuccess,
    sendError,
} from '../utils/response'

import { AuthRequest } from '../middleware/auth'

export const getRequestMessages =
    async (
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

            const { requestId } =
                req.params


            const request =
                await RequestModel.findOne({
                    _id: requestId,

                    $or: [
                        {
                            client: req.user.id,
                        },
                        {
                            artisan: req.user.id,
                        },
                    ],
                })

            if (!request) {
                return sendError(
                    res,
                    'Request not found or access denied',
                    404
                )
            }

            const messages =
                await Message.find({
                    request: requestId,
                })
                    .populate({
                        path: 'sender',
                        select:
                            'firstName lastName profileImage',
                    })
                    .sort({
                        createdAt: 1,
                    })

            return sendSuccess(
                res,
                {
                    requestId:
                        request._id,

                    messages,
                },
                'Messages fetched successfully'
            )
        } catch (error) {
            console.error(
                'Get messages error:',
                error
            )

            return sendError(
                res,
                'Failed to fetch messages',
                500
            )
        }
    }



export const markRequestMessagesRead =
    async (
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

            const { requestId } =
                req.params


            const request =
                await RequestModel.findOne({
                    _id: requestId,

                    $or: [
                        {
                            client: req.user.id,
                        },
                        {
                            artisan: req.user.id,
                        },
                    ],
                })

            if (!request) {
                return sendError(
                    res,
                    'Request not found',
                    404
                )
            }

            await Message.updateMany(
                {
                    request: requestId,

                    receiver: req.user.id,

                    read: false,
                },
                {
                    $set: {
                        read: true,
                    },
                }
            )

            return sendSuccess(
                res,
                null,
                'Messages marked as read'
            )
        } catch (error) {
            console.error(
                'Mark messages read error:',
                error
            )

            return sendError(
                res,
                'Failed to mark messages as read',
                500
            )
        }
    }