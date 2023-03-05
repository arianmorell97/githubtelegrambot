/* eslint-disable @typescript-eslint/indent */
import 'express'
import { issuesCommentActionType, issuesActionType } from './src/types'

type issuesCommentAction = keyof typeof issuesCommentActionType
type issuesAction = keyof typeof issuesActionType
declare global {
  namespace Express {
    interface Request {
      event_type: string
      action: issuesCommentAction | issuesCommentAction
      payload: any
    }
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    BOT_TOKEN: string
    GITHUB_WEBHOOK_SECRET: string
    CHAT_ID_BOT: string | number
    WEBHOOK_SERVER_PORT: number
  }
}

export interface DataConfig {
  id_forum: number
  chat_id: number
}
