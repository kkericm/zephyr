import TelegramBot from 'node-telegram-bot-api';
import path from "path"
import fs from "fs"
import qr from "qrcode"
import ytdl from "ytdl-core"
import ytSeach from "yt-search"
import { log } from 'console';

const bot = new TelegramBot("6157411466:AAGUFR2hh1aknQinOZO21i3S1WF3eqTUafM", { polling: true });

var config = {
    waitParam: false,
    commandRes: '',
    callOn: false
}

bot.setMyCommands([
    {command: "qrcode", description: "Gera um QrCode."},
    {command: "yt", description: "Baixa audios de videos."},
])

function commands(event: TelegramBot.Message, param: string[]): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá`)
        },
        qrcode() {
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Foneça o link...")
                config.waitParam = true
                config.commandRes = "qrcode"
            } else {
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff)
                })
            }
        },
        async yt() {
            const vid = (await ytSeach({query: param[0], category: "music"})).videos.slice(0, 11)
            let x = ''
            let y: any[] = []
            for (let i = 1; i <= 10; i++) {
                x += `${i}. ${vid[i].title}. [${vid[i].duration.timestamp}]\n`
                if (i == 6 || i == 1) y.push([
                    {text: i, callback_data: `yt:${vid[i].url}`}, 
                    {text: i + 1, callback_data: `yt:${vid[i + 1].url}`},
                    {text: i + 2, callback_data: `yt:${vid[i + 2].url}`},
                    {text: i + 3, callback_data: `yt:${vid[i + 3].url}`},
                    {text: i + 4, callback_data: `yt:${vid[i + 4].url}`}
                ])
            }
            bot.sendMessage(event.chat.id, x, {
                reply_markup: {
                    inline_keyboard: y
                }
            })
        }
    }
}

function waits(event: TelegramBot.Message): { [key: string]: any } {
    return {
        // what(...params: any[]) {
        //     bot.sendMessage(event.chat.id, `Ah sim ${params}, entendi...`)
        //     config.commandRes = ''
        //     config.waitParam = false
        // },
        qrcode(...params: any[]) {
            qr.toBuffer(params[0], (err, buff) => {
                bot.sendPhoto(event.chat.id, buff)
            })
            config.commandRes = ''
            config.waitParam = false
        }
    }
}

function calls(event: TelegramBot.CallbackQuery, data: string[]): { [key: string]: any } {
    return {
        hell() {
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim": "não"}.`, {
                chat_id: event.message?.chat.id,
                message_id: event.message?.message_id
            })
        },
        async yt() {
            let th = await bot.sendMessage(event.message?.chat.id as number, "Enviando, aguarde...")
            try {
                let videoInfo = await ytdl.getInfo(data.join(':'));
                let audioFormat = ytdl.chooseFormat(videoInfo.formats, { filter: 'audioonly' });
                const audioStream = ytdl.downloadFromInfo(videoInfo, {
                    format: audioFormat,
                    quality: 'highestaudio',
                });

                let audioBuffer = Buffer.from('');
                audioStream.on('data', (chunk) => {
                    audioBuffer = Buffer.concat([audioBuffer, chunk]);
                });
                audioStream.on('end', () => {
                    bot.sendAudio(event.message?.chat.id as number, audioBuffer, {
                        title: videoInfo.videoDetails.title + '.mp3', 
                        performer: videoInfo.videoDetails.ownerChannelName
                    }).then(r => {
                        bot.deleteMessage(th.chat.id, th.message_id)
                    });
                });
            } catch (error) {
                console.error(error);
                throw error;
            }
            config.callOn = false
        }
    }
}

bot.on("message", event => {
    let msg = event.text as string;
    if (msg.startsWith("/")) {
        config.waitParam = false;
        config.commandRes = '';
        let command = msg.slice(1).split(" ");
        let _commands = commands(event, command.slice(1));
        if (Object.keys(_commands).includes(command[0])) _commands[command[0]]();
        else bot.sendMessage(event.chat.id, "Comando desconhecido.");

    } else if (config.waitParam) {
        waits(event)[config.commandRes](msg);
    }
})

bot.on("callback_query", event => {
    let dal = event.data?.split(":") as string[];
    if (!config.callOn) {
        config.callOn = true;
        calls(event, dal.slice(1))[dal[0]]();
    }
})

bot.on('polling_error', event => {
    console.log(event.message);
})

console.log("Zephyr está on-line");