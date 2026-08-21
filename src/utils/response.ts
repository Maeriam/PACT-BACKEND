import { Response } from 'express'

export const sendSuccess = (
  res: Response,
  data: any,
  message = 'Success',
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export const sendError = (
  res: Response,
  message = 'Something went wrong',
  statusCode = 400,
  errors: any = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  })
}
