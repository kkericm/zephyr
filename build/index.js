"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_telegram_bot_api_1 = require("node-telegram-bot-api");
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
var fs_1 = require("fs");
var qrcode_1 = require("qrcode");
var ytdl_core_1 = require("@distube/ytdl-core");
var yt_search_1 = require("yt-search");
var date_fns_1 = require("date-fns");
var axios_1 = require("axios");
var bot = new node_telegram_bot_api_1.default(process.env.TOKEN, { polling: true, filepath: false });
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
function commandNotify(content, title, width) {
    if (width === void 0) { width = 1; }
    var emi = [];
    var bigger = Math.max.apply(Math, content.map(function (d) { return d.length; }));
    if (bigger > width)
        width = bigger;
    emi.push.apply(emi, content.map(function (d) {
        return "\u2503".concat(d + " ".repeat(width - d.length), "\u2503");
    }));
    return __spreadArray(__spreadArray([
        "\u250F".concat(title === undefined ? '━'.repeat(width) : "\u2501 ".concat(title, " ") + '━'.repeat(width - title.length - 3), "\u2513")
    ], emi, true), [
        "\u2517".concat('━'.repeat(width), "\u251B")
    ], false).join("\n");
}
var applyPrivate = function (command, chatId, userName, add) {
    if (add === void 0) { add = true; }
    RunTimeParams.private.waitPrm = add;
    RunTimeParams.private.waitCmd = add ? command : "";
};
var applyPublic = function (command, chatId, userName, add) {
    var _a;
    if (add === void 0) { add = true; }
    try {
        delete RunTimeParams.public[chatId][userName];
    }
    catch (_b) { }
    if (add) {
        RunTimeParams.public[chatId] = __assign(__assign({}, (RunTimeParams.public[chatId] || {})), (_a = {}, _a[userName] = {
            waitPrm: add,
            waitCmd: command,
        }, _a));
    }
};
function commands(event, param, funcApply, reply) {
    return {
        start: function () {
            bot.sendMessage(event.chat.id, "Ol\u00E1, veja os comandos no Menu.");
        },
        qrcode: function () {
            var _a, _b;
            if (event.reply_to_message !== undefined) {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qrcode_1.default.toBuffer((_a = event.reply_to_message) === null || _a === void 0 ? void 0 : _a.text, function (err, buff) {
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
                qrcode_1.default.toBuffer(param[0], function (err, buff) {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            }
        },
        yt: function () {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var vid, to_yt, videoInfo_1, audioFormat, audioStream, audioBuffer_1, error_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(param[0] !== undefined)) return [3 /*break*/, 8];
                            return [4 /*yield*/, (0, yt_search_1.default)({ query: param[0], category: "music" })];
                        case 1:
                            vid = (_b.sent()).videos[0];
                            bot.sendChatAction(event.chat.id, "upload_voice");
                            to_yt = setTimeout(function () {
                                bot.sendMessage(event.chat.id, "Enviando, aguarde...", {
                                    reply_to_message_id: reply
                                });
                                bot.sendChatAction(event.chat.id, "upload_voice");
                            }, 10000);
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 6, , 7]);
                            if (!(vid === undefined)) return [3 /*break*/, 3];
                            bot.sendMessage(event.chat.id, "Houve um erro.", {
                                reply_to_message_id: reply
                            });
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, ytdl_core_1.default.getInfo(vid.url)];
                        case 4:
                            videoInfo_1 = _b.sent();
                            audioFormat = ytdl_core_1.default.chooseFormat(videoInfo_1.formats, { filter: 'audioonly' });
                            audioStream = ytdl_core_1.default.downloadFromInfo(videoInfo_1, {
                                format: audioFormat,
                                quality: 'highestaudio',
                            });
                            audioBuffer_1 = Buffer.from('');
                            audioStream.on('data', function (chunk) {
                                audioBuffer_1 = Buffer.concat([audioBuffer_1, chunk]);
                            });
                            audioStream.on('end', function () {
                                bot.sendAudio(event.chat.id, audioBuffer_1, {
                                    title: videoInfo_1.videoDetails.title,
                                    performer: videoInfo_1.videoDetails.author.name,
                                    reply_to_message_id: reply
                                }).then(function (r) { return clearTimeout(to_yt); });
                            });
                            _b.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            error_1 = _b.sent();
                            bot.sendMessage(event.chat.id, "Houve um erro.", {
                                reply_to_message_id: reply
                            });
                            // console.error(error);
                            throw error_1;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            bot.sendMessage(event.chat.id, "Qual o nome da música?", {
                                reply_to_message_id: reply
                            });
                            funcApply("yt", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username);
                            _b.label = 9;
                        case 9: return [2 /*return*/];
                    }
                });
            });
        },
        allow: function () {
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
        shorturl: function () {
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
                                { text: "TinyUrl", callback_data: "shorturl:tinyurl-".concat(event.message_id) },
                                { text: "is.gd", callback_data: "shorturl:isgd-".concat(event.message_id) }
                            ]]
                    },
                    reply_to_message_id: reply
                }).then(function (r) {
                    settings.callData["shorturl-".concat(event.message_id)] = {
                        tinyurl: ["tinyurl.com/api-create.php?url=", param[0]],
                        isgd: ["is.gd/create.php?format=simple&url=", param[0]]
                    };
                });
            }
        },
        cota: function () {
            return __awaiter(this, void 0, void 0, function () {
                function convert(entry, exit, value) {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, axios_1.default.get("https://economia.awesomeapi.com.br/last/".concat(entry, "-").concat(exit)).then(function (response) {
                                    var cvt = parseFloat(response.data[entry + exit].high);
                                    var result = value * cvt;
                                    return isNaN(result) ? 'error-2' : result;
                                }).catch(function (r) {
                                    return 'error-1';
                                })];
                        });
                    });
                }
                var params, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(param.length === 2)) return [3 /*break*/, 2];
                            params = param[0].split('-').map(function (d) { return d.toUpperCase(); });
                            return [4 /*yield*/, convert(params[0], params[1], parseFloat(param[1]))];
                        case 1:
                            result = _a.sent();
                            if (result === 'error-1') {
                                bot.sendMessage(event.chat.id, "N\u00E3o consigo converter a configura\u00E7\u00E3o de *".concat(params[0], "-").concat(params[1], "*."), { reply_to_message_id: reply, parse_mode: "Markdown" });
                            }
                            else if (result === 'error-2') {
                                bot.sendMessage(event.chat.id, "O valor n\u00E3o pode ser convertido.", { reply_to_message_id: reply });
                            }
                            else {
                                bot.sendMessage(event.chat.id, "A cota\u00E7\u00E3o de ".concat(params[0], " para ").concat(params[1], " \u00E9: *").concat(result.toLocaleString("pt-BR", { style: "currency", currency: params[1] }), "*."), { reply_to_message_id: reply, reply_markup: { remove_keyboard: true }, parse_mode: "Markdown" });
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            bot.sendMessage(event.chat.id, "O comando deve estar no formato: `/cota <entrada-saida> <valor>`.\n\nExemplo: \n`/cota USD-BRL 100`.\n`/cota EUR-JPY 100`.\n`/cota BRL-USD 100`.\n\nVeja mais usando: /cota\\_factors.", {
                                reply_to_message_id: reply,
                                parse_mode: "Markdown"
                            });
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
        cota_factors: function () {
            bot.sendMessage(event.chat.id, "Fatores de cota\u00E7\u00E3o: \n\n`AED`: Dirham dos Emirados;\n`AFN`: Afghani do Afeganist\u00E3o;\n`ALL`: Lek Alban\u00EAs;\n`AMD`: Dram Arm\u00EAnio;\n`ANG`: Guilder das Antilhas;\n`AOA`: Kwanza Angolano;\n`ARS`: Peso Argentino;\n`AUD`: D\u00F3lar Australiano;\n`AZN`: Manat Azeri;\n`BAM`: Marco Convers\u00EDvel;\n`BBD`: D\u00F3lar de Barbados;\n`BDT`: Taka de Bangladesh;\n`BGN`: Lev B\u00FAlgaro;\n`BHD`: Dinar do Bahrein;\n`BIF`: Franco Burundinense;\n`BND`: D\u00F3lar de Brunei;\n`BOB`: Boliviano;\n`BRL`: Real Brasileiro;\n`BRLT`: Real Brasileiro Turismo;\n`BSD`: D\u00F3lar das Bahamas;\n`BTC`: Bitcoin;\n`BWP`: Pula de Botswana;\n`BYN`: Rublo Bielorrusso;\n`BZD`: D\u00F3lar de Belize;\n`CAD`: D\u00F3lar Canadense;\n`CHF`: Franco Su\u00ED\u00E7o;\n`CHFRTS`: Franco Su\u00ED\u00E7o;\n`CLP`: Peso Chileno;\n`CNH`: Yuan chin\u00EAs offshore;\n`CNY`: Yuan Chin\u00EAs;\n`COP`: Peso Colombiano;\n`CRC`: Col\u00F3n Costarriquenho;\n`CUP`: Peso Cubano;\n`CVE`: Escudo cabo-verdiano;\n`CZK`: Coroa Checa;\n`DJF`: Franco do Djubouti;\n`DKK`: Coroa Dinamarquesa;\n`DOGE`: Dogecoin;\n`DOP`: Peso Dominicano;\n`DZD`: Dinar Argelino;\n`EGP`: Libra Eg\u00EDpcia;\n`ETB`: Birr Et\u00EDope;\n`ETH`: Ethereum;\n`EUR`: Euro;\n`FJD`: D\u00F3lar de Fiji;\n`GBP`: Libra Esterlina;\n`GEL`: Lari Georgiano;\n`GHS`: Cedi Gan\u00EAs;\n`GMD`: Dalasi da G\u00E2mbia;\n`GNF`: Franco de Guin\u00E9;\n`GTQ`: Quetzal Guatemalteco;\n`HKD`: D\u00F3lar de Hong Kong;\n`HNL`: Lempira Hondurenha;\n`HRK`: Kuna Croata;\n`HTG`: Gourde Haitiano;\n`HUF`: Florim H\u00FAngaro;\n`IDR`: Rupia Indon\u00E9sia;\n`ILS`: Novo Shekel Israelense;\n`INR`: R\u00FApia Indiana;\n`IQD`: Dinar Iraquiano;\n`IRR`: Rial Iraniano;\n`ISK`: Coroa Islandesa;\n`JMD`: D\u00F3lar Jamaicano;\n`JOD`: Dinar Jordaniano;\n`JPY`: Iene Japon\u00EAs;\n`JPYRTS`: Iene Japon\u00EAs;\n`KES`: Shilling Queniano;\n`KGS`: Som Quirguistan\u00EAs;\n`KHR`: Riel Cambojano;\n`KMF`: Franco Comorense;\n`KRW`: Won Sul-Coreano;\n`KWD`: Dinar Kuwaitiano;\n`KYD`: D\u00F3lar das Ilhas Cayman;\n`KZT`: Tengue Cazaquistan\u00EAs;\n`LAK`: Kip Laosiano;\n`LBP`: Libra Libanesa;\n`LKR`: R\u00FApia de Sri Lanka;\n`LSL`: Loti do Lesoto;\n`LTC`: Litecoin;\n`LYD`: Dinar L\u00EDbio;\n`MAD`: Dirham Marroquino;\n`MDL`: Leu Moldavo;\n`MGA`: Ariary Madagascarense;\n`MKD`: Denar Maced\u00F4nio;\n`MMK`: Kyat de Mianmar;\n`MNT`: Mongolian Tugrik;\n`MOP`: Pataca de Macau;\n`MRO`: Ouguiya Mauritana;\n`MUR`: R\u00FApia Mauriciana;\n`MVR`: Rufiyaa Maldiva;\n`MWK`: Kwacha Malauiana;\n`MXN`: Peso Mexicano;\n`MYR`: Ringgit Malaio;\n`MZN`: Metical de Mo\u00E7ambique;\n`NAD`: D\u00F3lar Nam\u00EDbio;\n`NGN`: Naira Nigeriana;\n`NGNI`: Naira Nigeriana;\n`NGNPARALLEL`: Naira Nigeriana;\n`NIO`: C\u00F3rdoba Nicaraguense;\n`NOK`: Coroa Norueguesa;\n`NPR`: R\u00FApia Nepalesa;\n`NZD`: D\u00F3lar Neozeland\u00EAs;\n`OMR`: Rial Omanense;\n`PAB`: Balboa Panamenho;\n`PEN`: Sol do Peru;\n`PGK`: Kina Papua-Nova Guin\u00E9;\n`PHP`: Peso Filipino;\n`PKR`: R\u00FApia Paquistanesa;\n`PLN`: Zl\u00F3ti Polon\u00EAs;\n`PYG`: Guarani Paraguaio;\n`QAR`: Rial Catarense;\n`RON`: Leu Romeno;\n`RSD`: Dinar S\u00E9rvio;\n`RUB`: Rublo Russo;\n`RUBTOD`: Rublo Russo;\n`RUBTOM`: Rublo Russo;\n`RWF`: Franco Ruand\u00EAs;\n`SAR`: Riyal Saudita;\n`SCR`: R\u00FApias de Seicheles;\n`SDG`: Libra Sudanesa;\n`SDR`: DSE;\n`SEK`: Coroa Sueca;\n`SGD`: D\u00F3lar de Cingapura;\n`SOS`: Shilling Somaliano;\n`STD`: Dobra S\u00E3o Tom\u00E9/Pr\u00EDncipe;\n`SVC`: Colon de El Salvador;\n`SYP`: Libra S\u00EDria;\n`SZL`: Lilangeni Suaziland\u00EAs;\n`THB`: Baht Tailand\u00EAs;\n`TJS`: Somoni do Tajiquist\u00E3o;\n`TMT`: TMT;\n`TND`: Dinar Tunisiano;\n`TRY`: Nova Lira Turca;\n`TTD`: D\u00F3lar de Trinidad;\n`TWD`: D\u00F3lar Taiuan\u00EAs;\n`TZS`: Shilling Tanzaniano;\n`UAH`: Hryvinia Ucraniana;\n`UGX`: Shilling Ugand\u00EAs;\n`USD`: D\u00F3lar Americano;\n`USDT`: D\u00F3lar Americano;\n`UYU`: Peso Uruguaio;\n`UZS`: Som Uzbequistan\u00EAs;\n`VEF`: Bol\u00EDvar Venezuelano;\n`VND`: Dong Vietnamita;\n`VUV`: Vatu de Vanuatu;\n`XAF`: Franco CFA Central;\n`XAGG`: Prata;\n`XBR`: Brent Spot;\n`XCD`: D\u00F3lar do Caribe Oriental;\n`XOF`: Franco CFA Ocidental;\n`XPF`: Franco CFP;\n`XRP`: XRP;\n`YER`: Riyal Iemenita;\n`ZAR`: Rand Sul-Africano;\n`ZMK`: Kwacha Zambiana;\n`ZWL`: D\u00F3lar Zimbabuense;\n`XAU`: Ouro.", { reply_to_message_id: reply, parse_mode: "Markdown" });
        }
    };
}
function waits(event, funcApply, reply) {
    return {
        qrcode: function () {
            var _a;
            bot.sendChatAction(event.chat.id, "upload_photo");
            qrcode_1.default.toBuffer(event.text, function (err, buff) {
                bot.sendPhoto(event.chat.id, buff, {
                    reply_to_message_id: reply
                });
            });
            funcApply("qrcode", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        },
        shorturl: function () {
            var _a;
            commands(event, [event.text], function () { }, reply).shorturl();
            funcApply("shorturl", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        },
        yt: function () {
            var _a;
            commands(event, [event.text], function () { }, reply).yt();
            funcApply("yt", event.chat.id, (_a = event.from) === null || _a === void 0 ? void 0 : _a.username, false);
        }
    };
}
function calls(event, data, reply) {
    return {
        shorturl: function () {
            var _a, _b, _c, _d;
            return __awaiter(this, void 0, void 0, function () {
                var dat, apiUrl, response, error_2;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            dat = settings.callData["shorturl-".concat(data.slice(9).split('-')[1])];
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 3, , 4]);
                            apiUrl = "https:".concat(dat[data.slice(9).split('-')[0]][0]).concat(encodeURIComponent(dat[data.slice(9).split('-')[0]][1]));
                            return [4 /*yield*/, axios_1.default.get(apiUrl)];
                        case 2:
                            response = _e.sent();
                            bot.editMessageText("Seu link: ".concat(response.data), {
                                chat_id: (_a = event.message) === null || _a === void 0 ? void 0 : _a.chat.id,
                                message_id: (_b = event.message) === null || _b === void 0 ? void 0 : _b.message_id,
                                reply_markup: { inline_keyboard: [] }
                            });
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _e.sent();
                            bot.editMessageText("Ocorreu um erro ao encurtar a URL. Tente novamente.", {
                                chat_id: (_c = event.message) === null || _c === void 0 ? void 0 : _c.chat.id,
                                message_id: (_d = event.message) === null || _d === void 0 ? void 0 : _d.message_id,
                                reply_markup: { inline_keyboard: [] }
                            });
                            return [3 /*break*/, 4];
                        case 4:
                            delete settings.callData["shorturl-".concat(data.slice(9).split('-')[1])];
                            return [2 /*return*/];
                    }
                });
            });
        }
    };
}
bot.on("message", function (event) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var msg = event.text;
    if (msg.startsWith("/") && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        if (primaryConfig.chats_allowed.includes(event.chat.id) || primaryConfig.administrators.includes((_a = event.from) === null || _a === void 0 ? void 0 : _a.id)) {
            var command = msg.slice(1).split(" ");
            if (command[0].includes("@")) {
                if (command[0].endsWith("@".concat(process.env.BOT_NAME))) {
                    command[0] = command[0].split("@")[0];
                }
                else
                    return;
            }
            command[0] = command[0].split("@")[0];
            applyPublic("", event.chat.id, (_b = event.from) === null || _b === void 0 ? void 0 : _b.username, false);
            var _commands = commands(event, command.slice(1), applyPublic, event.message_id);
            if (Object.keys(_commands).includes(command[0])) {
                _commands[command[0]]();
            }
            console.log(commandNotify([
                " > Command:  ".concat(command[0], ". "),
                " > Message:  \"".concat(msg, "\". "),
                " > User:     @".concat((_c = event.from) === null || _c === void 0 ? void 0 : _c.username, ". "),
                " > Used in:  ".concat(event.chat.title, ". "),
                " > Hour:     ".concat((0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss'), ". "),
            ], "Command Used"));
        }
        else {
            bot.sendMessage(event.chat.id, "Esse grupo está bloqueado.");
        }
    }
    else if ((RunTimeParams.public[event.chat.id] !== undefined && RunTimeParams.public[event.chat.id][(_d = event.from) === null || _d === void 0 ? void 0 : _d.username].waitPrm) && (event.chat.type === "group" || event.chat.type === "supergroup")) {
        var cmd = RunTimeParams.public[event.chat.id][(_e = event.from) === null || _e === void 0 ? void 0 : _e.username].waitCmd;
        waits(event, applyPublic, event.message_id)[cmd]();
        console.log(commandNotify([
            " > Answer to:   ".concat(cmd, ". "),
            " > Content:     \"".concat(event.text, "\". "),
            " > User:        @".concat((_f = event.from) === null || _f === void 0 ? void 0 : _f.username, ". "),
            " > Answered in: ".concat(event.chat.title, ". "),
            " > Hour:        ".concat((0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss'), ". "),
        ], "Command Answered"));
    }
    else if (msg.startsWith("/") && event.chat.type === "private") {
        RunTimeParams.private.waitPrm = false;
        RunTimeParams.private.waitCmd = "";
        var command = msg.slice(1).split(" ");
        var _commands = commands(event, command.slice(1), applyPrivate);
        if (Object.keys(_commands).includes(command[0])) {
            _commands[command[0]]();
        }
        console.log(commandNotify([
            " > Command:  ".concat(command[0], ". "),
            " > Message:  \"".concat(msg, "\". "),
            " > User:     @".concat((_g = event.from) === null || _g === void 0 ? void 0 : _g.username, ". "),
            " > Used in:  Private. ",
            " > Hour:     ".concat((0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss'), ". "),
        ], "Command Used"));
    }
    else if (RunTimeParams.private.waitPrm && event.chat.type === "private") {
        bot.sendChatAction(event.chat.id, "typing");
        var cmd = RunTimeParams.private.waitCmd;
        waits(event, applyPrivate)[cmd]();
        console.log(commandNotify([
            " > Answer to:   ".concat(cmd, ". "),
            " > Content:     \"".concat(event.text, "\". "),
            " > User:        @".concat((_h = event.from) === null || _h === void 0 ? void 0 : _h.username, ". "),
            " > Answered in: Private. ",
            " > Hour:        ".concat((0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm:ss'), ". "),
        ], "Command Answered"));
    }
});
bot.on("callback_query", function (event) {
    var _a, _b, _c, _d;
    var dal = (_a = event.data) === null || _a === void 0 ? void 0 : _a.split(":");
    var on = ((_b = event.message) === null || _b === void 0 ? void 0 : _b.chat.type) === "group" ? settings.callOnAny[event.message.message_id] : settings.callOn;
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
bot.on('polling_error', function (event) {
    console.log(event.message);
});
console.log(commandNotify([" O Bot está on-line. "]));
console.log(commandNotify(JSON.stringify(primaryConfig, undefined, 2).split("\n").map(function (d) { return d + " "; }).slice(1, -1), "Current Settings"));
process.env["NTBA_FIX_319"] = "1";
process.env["NTBA_FIX_350"] = "0";
