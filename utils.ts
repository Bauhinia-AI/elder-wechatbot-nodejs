import { v4 as uuidv4 } from 'uuid';

export function saveAudioFile(audioContent: ArrayBuffer): string {
    const fs = require('fs');
    const fileDir = './audio_messages/';
    const fileName = uuidv4() + '.silk';
    const filePath = fileDir + fileName
    fs.writeFileSync(filePath, audioContent);
    return filePath;
}