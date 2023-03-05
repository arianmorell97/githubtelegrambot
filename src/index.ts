/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import bodyParser from 'body-parser'
import express, { RequestHandler } from 'express'
import { config } from 'dotenv'
import { Composer, Context, Middleware, Telegraf } from 'telegraf'
import { telegrafThrottler } from 'telegraf-throttler'
// import fs from 'fs'
import { verifyGithubPayload } from './utils/middleware'
import { issuesActionType, issuesCommentActionType } from './types'
import { sendCustomMessage } from './utils/customMessage'
import { DataConfig } from 'env'

// Load .env
const configEnv = config()

if (configEnv.error != null) {
  throw new Error('ha ocurrido un error al cargar env')
}

if (configEnv.parsed != null) {
  console.log(new Date().toLocaleString(), '.env loaded')
}

const token = process.env.BOT_TOKEN

export let dataConfig: DataConfig = { id_forum: 0, chat_id: 0 }

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
export const bot = new Telegraf(token as string)

const privateThrottler = telegrafThrottler()
const groupThrottler = telegrafThrottler({
  in: {
    // Aggresively drop inbound messages
    highWater: 0, // Trigger strategy if throttler is not ready for a new job
    maxConcurrent: 1, // Only 1 job at a time
    minTime: 5000 // Wait this many milliseconds to be ready, after a job
  },
  inKey: 'from' // Throttle inbound messages by chat.id instead
})

const partitioningMiddleware: Middleware<Context> = async (ctx, next) => {
  const chatId = Number(ctx.chat?.id)
  return await Composer.optional(
    () => chatId < 0,
    groupThrottler,
    privateThrottler
  )(ctx, next)
}
bot.use(partitioningMiddleware)

bot.command('/notifyhere', async (ctx) => {
  const chat = await ctx.getChat()

  const isChatAdmins = (await ctx.getChatAdministrators()).find(
    (admin) => admin.user.username === ctx.from.username
  )
  if (chat.type !== 'supergroup') {
    void ctx.reply('este comando solo se puede usar en supergrupos')
  }
  if (isChatAdmins === undefined) {
    void ctx.reply(
      'No inventes! Solo los administradores del grupo pueden usar este comando'
    )
  }

  if (
    (isChatAdmins !== undefined && chat.type === 'supergroup') ||
    chat.type === 'group'
  ) {
    const newDataConfig = {
      ...dataConfig,
      id_forum:
        ctx.update.message.message_thread_id != null
          ? ctx.update.message.message_thread_id
          : 0,
      chat_id: chat.id
    }
    dataConfig = newDataConfig
    console.log(new Date().toLocaleString(), dataConfig)
    void ctx.reply('Se actualizó correctamente la configuración')
  }
})

void bot.telegram.setMyCommands([
  {
    command: 'notifyhere',
    description: 'El Bot notificara en este chat.'
  }
])

void bot.launch()

// Below start webhook server
const app = express()

app.use(bodyParser.json())

const PORT = process.env.WEBHOOK_SERVER_PORT

app.listen(PORT, () => {
  console.log(new Date().toLocaleString(), `Server running on port ${PORT}`)
})

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const eventsHandler: RequestHandler = (req, res) => {
  console.log(new Date().toLocaleString(), dataConfig)
  if (dataConfig.chat_id === 0) {
    console.error('No se ha inicializado la configuración')
    return res.status(400).send('No se ha inicializado la configuración')
  }
  console.log(new Date().toLocaleString(), req.event_type, req.action)

  // console.log(new Date().toLocaleString(),JSON.stringify(req.payload, null, 2))

  const { payload } = req
  console.log(
    new Date().toLocaleString(),
    `Evento: ${req.event_type}, Acción: ${req.action}`
  )
  if (req.event_type === 'issues') {
    // Get the relevant properties
    const action = req.action as keyof typeof issuesActionType
    const issue = payload.issue
    const user = payload.sender
    const labels = issue.labels

    // Format the message
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

      sendCustomMessage(message)
      // console.log(new Date().toLocaleString(),message)
    } catch (error) {
      console.error(error)
      sendCustomMessage('Algo ha salido mal con el Webhook')
    }
  }

  if (req.event_type === 'issue_comment') {
    // Get the relevant properties
    const action = req.action
    const issue = payload.issue
    const user = payload.sender
    const editedComment = action === 'edited' ? payload.changes.body.from : null
    const comment = action !== 'edited' ? payload.comment.body : null

    // Format the message
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

      sendCustomMessage(message)
      // console.log(new Date().toLocaleString(),message)
    } catch (error) {
      console.error(error)
      sendCustomMessage('Algo ha salido mal con el Webhook')
    }
  }
  return res.send('ok')
}

app.use('/', verifyGithubPayload, eventsHandler)
