import type { Game as Gather, Player } from '@gathertown/gather-game-client'
import { App as SlackApp } from '@slack/bolt'
import { SlackTs } from './types'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ja'

const generateJoinMessage = (players: Player[]) => {
  dayjs.locale('ja')
  dayjs.extend(utc)
  dayjs.extend(timezone)
  dayjs.tz.setDefault('Asia/Tokyo')
  let message: string[] = []
  const newLine = () => message.push(` `)
  const writeLine = (value: string) => message.push(value)

  // Write the header.
  writeLine(`:fried_egg:参加人数\n*${players.length}* 人がオフィスにいるぞ`)
  const playerNames = players.map((player) => player.name).join(', ')
  newLine()
  if (playerNames) {
    writeLine(`:portrait01:参加者\n ${playerNames}`)
    newLine()
  }
  writeLine(`更新日時 ${dayjs().add(9, 'hour').format('HH:mm:ss')}`)
  newLine()
  return message.join('\n')
}

export const deleteAllMessages = async (app: SlackApp, channelId: string) => {
  try {
    const history = await app.client.conversations.history({
      channel: channelId,
    })
    if (!history.messages) return
    await Promise.all(
      history.messages.map(async (message) => {
        if (message?.app_id === process.env.SLACK_BOT_ID) {
          return await app.client.chat.delete({
            channel: channelId,
            ts: message.ts!,
          })
        }
      })
    )
  } catch (e) {
    console.log('削除エラー', e)
  }
}

export const postJoinMessage = async (
  gather: Gather,
  slack: SlackApp
): Promise<SlackTs> => {
  dayjs.locale('ja')
  dayjs.extend(utc)
  dayjs.extend(timezone)
  dayjs.tz.setDefault('Asia/Tokyo')
  const today = dayjs().add(9, 'hour').format('YYYY-MM-DD')
  await deleteAllMessages(slack, process.env.SLACK_CHANNEL_ID || '')
  const players = Object.keys(gather.players).map((key) => gather.players[key])
  const text = generateJoinMessage(players)
  const newMessage = await slack.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID || '',
    mrkdwn: true,
    text,
    attachments: [
      {
        text: '',
        actions: [
          {
            text: 'Go to Gather',
            type: 'button',
            url: encodeURI(
              `https://app.gather.town/app/${process.env.GATHER_SPACE_ID}`
            ).replace('%5C', '/'),
          },
        ],
      },
    ],
  })
  return {
    date: today,
    ts: newMessage.ts || '',
  }
}
export const updateJoinMessage = async (
  gather: Gather,
  slack: SlackApp,
  slackTs: SlackTs
): Promise<SlackTs> => {
  try {
    // slackメッセージを更新
    const players = Object.keys(gather.players).map(
      (key) => gather.players[key]
    )
    const text = generateJoinMessage(players)
    await slack.client.chat.update({
      channel: process.env.SLACK_CHANNEL_ID || '',
      ts: slackTs.ts,
      text,
    })
    return slackTs
  } catch (e) {
    console.error('更新エラー', e)
    return { date: '', ts: '' }
  }
}
