"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const fs_1 = __importDefault(require("fs"));
const qrcode_1 = __importDefault(require("qrcode"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const yt_search_1 = __importDefault(require("yt-search"));
const date_fns_1 = require("date-fns");
const axios_1 = __importDefault(require("axios"));
const bot = new node_telegram_bot_api_1.default("6157411466:AAEuIarJoVQZhwcWm1zxBhXJ_zjkGNAAyaI", { polling: true, filepath: false });
var primaryConfig = JSON.parse(fs_1.default.readFileSync('./db/bases.json').toString("utf-8"));
var settings = {
    waitParam: false,
    commandRes: '',
    callOn: false,
    commandResAny: {},
    callOnAny: {},
    callData: {}
};
var RunTimeParams = {
    private: {
        waitPrm: false,
        waitCmd: '',
        callOn: false,
        callData: {}
    },
    public: {}
};
bot.setMyCommands([
    { command: "qrcode", description: "Gera um QrCode." },
    { command: "yt", description: "Baixa musicas do YouTube." },
    { command: "shorturl", description: "Encurta uma URL." },
    { command: "allow", description: "Permite um grupo (ADM)." },
]);
function fuckBody(content, title, width = 1) {
    let emi = [];
    let bigger = Math.max(...content.map(d => d.length));
    if (bigger > width)
        width = bigger;
    emi.push(...content.map(d => {
        return `┃${d + " ".repeat(width - d.length)}┃`;
    }));
    return [
        `┏${title === undefined ? '━'.repeat(width) : `━ ${title} ` + '━'.repeat(width - title.length - 3)}┓`,
        ...emi,
        `┗${'━'.repeat(width)}┛`
    ].join("\n");
}
const applyPrivate = (command, chatId, userName, add = true) => {
    RunTimeParams.private.waitPrm = add;
    RunTimeParams.private.waitCmd = add ? command : "";
};
const applyPublic = (command, chatId, userName, add = true) => {
    try {
        delete RunTimeParams.public[chatId][userName];
    }
    catch (_a) { }
    if (add) {
        RunTimeParams.public[chatId] = Object.assign(Object.assign({}, (RunTimeParams.public[chatId] || {})), { [userName]: {
                waitPrm: add,
                waitCmd: command,
            } });
    }
};
function geturtp(chatID, userID) {
    try {
        return RunTimeParams.public[chatID][String(userID)];
    }
    catch (_a) {
        return undefined;
    }
}
function privateCalls(event, data) {
    return {
        hell() {
            var _a, _b;
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim" : "não"}.`, {
                chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id
            });
        }
    };
}
function groupCalls(event, data) {
    return {
        hell() {
            var _a, _b;
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim" : "não"}.`, {
                chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id
            });
        },
        shorturl() {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                var dat = settings.callData[`shorturl-${data.slice(9).split('-')[1]}`];
                try {
                    const apiUrl = `https:${dat[data.slice(9).split('-')[0]][0]}${encodeURIComponent(dat[data.slice(9).split('-')[0]][1])}`;
                    const response = yield axios_1.default.get(apiUrl);
                    bot.editMessageText(`Seu link: ${response.data}`, {
                        chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                        message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id,
                        reply_markup: { inline_keyboard: [] }
                    });
                }
                catch (error) {
                    console.error('Erro ao encurtar a URL:', error);
                }
                delete settings.callData[`shorturl-${data.slice(9).split('-')[1]}`];
            });
        }
    };
}
function commands(event, param, funcApply, reply) {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá, veja os comandos no Menu.`);
        },
        qrcode() {
            var _a, _b;
            if (event.reply_to_message !== undefined) {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qrcode_1.default.toBuffer((_a = event.reply_to_message) === null || _a === void 0 ? void 0 : _a.text, (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            }
            else if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", {
                    reply_to_message_id: reply
                });
                funcApply("qrcode", event.chat.id, (_b = event.from) === null || _b === void 0 ? void 0 : _b.username);
            }
            else {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qrcode_1.default.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            }
        },
        yt() {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                if (param[0] !== undefined) {
                    var vid = (yield (0, yt_search_1.default)({ query: param[0], category: "music" })).videos[0];
                    bot.sendChatAction(event.chat.id, "upload_voice");
                    var to_yt = setTimeout(() => {
                        bot.sendMessage(event.chat.id, "Enviando, aguarde...", {
                            reply_to_message_id: reply
                        });
                        bot.sendChatAction(event.chat.id, "upload_voice");
                    }, 10000);
                    try {
                        if (vid === undefined) {
                            bot.sendMessage(event.chat.id, "Houve um erro.", {
                                reply_to_message_id: reply
                            });
                        }
                        else {
                            let videoInfo = yield ytdl_core_1.default.getInfo(vid.url);
                            let audioFormat = ytdl_core_1.default.chooseFormat(videoInfo.formats, { filter: 'audioonly' });
                            const audioStream = ytdl_core_1.default.downloadFromInfo(videoInfo, {
                                format: audioFormat,
                                quality: 'highestaudio',
                            });
                            let audioBuffer = Buffer.from('');
                            audioStream.on('data', (chunk) => {
                                audioBuffer = Buffer.concat([audioBuffer, chunk]);
                            });
                            audioStream.on('end', () => {
                                bot.sendAudio(event.chat.id, audioBuffer, {
                                    title: videoInfo.videoDetails.title,
                                    performer: videoInfo.videoDetails.author.name,
                                    reply_to_message_id: reply
                                }).then(r => clearTimeout(to_yt));
                            });
                        }
                    }
                    catch (error) {
                        bot.sendMessage(event.chat.id, "Houve um erro.", {
                            reply_to_message_id: reply
                        });
                        throw error;
                    }
                }
                else {
                    bot.sendMessage(event.chat.id, "Qual o nome da música?", {
                        reply_to_message_id: reply
                    });
                    funcApply("yt", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username);
                }
            });
        },
        allow() {
            var _a;
            bot.sendChatAction(event.chat.id, "typing");
            if (primaryConfig.administrators.includes((_a = event.from) === null || _a === void 0 ? void 0 : _a.id)) {
                if (!primaryConfig.chats_allowed.includes(event.chat.id)) {
                    primaryConfig.chats_allowed.push(event.chat.id);
                    fs_1.default.writeFileSync("./src/bases.json", JSON.stringify(primaryConfig, undefined, 4));
                    bot.sendMessage(event.chat.id, "Esse grupo foi desbloqueado.");
                }
                else {
                    bot.sendMessage(event.chat.id, "Esse grupo já foi desbloqueado.");
                }
            }
            else {
                bot.sendMessage(event.chat.id, "Somente administradores podem usar esse comando.");
            }
        },
        shorturl() {
            var _a;
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Qual link deseja encurtar?", {
                    reply_to_message_id: reply
                });
                funcApply("shorturl", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username);
            }
            else {
                bot.sendMessage(event.chat.id, "Qual encurtador deseja usar?", {
                    reply_markup: {
                        inline_keyboard: [[
                                { text: "TinyUrl", callback_data: `shorturl:tinyurl-${event.message_id}` },
                                { text: "is.gd", callback_data: `shorturl:isgd-${event.message_id}` }
                            ]]
                    },
                    reply_to_message_id: reply
                }).then(r => {
                    settings.callData[`shorturl-${event.message_id}`] = {
                        tinyurl: ["tinyurl.com/api-create.php?url=", param[0]],
                        isgd: ["is.gd/create.php?format=simple&url=", param[0]]
                    };
                });
            }
        }
    };
}
function waits(event, funcApply, reply) {
    return {
        qrcode() {
            var _a;
            bot.sendChatAction(event.chat.id, "upload_photo");
            qrcode_1.default.toBuffer(event.text, (err, buff) => {
                bot.sendPhoto(event.chat.id, buff, {
                    reply_to_message_id: reply
                });
            });
            funcApply("qrcode", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        },
        shorturl() {
            var _a;
            commands(event, [event.text], () => { }, reply).shorturl();
            funcApply("shorturl", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        },
        yt() {
            var _a;
            commands(event, [event.text], () => { }, reply).yt();
            funcApply("yt", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        }
    };
}
function calls(event, data, reply) {
    return {
        hell() {
            var _a, _b;
            bot.editMessageText(`Você escolheu ${data[0] === "yes" ? "sim" : "não"}.`, {
                chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id
            });
        },
        shorturl() {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                var dat = settings.callData[`shorturl-${data.slice(9).split('-')[1]}`];
                try {
                    const apiUrl = `https:${dat[data.slice(9).split('-')[0]][0]}${encodeURIComponent(dat[data.slice(9).split('-')[0]][1])}`;
                    const response = yield axios_1.default.get(apiUrl);
                    bot.editMessageText(`Seu link: ${response.data}`, {
                        chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                        message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id,
                        reply_markup: { inline_keyboard: [] }
                    });
                }
                catch (error) {
                    bot.editMessageText("Ocorreu um erro ao encurtar a URL. Tente novamente.", {
                        chat_id: (_c = event.message) === null || _c === void 0 ? void 0 : _c.chat.id,
                        message_id: (_d = event.message) === null || _d === void 0 ? void 0 : _d.message_id,
                        reply_markup: { inline_keyboard: [] }
                    });
                }
                delete settings.callData[`shorturl-${data.slice(9).split('-')[1]}`];
            });
        }
    };
}
bot.on("message", event => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let msg = event.text;
    if (msg.startsWith("/") && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        if (primaryConfig.chats_allowed.includes(event.chat.id) || primaryConfig.administrators.includes((_a = event.from) === null || _a === void 0 ? void 0 : _a.id)) {
            let command = msg.slice(1).split(" ");
            if (command[0].includes("@")) {
                if (command[0].endsWith("@zephyr_0bot")) {
                    command[0] = command[0].split("@")[0];
                }
                else
                    return;
            }
            command[0] = command[0].split("@")[0];
            applyPublic("", event.chat.id, (_b = event.from) === null || _b === void 0 ? void 0 : _b.username, false);
            let _commands = commands(event, command.slice(1), applyPublic, event.message_id);
            if (Object.keys(_commands).includes(command[0])) {
                _commands[command[0]]();
            }
            console.log(fuckBody([
                ` > command:  ${command[0]}. `,
                ` > message:  "${msg}". `,
                ` > user:     @${(_c = event.from) === null || _c === void 0 ? void 0 : _c.username}. `,
                ` > used in:  ${event.chat.title}. `,
                ` > hour:     ${(0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
            ], "Command Used"));
        }
        else {
            bot.sendMessage(event.chat.id, "Esse grupo está bloqueado.");
        }
    }
    else if ((RunTimeParams.public[event.chat.id] !== undefined && RunTimeParams.public[event.chat.id][(_d = event.from) === null || _d === void 0 ? void 0 : _d.username].waitPrm) && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        let cmd = RunTimeParams.public[event.chat.id][(_e = event.from) === null || _e === void 0 ? void 0 : _e.username].waitCmd;
        waits(event, applyPublic, event.message_id)[cmd]();
        console.log(fuckBody([
            ` > answer to:   ${cmd}. `,
            ` > content:     "${event.text}". `,
            ` > user:        @${(_f = event.from) === null || _f === void 0 ? void 0 : _f.username}. `,
            ` > answered in: ${event.chat.title}. `,
            ` > hour:        ${(0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"));
    }
    else if (msg.startsWith("/") && event.chat.type === "private") {
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
            ` > user:     @${(_g = event.from) === null || _g === void 0 ? void 0 : _g.username}. `,
            ` > used in:  Private. `,
            ` > hour:     ${(0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Used"));
    }
    else if (RunTimeParams.private.waitPrm && event.chat.type === "private") {
        bot.sendChatAction(event.chat.id, "typing");
        let cmd = RunTimeParams.private.waitCmd;
        waits(event, applyPrivate)[cmd]();
        console.log(fuckBody([
            ` > answer to:   ${cmd}. `,
            ` > content:     "${event.text}". `,
            ` > user:        @${(_h = event.from) === null || _h === void 0 ? void 0 : _h.username}. `,
            ` > answered in: Private. `,
            ` > hour:        ${(0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"));
    }
});
bot.on("callback_query", event => {
    var _a, _b, _c, _d;
    let dal = (_a = event.data) === null || _a === void 0 ? void 0 : _a.split(":");
    let on = ((_b = event.message) === null || _b === void 0 ? void 0 : _b.chat.type) === "group" ? settings.callOnAny[event.message.message_id] : settings.callOn;
    if (!on) {
        if (((_c = event.message) === null || _c === void 0 ? void 0 : _c.chat.type) === "group")
            settings.callOnAny[event.message.message_id] = true;
        else
            settings.callOn = true;
        if (((_d = event.message) === null || _d === void 0 ? void 0 : _d.chat.type) === "group") {
            calls(event, event.data, event.message.message_id)[dal[0]]();
        }
        else {
            calls(event, event.data)[dal[0]]();
        }
    }
});
bot.on('polling_error', event => {
    console.log(event.message);
});
console.log(fuckBody([" Zephyr está on-line. "]));
console.log(fuckBody(JSON.stringify(primaryConfig, undefined, 2).split("\n").map(d => d + " ").slice(1, -1), "Current Settings"));
process.env["NTBA_FIX_319"] = "1";
process.env["NTBA_FIX_350"] = "0";
