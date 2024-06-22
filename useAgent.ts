import axios, { AxiosResponse, AxiosError } from 'axios';
import { AI_AGENT_HOST, DB_HOST, ERROR_MESSAGE } from './constant';
import { saveAudioFile } from './utils';

export enum ReplyType {
    TEXT = 'text',
    AUDIO = 'audio',
    ERROR = 'error'
}

export interface Reply {
    type: ReplyType;
    content: string;
    audioUrl?: string;
    audioDuration?: number;
}

export const useAgent = () => {

    const fs = require('fs');

    async function getReply(userAlias: string, query: string, isAudio: boolean = false): Promise<Reply> {
        try {
            const url = "http://47.95.21.135:8014/chat";
            const data = {
                user_id: userAlias,
                query: query,
                is_audio: isAudio
            };
            if (isAudio) {
                return axios.post(url, data)
                    .then((response: AxiosResponse) => {
                        console.log("Chat Response:", response.data.response);
                        return { type: ReplyType.AUDIO, content: response.data.response, audioUrl: response.data.silk_url, audioDuration: response.data.duration };
                    })
                    .catch((error: AxiosError) => {
                        console.error(error);
                        return { 'type': ReplyType.ERROR, 'content': error.message };
                    });
            } else return axios.post(url, data)
                .then((response: AxiosResponse) => {
                    console.log("Chat Response:", response.data.response);
                    return { 'type': ReplyType.TEXT, 'content': response.data.response };
                })
                .catch((error: AxiosError) => {
                    console.error(error);
                    return { 'type': ReplyType.ERROR, 'content': error.message };
                });
        } catch (e) {
            console.error(e);
            return Promise.resolve({ 'type': ReplyType.ERROR, 'content': e });
        }
    }


    async function updateChatDb(userId: string, isBot: boolean, content: string): Promise<void> {
        const url = `${DB_HOST}/chatMessage/addChatMessage`;
        const data = {
            remarkName: userId,
            isBot: isBot ? 1 : 0,
            messageContent: content
        };
        const headers = {
            "Content-Type": "application/json"
        };

        try {
            const response: AxiosResponse = await axios.post(url, data, { headers: headers });
            console.log(`updateChatDb response=${response}, userId=${userId}, isBot=${isBot}, content=${content}`);
        } catch (error: any) {
            console.error(error);
        }
    }

    return { getReply, updateChatDb };
}