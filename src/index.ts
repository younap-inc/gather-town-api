import {
  Game as Gather,
  Player,
  SpriteDirectionEnum_ENUM,
} from '@gathertown/gather-game-client'
import { App as SlackApp } from '@slack/bolt'
import * as http from 'http'
import { initGather } from './gather'
import {
  updateJoinMessage,
  postJoinMessage,
  deleteAllMessages,
} from './message'
import { initSlack } from './slack'
import { SlackTs } from './types'
const dayjs = require('dayjs')

const port = process.env.PORT || 8080
// playerJoinsが1回の入出で複数回実行されることがあり、slackへの投稿が重複してしまうことがある。
// これを防ぐためのフラグ
let processing = false

process.on('uncaughtException', function (err) {
  console.log('------------ Exception!! -----------')
  console.log(err)
})

const healthServerListener = () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(JSON.stringify({ result: true }))
  })
  server.listen(port)
}

let slackTs: SlackTs = { date: '', ts: '' }
;(async () => {
  healthServerListener()
  const gather = await initGather()
  const slack = await initSlack()

  gather.subscribeToConnection((connected) => {
    console.log('😈', { connected })
    gather.subscribeToEvent('playerJoins', async (data, context) => {
      console.log('player joined')
      if (processing) return
      processing = true
      slackTs = await postJoinMessage(gather, slack)
      processing = false
    })

    gather.subscribeToEvent('playerExits', async (data, context) => {
      console.log('player exit')
      if (processing) return
      processing = true
      const today = dayjs().format('YYYY-MM-DD')
      // 本日未投稿の場合
      if (slackTs?.date !== today) {
        slackTs = await postJoinMessage(gather, slack)
      } else {
        slackTs = await updateJoinMessage(gather, slack, slackTs)
      }
      processing = false
    })
  })
  // スラッシュコマンド"/players"を受信
  // @ts-ignore
  slack.command('/players', async ({ ack, say }) => {
    await ack()
    slackTs = await postJoinMessage(gather, slack)
  })

  // スラッシュコマンド"/removes"を受信
  // @ts-ignore
  slack.command('/removes', async ({ ack, say }) => {
    await ack()
    await deleteAllMessages(slack, process.env.SLACK_CHANNEL_ID || '')
  })
})()
