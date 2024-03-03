import TelegramBot from 'node-telegram-bot-api';
import { config } from "dotenv"; config();
import path from "path";
import fs from "fs";
import qr from "qrcode";
import ytdl from "ytdl-core";
import ytSeach from "yt-search";
import Jimp from "jimp";

const bot = new TelegramBot(process.env.TOLKEN as string, { polling: true });

var settings = {
    waitParam: false,
    commandRes: '',
    callOn: false
}

bot.setMyCommands([
    {command: "qrcode", description: "Gera um QrCode."},
    {command: "yt", description: "Baixa musicas do YouTube."},
])


function privateCommands(event: TelegramBot.Message, param: string[]): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá`)
        },
        qrcode() {
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.")
                settings.waitParam = true
                settings.commandRes = "qrcode"
            } else {
                bot.sendMessage(event.chat.id, "Enviando, aguarde...")
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff)
                })
            }
        },
        async yt() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({query: param[0], category: "music"})).videos[0]
                let th = await bot.sendMessage(event.chat.id as number, "Enviando, aguarde...")
                try {
                    if (vid === undefined) {
                        bot.sendMessage(event.chat.id, "Houve um erro.")
                    } else {
                        let videoInfo: ytdl.videoInfo = await ytdl.getInfo(vid.url);
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
                }
            } catch (error) {
                bot.sendMessage(event.chat.id, "Houve um erro.")
                // console.error(error);
                throw error;
            }
            } else {
                bot.sendMessage(event.chat.id, "Qual o nome da música?")
                settings.waitParam = true
                settings.commandRes = "yt"
            }
        },
    }
}

function privateWaits(event: TelegramBot.Message): { [key: string]: any } {
    return {
        qrcode(...params: any[]) {
            bot.sendMessage(event.chat.id, "Enviando, aguarde...");
            qr.toBuffer(params[0], (err, buff) => {
                bot.sendPhoto(event.chat.id, buff);
            });
            settings.commandRes = '';
            settings.waitParam = false;
        },
        yt() {
            privateCommands(event, [event.text as string]).yt();
            settings.commandRes = '';
            settings.waitParam = false;
        }
    }
}

function privateCalls(event: TelegramBot.CallbackQuery, data: string[]): { [key: string]: any } {
    return {
        hell() {
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim": "não"}.`, {
                chat_id: event.message?.chat.id,
                message_id: event.message?.message_id
            })
        }
    }
}


function groupCommands(event: TelegramBot.Message, param: string[]): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá`)
        },
        qrcode() {
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", {
                    reply_to_message_id: event.message_id
                })
                settings.waitParam = true
                settings.commandRes = "qrcode"
            } else {
                bot.sendMessage(event.chat.id, "Enviando, aguarde...", {
                    reply_to_message_id: event.message_id
                })
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff)
                })
            }
        },
        async yt() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({query: param[0], category: "music"})).videos[0]
                let th = await bot.sendMessage(event.chat.id as number, "Enviando, aguarde...", {
                    reply_to_message_id: event.message_id
                })
                try {
                    if (vid === undefined) {
                        bot.sendMessage(event.chat.id, "Houve um erro.", {
                            reply_to_message_id: event.message_id
                        })
                    } else {
                        let videoInfo: ytdl.videoInfo = await ytdl.getInfo(vid.url);
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
                }
            } catch (error) {
                bot.sendMessage(event.chat.id, "Houve um erro.", {
                    reply_to_message_id: event.message_id
                })
                // console.error(error);
                throw error;
            }
            } else {
                bot.sendMessage(event.chat.id, "Qual o nome da música?", {
                    reply_to_message_id: event.message_id
                })
                settings.waitParam = true
                settings.commandRes = "yt"
            }
        },
    }
}

function groupWaits(event: TelegramBot.Message): { [key: string]: any } {
    return {
        qrcode(...params: any[]) {
            bot.sendMessage(event.chat.id, "Enviando, aguarde...", {
                reply_to_message_id: event.message_id
            });
            qr.toBuffer(params[0], (err, buff) => {
                bot.sendPhoto(event.chat.id, buff, {
                    reply_to_message_id: event.message_id
                });
            });
            settings.commandRes = '';
            settings.waitParam = false;
        },
        yt() {
            groupCommands(event, [event.text as string]).yt();
            settings.commandRes = '';
            settings.waitParam = false;
        }
    }
}

function groupCalls(event: TelegramBot.CallbackQuery, data: string[]): { [key: string]: any } {
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
    if (msg.startsWith("/") && event.chat.type === "group") {
        settings.waitParam = false;
        settings.commandRes = '';
        let command = msg.slice(1).split(" ");
        let _commands = groupCommands(event, command.slice(1));
        if (Object.keys(_commands).includes(command[0])) bot.sendChatAction(event.chat.id, "typing").then(r => {
            _commands[command[0]]();
        });
    } else if (settings.waitParam && event.chat.type === "group") {
        bot.sendChatAction(event.chat.id, "typing").then(r => {
            groupWaits(event)[settings.commandRes](msg);
        })
    } else if (msg.startsWith("/") && event.chat.type === "private") {
        settings.waitParam = false;
        settings.commandRes = '';
        let command = msg.slice(1).split(" ");
        let _commands = privateCommands(event, command.slice(1));
        if (Object.keys(_commands).includes(command[0])) bot.sendChatAction(event.chat.id, "typing").then(r => {
            _commands[command[0]]();
        });
    } else if (settings.waitParam && event.chat.type === "private") {
        bot.sendChatAction(event.chat.id, "typing").then(r => {
            privateWaits(event)[settings.commandRes](msg);
        })
    }
})

bot.on("callback_query", event => {
    let dal = event.data?.split(":") as string[];
    if (!settings.callOn) {
        settings.callOn = true;
        privateCalls(event, dal.slice(1))[dal[0]]();
    }
})

bot.on('polling_error', event => {
    console.log(event.message);
})

console.log("Zephyr está on-line");