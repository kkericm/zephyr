import TelegramBot from 'node-telegram-bot-api';
import { config } from "dotenv"; config();
import path from "path";
import fs, { fstatSync, readFile } from "fs";
import qr from "qrcode";
import ytdl from "ytdl-core";
import ytSeach from "yt-search";
import { format } from "date-fns";
import axios from 'axios';

const bot = new TelegramBot(process.env.TOLKEN as string, { polling: true, filepath: false });

var primaryConfig: {
    chats_allowed: number[];
    administrators: number[];
} = JSON.parse(fs.readFileSync('./src/bases.json').toString("utf-8"))
var settings = {
    waitParam: false,
    commandRes: '',
    callOn: false,
    commandResAny: <{ [key: number]: {
        waitParam?: boolean; 
        commandRes?: string;
        callOn?: boolean;
    }}> {},
    callOnAny: <{ [key: number]: boolean }> {},
    callData: <{ [key: string]: { [key: string]: (string | number)[] } }> {}
};

bot.setMyCommands([
    {command: "qrcode", description: "Gera um QrCode."},
    {command: "yt", description: "Baixa musicas do YouTube."},
    {command: "shorturl", description: "Encurta uma URL."},
    {command: "allow", description: "Permite um grupo (ADM)."},
]);

function fuckBody(content: string[], title?: string, width: number = 1) {
    let emi: string[] = []
    let bigger = Math.max(...content.map(d => d.length))
    if (bigger > width) width = bigger
    emi.push(...content.map(d => {
        return `┃${d + " ".repeat(width - d.length)}┃`
    }))
    return [
        `┏${title === undefined ? '━'.repeat(width) : `━ ${title} ` + '━'.repeat(width - title.length - 3)}┓`,
        ...emi,
        `┗${'━'.repeat(width)}┛`
    ].join("\n")
}

function privateCommands(event: TelegramBot.Message, param: string[]): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá`)
        },
        async qrcode() {
            if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.");
                settings.waitParam = true;
                settings.commandRes = "qrcode";
            } else {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff);
                });
            }
        },
        async yt() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({query: param[0], category: "music"})).videos[0];
                bot.sendChatAction(event.chat.id, "upload_voice");
                var to_yt = setTimeout(() => {
                    bot.sendMessage(event.chat.id as number, "Enviando, aguarde...");
                    bot.sendChatAction(event.chat.id, "upload_voice");
                }, 10000);
                try {
                    if (vid === undefined) {
                        bot.sendMessage(event.chat.id, "Houve um erro.");
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
                            title: videoInfo.videoDetails.title, 
                            performer: videoInfo.videoDetails.author.name,
                            reply_to_message_id: event.message_id
                        }).then(r => clearTimeout(to_yt));
                    });
                }
            } catch (error) {
                bot.sendMessage(event.chat.id, "Houve um erro.");
                throw error;
            }
            } else {
                bot.sendMessage(event.chat.id, "Qual o nome da música?");
                settings.waitParam = true;
                settings.commandRes = "yt";
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

function privateCalls(event: TelegramBot.CallbackQuery, data: string): { [key: string]: any } {
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
            bot.sendMessage(event.chat.id, `Olá, veja os comandos no Menu.`)
        },
        async qrcode() {
            if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", {
                    reply_to_message_id: event.message_id
                });
                settings.commandResAny[event.from.id] = {
                    commandRes: "qrcode",
                    waitParam: true
                };
            } else {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: event.message_id
                    }, {});
                });
            }
        },
        async yt() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({query: param[0], category: "music"})).videos[0]
                bot.sendChatAction(event.chat.id, "upload_voice");
                var to_yt = setTimeout(() => {
                    bot.sendMessage(event.chat.id as number, "Enviando, aguarde...", {
                        reply_to_message_id: event.message_id
                    })
                    bot.sendChatAction(event.chat.id, "upload_voice");
                }, 10000);
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
                                title: videoInfo.videoDetails.title, 
                                performer: videoInfo.videoDetails.author.name,
                                reply_to_message_id: event.message_id
                            }).then(r => clearTimeout(to_yt))
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
        allow() {
            bot.sendChatAction(event.chat.id, "typing");
            if (primaryConfig.administrators.includes(event.from.id)) {
                if (!primaryConfig.chats_allowed.includes(event.chat.id)) {
                    primaryConfig.chats_allowed.push(event.chat.id);
                    fs.writeFileSync("./src/bases.json", JSON.stringify(primaryConfig, undefined, 4));
                    bot.sendMessage(event.chat.id, "Esse grupo foi desbloqueado.");
                } else {
                    bot.sendMessage(event.chat.id, "Esse grupo já foi desbloqueado.");
                }
            } else {
                bot.sendMessage(event.chat.id, "Somente administradores podem usar esse comando.");
            }
        },
        shorturl() {
            bot.sendMessage(event.chat.id, "Qual encurtador deseja usar?", {
                reply_markup: {
                    inline_keyboard: [[
                        {text: "TinyUrl", callback_data: `shorturl:tinyurl-${event.message_id}`},
                        {text: "is.gd", callback_data: `shorturl:isgd-${event.message_id}`}
                    ]]
                },
                reply_to_message_id: event.message_id
            }).then(r => {
                settings.callData[`shorturl-${event.message_id}`] = {
                    tinyurl: ["tinyurl.com/api-create.php?url=", param[0]],
                    isgd: ["is.gd/create.php?format=simple&url=", param[0]]
                }
            })
        }
    }
}

function groupWaits(event: TelegramBot.Message): { [key: string]: any } {
    return {
        qrcode(...params: any[]) {
            groupCommands(event, [event.text as string]).qrcode();
            delete settings.commandResAny[event.from.id]
        },
        yt() {
            groupCommands(event, [event.text as string]).yt();
            delete settings.commandResAny[event.from.id]
        }
    }
}

function groupCalls(event: TelegramBot.CallbackQuery, data: string): { [key: string]: any } {
    return {
        hell() {
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim": "não"}.`, {
                chat_id: event.message?.chat.id,
                message_id: event.message?.message_id
            })
        },
        async shorturl() {
            var dat = settings.callData[`shorturl-${data.slice(9).split('-')[1]}`]
            try {
                const apiUrl = `https:${dat[data.slice(9).split('-')[0]][0]}${encodeURIComponent(dat[data.slice(9).split('-')[0]][1])}`;
                const response = await axios.get(apiUrl);
                bot.editMessageText(`Seu link: ${response.data}`, {
                    chat_id: event.message.chat.id,
                    message_id: event.message.message_id,
                    reply_markup: { inline_keyboard: [] }
                });
            } catch (error) {
                console.error('Erro ao encurtar a URL:', error);
            }
            delete settings.callData[`shorturl-${data.slice(9).split('-')[1]}`];
        }
    }
}

bot.on("message", event => {
    let msg = event.text as string;
    // console.dir(settings, {depth: 100})
    if (msg.startsWith("/") && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        if (primaryConfig.chats_allowed.includes(event.chat.id) || primaryConfig.administrators.includes(event.from.id)) {
            let command = msg.slice(1).split(" ");
            if(command[0].includes("@")) command[0] = command[0].split("@")[0]
            settings.waitParam = false;
            settings.commandRes = '';
            let _commands = groupCommands(event, command.slice(1));
            if (Object.keys(_commands).includes(command[0])) {
                _commands[command[0]]();
            }
            console.log(fuckBody([
                ` > command:  ${command[0]}. `,
                ` > message:  "${msg}". `,
                ` > sender:   ${event.from.first_name}. `,
                ` > user:     ${event.from.username}. `,
                ` > used in:  ${event.chat.title}. `,
                ` > hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
            ], "Command Used"))
        } else {
            bot.sendMessage(event.chat.id, "Esse grupo está bloqueado.")
        }
    } else if (settings.commandResAny[event.from.id].waitParam && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        groupWaits(event)[settings.commandResAny[event.from.id].commandRes](msg);

    } else if (msg.startsWith("/") && event.chat.type === "private") {
        settings.waitParam = false;
        settings.commandRes = '';
        let command = msg.slice(1).split(" ");
        let _commands = privateCommands(event, command.slice(1));
        if (Object.keys(_commands).includes(command[0])) {
            _commands[command[0]]();
        }
    } else if (settings.waitParam && event.chat.type === "private") {
        bot.sendChatAction(event.chat.id, "typing").then(r => {
            privateWaits(event)[settings.commandRes](msg);
        })
    }
})

bot.on("callback_query", event => {
    let dal = event.data?.split(":") as string[];
    let on = event.message.chat.type === "group" ? settings.callOnAny[event.message.message_id] : settings.callOn;
    if (!on) {
        if (event.message.chat.type === "group") settings.callOnAny[event.message.message_id] = true
        else settings.callOn = true;
        if (event.message.chat.type === "group") {
            groupCalls(event, event.data)[dal[0]]();
        } else {
            privateCalls(event, event.data)[dal[0]]();
        }
    }
})

bot.on('polling_error', event => {
    console.log(event.message);
})

console.log(fuckBody([" Zephyr está on-line. "]));
console.log(fuckBody(JSON.stringify(primaryConfig, undefined, 2).split("\n").map(d => d + " ").slice(1, -1), "Current Settings"));

process.env["NTBA_FIX_319"] = "1";
process.env["NTBA_FIX_350"] = "0";