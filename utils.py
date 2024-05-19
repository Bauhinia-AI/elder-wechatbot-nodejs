from pydub import AudioSegment
import os
import pilk
import logging

l = logging.getLogger("pydub.converter")
l.setLevel(logging.DEBUG)
l.addHandler(logging.StreamHandler())


def convert_mp3_to_silk(audio_path):
    print("💡", audio_path)
    # audio = AudioSegment.from_file(audio_path, format="mp4")
    # audio = AudioSegment.from_mp3(audio_path)
    try:
        audio = AudioSegment.from_file(
            audio_path,
            "mp3",
            parameters=["-analyzeduration", "100M", "-probesize", "100M"],
        )
    except:
        print(f"Error while reading the audio file: {e}")  # Print the error
        audio = AudioSegment.from_file(audio_path, format="mp4")

    # 确保采样率是支持的值之一
    supported_rates = [8000, 12000, 16000, 24000, 32000, 44100, 48000]
    if audio.frame_rate not in supported_rates:
        target_rate = 16000
    else:
        target_rate = audio.frame_rate

    pcm_path = audio_path.rsplit(".", 1)[0]
    silk_path = pcm_path + ".silk"
    pcm_path += ".pcm"
    print(silk_path)
    audio.export(
        pcm_path, format="s16le", parameters=["-ar", str(target_rate), "-ac", str(audio.channels)]
    ).close()

    pilk.encode(pcm_path, silk_path, pcm_rate=target_rate, tencent=True)
    print(f"Converted file saved to: {silk_path}")


if __name__ == "__main__":
    convert_mp3_to_silk("/Users/xyd/Cropo/temp_audio/speech.mp3")
    # pilk.encode('/Users/xyd/Cropo/temp_audio/speech.pcm',
    #             "/Users/xyd/Cropo/elder-wechatbot-nodejs/audio_messages/speech.silk", 16000, tencent=True)
