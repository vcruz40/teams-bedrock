Visão Geral
Este projeto demonstra como configurar um bot no Microsoft Teams utilizando o Azure Bot Service para interagir com um serviço de IA hospedado na AWS, especificamente utilizando o AWS Bedrock. A arquitetura inclui uma função Lambda hospedada na AWS que processa as mensagens e interage com o Bedrock para fornecer respostas.

Arquitetura

![Ia-Bedrock](https://github.com/vcruz40/teams-bedrock/assets/32345339/e141a0d5-1345-4adf-b5ea-c40795c01a4c)


Microsoft Teams: Usuário envia mensagem.
Azure Bot Service: Recebe e encaminha a mensagem para o endpoint configurado.
Amazon API Gateway: Ponto de entrada para as requisições, encaminhando para a função Lambda.
Lambda Function (Bot-Teams): Processa a mensagem e interage com outra Lambda.
Lambda Function (Bedrock): Interage com o AWS Bedrock para obter a resposta.
Pré-requisitos
Conta no Azure com Azure Bot Service configurado.
Conta na AWS com permissões para criar e gerenciar funções Lambda, DynamoDB, e Bedrock.
Node.js instalado localmente para desenvolvimento.
Configuração do Projeto
1. Configuração do Azure Bot Service
Criação do Bot no Azure:

Acesse o Azure Portal.
Crie um novo recurso do tipo "Bot Channels Registration".
Configure o App ID e Password.
Configuração do Endpoint do Bot:

O endpoint do bot deve apontar para o API Gateway da AWS que está configurado para invocar a Lambda Bot-Teams.
2. Configuração da AWS
Criação das Tabelas DynamoDB:

Crie uma tabela bot com a chave primária ADUserID.
Crie uma tabela ConversationState com a chave primária conversationId.
Criação das Funções Lambda:

Lambda: Bot-Teams
Crie uma nova função Lambda com o runtime Node.js.
Configure as permissões necessárias para invocar outras Lambdas e acessar o DynamoDB.

Lambda: Bedrock
Crie uma nova função Lambda com o runtime Node.js.
Configure as permissões necessárias para acessar o DynamoDB e invocar o Bedrock.

Passos Finais
Desenvolvimento Local:

Configure as variáveis de ambiente necessárias (MicrosoftAppId, MicrosoftAppPassword).
Utilize ferramentas como o ngrok para testar o bot localmente antes de fazer o deploy.
Deploy:

Faça o deploy das funções Lambda utilizando o AWS CLI ou outra ferramenta de sua escolha.
Configure o API Gateway para direcionar as requisições para a função Lambda Bot-Teams.
Testes:

Envie mensagens de teste pelo Microsoft Teams e verifique se a resposta é gerada corretamente utilizando o AWS Bedrock.
Conclusão
Este projeto demonstra como integrar um bot no Microsoft Teams utilizando o Azure Bot Service e AWS Lambda para fornecer respostas automatizadas utilizando IA do AWS Bedrock. A documentação fornece um passo a passo para configuração e desenvolvimento, permitindo que você implemente e teste essa solução em sua própria infraestrutura.


