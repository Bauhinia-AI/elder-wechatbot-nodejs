import { ScanStatus, WechatyBuilder, types } from '@juzi/wechaty'
import QrcodeTerminal from 'qrcode-terminal'
import useContact from './contact';
import { Friend } from './contact';
import { Reply, ReplyType, useAgent } from './useAgent';
import readline from 'readline';
import { ERROR_MESSAGE, PUPPET_TOKEN, ROOM_NAME_LOG, USE_AUDIO_REPLY, WECHAT_BOT_HOST } from './constant';
import { FileBox } from 'file-box';
import useRoom, { ChatRoom } from './room';


const weChatBot = () => {
    const {
        getContactList,
        getContactByAlias,
        setContactList,
        updateUserInfo
    } = useContact();
    const { setRoomList, getRoomByTopic } = useRoom();
    const { getReply, updateChatDb } = useAgent();
    async function getVerifyCode(): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('Please enter the verification code: ', (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    const token = PUPPET_TOKEN // put your token here
    const bot = WechatyBuilder.build({
        puppet: '@juzi/wechaty-puppet-service',
        puppetOptions: {
            token,
            tls: {
                disable: true
                // currently we are not using TLS since most puppet-service versions does not support it. See: https://github.com/wechaty/puppet-service/issues/160
            }
        }
    })

    const store = {
        qrcodeKey: '',
    }

    bot.on('scan', (qrcode, status, data) => {
        console.log(`qrcode : ${qrcode}, status: ${status}, data: ${data}`)
        if (status === ScanStatus.Waiting) {
            store.qrcodeKey = getQrcodeKey(qrcode) || ''
            QrcodeTerminal.generate(qrcode, {
                small: true
            })
        }
    }).on('verify-code', async (id: string, message: string, scene: types.VerifyCodeScene, status: types.VerifyCodeStatus) => {
        // 需要注意的是，验证码事件不是完全即时的，可能有最多10秒的延迟。
        // 这与底层轮询二维码状态的时间间隔有关。
        if (status === types.VerifyCodeStatus.WAITING && scene === types.VerifyCodeScene.LOGIN && id === store.qrcodeKey) {
            console.log(`receive verify-code event, id: ${id}, message: ${message}, scene: ${types.VerifyCodeScene[scene]} status: ${types.VerifyCodeStatus[status]}`)
            const verifyCode = await getVerifyCode() // 通过一些途径输入验证码
            try {
                await bot.enterVerifyCode(id, verifyCode) // 如果没抛错，则说明输入成功，会推送登录事件
                return
            } catch (e) {
                console.log((e as Error).message)

                // 如果抛错，请根据 message 处理，目前发现可以输错3次，超过3次错误需要重新扫码。
                // 错误关键词: 验证码错误输入错误，请重新输入
                // 错误关键词：验证码错误次数超过阈值，请重新扫码'
                // 目前不会推送 EXPIRED 事件，需要根据错误内容判断
            }
        }
    }).on('login', user => {
        console.log(`user: ${JSON.stringify(user)}, friend: ${user.friend()}, ${user.coworker()}`);
        updateContactListTask();
    }).on('message', async message => {
        console.log(`new message received: ${JSON.stringify(message)}`)
        const room = message.room();
        if (room) {
            // 暂不处理群聊消息
            console.log(`message from room: ${room.id}`)
            return;
        }
        if (message.type() == types.Message.Text || message.type() == types.Message.Audio || message.type() == types.Message.Emoticon) {
            const talker = message.talker()
            const text = message.text()
            const alias: string = await talker.alias() ?? "";
            console.log(`talker: ${alias}, text: ${text}`)
            updateChatDb(alias, false, message.text())
            getReply(alias, message.text(), USE_AUDIO_REPLY)
                .then((reply: Reply) => {
                    if (USE_AUDIO_REPLY) {
                        // audio reply 
                        if (reply.type === ReplyType.AUDIO && reply.audioUrl && reply.audioDuration) {
                            console.log('audio reply, url: ' + reply.audioUrl.toString() + ', duration: ' + reply.audioDuration + 's')
                            const fileBox = FileBox.fromUrl(reply.audioUrl)
                            fileBox.mimeType = "audio/silk";
                            fileBox.metadata = {
                                duration: reply.audioDuration,
                                voiceLength: reply.audioDuration
                            };
                            talker.say(fileBox)
                        }
                    } else {
                        if (reply.type === ReplyType.TEXT) {
                            talker.say(reply.content);

                        }
                    }
                    if (reply.type === ReplyType.ERROR) {
                        roomLog({ 'user': alias, 'content': message.text(), 'error_msg': reply.content }.toString());
                    }
                    updateChatDb(alias, true, reply.content)
                })
                .catch(error => {
                    console.error(error);
                });
        } else {
            console.log(`message type: ${message.type()} is not supported`)
        }
    }).on('error', err => {
        console.log(err)
    }).on('room-announce', (...args) => {
        console.log(`room announce: ${JSON.stringify(args)}`)
    }).on('contact-alias', (...args) => {
        console.log(`contact alias: ${JSON.stringify(args)}`)
        updateContactListOnce()
    }).on('tag', (...args) => {
        console.log(`tag: ${JSON.stringify(args)}`)
    }).on('friendship', async (friendship) => {
        if (friendship.type() === bot.Friendship.Type.Receive) { // 收到新的好友请求
        } else if (friendship.type() === bot.Friendship.Type.Confirm) { // 确认好友关系
            console.log(`与${friendship.contact().name()}的新的好友关系已确认`)
            updateContactListOnce();
        }

    })

    const roomLog = (msg: string) => {
        chatText("", msg, true, ROOM_NAME_LOG);
    }

    const getQrcodeKey = (urlStr: string) => {
        const url = new URL(urlStr);
        return url.searchParams.get('key');
    }

    async function updateContactListTask() {
        updateContactListOnce();
        const SLEEP = 600;
        console.info(
            "Bot",
            "I will re-dump contact weixin id & names after %d second... ",
            SLEEP
        );
        setTimeout(updateContactListTask, SLEEP * 1000);
    }

    async function updateContactListOnce() {
        updateUserInfo(); //pull server user info
        updateFriendList();
        updateRoomList();
    }

    async function updateFriendList() {
        const contactList = await bot.Contact.findAll();
        // console.info("Bot", "#######################");
        console.info("Bot", "Contact number: %d\n", contactList.length);
        let friendList: Friend[] = [];
        /**
         * official contacts list
         */
        for (let i = 0; i < contactList.length; i++) {
            const contact = contactList[i];
            //   console.info(`Contact: ${contact.id} : ${contact.name()}, alias: ${contact.alias()}`);
            const alias = await contact.alias().then((alias) => {
                // console.log(`alias: ${alias}`);
                return alias;
            });
            friendList.push({ 'id': contact.id, 'name': contact.name(), 'alias': alias ?? '', 'contact': contact });
            // console.log(`contact: ${contact.name()}, alias: ${alias}`);
        }
        // console.log(friendList);
        setContactList(friendList);
    }

    async function updateRoomList() {
        const contactList = await bot.Room.findAll();
        console.info("Bot", "Room number: %d\n", contactList.length);
        let roomList: ChatRoom[] = [];
        for (let i = 0; i < contactList.length; i++) {
            const contact = contactList[i];
            const topic = await contact.topic();
            roomList.push({ 'roomName': topic, 'room': contact });
        }
        setRoomList(roomList);
    }

    const chatText = (userAlias: string, content: string, isRoom?: boolean, roomName?: string) => {
        if (isRoom && roomName) {
            // room chat
            const room = getRoomByTopic(roomName);
            if (room) {
                console.log(`start chat with room ${room.roomName}`);
                room.room.say(content);
            } else {
                console.log(`room not found with name ${roomName}`);
            }
            return;
        }
        // else friend chat
        const friend = getContactByAlias(userAlias);
        if (friend) {
            const contact = friend.contact;
            console.log(`start chat with ${contact.name}`);
            contact.say(content);
            updateChatDb(userAlias, true, content)
        } else {
            console.log(`contact not found with alias ${userAlias}`);
        }
    }

    const chatAudio = (userAlias: string, audioUrl: string, content?: string, duration?: number, isRoom?: boolean, roomName?: string) => {
        if (isRoom && roomName) {
            // room chat
            const room = getRoomByTopic(roomName);
            if (room) {
                console.log(`start chat with room ${room.roomName}`);
                const fileBox = FileBox.fromUrl(audioUrl)
                fileBox.mimeType = "audio/silk";
                fileBox.metadata = {
                    duration: duration,
                    voiceLength: duration
                };
                room.room.say(fileBox)
            } else {
                console.log(`room not found with name ${roomName}`);
            }
        }
        // friend chat
        const friend = getContactByAlias(userAlias);
        if (friend) {
            const contact = friend.contact;
            console.log(`bot start chat with ${contact.name}`);
            const fileBox = FileBox.fromUrl(audioUrl)
            fileBox.mimeType = "audio/silk";
            fileBox.metadata = {
                duration: duration,
                voiceLength: duration
            };
            contact.say(fileBox)
            if (content) {
                updateChatDb(userAlias, true, content);
            }
        } else {
            console.log(`contact not found with alias ${userAlias}`);
        }
    }

    return { bot, chatText, chatAudio };
}

export default weChatBot
