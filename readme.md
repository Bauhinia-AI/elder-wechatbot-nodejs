# 康养前端机器人
## API
###  1. /startchat 主动发起对话/语音
#### 参数:
- user_id: 发送对象
- query: 文字内容(发送语音填写对应文字)
- type: 发送类型(语音为audio)
- audio_url: 语音url
- duration: 语音长度
- room_name: 发送到群聊名称
#### 请求体示例
##### 1. 发送文字到个人:
```json
{"user_id": "邵琦", "query": "您好"}
```
##### 2. 发送语音到个人:
```json
{"user_id": "邵琦", "query": "您好", "type":"audio", "audio_url": "http://47.95.21.135:8014/static/temp_audios/azure_2024-05-20T16-46-58-317Z.silk","duration":14.4}
```

##### 3. 发送文字到群聊:
```json
{ "query": "您好", "room_name": "康养后台信息"}
```

##### 4. 发送语音到群聊:
```json
{ "query": "您好", "type":"audio", "audio_url": "http://47.95.21.135:8014/static/temp_audios/azure_2024-05-20T16-46-58-317Z.silk","duration":14.4, "room_name": "康养后台信息"}
```