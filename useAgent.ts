import axios, { AxiosResponse, AxiosError } from 'axios';
import { ERROR_MESSAGE } from './constant';

export enum ReplyType {
    TEXT = 'text',
}

export interface Reply {
    type: ReplyType;
    content: string;
}

export const useAgent = () => {

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
                    return { 'type': ReplyType.TEXT, 'content': ERROR_MESSAGE };
                });
        } catch (e) {
            console.error(e);
            return Promise.resolve({ 'type': ReplyType.TEXT, 'content': ERROR_MESSAGE });
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

    return { getReply, updateChatDb };
}