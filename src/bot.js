require('dotenv').config()
const MailSlurp = require('mailslurp-client').default;
require('dotenv').config();
const fs = require('fs');
const { Telegraf, Markup, Input } = require('telegraf')
const { message } = require('telegraf/filters');
const ncp = require('copy-paste')
const cheerio = require('cheerio'); 
// const { callback } = require('telegraf/typings/button');

// const { callback } = require('telegraf/typings/button');

// const { callback } = require('telegraf/typings/button');



const apiFile = './config/list';
// console.log(process.env.MAILKEY,process.env.TGTOKEN);
const keys = process.env.MAILKEY.split(",");


const bot = new Telegraf(process.env.TGTOKEN)

async function readmail_address(apiKey) {
    // create a client

    const mailslurp = new MailSlurp({ apiKey });
    let addresses = [];
    // create an inbox
    let inbox_count = await mailslurp.inboxController.getInboxCount();
    if (inbox_count.totalElements < 1) {
        await mailslurp.createInbox();
    }
    let page_inboxes = await mailslurp.inboxController.getAllInboxes(0,20);

    page_inboxes.content.forEach((ele) => {
        addresses.push(ele.emailAddress)
    })
    return addresses;
    // expect(inbox.emailAddress).toContain('@mailslurp');
}


async function receive_mail(key) {
    // create a client
    try {
        const mailslurp = new MailSlurp({ apiKey: key});
        // doc: https://mailslurp.github.io/mailslurp-client/classes/EmailControllerApi.html#getLatestEmail
        const inbox = await mailslurp.inboxController.getAllInboxes(0,20);
        const unread = await mailslurp.emailController.getUnreadEmailCount(inbox);
        if(unread.count != 0) {
            const email = await mailslurp.emailController.getLatestEmail(inbox);

            const $ = cheerio.load(email.body);
            const body = $('body').text();
            const from = email.from;
            const to = email.to;
            mail_content = `from: ${from} \n to: ${to} \n${body}` ;
            return mail_content;
        } else {
            return 'No email received!';
        }
        // console.log(mail_content);
        
    } catch(e) {
        const statusCode = e.status;
        const errorMessage = await e.text;
        return 'error!';
    }
}


async function create_inbox(apikey) {
    const mailslurp = new MailSlurp({ apiKey:apikey });
    // create an inbox
    await mailslurp.createInbox();

    let inbox_count = await mailslurp.inboxController.getInboxCount();
    return inbox_count.totalElements;
}

async function read_keys() {
    return fs.readFileSync(apiFile, 'utf-8', (err, data) => {
        if (err) {
            console.error('err', err);
            return [];
        }
    })
}
bot.start(async(ctx) => {
    ctx.reply('喵呜~~ ');
    let img_addr = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGtEsCLSPQaRJP9lunzN2N2uO10hS5uUpodw&usqp=CAU';
    await ctx.replyWithPhoto(
        Input.fromURLStream(img_addr, 'kitten.jpg')
      )

    
});




  
bot.on('callback_query', async (ctx) => {
    const selectedOption =   ctx.callbackQuery.data;
    await ctx.reply(`您选择了：${selectedOption}`);
  });
  





bot.command('address', async (ctx) => {
    try {
        let addresses = [];
        for (const key of keys) {
            const inbox_addresses = await readmail_address(key);
            let index = keys.indexOf(key);
            let return_Addr = [];
            var options = inbox_addresses.map(
                x => ({ text: x, callback_data: x })
            );
            // const keyboard = Markup.inlineKeyboard(options2);

            const keyboard = {
                inline_keyboard: [options],
              };
            
            await ctx.replyWithMarkdownV2(`Account id is : ${index}:`, {reply_markup: keyboard});
            // await ctx.reply(`Account id is : ${index}:\n${inbox_addresses}`);
        }       
        // await ctx.reply(`${addresses}`);

    } catch(e) {
        console.log(e);
    }
});



bot.command('receive', async (ctx) => {
    try {
        let email = ctx.update.message.text.split(' ')[1];
        if (email === undefined ) {
            ctx.reply(`Please set receive email address! current is: ${email}`)
        }

        await ctx.reply(`test ${email}`);

    } catch(e) {
        console.log(e);
    }
});



bot.command('get', async (ctx) => {
    try {
        let account_id = ctx.update.message.text.split(' ')[1];
        if (account_id ===undefined) {
            for (const key of keys) {
                const mail = await receive_mail(key);
                ctx.replyWithHTML(mail);
            }
        } else if (account_id < keys.length) {
            key = keys[account_id];
            const mail = await receive_mail(key);
            ctx.replyWithHTML(mail);
        } else {
            ctx.reply('error! 请选择正确的account id!');
        }
        
    } catch(e) {
        console.log(e);
    }
});

bot.command('create', async(ctx) => {
    try {
        let account_id = ctx.update.message.text.split(' ')[1];
        if (account_id ===undefined) 
        {
            ctx.reply('error! 请选择正确的account id! /create {account index}');
        } else if (account_id < keys.length)  {
            let inbox_num = await create_inbox(keys[account_id]);
            ctx.reply(`第${account_id}用户创建邮箱成功! 现在有${inbox_num}个匿名邮箱(/address查看全部用户下邮箱)`);
        } else {
            ctx.reply('error! 请选择正确的account id!');
        }

    } catch(e) {
        console.log(e);
    }
})

bot.on(message('sticker'), (ctx) => ctx.reply('meow~'));


if(process.env.environment == "PRODUCTION"){
    bot.launch({
        webhook: {
          // Public domain for webhook; e.g.: example.com
          domain: process.env.TESTDOMAIN,
      
          // Port to listen on; e.g.: 8080
          port:  process.env.TESTPORT,
      
          // Optional path to listen for.
          // `bot.secretPathComponent()` will be used by default
          path: process.env.UUID,
      
          // Optional secret to be sent back in a header for security.
          // e.g.: `crypto.randomBytes(64).toString("hex")`
          secretToken: randomAlphaNumericString,
        },
      });
  } else { // if local use Long-polling
    bot.launch().then(() => {
      console.info(`The bot ${bot.botInfo.username} is running locally`);
    });
}


// bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))