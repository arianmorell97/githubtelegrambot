/* eslint-disable @typescript-eslint/explicit-function-return-type */
import crypto, { BinaryLike, KeyObject } from 'crypto'

const createComparisonSignature = (body: any) => {
  const hmac = crypto.createHmac(
    'sha1',

    process.env.GITHUB_WEBHOOK_SECRET as BinaryLike | KeyObject
  )

  const selfSignature = hmac.update(JSON.stringify(body)).digest('hex')
  return `sha1=${selfSignature}` // shape in GitHub header
}

const compareSignatures = (signature: any, comparisonSsignature: any) => {
  const source = Buffer.from(signature)
  const comparison = Buffer.from(comparisonSsignature)

  return crypto.timingSafeEqual(source, comparison) // constant time comparison
}

export const verifyGithubPayload = (req: any, res: any, next: any): void => {
  const { headers, body } = req

  const signature = headers['x-hub-signature']
  const comparisonSsignature = createComparisonSignature(body)

  if (!compareSignatures(signature, comparisonSsignature)) {
    return res.status(401).send('Mismatched signatures')
  }

  const { action, ...payload } = body
  req.event_type = headers['x-github-event'] // one of: https://developer.github.com/v3/activity/events/types/
  req.action = action
  req.payload = payload
  next()
}
