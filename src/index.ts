import TelegramBot from 'node-telegram-bot-api';
import { config } from "dotenv"; config();
import path from "path";
import fs, { fstatSync, readFile } from "fs";
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
    wait_settings: <{ [key: string]: { command_wait: string | null, parameters: string[] } }> {}
}

interface PublicRunTimeParams {
    [key: number]: { // <- Chat ID
        [key: string]: /* <- User Name */ UserRunTimeParams
    }
}
interface UserRunTimeParams {
    command_wait?: string | null;
    callOn?: boolean;
}
var RunTimeParams = {
    private: <UserRunTimeParams>{
        command_wait: null,
        params: [],
        callOn: false,
        callData: <{ [key: string]: { [key: string]: (string | number)[] } }>{}
    },
    public: <PublicRunTimeParams>{}
}

const myCommands = [
    { command: "menu", description: "Mostra todos os comandos." },
    { command: "qrcode", description: "Gera um QrCode." },
    { command: "yt_music", description: "Baixa musicas do YouTube." },
    { command: "shorturl", description: "Encurta uma URL." },
    { command: "cota", description: "Converte de moedas." },
]
bot.setMyCommands(myCommands);

function commandNotify(content: string[], title?: string, width: number = 1, max_width = process.stdout.columns) {
    let emi: string[] = []
    let bigger = Math.max(...content.map(d => d.length))
    if (bigger > width) width = bigger
    if (width > max_width) width = max_width - 2
    emi.push(...content.map(d => {
        var x = d.length > width ? d.slice(0, width - 4) + "... " : d
        return `┃${x + " ".repeat(width - x.length)}┃`
    }))
    return [
        `┏${title === undefined ? '━'.repeat(width) : `━ ${title} ` + '━'.repeat(width - title.length - 3)}┓`,
        ...emi,
        `┗${'━'.repeat(width)}┛`
    ].join("\n")
}
function wait_start(command: string, parameters: string[], chatId?: number, userId?: number) {
    const wait_ponter = `${chatId}_${userId}`;
    runtime_data.wait_settings[wait_ponter] = {
        command_wait: command,
        parameters: parameters
    }
}
function wait_end(command: string, chatId?: number, userId?: number) {
    const wait_ponter = `${chatId}_${userId}`;
    delete runtime_data.wait_settings[wait_ponter];
}
function push_parameter(chatId: number, userId: number, parameter: string) {
    const wait_ponter = `${chatId}_${userId}`;
    runtime_data.wait_settings[wait_ponter].parameters.push(parameter);
}
function get_command(message: string, is_public: boolean) {
    const regex: RegExp = is_public ? new RegExp(`(?<=^\\/)(\\w+)(?=@${process.env.BOT_NAME})`) : /(?<=^\/)(\w+)/;
    const cmd = message.match(regex);
    return cmd ? cmd[0] : undefined;
}

function commands(event: TelegramBot.Message, param: string[], reply?: number): { [key: string]: any } {
    return {
        start() {
            bot.sendMessage(event.chat.id, `Olá, veja os comandos no Menu.`)
        },
        menu() {

        },
        qrcode() {
            if (event.reply_to_message !== undefined) {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(event.reply_to_message?.text as string, (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply
                    });
                });
            } else if (param.length === 0) {
                bot.sendChatAction(event.chat.id, "typing");
                bot.sendMessage(event.chat.id, "Foneça o conteudo do código QR.", {
                    reply_to_message_id: reply
                });
                wait_start("qrcode", param, event.chat.id, event.from?.id);
            } else {
                bot.sendChatAction(event.chat.id, "upload_photo");
                qr.toBuffer(param[0], (err, buff) => {
                    bot.sendPhoto(event.chat.id, buff, {
                        reply_to_message_id: reply,
                        caption: "Aqui está seu QrCode."
                    })
                });
            }
        },
        async yt_music() {
            if (param[0] !== undefined) {
                var vid = (await ytSeach({ query: param[0], category: "music" })).videos[0]
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
                wait_start("yt_music", param, event.chat.id, event.from?.id);
            }
        },
        allow() {
            bot.sendChatAction(event.chat.id, "typing");
            if (primary_config.administrators.includes(event.from?.id as number)) {
                if (!primary_config.chats_allowed.includes(event.chat.id)) {
                    primary_config.chats_allowed.push(event.chat.id);
                    fs.writeFileSync("./src/bases.json", JSON.stringify(primary_config, undefined, 4));
                    bot.sendMessage(event.chat.id, "Esse grupo foi desbloqueado.");
                } else {
                    bot.sendMessage(event.chat.id, "Esse grupo já foi desbloqueado.");
                }
            } else {
                bot.sendMessage(event.chat.id, "Somente administradores podem usar esse comando.");
            }
        },
        shorturl() {
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Qual link deseja encurtar?", {
                    reply_to_message_id: reply
                });
                wait_start("shorturl", param, event.chat.id, event.from?.id);
            } else {
                bot.sendMessage(event.chat.id, `Qual encurtador deseja usar?\n\nURL Original: ${param[0]}`, {
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "TinyUrl", callback_data: `shorturl:tinyurl-${event.message_id}` },
                            { text: "IS.GD", callback_data: `shorturl:isgd-${event.message_id}` }
                        ]]
                    },
                    reply_to_message_id: reply
                })
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
            if (param.length === 2) {
                const etr = parseFloat(param[1].replace(',', '.'));
                const params = param[0].split('-').map(d => d.toUpperCase());
                const result = await convert(params[0], params[1], etr);
                if (result === 'error-1') {
                    bot.sendMessage(event.chat.id, `Não consigo converter a configuração *${params[0]}-${params[1]}*.`, { reply_to_message_id: reply, parse_mode: "Markdown" });
                } else if (result === 'error-2') {
                    bot.sendMessage(event.chat.id, `O valor não pode ser convertido.`, { reply_to_message_id: reply });
                } else {
                    var from: number | string = etr;
                    try { from = from.toLocaleString("pt-BR", { style: "currency", currency: params[0] }) } catch { }
                    var to = result;
                    try { to = result.toLocaleString("pt-BR", { style: "currency", currency: params[1] }) } catch { }
                    bot.sendMessage(
                        event.chat.id,
                        `Atualmente, <strong><u>${from}</u></strong> em ${params[0]} vale o mesmo que <strong><u>${to}</u></strong> em ${params[1]}.\n\nCotação de ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`,
                        { reply_to_message_id: reply, reply_markup: { remove_keyboard: true }, parse_mode: "HTML" }
                    );
                }
            } else {
                bot.sendMessage(event.chat.id, `O comando deve estar no formato: \`/cota <entrada-saida> <valor>\`.\n\nExemplo: \n\`/cota USD-BRL 100\`.\n\`/cota EUR-JPY 100\`.\n\`/cota BRL-USD 100\`.\n\nVeja mais usando: /cota\\_factors.`, {
                    reply_to_message_id: reply,
                    parse_mode: "Markdown"
                });
            }
        },
        cota_factors() {
            bot.sendMessage(event.chat.id,
                `Fatores de cotação: \n\n\`AED\`: Dirham dos Emirados;\n\`AFN\`: Afghani do Afeganistão;\n\`ALL\`: Lek Albanês;\n\`AMD\`: Dram Armênio;\n\`ANG\`: Guilder das Antilhas;\n\`AOA\`: Kwanza Angolano;\n\`ARS\`: Peso Argentino;\n\`AUD\`: Dólar Australiano;\n\`AZN\`: Manat Azeri;\n\`BAM\`: Marco Conversível;\n\`BBD\`: Dólar de Barbados;\n\`BDT\`: Taka de Bangladesh;\n\`BGN\`: Lev Búlgaro;\n\`BHD\`: Dinar do Bahrein;\n\`BIF\`: Franco Burundinense;\n\`BND\`: Dólar de Brunei;\n\`BOB\`: Boliviano;\n\`BRL\`: Real Brasileiro;\n\`BRLT\`: Real Brasileiro Turismo;\n\`BSD\`: Dólar das Bahamas;\n\`BTC\`: Bitcoin;\n\`BWP\`: Pula de Botswana;\n\`BYN\`: Rublo Bielorrusso;\n\`BZD\`: Dólar de Belize;\n\`CAD\`: Dólar Canadense;\n\`CHF\`: Franco Suíço;\n\`CHFRTS\`: Franco Suíço;\n\`CLP\`: Peso Chileno;\n\`CNH\`: Yuan chinês offshore;\n\`CNY\`: Yuan Chinês;\n\`COP\`: Peso Colombiano;\n\`CRC\`: Colón Costarriquenho;\n\`CUP\`: Peso Cubano;\n\`CVE\`: Escudo cabo-verdiano;\n\`CZK\`: Coroa Checa;\n\`DJF\`: Franco do Djubouti;\n\`DKK\`: Coroa Dinamarquesa;\n\`DOGE\`: Dogecoin;\n\`DOP\`: Peso Dominicano;\n\`DZD\`: Dinar Argelino;\n\`EGP\`: Libra Egípcia;\n\`ETB\`: Birr Etíope;\n\`ETH\`: Ethereum;\n\`EUR\`: Euro;\n\`FJD\`: Dólar de Fiji;\n\`GBP\`: Libra Esterlina;\n\`GEL\`: Lari Georgiano;\n\`GHS\`: Cedi Ganês;\n\`GMD\`: Dalasi da Gâmbia;\n\`GNF\`: Franco de Guiné;\n\`GTQ\`: Quetzal Guatemalteco;\n\`HKD\`: Dólar de Hong Kong;\n\`HNL\`: Lempira Hondurenha;\n\`HRK\`: Kuna Croata;\n\`HTG\`: Gourde Haitiano;\n\`HUF\`: Florim Húngaro;\n\`IDR\`: Rupia Indonésia;\n\`ILS\`: Novo Shekel Israelense;\n\`INR\`: Rúpia Indiana;\n\`IQD\`: Dinar Iraquiano;\n\`IRR\`: Rial Iraniano;\n\`ISK\`: Coroa Islandesa;\n\`JMD\`: Dólar Jamaicano;\n\`JOD\`: Dinar Jordaniano;\n\`JPY\`: Iene Japonês;\n\`JPYRTS\`: Iene Japonês;\n\`KES\`: Shilling Queniano;\n\`KGS\`: Som Quirguistanês;\n\`KHR\`: Riel Cambojano;\n\`KMF\`: Franco Comorense;\n\`KRW\`: Won Sul-Coreano;\n\`KWD\`: Dinar Kuwaitiano;\n\`KYD\`: Dólar das Ilhas Cayman;\n\`KZT\`: Tengue Cazaquistanês;\n\`LAK\`: Kip Laosiano;\n\`LBP\`: Libra Libanesa;\n\`LKR\`: Rúpia de Sri Lanka;\n\`LSL\`: Loti do Lesoto;\n\`LTC\`: Litecoin;\n\`LYD\`: Dinar Líbio;\n\`MAD\`: Dirham Marroquino;\n\`MDL\`: Leu Moldavo;\n\`MGA\`: Ariary Madagascarense;\n\`MKD\`: Denar Macedônio;\n\`MMK\`: Kyat de Mianmar;\n\`MNT\`: Mongolian Tugrik;\n\`MOP\`: Pataca de Macau;\n\`MRO\`: Ouguiya Mauritana;\n\`MUR\`: Rúpia Mauriciana;\n\`MVR\`: Rufiyaa Maldiva;\n\`MWK\`: Kwacha Malauiana;\n\`MXN\`: Peso Mexicano;\n\`MYR\`: Ringgit Malaio;\n\`MZN\`: Metical de Moçambique;\n\`NAD\`: Dólar Namíbio;\n\`NGN\`: Naira Nigeriana;\n\`NGNI\`: Naira Nigeriana;\n\`NGNPARALLEL\`: Naira Nigeriana;\n\`NIO\`: Córdoba Nicaraguense;\n\`NOK\`: Coroa Norueguesa;\n\`NPR\`: Rúpia Nepalesa;\n\`NZD\`: Dólar Neozelandês;\n\`OMR\`: Rial Omanense;\n\`PAB\`: Balboa Panamenho;\n\`PEN\`: Sol do Peru;\n\`PGK\`: Kina Papua-Nova Guiné;\n\`PHP\`: Peso Filipino;\n\`PKR\`: Rúpia Paquistanesa;\n\`PLN\`: Zlóti Polonês;\n\`PYG\`: Guarani Paraguaio;\n\`QAR\`: Rial Catarense;\n\`RON\`: Leu Romeno;\n\`RSD\`: Dinar Sérvio;\n\`RUB\`: Rublo Russo;\n\`RUBTOD\`: Rublo Russo;\n\`RUBTOM\`: Rublo Russo;\n\`RWF\`: Franco Ruandês;\n\`SAR\`: Riyal Saudita;\n\`SCR\`: Rúpias de Seicheles;\n\`SDG\`: Libra Sudanesa;\n\`SDR\`: DSE;\n\`SEK\`: Coroa Sueca;\n\`SGD\`: Dólar de Cingapura;\n\`SOS\`: Shilling Somaliano;\n\`STD\`: Dobra São Tomé/Príncipe;\n\`SVC\`: Colon de El Salvador;\n\`SYP\`: Libra Síria;\n\`SZL\`: Lilangeni Suazilandês;\n\`THB\`: Baht Tailandês;\n\`TJS\`: Somoni do Tajiquistão;\n\`TMT\`: TMT;\n\`TND\`: Dinar Tunisiano;\n\`TRY\`: Nova Lira Turca;\n\`TTD\`: Dólar de Trinidad;\n\`TWD\`: Dólar Taiuanês;\n\`TZS\`: Shilling Tanzaniano;\n\`UAH\`: Hryvinia Ucraniana;\n\`UGX\`: Shilling Ugandês;\n\`USD\`: Dólar Americano;\n\`USDT\`: Dólar Americano;\n\`UYU\`: Peso Uruguaio;\n\`UZS\`: Som Uzbequistanês;\n\`VEF\`: Bolívar Venezuelano;\n\`VND\`: Dong Vietnamita;\n\`VUV\`: Vatu de Vanuatu;\n\`XAF\`: Franco CFA Central;\n\`XAGG\`: Prata;\n\`XBR\`: Brent Spot;\n\`XCD\`: Dólar do Caribe Oriental;\n\`XOF\`: Franco CFA Ocidental;\n\`XPF\`: Franco CFP;\n\`XRP\`: XRP;\n\`YER\`: Riyal Iemenita;\n\`ZAR\`: Rand Sul-Africano;\n\`ZMK\`: Kwacha Zambiana;\n\`ZWL\`: Dólar Zimbabuense;\n\`XAU\`: Ouro.`,
                { reply_to_message_id: reply, parse_mode: "Markdown" });
        },
        wait_test() {
            if (param.length === 0) {
                bot.sendMessage(event.chat.id, "Esperando o parametro 1", { reply_to_message_id: reply });
                wait_start("wait_test", param, event.chat.id, event.from?.id);
            } else if (param.length === 1) {
                bot.sendMessage(event.chat.id, "Esperando o parametro 2", { reply_to_message_id: reply });
                wait_start("wait_test", param, event.chat.id, event.from?.id);
            } else if (param.length === 2) {
                bot.sendMessage(event.chat.id, "Obrigado!", { reply_to_message_id: reply });
                wait_start("wait_test", param, event.chat.id, event.from?.id);
            }
        }
    }
}

function waits(event: TelegramBot.Message, reply?: number): { [key: string]: any } {
    return {
        qrcode() {
            commands(event, [event.text as string], reply).qrcode();
            wait_end("qrcode", event.chat.id, event.from?.id)
        },
        shorturl() {
            commands(event, [event.text as string], reply).shorturl();
            wait_end("shorturl", event.chat.id, event.from?.id)
        },
        yt_music() {
            commands(event, [event.text as string], reply).yt_music();
            wait_end("yt_music", event.chat.id, event.from?.id)
        },
        wait_test() {
            push_parameter(event.chat.id, event.from?.id as number, event.text as string);
            commands(event, [event.text as string], reply).wait_test();
        }
    }
}

function calls(event: TelegramBot.CallbackQuery, data: string, reply?: number): { [key: string]: any } {
    return {
        async shorturl() {
            const shorter = {
                tinyurl: {
                    name: 'TinyURL',
                    url: "tinyurl.com/api-create.php?url="
                },
                isgd: {
                    name: 'IS.GD',
                    url: "is.gd/create.php?format=simple&url="
                }
            }[data.replace('shorturl:', '').split('-')[0]] as any
            const original_url = event.message?.text?.slice(44)
            try {
                const apiUrl = `https://${shorter.url}${original_url}`;
                const response = await axios.get(apiUrl);
                bot.editMessageText(`Usado o encurtador ${shorter.name}.\n\nURL Encurtada: ${response.data}`, {
                    chat_id: event.message?.chat.id,
                    message_id: event.message?.message_id,
                    reply_markup: { inline_keyboard: [] }
                });
            } catch (error) {
                bot.editMessageText("Ocorreu um erro ao encurtar a URL. Tente novamente.", {
                    chat_id: event.message?.chat.id,
                    message_id: event.message?.message_id,
                    reply_markup: { inline_keyboard: [] }
                });
            }
        }
    }
}

bot.on("message", event => {
    let msg = event.text as string;
    const is_private = event.chat.type !== "private";
    const reply = is_private ? event.message_id : undefined;
    const parameters = msg.split(" ").slice(1);
    const wait_pointer = `${event.chat.id}_${event.from?.id}`
    
    var command = get_command(msg, is_private);
    var is_command = true

    if (command) {
        wait_end('', event.chat.id, event.from?.id);
        commands(event, parameters, reply)[command](); 
    } else if (runtime_data.wait_settings[wait_pointer]?.command_wait && !command) {
        if (is_private &&!(event.reply_to_message?.from?.username === process.env.BOT_NAME)) return;
        is_command = false
        command = runtime_data.wait_settings[wait_pointer].command_wait
        waits(event, reply)[command]();
    }

    console.log(commandNotify([
        ` > ${is_command ? 'Command:     ' : 'Answer to:   ' }${command}. `,
        ` > ${is_command ? 'Message:     ' : 'Content:     ' }"${event.text}". `,
        ` > User:        @${event.from?.username}. `,
        ` > ${is_command ? 'Used in:     ' : 'Answered in: ' }${event.chat.title}. `,
        ` > Hour:        ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
    ], is_command ? "Command Used" : "Command Answered"));
    
    return 
    if (
        msg.startsWith("/") && 
        (
            event.chat.type === "group" || 
            event.chat.type === "supergroup"
        )
    ) {
        if (
            primary_config.chats_allowed.includes(event.chat.id) || 
            primary_config.administrators.includes(event.from?.id as number)
        ) {
            let command = msg.slice(1).split(" ");
            if (command[0].includes("@")) {
                if (command[0].endsWith(`@${process.env.BOT_NAME}`)) {
                    command[0] = command[0].split("@")[0]
                } else return
            }
            command[0] = command[0].split("@")[0];
            
            wait_end("", event.chat.id, event.from?.id);

            let _commands = commands(event, command.slice(1), event.message_id);
            if (Object.keys(_commands).includes(command[0])) {
                _commands[command[0]]();
            }
            console.log(commandNotify([
                ` > Command:  ${command[0]}. `,
                ` > Message:  "${msg}". `,
                ` > User:     @${event.from?.username}. `,
                ` > Used in:  ${event.chat.title}. `,
                ` > Hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
            ], "Command Used"))
        } else {
            bot.sendMessage(event.chat.id, "Esse grupo está bloqueado.")
        }
    } else if (
        (
            RunTimeParams.public[event.chat.id] !== undefined &&
            RunTimeParams.public[event.chat.id][event.from?.username as string].command_wait !== null
        ) && (
            event.chat.type === "group" || 
            event.chat.type === "supergroup"
        )
    ) {
        let cmd = RunTimeParams.public[event.chat.id][event.from?.username as string].command_wait as string
        waits(event, event.message_id)[cmd]();
        console.log(commandNotify([
            ` > Answer to:   ${cmd}. `,
            ` > Content:     "${event.text}". `,
            ` > User:        @${event.from?.username}. `,
            ` > Answered in: ${event.chat.title}. `,
            ` > Hour:        ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"))

    } else if (
        msg.startsWith("/") && 
        event.chat.type === "private"
    ) {
        RunTimeParams.private.command_wait = "";
        let command = msg.slice(1).split(" ");
        let _commands = commands(event, command.slice(1));
        if (Object.keys(_commands).includes(command[0])) {
            _commands[command[0]]();
        }
        console.log(commandNotify([
            ` > Command:  ${command[0]}. `,
            ` > Message:  "${msg}". `,
            ` > User:     @${event.from?.username}. `,
            ` > Used in:  Private. `,
            ` > Hour:     ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Used"))
    } else if (
        RunTimeParams.private.command_wait !== null && 
        event.chat.type === "private"
    ) {
        bot.sendChatAction(event.chat.id, "typing")
        let cmd = RunTimeParams.private.command_wait as string
        waits(event)[cmd]();
        console.log(commandNotify([
            ` > Answer to:   ${cmd}. `,
            ` > Content:     "${event.text}". `,
            ` > User:        @${event.from?.username}. `,
            ` > Answered in: Private. `,
            ` > Hour:        ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. `,
        ], "Command Answered"))
    }
})

bot.on("callback_query", event => {
    const call_pointer = `${event.message?.chat.id}_${event.message?.message_id}`
    if (!runtime_data.calls_running[ call_pointer ]) {
        const call_name = event.data?.split(":")[0] as string;
        runtime_data.calls_running[ call_pointer ] = true;
        calls(event, event.data as string)[call_name]();
    }
})

bot.on('polling_error', event => {
    console.log(event.message);
})

console.log(commandNotify([" O Bot está on-line. "]));
console.log(commandNotify(JSON.stringify(primary_config, undefined, 2).split("\n").map(d => d + " ").slice(1, -1), "Current Settings"));

process.env["NTBA_FIX_319"] = "1";
process.env["NTBA_FIX_350"] = "0";