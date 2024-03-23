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

interface PublicRunTimeParams {
    [key: number]: { // <- Chat ID
        [key: string]: /* <- User Name*/ UserRunTimeParams
    }
}
interface UserRunTimeParams {
    waitPrm?: boolean;
    waitCmd?: string;
    callOn?: boolean;
}

var RunTimeParams = {
    private: <UserRunTimeParams> {
        waitPrm: false,
        waitCmd: '',
        callOn: false,
        callData: <{ [key: string]: { [key: string]: (string | number)[] } }> {}
    },
    public: <PublicRunTimeParams> {}
}

// primaryConfig.chats_allowed.forEach(r => {
//     RunTimeParams.public[r] = {}
// })

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

const applyPrivate: Apply = (command, chatId?, userName?, add = true) => {
    RunTimeParams.private.waitPrm = add;
    RunTimeParams.private.waitCmd = add ? command : "";
}
const applyPublic: Apply = (command, chatId?, userName?, add = true) => {
    try {
        delete RunTimeParams.public[String(chatId)][userName];
    } catch {}
    if (add) {     
        RunTimeParams.public[chatId] = {
            ...(RunTimeParams.public[chatId] || {}),
            [userName]: {
                waitPrm: add,
                waitCmd: command,
            }
        };
    }
}

type Apply = (command: string, chatId?: number, userName?: string, add?: boolean) => void

function geturtp(chatID: number, userID: number): UserRunTimeParams | undefined {
    try {
        return RunTimeParams.public[String(chatID)][String(userID)]
    } catch {
        return undefined
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


function commands(event: TelegramBot.Message, param: string[], funcApply: Apply, reply?: number): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá, veja os comandos no Menu.`)
        },
        qrcode() {
            if (event.reply_to_message !== undefined) {    
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(event.reply_to_message.text, (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            } else if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", {
                    reply_to_message_id: reply
                });
                funcApply("qrcode", event.chat.id, event.from.username);
            } else {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            }
        },
        async yt() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({query: param[0], category: "music"})).videos[0]
                bot.sendChatAction(event.chat.id, "upload_voice");
                var to_yt = setTimeout(() => {
                    bot.sendMessage(event.chat.id as number, "Enviando, aguarde...", {
                        reply_to_message_id: reply
                    })
                    bot.sendChatAction(event.chat.id, "upload_voice");
                }, 10000);
                try {
                    if (vid === undefined) {
                        bot.sendMessage(event.chat.id, "Houve um erro.", {
                            reply_to_message_id: reply
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
                                reply_to_message_id: reply
                            }).then(r => clearTimeout(to_yt))
                        });
                    }
            } catch (error) {
                bot.sendMessage(event.chat.id, "Houve um erro.", {
                    reply_to_message_id: reply
                })
                // console.error(error);
                throw error;
            }
            } else {
                bot.sendMessage(event.chat.id, "Qual o nome da música?", {
                    reply_to_message_id: reply
                })
                funcApply("yt", event.chat.id, event.from.username)
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
                reply_to_message_id: reply
            }).then(r => {
                settings.callData[`shorturl-${event.message_id}`] = {
                    tinyurl: ["tinyurl.com/api-create.php?url=", param[0]],
                    isgd: ["is.gd/create.php?format=simple&url=", param[0]]
                }
            })
        }
    }
}

function waits(event: TelegramBot.Message, funcApply: Apply, reply?: number): { [key: string]: any } {
    return {
        qrcode() {
            bot.sendChatAction(event.chat.id, "upload_photo");
            qr.toBuffer(event.text, (err, buff) => {
                bot.sendPhoto(event.chat.id, buff, {
                    reply_to_message_id: reply
                });
            });
            funcApply("qrcode", event.chat.id, event.from.username, false);
        },
        yt() {
            commands(event, [event.text as string], () => {}, reply).yt();
            funcApply("yt", event.chat.id, event.from.username, false)
        }
    }
}

function calls(event: TelegramBot.CallbackQuery, data: string, reply?: number): { [key: string]: any } {
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
    // console.dir(RunTimeParams, {depth: 1000})
    // console.dir(settings, {depth: 100})
    if (msg.startsWith("/") && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        if (primaryConfig.chats_allowed.includes(event.chat.id) || primaryConfig.administrators.includes(event.from.id)) {
            let command = msg.slice(1).split(" ");
            if(command[0].includes("@")) {
                if (command[0].endsWith("@zephyr_0bot")) {
                    command[0] = command[0].split("@")[0]
                } else return
            } 
            command[0] = command[0].split("@")[0];
            applyPublic("", event.chat.id, event.from.username, false);
            let _commands = commands(event, command.slice(1), applyPublic, event.message_id);
            if (Object.keys(_commands).includes(command[0])) {
                _commands[command[0]]();
            }
            console.log(fuckBody([
                ` > command:  ${command[0]}. `,
                ` > message:  "${msg}". `,
                ` > user:     @${event.from.username}. `,
                ` > used in:  ${event.chat.title}. `,
                ` > hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
            ], "Command Used"))
        } else {
            bot.sendMessage(event.chat.id, "Esse grupo está bloqueado.")
        }
    
    } else if ((RunTimeParams.public[String(event.chat.id)] !== undefined && RunTimeParams.public[String(event.chat.id)][event.from.username].waitPrm) && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        let cmd = RunTimeParams.public[String(event.chat.id)][event.from.username].waitCmd
        waits(event, applyPublic, event.message_id)[cmd]();
        console.log(fuckBody([
            ` > answer to:   ${cmd}. `,
            ` > content:     "${event.text}". `,
            ` > user:        @${event.from.username}. `,
            ` > answered in: ${event.chat.title}. `,
            ` > hour:        ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"))

    } else if (msg.startsWith("/") && event.chat.type === "private") {
        RunTimeParams.private.waitPrm = false;
        RunTimeParams.private.waitCmd = "";
        let command = msg.slice(1).split(" ");
        let _commands = commands(event, command.slice(1), applyPrivate);
        if (Object.keys(_commands).includes(command[0])) {
            _commands[command[0]]();
        }
        console.log(fuckBody([
            ` > command:  ${command[0]}. `,
            ` > message:  "${msg}". `,
            ` > user:     @${event.from.username}. `,
            ` > used in:  Private. `,
            ` > hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Used"))
    } else if (RunTimeParams.private.waitPrm && event.chat.type === "private") {
        bot.sendChatAction(event.chat.id, "typing")
        let cmd = RunTimeParams.private.waitCmd
        waits(event, applyPrivate)[cmd]();
        console.log(fuckBody([
            ` > answer to:   ${cmd}. `,
            ` > content:     "${event.text}". `,
            ` > user:        @${event.from.username}. `,
            ` > answered in: Private. `,
            ` > hour:        ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"))
    }
    // console.dir(RunTimeParams, {depth: 1000})
    // console.dir(settings, {depth: 100})
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