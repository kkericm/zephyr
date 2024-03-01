import TelegramBot from 'node-telegram-bot-api';
import path from "path"
import fs from "fs"
import qr from "qrcode"
import ytdl from "ytdl-core"
import ytSeach from "yt-search"

const bot = new TelegramBot("6157411466:AAGUFR2hh1aknQinOZO21i3S1WF3eqTUafM", { polling: true });

var config = {
    waitParam: false,
    commandRes: '',
    callOn: false
}

bot.setMyCommands([
    {command: "qrcode", description: "Gera um QrCode."},
    {command: "yt", description: "Baixa musicas do YouTube."},
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
            const vid = (await ytSeach({query: param[0], category: "music"})).videos[0]
            let th = await bot.sendMessage(event.chat.id as number, "Enviando, aguarde...")
            try {
                let videoInfo = await ytdl.getInfo(vid.url);
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
                    bot.sendAudio(event.chat.id as number, audioBuffer, {
                        title: videoInfo.videoDetails.title + '.mp3', 
                        performer: videoInfo.videoDetails.author.name
                    }).then(r => {
                        bot.deleteMessage(th.chat.id, th.message_id)
                    });
                });
            } catch (error) {
                bot.sendMessage(event.chat.id, "Houve um erro.")
                console.error(error);
                throw error;
            }
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