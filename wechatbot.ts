import { ScanStatus, WechatyBuilder, types } from '@juzi/wechaty'
import QrcodeTerminal from 'qrcode-terminal'
import useContact from './contact';
import { Friend } from './contact';
import { Reply, ReplyType, useAgent } from './useAgent';
import readline from 'readline';
import { ERROR_MESSAGE } from './constant';
import { FileBox } from 'file-box';


const weChatBot = () => {
    const {
        getContactList,
        getContactByAlias,
        setContactList
    } = useContact();
    const { getAudioReply, getReply, updateChatDb } = useAgent();
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

    const token = 'puppet_workpro_4e726745f4814569ad093709e1788ea9' // put your token here
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
        console.log(`user: ${JSON.stringify(user)}, friend: ${user.friend()}, ${user.coworker()}`)
        updateContactListTask()
    }).on('message', async message => {
        console.log(`new message received: ${JSON.stringify(message)}`)
        if (message.type() == types.Message.Text || message.type() == types.Message.Audio || message.type() == types.Message.Emoticon) {
            const talker = message.talker()
            const text = message.text()
            const alias: string = await talker.alias() ?? "";
            console.log(`talker: ${alias}, text: ${text}`)
            const useAudio = true;
            if (useAudio) {
                // audio msg
                // getAudioReply(alias, message.text()).then((reply: Reply) => {
                //     if (reply.type === ReplyType.AUDIO && reply.audioPath) {
                //         const fileBox = FileBox.fromFile(reply.audioPath)
                //         fileBox.mimeType = "audio/silk";
                //         talker.say(fileBox)
                //     }
                // });
                const fileBox = FileBox.fromUrl('http://localhost:8088/audiomsg/speech.silk')
                fileBox.mimeType = "audio/silk";
                fileBox.metadata = {
                    duration: 3,
                    voiceLength: 3
                };
                talker.say(fileBox)
            } else {
                //text msg
                getReply(alias, message.text())
                    .then((reply: Reply) => {
                        if (reply.type === ReplyType.TEXT) {
                            talker.say(reply.content);
                            updateChatDb(alias, false, message.text())
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        talker.say(ERROR_MESSAGE);
                    });
            }
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
    })

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
        const contactList = await bot.Contact.findAll();
        console.info("Bot", "#######################");
        console.info("Bot", "Contact number: %d\n", contactList.length);

        let friendList: Friend[] = [];
        /**
         * official contacts list
         */
        for (let i = 0; i < contactList.length; i++) {
            const contact = contactList[i];
            //   console.info(`Contact: ${contact.id} : ${contact.name()}, alias: ${contact.alias()}`);
            const alias = await contact.alias();
            friendList.push({ 'id': contact.id, 'name': contact.name(), 'alias': alias ?? '', 'contact': contact });
        }

        setContactList(friendList);
    }

    const chatText = (userAlias: string, content: string) => {
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

    const chatAudio = (userAlias: string, audioPath: string, content?: string) => {
        const friend = getContactByAlias(userAlias);
        if (friend) {
            const contact = friend.contact;
            console.log(`start chat with ${contact.name}`);
            const fileBox = FileBox.fromFile(audioPath)
            fileBox.mimeType = "audio/silk";
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
