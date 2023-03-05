import { bot, dataConfig } from '../'

export const sendCustomMessage = (message: string): void => {
  try {
    void bot.telegram.sendMessage(dataConfig.chat_id, message, {
      message_thread_id:
        dataConfig.id_forum !== 0 ? dataConfig.id_forum : undefined,
      parse_mode: 'HTML'
    })
    console.log(new Date().toLocaleString(), 'Mensaje de evento enviado')
  } catch (error) {
    console.error(error)
    // void bot.telegram.sendMessage(chatId, 'Algo ha salido mal')
    throw new Error('No se ha podido enviar el mensaje')
  }
}
