/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import bodyParser from 'body-parser'
import express from 'express'
import crypto, { BinaryLike, KeyObject } from 'crypto'
import { config } from 'dotenv'
import { Composer, Context, Middleware, Telegraf } from 'telegraf'
import { telegrafThrottler } from 'telegraf-throttler'

const configEnv = config()
if (configEnv.error != null) {
  throw new Error('ha ocurrido un error al cargar env')
}

if (configEnv.parsed != null) {
  console.log('.env loaded')
}

const token = process.env.BOT_TOKEN

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const bot = new Telegraf(token as string)

const privateThrottler = telegrafThrottler()
const groupThrottler = telegrafThrottler({
  in: {
    // Aggresively drop inbound messages
    highWater: 0, // Trigger strategy if throttler is not ready for a new job
    maxConcurrent: 1, // Only 1 job at a time
    minTime: 30000 // Wait this many milliseconds to be ready, after a job
  },
  inKey: 'chat' // Throttle inbound messages by chat.id instead
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const customMiddleware: Middleware<Context<Update>> = async (_ctx, _next) =>
//   false

const partitioningMiddleware: Middleware<Context> = async (ctx, next) => {
  console.log('ChatId: ', ctx.message?.chat.id)

  const chatId = Number(ctx.chat?.id)
  return await Composer.optional(
    () => chatId < 0,
    groupThrottler,
    privateThrottler
  )(ctx, next)
}
bot.use(partitioningMiddleware)

bot.command('/example', (ctx) => {
  void ctx.reply('I am seriously throttled!')
})

// bot.telegram.sendMessage()

void bot.telegram.setMyCommands([
  { command: 'example', description: 'comando de ejemplo' }
])

void bot.launch()

// console.log(crypto.randomBytes(32).toString('hex'))

const app = express()

app.use(bodyParser.json())

const PORT = process.env.WEBHOOK_SERVER_PORT

app.listen(PORT, () => {
  // bot.telegram.chat
  console.log(`Server running on port ${PORT}`)
})

const createComparisonSignature = (body: any) => {
  const hmac = crypto.createHmac(
    'sha1',

    process.env.OCTO_WIZARD_HOOK_SECRET as BinaryLike | KeyObject
  )

  const selfSignature = hmac.update(JSON.stringify(body)).digest('hex')
  return `sha1=${selfSignature}` // shape in GitHub header
}

const compareSignatures = (signature: any, comparisonSsignature: any) => {
  const source = Buffer.from(signature)
  const comparison = Buffer.from(comparisonSsignature)

  return crypto.timingSafeEqual(source, comparison) // constant time comparison
}

const verifyGithubPayload = (req: any, res: any, next: any): void => {
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

const eventsHandler = (req: any, res: any): void => {
  console.log(req.event_type, req.action)

  // console.log(JSON.stringify(req.payload, null, 2))

  const { payload } = req
  // console.log(payload.action)
  // console.log(payload.user)

  if (req.event_type === 'issues') {
    // Get the relevant properties
    const action: keyof typeof issuesActionType = req.action
    const issue = payload.issue
    const user = payload.sender
    const labels = issue.labels

    // Format the message
    // [inline URL](http://www.example.com/)
    try {
      let message = `El issue <a href="${issue.html_url}">#${issue.number} ${
        issue.title
      }</a>,  ha sido ${
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        issuesActionType[action] ? issuesActionType[action] : action
      } por ${user.login}.`
      if (labels.length > 0) {
        message += `\nEtiquetas: ${labels.map((l: any) => l.name).join(', ')}.`
      } else {
        message += '\nSin etiquetar.'
      }

      if (issue.assignee != null) {
        message += `\nAsignado a: \n${issue.assignee.login}.`
      } else {
        message += '\nSin asignar.'
      }
      message += `\nDescripción: \n${issue.body}.`

      void bot.telegram.sendMessage(
        process.env.CHAT_ID_BOT as string | number,
        message,
        {
          parse_mode: 'HTML'
        }
      )
      console.log(message)
    } catch (error) {
      console.error(error)
      void bot.telegram.sendMessage(
        process.env.CHAT_ID_BOT as string | number,
        'Algo ha salido mal con el Webhook',
        {
          parse_mode: 'HTML'
        }
      )
    }
  }

  if (req.event_type === 'issue_comment') {
    const action: keyof typeof issuesCommentActionType = req.action
    const issue = payload.issue
    const user = payload.sender
    const editedComment = action === 'edited' ? payload.changes.body.from : null
    const comment = action !== 'edited' ? payload.comment.body : null

    try {
      let message = `El usuario ${user.login} ha ${
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        issuesCommentActionType[action]
          ? issuesCommentActionType[action]
          : action
      } un comentario en el issue <a href="${issue.html_url}">#${
        issue.number
      } ${issue.title}</a>.`
      if (comment !== null) {
        message += `\nComentario: \n${comment}`
      } else {
        message += `\nComentario(editado): \n${editedComment}`
      }
      // message += `\nDescripción: \n${issue.body}.`

      void bot.telegram.sendMessage(
        process.env.CHAT_ID_BOT as string | number,
        message,
        {
          parse_mode: 'HTML'
        }
      )
      console.log(message)
    } catch (error) {
      console.error(error)
      void bot.telegram.sendMessage(
        process.env.CHAT_ID_BOT as string | number,
        'Algo ha salido mal con el Webhook',
        {
          parse_mode: 'HTML'
        }
      )
    }
  }
  return res.send('ok')
}

app.use('/', verifyGithubPayload, eventsHandler)

export enum issuesCommentActionType {
  created = 'creado',
  deleted = 'eliminado',
  edited = 'editado'
}

export enum issuesActionType {
  assigned = 'asignado',
  closed = 'cerrado',
  deleted = 'eliminado',
  demilestoned = 'desmarcado como hito',
  edited = 'editado',
  labeled = 'etiquetado',
  locked = 'bloqueado',
  milestoned = 'marcado como hito',
  opened = 'abierto',
  pinned = 'anclado',
  transferred = 'transferido',
  unassigned = 'desasignado',
  unlabeled = 'desetiquetado',
  unlocked = 'desbloqueado',
  unpinned = 'desfijado'
}
