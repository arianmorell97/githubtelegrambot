<div align="center">
  <h1>Github Webhooks with TelegrambotBot
</div>

<!-- <div align="center">
  <a href="https://www.npmjs.com/package/next-hcaptcha"><img alt="npm version badge" src="https://badgen.net/npm/v/next-hcaptcha"></a>
  <img alt="types information" src="https://badgen.net/npm/types/next-hcaptcha">
  <img alt="npm bundle size" src="https://badgen.net/bundlephobia/minzip/next-hcaptcha">
  <img alt="license badge" src="https://badgen.net/npm/license/next-hcaptcha">

</div> -->

<br />

## Introduction

This library provides a simple server with the responsibility of notifying Github events by Telegram in the chats that are indicated and you are a member.

## Features

-

## Configuration

Configuration is done by passing options object as second `withHCaptcha` function call argument.

Default options with all properties explained:
in your enviroment `.env` file

```js
BOT_TOKEN = [secret] // Token proporcionado por [Bot](https://t.me/BotFather)
GITHUB_WEBHOOK_SECRET = [hook_secret] // Secret to Github Webhook
CHAT_ID_BOT = [chat_id] // ID for chat where send menssages
WEBHOOK_SERVER_PORT = [port] // Server Port
```

## Errors

`githubtelegrambot` bug reports and required changes.

**NOTE**: Error optimization described in point **2.** and **3.** can be disabled by setting `skipCaptchaRequestsOptimization` in configuration to `true` and way of informing about errors described in point **1.**
can be restored to traditional way by setting `errorDisplayMode` to `'code'`

1. You want it to take the chat id when it is added or belongs to a group

## Ending speech

This project is licensed under the MIT license.
All contributions are welcome.

<!-- [hcaptcha-docs-errors]: https://docs.hcaptcha.com/#siteverify-error-codes-table
[next-homepage]: https://nextjs.org/
[next-api-routes]: https://nextjs.org/docs/api-routes/introduction -->
