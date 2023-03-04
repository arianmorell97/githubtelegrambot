declare namespace NodeJS {
  interface ProcessEnv {
    BOT_TOKEN: string
    OCTO_WIZARD_HOOK_SECRET: string
    CHAT_ID_BOT: string | number
    WEBHOOK_SERVER_PORT: number
  }
}
