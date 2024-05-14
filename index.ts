import { ScanStatus, WechatyBuilder, types } from '@juzi/wechaty'
import QrcodeTerminal from 'qrcode-terminal'
import weChatBot from './wechatbot'

const express = require('express');
import { Request, Response } from 'express';
const bodyParser = require('body-parser');

const { bot, chatText } = weChatBot();
bot.start();
const app = express();
const port = 8088;
// 是否进行url解码
app.use(bodyParser.urlencoded({ extended: true }))
// 将数据转换为json格式
app.use(bodyParser.json())
interface ChatData {
  user_id: string;
  text: string;
}
app.post('/startchat', async (req: Request, res: Response) => {
  const data = req.body;
  console.log(data);
  try {
    chatText(data.user_id, data.query);
    res.json({ success: true, error: "" });
  } catch (e: any) {
    console.error(e);
    res.json({ error: e.toString(), success: false });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

