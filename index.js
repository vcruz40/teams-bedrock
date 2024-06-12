const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { EchoBot } = require('./bot');

const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

const bot = new EchoBot(conversationState, userState);

exports.handler = async (event, context) => {
    // Adiciona um log para imprimir o event.body
    console.log("Received event.body:", event.body);

    const req = {
        body: event.body ? JSON.parse(event.body) : {},
        headers: event.headers
    };

    const res = {
        status: 200, 
        body: null,
        end: function() {
            context.succeed({
                statusCode: this.status,
                body: JSON.stringify(this.body),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        },
        send: function(status, body) {
            this.status = status;
            this.body = body;
            this.end();
        },
        status: function(code) {
            this.status = code;
            return this; 
        }
    };

    console.log("Before processing activity");
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    try {
        console.log("Before calling adapter.processActivity");
        await adapter.processActivity(req, res, async (context) => {
            try {
                console.log("Before running bot");
                await bot.run(context);
                console.log("After running bot");
            } catch (error) {
                console.error("Error processing activity:", error);
            }
        });
        console.log("After calling adapter.processActivity");
    } catch (error) {
        console.error("Error in try block before adapter.processActivity:", error);
    }

    console.log("After processing activity");
};
