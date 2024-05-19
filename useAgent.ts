import axios, { AxiosResponse, AxiosError } from 'axios';
import { ERROR_MESSAGE } from './constant';
import { saveAudioFile } from './utils';

export enum ReplyType {
    TEXT = 'text',
    AUDIO = 'audio',
    ERROR = 'error'
}

export interface Reply {
    type: ReplyType;
    content: string;
    audioPath?: string;
}

export const useAgent = () => {

    const fs = require('fs');

    interface ResponseData {
        response: string;
    }

    async function getAudioReply(query: string, userId: string): Promise<Reply> {
        const url: string = "http://47.95.21.135:8014/chat";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const data: Record<string, string | boolean> = { "user_id": userId, "query": query, "is_audio": 'True' };

        try {
            return await axios.post(url, data, { headers }).then(
                (response: AxiosResponse) => {
                    if (response.status !== 200) {
                        console.log("Error with the request:", response.status);
                        return { 'type': ReplyType.TEXT, 'content': ERROR_MESSAGE };
                    }
                    // Assuming the server returns an audio file
                    const audioContent: ArrayBuffer = response.data;
                    // Save the audio content to a local file
                    const filePath = saveAudioFile(audioContent)
                    return { 'type': ReplyType.AUDIO, 'content': response.data.response, 'audioPath': filePath };
                }
            ).catch((error: AxiosError) => {
                console.error(error);
                return Promise.resolve({ 'type': ReplyType.ERROR, 'content': ERROR_MESSAGE })
            }
            );
        } catch (error) {
            console.error(error);
            return Promise.resolve({ 'type': ReplyType.ERROR, 'content': ERROR_MESSAGE });
        }
    }

    async function getReply(userAlias: string, query: string): Promise<Reply> {
        try {
            const url = "http://47.95.21.135:8014/chat";
            const data = {
                user_id: userAlias,
                query: query
            };
            return axios.post(url, data)
                .then((response: AxiosResponse) => {
                    console.log("Chat Response:", response.data.response);
                    return { 'type': ReplyType.TEXT, 'content': response.data.response };
                })
                .catch((error: AxiosError) => {
                    console.error(error);
                    return { 'type': ReplyType.ERROR, 'content': ERROR_MESSAGE };
                });
        } catch (e) {
            console.error(e);
            return Promise.resolve({ 'type': ReplyType.ERROR, 'content': ERROR_MESSAGE });
        }
    }

    async function updateChatDb(userId: string, isBot: boolean, content: string): Promise<void> {
        const url = "http://47.95.21.135:8081/chatMessage/addChatMessage";
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

    return { getAudioReply, getReply, updateChatDb };
}