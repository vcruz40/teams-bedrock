const { ActivityHandler } = require('botbuilder');
const AWS = require('aws-sdk');

class EchoBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        this.conversationState = conversationState;
        this.userState = userState;

        this.onMessage(async (context, next) => {
            console.log("onMessage event triggered");
            console.log("Received message:", context.activity.text);

            const userName = context.activity.from.name;
            const userId = context.activity.from.aadObjectId; // ID do usuário do AD
            const responseMessage = `Olá ${userName}, estou processando sua pergunta...`;

            
            const lambda = new AWS.Lambda({ region: 'us-east-1' });
            const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
            const lambdaFunctionName = 'Bedrock-CCOE'; // Nome do Lambda analisador

            try {
                
                const userAuthorized = await isUserAuthorized(dynamoDB, userId);
                if (!userAuthorized) {
                    await context.sendActivity('Desculpe, você não está autorizado para fazer perguntas neste bot. Contate o CCoE para solicitar acesso.');
                    return;
                }

                
                await context.sendActivity(responseMessage);

                
                const lambdaParams = {
                    FunctionName: lambdaFunctionName,
                    InvocationType: 'RequestResponse',
                    Payload: JSON.stringify({
                        message: context.activity.text,
                        conversationId: context.activity.conversation.id 
                    })
                };

                const lambdaResponse = await lambda.invoke(lambdaParams).promise();
                console.log('Lambda response:', JSON.parse(lambdaResponse.Payload));

                
                await updateConversationState(dynamoDB, context.activity.conversation.id, context.activity.text);

                
                const lambdaResponsePayload = JSON.parse(lambdaResponse.Payload);
                if (lambdaResponsePayload && lambdaResponsePayload.body) {
                    const bedrockResponse = JSON.parse(lambdaResponsePayload.body);
                    if (bedrockResponse && bedrockResponse.Answer) {
                        await context.sendActivity(bedrockResponse.Answer.trim()); 

                        
                        if (bedrockResponse.Answer.trim() === 'Conversa encerrada devido à inatividade.') {
                            
                            console.log('Conversa encerrada automaticamente devido à inatividade do usuário.');
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
                await context.sendActivity('Desculpe, ocorreu um erro ao processar sua pergunta.');
            }

            
            await this.conversationState.saveChanges(context);
            await this.userState.saveChanges(context);

            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;


async function isUserAuthorized(dynamoDB, userId) {
    const params = {
        TableName: 'bot-ccoe',
        Key: {
            'ADUserID': userId
        }
    };

    try {
        const result = await dynamoDB.get(params).promise();
        return !!result.Item; 
    } catch (error) {
        console.error('Error checking user authorization:', error);
        throw error;
    }
}


async function updateConversationState(dynamoDB, conversationId, message) {
    const timestamp = new Date().toISOString();
    const messageWithTimestamp = { message, timestamp };

    console.log("Timestamp:", timestamp);
    console.log("Message with timestamp:", messageWithTimestamp);

    const params = {
        TableName: 'ConversationState', // Nome da tabela no DynamoDB
        Key: {
            'conversationId': conversationId
        },
        UpdateExpression: 'set #state = list_append(if_not_exists(#state, :empty_list), :messageWithTimestamp)',
        ExpressionAttributeNames: {
            '#state': 'messages'
        },
        ExpressionAttributeValues: {
            ':messageWithTimestamp': [messageWithTimestamp],
            ':empty_list': []
        }
    };
    await dynamoDB.update(params).promise();
}
