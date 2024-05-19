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
    if (data.type === 'audio') {
      const audioContent: ArrayBuffer = data.audio;
      const filePath = saveAudioFile(audioContent);
      chatAudio(data.user_id, filePath, data.query);
      res.json({ success: true, error: "" });
    } else {
      chatText(data.user_id, data.query);
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
// const fs = require('fs');
// const {
//   decode,
//   encode,
//   compare,
// } = require('silk-sdk');
// fs.createReadStream('/Users/xyd/Cropo/temp_audio/speech.mp3')
//   .pipe(encode({ quiet: true }))
//   .pipe(fs.createWriteStream('/Users/xyd/Cropo/temp_audio/speech.silk'));