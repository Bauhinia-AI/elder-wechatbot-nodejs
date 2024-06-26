import weChatBot from './wechatbot'
import { saveAudioFile } from './utils'
const express = require('express');
import { Request, Response } from 'express';
const bodyParser = require('body-parser');

const { bot, chatText, chatAudio } = weChatBot();
bot.start();

const app = express();
const port = 8088;
// 是否进行url解码
app.use(bodyParser.urlencoded({ extended: true }))
// 将数据转换为json格式
app.use(bodyParser.json())
app.use('/audiomsg', express.static('audio_messages'));

app.post('/startchat', async (req: Request, res: Response) => {
  const data = req.body;
  console.log(data);
  try {
    const isRoom = data.room_name ? true : false;
    if (data.type === 'audio' && data.audio_url && data.duration) {
      chatAudio(data.user_id, data.audio_url, data.query, data.duration, isRoom, data.room_name);
      res.json({ success: true, error: "" });
    } else {
      chatText(data.user_id, data.query, isRoom, data.room_name);
      res.json({ success: true, error: "" });
    }

  } catch (e: any) {
    console.error(e);
    res.json({ error: e.toString(), success: false });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
