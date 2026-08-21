import { Response } from 'express'
import mongoose from 'mongoose'

import Job from '../models/Job'
import ArtisanProfile from '../models/ArtisanProfile'
import Request from '../models/Request'
import { AuthRequest } from '../middleware/auth'
import {
    sendSuccess,
    sendError,
} from '../utils/response'
import { createNotification } from '../utils/notification'


export const requestService = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(res, 'Not authenticated', 401)
        }

        const {
            service,
            description,
            state,
            city,
            address,
            client_price,
        } = req.body

        const { artisanId } = req.params

        if (!service || !description || !state) {
            return sendError(
                res,
                'Service, description and state are required',
                400
            )
        }


        const artisanProfile = await ArtisanProfile.findOne({
            user: artisanId,
        })

        if (!artisanProfile) {
            return sendError(res, 'Artisan profile not found', 404)
        }

        // const artisanUser = await User.findOne({
        //     _id: artisan,
        //     role: 'artisan',
        // })

        // if (!artisanUser) {
        //     return sendError(res, 'Artisan not found', 404)
        // }

        const job = await Job.create({
            artisan: artisanProfile.user,
            client: req.user.id,
            service,
            description,
            state,
            city,
            address,
            client_price,
            status: 'pending',
        })

        await createNotification({
            user: artisanProfile.user,
            title: 'New service requested',
            message: 'You have a new job offer',
            type: 'Job',
            data: {
                jobId: job._id,
            },
        })

        return sendSuccess(
            res,
            { job },
            'Service requested successfully',
            201
        )
    } catch (error) {
        console.error('Create job error:', error)

        return sendError(
            res,
            'Failed to request service',
            500
        )
    }
}

export const acceptJob = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(res, 'Not authenticated', 401)
        }

        const { jobId } = req.params


        const job = await Job.findOne({
            _id: jobId,
            artisan: req.user.id,
            status: 'pending',
        })

        if (!job) {
            return sendError(
                res,
                'Job request not found or is no longer pending',
                404
            )
        }

        const request = await Request.create({
            job: job._id,
            client: job.client,
            artisan: job.artisan,
            client_price: job.client_price,
            artisan_price: job.client_price,
            final_price: job.client_price,
            status: 'accepted',
        })



        job.request = request._id
        job.status = 'accepted'
        job.artisan_price = job.client_price
        job.final_price = job.client_price
        job.agreement = 'Artisan accepted the service request'

        await job.save()

        await createNotification({
            user: job.client,
            title: 'Service request accepted',
            message: 'The artisan accepted your service request',
            type: 'Job',
            data: {
                jobId: job._id,
                requestId: request._id,
            },
        })

        return sendSuccess(
            res,
            { job, request },
            'Service request accepted successfully'
        )
    } catch (error) {
        console.error('Accept job error:', error)

        return sendError(
            res,
            'Failed to accept service request',
            500
        )
    }
}

export const cancelJob = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(res, 'Not authenticated', 401)
        }

        const { jobId } = req.params

        const job = await Job.findOne({
            _id: jobId,
            status: 'pending',
        })

        if (!job) {
            return sendError(
                res,
                'Job request not found or is no longer pending',
                404
            )
        }

        const isClient =
            job.client.toString() === req.user.id

        const isArtisan =
            job.artisan.toString() === req.user.id

        if (!isClient && !isArtisan) {
            return sendError(
                res,
                'You are not involved in this job',
                403
            )
        }

        job.status = 'cancelled'

        job.agreement = isClient
            ? 'Client cancelled the service request'
            : 'Artisan declined the service request'

        await job.save()

        const receiverId = isClient
            ? job.artisan
            : job.client

        await createNotification({
            user: receiverId,
            title: isClient
                ? 'Service request cancelled'
                : 'Service request declined',
            message: isClient
                ? 'The client cancelled the service request'
                : 'The artisan declined your service request',
            type: 'Job',
            data: {
                jobId: job._id,
                status: job.status,
            },
        })

        return sendSuccess(
            res,
            { job },
            isClient
                ? 'Service request cancelled successfully'
                : 'Service request declined successfully'
        )
    } catch (error) {
        console.error('Cancel job error:', error)

        return sendError(
            res,
            'Failed to cancel service request',
            500
        )
    }
}

export const updateRequestPrice = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.user) {
            return sendError(res, 'Not authenticated', 401)
        }

        const { requestId } = req.params
        const { price } = req.body


        if (
            typeof price !== 'number' ||
            price < 0
        ) {
            return sendError(
                res,
                'A valid price is required',
                400
            )
        }

        const request = await Request.findById(requestId)

        if (!request) {
            return sendError(res, 'Request not found', 404)
        }

        const isClient =
            request.client.toString() === req.user.id

        const isArtisan =
            request.artisan.toString() === req.user.id

        if (!isClient && !isArtisan) {
            return sendError(
                res,
                'You are not part of this request',
                403
            )
        }

        if (
            request.status !== 'accepted' &&
            request.status !== 'negotiating'
        ) {
            return sendError(
                res,
                'Price cannot be changed for this request',
                400
            )
        }

        if (isClient) {
            request.client_price = price
        }

        if (isArtisan) {
            request.artisan_price = price
        }

        request.status = 'negotiating'
        request.final_price = undefined
        request.agreement = undefined
        request.agreementStatus = 'pending'

        await request.save()

        const otherUserId = isClient
            ? request.artisan
            : request.client

        await createNotification({
            user: otherUserId,
            title: 'Price updated',
            message: isClient
                ? 'The client has proposed a new price'
                : 'The artisan has proposed a new price',
            type: 'Request',
            data: {
                requestId: request._id,
                price,
            },
        })

        

        return sendSuccess(
            res,
            { request },
            'Price updated successfully'
        )
    } catch (error) {
        console.error('Update price error:', error)

        return sendError(
            res,
            'Failed to update price',
            500
        )
    }
}