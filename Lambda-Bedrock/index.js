const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const AWS = require('aws-sdk');

const client = new BedrockRuntimeClient({ region: "us-east-1" });
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    console.log("Evento recebido:", JSON.stringify(event));

    const prompt = event.message ? event.message : 'Qual é a pergunta padrão?';
    const conversationId = event.conversationId ? event.conversationId : 'default_conversation_id';
    console.log("Pergunta extraída:", prompt);
    console.log("ID da conversa:", conversationId);

    let conversationState;
    try {
        conversationState = await getConversationState(dynamoDB, conversationId);
        console.log("Estado da conversa antes da atualização:", JSON.stringify(conversationState));

        if (!conversationState || Object.keys(conversationState).length === 0) {
            console.log("Iniciando uma nova conversa.");
            conversationState = { messages: [] };
        }
    } catch (error) {
        console.error("Erro ao recuperar o estado da conversa:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error retrieving conversation state', error: error.message })
        };
    }

    try {
        await updateConversationState(dynamoDB, conversationId, prompt);
        console.log("Estado da conversa atualizado com sucesso.");
    } catch (error) {
        console.error("Erro ao atualizar o estado da conversa:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error updating conversation state', error: error.message })
        };
    }

    try {
        conversationState = await getConversationState(dynamoDB, conversationId);
        console.log("Estado da conversa após a atualização:", JSON.stringify(conversationState));
    } catch (error) {
        console.error("Erro ao recuperar o estado da conversa após a atualização:", error);
    }

    if (!conversationState || !conversationState.messages || conversationState.messages.length === 0) {
        console.error("Estado da conversa não foi atualizado corretamente.");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Conversation state was not updated correctly' })
        };
    }

    const messagesForModel = conversationState.messages.reduce((acc, messageObj, index) => {
        acc.push({
            role: "user",
            content: [
                {
                    type: "text",
                    text: messageObj.message
                }
            ]
        });

        if (index < conversationState.messages.length - 1) {
            acc.push({
                role: "assistant",
                content: [
                    {
                        type: "text",
                        text: "Resposta do assistente"
                    }
                ]
            });
        }

        return acc;
    }, []);

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: messagesForModel
    };

    const modelId = "anthropic.claude-3-sonnet-20240229-v1:0";

    const command = new InvokeModelCommand({
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
        modelId: modelId,
    });

    try {
        const response = await client.send(command);
        const jsonString = new TextDecoder().decode(response.body);
        const parsedData = JSON.parse(jsonString);
        console.log("Resposta do modelo (JSON):", jsonString);

        if (!parsedData.content || parsedData.content.length === 0 || !parsedData.content[0].text) {
            console.error("Resposta do modelo inválida ou incompleta:", parsedData);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Model response is invalid or incomplete' })
            };
        }

        const text = parsedData.content[0].text;
        console.log('Resposta do modelo:', text);
        return {
            statusCode: 200,
            body: JSON.stringify({ Answer: text, conversationId: conversationId })
        };
    } catch (error) {
        console.error("Erro ao invocar o modelo:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error invoking model', error: error.message })
        };
    }
};

async function getConversationState(dynamoDB, conversationId) {
    const params = {
        TableName: 'ConversationState',
        Key: {
            'conversationId': conversationId
        }
    };
    const result = await dynamoDB.get(params).promise();
    return result.Item;
}

async function updateConversationState(dynamoDB, conversationId, message) {
    const timestamp = new Date().toISOString();
    const messageWithTimestamp = { message, timestamp };

    console.log("Timestamp:", timestamp);
    console.log("Message with timestamp:", messageWithTimestamp);

    const params = {
        TableName: 'ConversationState',
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

    try {
        const updateResult = await dynamoDB.update(params).promise();
        console.log("Resultado da atualização do estado da conversa:", JSON.stringify(updateResult));
    } catch (error) {
        console.error("Error updating conversation state:", error);
        throw error;
    }
}

async function deleteConversationState(dynamoDB, conversationId) {
    const params = {
        TableName: 'ConversationState',
        Key: {
            'conversationId': conversationId
        }
    };
    try {
        const deleteResult = await dynamoDB.delete(params).promise();
        console.log("Resultado da exclusão do estado da conversa:", JSON.stringify(deleteResult));
    } catch (error) {
        console.error("Erro ao deletar o estado da conversa:", error);
    }
}
