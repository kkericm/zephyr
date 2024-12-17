import TelegramBot from 'node-telegram-bot-api';
import { config } from "dotenv"; config();
import path from "path";
import fs, { fstatSync, read, readFile } from "fs";
import qr from "qrcode";
import ytdl from "@distube/ytdl-core";
import ytSeach from "yt-search";
import { format } from "date-fns";
import axios from 'axios';

const bot = new TelegramBot(process.env.TOKEN as string, { polling: true, filepath: false });

var primary_config: {
    chats_allowed: number[];
    administrators: number[];
} = JSON.parse(fs.readFileSync(path.join(__dirname, "../db/data.json"), 'utf-8'));

var runtime_data = {
    calls_running: <{ [key: string]: boolean }> {},
}

const myCommands = [
    { command: "menu", description: "Mostra todos os comandos." },
    { command: "qrcode", description: "Gera um QrCode." },
    { command: "shorturl", description: "Encurta uma URL." },
    { command: "cota", description: "Converte de moedas." },
    { command: "ping", description: "Calcula a velocidade da conexão." },
]
bot.setMyCommands(myCommands);

function commandNotify(content: string[], title = '', min_width = 1, max_width = process.stdout.columns, break_line = true) {
    var width = min_width - 2
    let emi: string[] = [];
    let bigger = Math.max(...content.map(d => d.length))
    if (bigger > width) width = bigger
    if (width > max_width) width = max_width - 3
    width++
    emi.push(...content.map(d => {
        if (d.length > width) {
            var x = ''
            if (break_line) {
                const rows = Math.ceil(d.length / width);
                var o = [];
                for (let i = 0; i < rows; i++) {
                    o.push(`│ ${d.slice(i * width, (i + 1) * width) + " ".repeat(width - d.slice(i * width, (i + 1) * width).length)} │`)
                }
                return o.join("\n")
            } else {
                var x = d.slice(0, width - 4) + "..."
                return `│ ${x + " ".repeat(width - x.length - 1)} │`
            }
        } else {
            return `│ ${d + " ".repeat(width - d.length -1)} │`
        }
    }));
    return [
        `┌${!title ? '─'.repeat(width + 1) : `─ ${(title.length > width ? title.slice(0, width - 6) + "..." : title)} ─` + '─'.repeat((width - title.length - 3) > 0 ? width - title.length - 3 : 0)}┐`,
        ...emi,
        `└${'─'.repeat(width + 1)}┘`
    ].join("\n")
}
function get_command(message: string, is_public: boolean) {
    const regex: RegExp = is_public ? new RegExp(`(?<=^\\/)(\\w+)(?=@${process.env.BOT_USERNAME})`) : /(?<=^\/)(\w+)/;
    const cmd = message.match(regex);
    return cmd ? cmd[0] : undefined;
}
const c_wid = () => process.stdout.columns - 4;

async function listen_parameter(chat_id: number, user_id: number, command_name?: string): Promise<TelegramBot.Message> {
    return new Promise((resolve) => {
        function handler(msg: TelegramBot.Message) {
            const is_private = msg.chat.type === 'private';
            if (msg.from?.id === user_id && msg.chat.id === chat_id && (is_private || msg.reply_to_message?.from?.username === process.env.BOT_USERNAME)) {
                if (!msg.text?.startsWith('/')) { 
                    resolve(msg);
                    console.log(commandNotify([
                        ` > Answer to:    ${command_name ?? ''}. `,
                        ` > Content:      "${msg.text}". `,
                        ` > User:         @${msg.from?.username}. `,
                        ` > Answered in:  ${msg.chat.title ?? 'Private'}. `,
                        ` > Hour:         ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
                    ], "Command Answered", c_wid()));
                }
                bot.removeListener('message', handler);
            }
        }
        bot.on('message', handler);
    });
}
async function listen_callback(chat_id: number, message_id: number, command_name?: string): Promise<TelegramBot.CallbackQuery> {
    return new Promise((resolve) => {
        async function handler(call: TelegramBot.CallbackQuery) {
            var msg = call.message as TelegramBot.Message;
            if (msg.message_id === message_id && msg.chat.id === chat_id) {
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: call.message?.chat.id, message_id: call.message?.message_id });
                resolve(call);
                bot.removeListener('callback_query', handler);

                console.log(commandNotify([
                    ` > Received to:  ${command_name ?? ''}. `,
                    ` > Data:         ${call.data}. `,
                    ` > User:         @${call.from?.username}. `,
                    ` > Answered in:  ${msg.chat.title ?? 'Private'}. `,
                    ` > Hour:         ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
                ], "Callback Received", c_wid()));
            }
        }
        bot.on('callback_query', handler);
    });
}

function commands(event: TelegramBot.Message, param: string[], reply: object): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá, veja os comandos no Menu, ou digite /menu para mais detalhes.`)
        },
        menu() {
            const arr = event.chat?.type === 'private' ? '' : "@zephyr_0bot"
            const content = [
                `<strong>Menu ${process.env.BOT_NAME}!</strong>`,
                `\nEstes são os meus comandos <strong>utilizáveis</strong>:`,
                `▸  /menu${arr} - Mostra essa mensagem.`,
                `▸  /qrcode${arr} - Gera um QrCode.`,
                `▸  /shorturl${arr} - Encurta uma URL.`,
                `▸  /cota${arr} - Converte de moedas.`,
                `▸  /ping${arr} - Calcula a velocidade da conexão.`,
                `\nEstes são os meus comandos <strong>inativos</strong>:`,
                `▸  /yt_music${arr} - Baixa musicas do YouTube.`,
                `\nEstes são os meus comandos <strong>exclusivos para administradores</strong>:`,
                `▸  /allow${arr} - Permite um grupo.`,
                `▸  /block${arr} - Bloqueia um grupo.`,
            ].join('\n')
            bot.sendMessage(event.chat.id, content, { ...reply, parse_mode: 'HTML' });
        },
        async qrcode() {
            if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                await bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", reply);
                const param1 = (await listen_parameter(event.chat.id, event.from?.id as number, 'qrcode'));
                if (!param1.text) return;

                param.push(param1.text as string);
            }
            bot.sendChatAction(event.chat.id, "upload_photo");

            qr.toBuffer(param[0], (err, buff) => {
                bot.sendPhoto(event.chat.id, buff, {
                    ...reply,
                    caption: `Aqui está seu QrCode.\n\nContém: "${param[0]}".`
                })
            });
        },
        async yt_music() {
            bot.sendMessage(event.chat.id, "Comando /yt_music está inativo.", reply);
            return
            if (param[0] !== undefined) {
                bot.sendChatAction(event.chat.id, "typing");
                const message_id = (await bot.sendMessage(event.chat.id, "Estou pesquisando...", reply)).message_id;
                var vid = (await ytSeach({ query: param[0], category: "music" })).videos[0]
                bot.editMessageText(`Estou baixando "${vid.title}", aguarde...`, {
                    chat_id: event.chat.id,
                    message_id: message_id
                });
                try {
                    if (vid === undefined) {
                        bot.editMessageText(`Houve um erro, tente novamente.`, {
                            chat_id: event.chat.id,
                            message_id: message_id
                        })
                    } else if (vid.seconds > 600) {
                        bot.editMessageText(`A musica encontrada (${vid.title} - ${vid.author}) é muito grande. Tente outra.`, {
                            chat_id: event.chat.id,
                            message_id: message_id
                        })
                    } else {
                        fs.readdir(__dirname, (err, files) => {
                            if (err) {
                                console.log(err)
                            } else {
                                files.filter(f => f.endsWith("-base.js")).forEach(f => {
                                    fs.rmSync(path.join(__dirname, f), { recursive: true, force: true });
                                });
                            }
                        });
                        const info = await ytdl.getInfo(vid.url);

                        const audio_format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
                        const audio_stream = ytdl.downloadFromInfo(info, {
                            format: audio_format,
                            quality: 'highestaudio'
                        });
                        let audio_buffer = Buffer.from('');
                        audio_stream.on('data', (chunk) => {
                            audio_buffer = Buffer.concat([audio_buffer, chunk]);
                        });
                        audio_stream.on('end', async () => {
                            bot.sendChatAction(event.chat.id, "upload_voice");
                            await bot.sendAudio(event.chat.id as number, audio_buffer, {
                                title: info.videoDetails.title,
                                performer: info.videoDetails.author.name,
                                ...reply
                            })
                            bot.editMessageText("Musica enviada!", {
                                chat_id: event.chat.id,
                                message_id: message_id
                            });
                        });
                    }
                } catch (error) {
                    bot.sendMessage(event.chat.id, "Houve um erro.", reply)
                    throw error;
                }
            } else {
                bot.sendMessage(event.chat.id, "Qual o nome da música?", reply)
            }
        },
        allow() {
            bot.sendChatAction(event.chat.id, "typing");
            if (event.chat.type === "private") {
                bot.sendMessage(event.chat.id, "Esse comando é exclusivo para grupos.", reply);
            } else if (primary_config.administrators.includes(event.from?.id as number)) {
                if (!primary_config.chats_allowed.includes(event.chat.id)) {
                    primary_config.chats_allowed.push(event.chat.id);
                    fs.writeFileSync(path.join(__dirname, "../db/data.json"), JSON.stringify(primary_config, undefined, 4));
                    bot.sendMessage(event.chat.id, "Esse grupo foi desbloqueado.", reply);
                } else {
                    bot.sendMessage(event.chat.id, "Esse grupo já está desbloqueado.", reply);
                }
            } else {
                bot.sendMessage(event.chat.id, "Somente administradores podem usar esse comando.", reply);
            }
        },
        block() {
            path.join(__dirname, "../db/data.json")
            bot.sendChatAction(event.chat.id, "typing");
            if (event.chat.type === "private") {
                bot.sendMessage(event.chat.id, "Esse comando é exclusivo para grupos.", reply);
            } else if (primary_config.administrators.includes(event.from?.id as number)) {
                var index = primary_config.chats_allowed.indexOf(event.chat.id);
                primary_config.chats_allowed.splice(index, 1);
                fs.writeFileSync(path.join(__dirname, "../db/data.json"), JSON.stringify(primary_config, undefined, 4));
                bot.sendMessage(event.chat.id, "Esse grupo foi bloqueado.", reply);
            } else {
                bot.sendMessage(event.chat.id, "Somente administradores podem usar esse comando.", reply);
            }
        },
        async shorturl() {
            var message_id: number | undefined;
            if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                message_id = (await bot.sendMessage(event.chat.id, "Qual link deseja encurtar?", reply)).message_id
                const param1 = (await listen_parameter(event.chat.id, event.from?.id as number, 'shorturl'))
                
                if (!(param1.text)) return;

                param.push(param1.text as string);
                bot.deleteMessage(param1.chat.id, param1.message_id);
            }
            if (message_id) {
                bot.editMessageText(`Qual encurtador deseja usar?\n\nURL Original: ${param[0]}`, {
                    chat_id: event.chat.id,
                    message_id: message_id,
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "TinyUrl", callback_data: `tinyurl` },
                            { text: "IS.GD", callback_data: `isgd` }
                        ]]
                    }
                });
            } else {
                message_id = (await bot.sendMessage(event.chat.id, `Qual encurtador deseja usar?\n\nURL Original: ${param[0]}`, {
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "TinyUrl", callback_data: `tinyurl` },
                            { text: "IS.GD", callback_data: `isgd` }
                        ]]
                    },
                    ...reply
                })).message_id;
            }
            const shtr = await listen_callback(event.chat.id, message_id as number, 'shorturl');
            const shorter = {
                tinyurl: {
                    name: 'TinyURL',
                    url: "tinyurl.com/api-create.php?url="
                },
                isgd: {
                    name: 'IS.GD',
                    url: "is.gd/create.php?format=simple&url="
                }
            }[shtr.data as string] as any
            try {
                const apiUrl = `https://${shorter.url}${param[0]}`;
                const response = await axios.get(apiUrl);
                bot.editMessageText(`Usado o encurtador ${shorter.name}.\n\nURL Encurtada: ${response.data}`, {
                    chat_id: event.chat.id,
                    message_id: message_id,
                    reply_markup: { inline_keyboard: [] }
                });
            } catch (error) {
                bot.editMessageText("Ocorreu um erro ao encurtar a URL. Tente novamente.", {
                    chat_id: event.chat.id,
                    message_id: message_id,
                    reply_markup: { inline_keyboard: [] }
                });
            }

        },
        async cota() {
            async function convert(entry: string, exit: string, value: number) {
                return axios.get(`https://economia.awesomeapi.com.br/last/${entry}-${exit}`).then((response) => {
                    const cvt = parseFloat(response.data[entry + exit].high);
                    const result = value * cvt;
                    return isNaN(result) ? 'error-2' : result
                }).catch(r => {
                    return 'error-1'
                })
            }
            var message_id: number | undefined;
            if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                
                message_id = (await bot.sendMessage(event.chat.id, "Com qual configuração deseja converter?", reply)).message_id;

                const param1 = await listen_parameter(event.chat.id, event.from?.id as number, 'cota');
                if (!(param1.text)) return;
                param.push(param1.text as string);
                bot.deleteMessage(param1.chat.id, param1.message_id);
            } if (param.length === 1) {
                bot.sendChatAction(event.chat.id, "typing");
                if (message_id) {
                    bot.editMessageText("Qual valor deseja converter?", {
                        chat_id: event.chat.id,
                        message_id: message_id
                    });
                } else {
                    message_id = (await bot.sendMessage(event.chat.id, "Qual valor deseja converter?", reply)).message_id;
                }
                const param2 = (await listen_parameter(event.chat.id, event.from?.id as number, 'cota'));
                if (!(param2.text)) return;
                param.push(param2.text as string);
                bot.deleteMessage(param2.chat.id, param2.message_id);
            }

            const etr = parseFloat(param[1].replace(',', '.'));
            const params = param[0].split('-').map(d => d.toUpperCase());
            const result = await convert(params[0], params[1], etr);

            if (result === 'error-1') {
                bot.sendMessage(event.chat.id, `Não consigo converter a configuração *${params[0]}-${params[1]}*.`, { ...reply, parse_mode: "Markdown" });
            } else if (result === 'error-2') {
                bot.sendMessage(event.chat.id, `O valor não pode ser convertido.`, reply);
            } else {
                var from: number | string = etr;
                try { from = from.toLocaleString("pt-BR", { style: "currency", currency: params[0] }) } catch { }
                var to = result;
                try { to = result.toLocaleString("pt-BR", { style: "currency", currency: params[1] }) } catch { }
                const text = `Atualmente, <strong><u>${from}</u></strong> em ${params[0]} vale o mesmo que <strong><u>${to}</u></strong> em ${params[1]}.\n\nCotação de ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}.`;
                if (message_id) {
                    bot.editMessageText(text, { chat_id: event.chat.id, message_id: message_id, parse_mode: "HTML" });
                } else {
                    bot.sendMessage(
                        event.chat.id,
                        text,
                        { ...reply, reply_markup: { remove_keyboard: true }, parse_mode: "HTML" }
                    );
                }
            }
        },
        cota_factors() {
            bot.sendMessage(event.chat.id,
                `O comando deve estar no formato: \`/cota <entrada-saida> <valor>\`.\n\nExemplo: \n\`/cota USD-BRL 100\`.\n\`/cota EUR-JPY 100\`.\n\`/cota BRL-USD 100\`.\n\nFatores de cotação: \n\n\`AED\`: Dirham dos Emirados;\n\`AFN\`: Afghani do Afeganistão;\n\`ALL\`: Lek Albanês;\n\`AMD\`: Dram Armênio;\n\`ANG\`: Guilder das Antilhas;\n\`AOA\`: Kwanza Angolano;\n\`ARS\`: Peso Argentino;\n\`AUD\`: Dólar Australiano;\n\`AZN\`: Manat Azeri;\n\`BAM\`: Marco Conversível;\n\`BBD\`: Dólar de Barbados;\n\`BDT\`: Taka de Bangladesh;\n\`BGN\`: Lev Búlgaro;\n\`BHD\`: Dinar do Bahrein;\n\`BIF\`: Franco Burundinense;\n\`BND\`: Dólar de Brunei;\n\`BOB\`: Boliviano;\n\`BRL\`: Real Brasileiro;\n\`BRLT\`: Real Brasileiro Turismo;\n\`BSD\`: Dólar das Bahamas;\n\`BTC\`: Bitcoin;\n\`BWP\`: Pula de Botswana;\n\`BYN\`: Rublo Bielorrusso;\n\`BZD\`: Dólar de Belize;\n\`CAD\`: Dólar Canadense;\n\`CHF\`: Franco Suíço;\n\`CHFRTS\`: Franco Suíço;\n\`CLP\`: Peso Chileno;\n\`CNH\`: Yuan chinês offshore;\n\`CNY\`: Yuan Chinês;\n\`COP\`: Peso Colombiano;\n\`CRC\`: Colón Costarriquenho;\n\`CUP\`: Peso Cubano;\n\`CVE\`: Escudo cabo-verdiano;\n\`CZK\`: Coroa Checa;\n\`DJF\`: Franco do Djubouti;\n\`DKK\`: Coroa Dinamarquesa;\n\`DOGE\`: Dogecoin;\n\`DOP\`: Peso Dominicano;\n\`DZD\`: Dinar Argelino;\n\`EGP\`: Libra Egípcia;\n\`ETB\`: Birr Etíope;\n\`ETH\`: Ethereum;\n\`EUR\`: Euro;\n\`FJD\`: Dólar de Fiji;\n\`GBP\`: Libra Esterlina;\n\`GEL\`: Lari Georgiano;\n\`GHS\`: Cedi Ganês;\n\`GMD\`: Dalasi da Gâmbia;\n\`GNF\`: Franco de Guiné;\n\`GTQ\`: Quetzal Guatemalteco;\n\`HKD\`: Dólar de Hong Kong;\n\`HNL\`: Lempira Hondurenha;\n\`HRK\`: Kuna Croata;\n\`HTG\`: Gourde Haitiano;\n\`HUF\`: Florim Húngaro;\n\`IDR\`: Rupia Indonésia;\n\`ILS\`: Novo Shekel Israelense;\n\`INR\`: Rúpia Indiana;\n\`IQD\`: Dinar Iraquiano;\n\`IRR\`: Rial Iraniano;\n\`ISK\`: Coroa Islandesa;\n\`JMD\`: Dólar Jamaicano;\n\`JOD\`: Dinar Jordaniano;\n\`JPY\`: Iene Japonês;\n\`JPYRTS\`: Iene Japonês;\n\`KES\`: Shilling Queniano;\n\`KGS\`: Som Quirguistanês;\n\`KHR\`: Riel Cambojano;\n\`KMF\`: Franco Comorense;\n\`KRW\`: Won Sul-Coreano;\n\`KWD\`: Dinar Kuwaitiano;\n\`KYD\`: Dólar das Ilhas Cayman;\n\`KZT\`: Tengue Cazaquistanês;\n\`LAK\`: Kip Laosiano;\n\`LBP\`: Libra Libanesa;\n\`LKR\`: Rúpia de Sri Lanka;\n\`LSL\`: Loti do Lesoto;\n\`LTC\`: Litecoin;\n\`LYD\`: Dinar Líbio;\n\`MAD\`: Dirham Marroquino;\n\`MDL\`: Leu Moldavo;\n\`MGA\`: Ariary Madagascarense;\n\`MKD\`: Denar Macedônio;\n\`MMK\`: Kyat de Mianmar;\n\`MNT\`: Mongolian Tugrik;\n\`MOP\`: Pataca de Macau;\n\`MRO\`: Ouguiya Mauritana;\n\`MUR\`: Rúpia Mauriciana;\n\`MVR\`: Rufiyaa Maldiva;\n\`MWK\`: Kwacha Malauiana;\n\`MXN\`: Peso Mexicano;\n\`MYR\`: Ringgit Malaio;\n\`MZN\`: Metical de Moçambique;\n\`NAD\`: Dólar Namíbio;\n\`NGN\`: Naira Nigeriana;\n\`NGNI\`: Naira Nigeriana;\n\`NGNPARALLEL\`: Naira Nigeriana;\n\`NIO\`: Córdoba Nicaraguense;\n\`NOK\`: Coroa Norueguesa;\n\`NPR\`: Rúpia Nepalesa;\n\`NZD\`: Dólar Neozelandês;\n\`OMR\`: Rial Omanense;\n\`PAB\`: Balboa Panamenho;\n\`PEN\`: Sol do Peru;\n\`PGK\`: Kina Papua-Nova Guiné;\n\`PHP\`: Peso Filipino;\n\`PKR\`: Rúpia Paquistanesa;\n\`PLN\`: Zlóti Polonês;\n\`PYG\`: Guarani Paraguaio;\n\`QAR\`: Rial Catarense;\n\`RON\`: Leu Romeno;\n\`RSD\`: Dinar Sérvio;\n\`RUB\`: Rublo Russo;\n\`RUBTOD\`: Rublo Russo;\n\`RUBTOM\`: Rublo Russo;\n\`RWF\`: Franco Ruandês;\n\`SAR\`: Riyal Saudita;\n\`SCR\`: Rúpias de Seicheles;\n\`SDG\`: Libra Sudanesa;\n\`SDR\`: DSE;\n\`SEK\`: Coroa Sueca;\n\`SGD\`: Dólar de Cingapura;\n\`SOS\`: Shilling Somaliano;\n\`STD\`: Dobra São Tomé/Príncipe;\n\`SVC\`: Colon de El Salvador;\n\`SYP\`: Libra Síria;\n\`SZL\`: Lilangeni Suazilandês;\n\`THB\`: Baht Tailandês;\n\`TJS\`: Somoni do Tajiquistão;\n\`TMT\`: TMT;\n\`TND\`: Dinar Tunisiano;\n\`TRY\`: Nova Lira Turca;\n\`TTD\`: Dólar de Trinidad;\n\`TWD\`: Dólar Taiuanês;\n\`TZS\`: Shilling Tanzaniano;\n\`UAH\`: Hryvinia Ucraniana;\n\`UGX\`: Shilling Ugandês;\n\`USD\`: Dólar Americano;\n\`USDT\`: Dólar Americano;\n\`UYU\`: Peso Uruguaio;\n\`UZS\`: Som Uzbequistanês;\n\`VEF\`: Bolívar Venezuelano;\n\`VND\`: Dong Vietnamita;\n\`VUV\`: Vatu de Vanuatu;\n\`XAF\`: Franco CFA Central;\n\`XAGG\`: Prata;\n\`XBR\`: Brent Spot;\n\`XCD\`: Dólar do Caribe Oriental;\n\`XOF\`: Franco CFA Ocidental;\n\`XPF\`: Franco CFP;\n\`XRP\`: XRP;\n\`YER\`: Riyal Iemenita;\n\`ZAR\`: Rand Sul-Africano;\n\`ZMK\`: Kwacha Zambiana;\n\`ZWL\`: Dólar Zimbabuense;\n\`XAU\`: Ouro.`,
                { ...reply, parse_mode: "Markdown" });
        },
        async ping() {        
            const sentMessage = await bot.sendMessage(event.chat.id, 'Calculando...', reply);
            
            const start = Date.now();

            await bot.getMe();

            const end = Date.now();
            const ping = end - start;
            
            bot.editMessageText(`🏓 Pong! O ping da API é de ${ping > 999 ? "+999" : ping}ms.`, {
                    chat_id: event.chat.id,
                    message_id: sentMessage.message_id,
            });
        },
        async wait_test() {
            var params = param;
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, `Esperando o parametro 1`, reply);
                var p1 = (await listen_parameter(event.chat?.id, event.from?.id as number, "Esperando o parametro 1")).text;
                if (!p1) return
                params.push(p1)
            } if (param.length === 1) {
                bot.sendMessage(event.chat.id, `Esperando o parametro 2`, reply);
                var p2 = (await listen_parameter(event.chat?.id, event.from?.id as number, "Esperando o parametro 2")).text;
                if (!p2) return
                params.push(p2)
            } if (param.length === 2) {
                bot.sendMessage(event.chat.id, `Obrigado!\n\n${params[0]}, ${params[1]}`, reply);
            }
        },
        async call_test() {
            var main = await bot.sendMessage(event.chat.id, `Esperando reação.`, { 
                ...reply,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "❤️", callback_data: "like" },
                            { text: "💔", callback_data: "hate" }
                        ]
                    ]
                }
            });
            const rl: any = {
                like: '❤️',
                hate: '💔',
            }
            
            const res1 = (await listen_callback(event.chat.id, main.message_id, "call_test"))
            main = res1.message as TelegramBot.Message;

            await bot.editMessageText(`Voce escolheu ${rl[res1.data as string]}`, {
                chat_id: event.chat.id,
                message_id: main.message_id
            }) as TelegramBot.Message;
        }
    }
}

bot.on("message", event => {
    if (event.new_chat_members) {
        if (!(event.new_chat_members.find(d => d.username === process.env.BOT_USERNAME))) return;
        bot.sendMessage(primary_config.administrators[0], `Me adicionaram no grupo: ${event.chat.title}.\n\nAdicionado por @${event.from?.username}.`);
        return
    } else if (event.left_chat_member) {
        event.left_chat_member.username === process.env.BOT_USERNAME && bot.sendMessage(primary_config.administrators[0], `Não estou mais no grupo: ${event.chat.title}.\n\nRemovido por @${event.from?.username}.`);
    }

    let msg = event.text as string;
    if (!msg) return;
    const is_private = event.chat.type === "private";
    const reply = is_private ? {} : { reply_to_message_id: event.message_id };
    const parameters = msg.split(" ").slice(1);
    
    var command = get_command(msg, !is_private);
    
    if (command && ((!is_private && (primary_config.chats_allowed.includes(event.chat.id) || primary_config.administrators.includes(event.from?.id as number))) || is_private)) {
        commands(event, parameters, reply)[command]();
        
        console.log(commandNotify([
            ` > Command:  ${command}. `,
            ` > Message:  "${event.text}". `,
            ` > User:     @${event.from?.username}. `,
            ` > Used in:  ${event.chat.title ?? 'Private'}. `,
            ` > Hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Used", c_wid()));
    } 
});

bot.on('polling_error', event => {
    console.log(commandNotify([` ${event.message} `], undefined, c_wid()));
});

console.log(commandNotify([`${process.env.BOT_NAME} está on-line.`, `Link: https://t.me/${process.env.BOT_USERNAME}`], undefined));
console.log(commandNotify(JSON.stringify(primary_config, undefined, 2).split("\n"), "Current Settings", c_wid()));

process.env["NTBA_FIX_319"] = "1";
process.env["NTBA_FIX_350"] = "0";