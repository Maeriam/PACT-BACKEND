import { Response } from 'express'

import Job from '../models/Job'
import Message from '../models/Message'
import RequestModel from '../models/Request'
import User from '../models/User'
import { AuthRequest } from '../middleware/auth'
import { sendError, sendSuccess } from '../utils/response'
import { createNotification } from '../utils/notification'
import { draftAgreement } from '../services/agreement.service'

const getParticipantRequest = async (requestId: string, userId: string) =>
  RequestModel.findOne({
    _id: requestId,
    $or: [{ client: userId }, { artisan: userId }],
  })

const generateAgreement = async (job: any, request: any) => {
  const [client, artisan, messages] = await Promise.all([
    User.findById(request.client).select('firstName lastName'),
    User.findById(request.artisan).select('firstName lastName'),
    Message.find({ request: request._id })
      .populate({ path: 'sender', select: 'firstName lastName' })
      .sort({ createdAt: 1 }),
  ])

  if (!client || !artisan) {
    throw new Error('Unable to find the agreement participants')
  }

  const agreement = await draftAgreement({
    clientName: `${client.firstName} ${client.lastName}`,
    artisanName: `${artisan.firstName} ${artisan.lastName}`,
    service: job.service,
    description: job.description,
    state: job.state,
    city: job.city,
    address: job.address,
    finalPrice: request.final_price,
    messages: messages.map((message: any) => ({
      sender: message.sender
        ? `${message.sender.firstName} ${message.sender.lastName}`
        : 'Participant',
      text: message.text,
      createdAt: message.createdAt,
    })),
  })

  job.agreement = agreement
  job.agreementStatus = 'ready'
  job.agreementGeneratedAt = new Date()
  await job.save()

  return agreement
}

export const proposePrice = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Not authenticated', 401)

    const price = Number(req.body.price)
    if (!Number.isFinite(price) || price < 0) {
      return sendError(res, 'Price must be a non-negative number', 400)
    }

    const request = await getParticipantRequest(
      String(req.params.requestId),
      req.user.id
    )
    if (!request || !['accepted', 'negotiating'].includes(request.status)) {
      return sendError(res, 'Active request not found or access denied', 404)
    }

    const job = await Job.findById(request.job)
    if (!job) return sendError(res, 'Job not found', 404)

    const isClient = request.client.toString() === req.user.id
    if (isClient) request.client_price = price
    else request.artisan_price = price

    // A new proposal always supersedes any previous final agreement.
    request.final_price = undefined
    job.final_price = undefined
    job.agreement = ''
    job.agreementStatus = 'not_required'
    job.agreementGeneratedAt = undefined

    const clientPrice = request.client_price
    const artisanPrice = request.artisan_price
    const pricesMatch =
      clientPrice !== undefined &&
      artisanPrice !== undefined &&
      clientPrice === artisanPrice

    if (!pricesMatch) {
      request.status = 'negotiating'
      job.status = 'negotiating'
      await Promise.all([request.save(), job.save()])

      const recipient = isClient ? request.artisan : request.client
      await createNotification({
        user: recipient,
        title: 'New price proposal',
        message: `A new proposed price of ₦${price.toLocaleString('en-NG')} needs your response.`,
        type: 'Job',
        data: { requestId: request._id, jobId: job._id },
      })

      return sendSuccess(
        res,
        { request, job, pricesMatch: false },
        'Price proposal saved. Waiting for the other participant to match it.'
      )
    }

    request.final_price = price
    request.status = 'accepted'
    job.final_price = price
    job.status = 'accepted'
    job.agreementStatus = 'generating'
    await Promise.all([request.save(), job.save()])

    try {
      const agreement = await generateAgreement(job, request)
      return sendSuccess(
        res,
        { request, job, pricesMatch: true, agreement },
        'Price agreed and agreement draft generated.'
      )
    } catch (error: any) {
      job.agreementStatus = 'failed'
      await job.save()
      return sendSuccess(
        res,
        {
          request,
          job,
          pricesMatch: true,
          agreementError: error.message || 'Agreement generation failed',
        },
        'Price agreed. Agreement generation failed and can be retried.'
      )
    }
  } catch (error) {
    console.error('Price proposal error:', error)
    return sendError(res, 'Failed to save price proposal', 500)
  }
}

export const retryAgreement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Not authenticated', 401)

    const request = await getParticipantRequest(
      String(req.params.requestId),
      req.user.id
    )
    if (!request || request.final_price === undefined) {
      return sendError(res, 'A finalized request is required before drafting an agreement', 400)
    }

    const job = await Job.findById(request.job)
    if (!job) return sendError(res, 'Job not found', 404)

    job.agreementStatus = 'generating'
    await job.save()

    try {
      const agreement = await generateAgreement(job, request)
      return sendSuccess(res, { agreement, job }, 'Agreement draft generated.')
    } catch (error: any) {
      job.agreementStatus = 'failed'
      await job.save()
      return sendError(res, error.message || 'Agreement generation failed', 502)
    }
  } catch (error) {
    console.error('Agreement generation error:', error)
    return sendError(res, 'Failed to generate agreement', 500)
  }
}
