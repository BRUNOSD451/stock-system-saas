# Stock System

Sistema web para gerenciamento de estoque, com cadastro de produtos, categorias, fornecedores, entradas, saídas, usuários e notificações.

O projeto é dividido em:

- `backEnd`: API REST em Express, TypeScript e MySQL.
- `frontEnd`: aplicação web em React, TypeScript e Vite.

## Funcionalidades

- Autenticação de usuários com JWT.
- Cadastro, edição, consulta e exclusão de usuários.
- Cadastro de produtos, categorias e fornecedores.
- Controle de entradas e saídas de estoque.
- Notificações para entradas, saídas e estoque baixo.
- Upload de imagens de produtos para o Cloudinary.



## Requisitos

- Node.js 20 ou superior.
- npm.
- MySQL em execução.
- Uma conta do Cloudinary para upload das imagens.


## Configuração do backend

Entre na pasta do backend e instale as dependências:

```bash
cd backEnd
npm install
```

Crie ou edite o arquivo `backEnd/.env`:

```env
JWT_SECRET=uma-chave-secreta-forte
JWT_EXPIRES_IN=1d

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua senha
DB_DATABASE=stockdb
DB_PORT=3306

CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

OPENROUTER_API_KEY=sua_chave_openrouter
OPENROUTER_MODEL=inclusionai/ling-3.0-flash-fin:free
UPSTASH_REDIS_REST_URL=https://seu-banco.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu_token_upstash
```

Nunca publique o arquivo `.env` nem compartilhe a `CLOUDINARY_API_SECRET`. Se uma credencial for exposta, revogue-a no painel do Cloudinary e gere outra.

### Banco de dados e migrations

A estrutura do banco é versionada em `backEnd/migrations/`, em arquivos `.sql` numerados (`001_initial.sql`, `002_...`). Cada arquivo roda uma única vez e fica registrado na tabela `schema_migrations`.

Para um banco **novo**, crie o banco vazio e aplique as migrations:

```bash
mysql -u root -p -e "CREATE DATABASE stockdb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
cd backEnd
npm run migrate
```

Para um banco que **já existia** antes das migrations (criado pelo antigo `schema.sql`), rode uma única vez:

```bash
npm run migrate:baseline
```

Isso marca apenas a `001_initial.sql` como aplicada, sem executá-la, porque ela representa a estrutura que o banco já tem. Em seguida rode `npm run migrate` para aplicar as migrations mais novas, e depois use sempre `npm run migrate`.

| Comando | O que faz |
|---|---|
| `npm run migrate` | Aplica as migrations pendentes, em ordem. |
| `npm run migrate:status` | Lista migrations aplicadas e pendentes, sem alterar o banco. |
| `npm run migrate:baseline` | Registra a `001_initial.sql` como aplicada sem executá-la (banco existente). |

Para mudar a estrutura, crie um novo arquivo com o próximo número, por exemplo `002_add_companies.sql`, e rode `npm run migrate`. Não edite uma migration que já foi aplicada: o comando avisa quando o conteúdo de um arquivo aplicado mudou. O arquivo `src/database/schema.sql` fica apenas como referência histórica.

### Executar o backend em desenvolvimento

```bash
cd backEnd
npm run dev
```

A API ficará disponível em `http://localhost:4000`.

O backend usa `--use-system-ca` nos scripts do Node para aproveitar os certificados raiz instalados no sistema operacional.

### Compilar e executar produção

```bash
cd backEnd
npm run build
npm start
```

## Chatbot com LangChain e OpenRouter

O endpoint `POST /chat` exige autenticação JWT, recebe `{ "message": "Quantos produtos temos?" }` e retorna `{ "message": "..." }`.

- `chatBot/controllers/chatController.ts`: valida a mensagem (até 4000 caracteres).
- `chatBot/services/chatService.ts`: usa `ChatOpenRouter`, mensagens do LangChain e executa até três rodadas de ferramentas, com até oito consultas por rodada, antes da resposta final. As chamadas ao modelo têm um prazo compartilhado de 60 segundos; consultas SQL já iniciadas não são canceladas.
- `chatBot/tools/index.ts`: registra as 20 ferramentas como `DynamicStructuredTool`, com validação Zod dos schemas antes das consultas.
- `chatBot/tools/tools.ts`: mantém as consultas de leitura e o acesso aos repositórios.
- `chatBot/prompts/primaryPrompt.ts`: define as regras de resposta sobre estoque.

Configure as variáveis `OPENROUTER_*` no `.env` do backend (veja `backEnd/.env.example`). O modelo precisa estar disponível no OpenRouter e suportar chamadas de ferramentas. Não há troca automática para modelos pagos. As variáveis antigas `GROQ_*` não são mais utilizadas.

O agente recupera do Redis as últimas 20 mensagens por usuário autenticado (10 pares de pergunta e resposta). Somente conversas concluídas são salvas; o prompt de sistema e as chamadas de ferramentas não contam nesse limite. O histórico é atualizado e limitado em uma transação Redis, sem expiração automática. Ao abrir a conversa, o frontend consulta `GET /chat/history` e exibe as últimas 20 mensagens salvas no Redis, em ordem cronológica. A rota exige JWT e usa o usuário autenticado para selecionar o histórico. O chat mostra o carregamento e permite tentar novamente em caso de falha. A memória permanece ao reabrir o chat ou reiniciar o backend. Se o Redis estiver indisponível, o chat retorna 503.

Crie um banco Redis no Upstash e copie `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` do painel para `backEnd/.env`:

```env
UPSTASH_REDIS_REST_URL=https://seu-banco.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu_token_upstash
```

A conexão usa HTTPS com o [SDK REST do Upstash](https://upstash.com/docs/redis/sdks/ts/getstarted), sem Redis local. Use a URL pura, sem formatação de link Markdown. Mantenha o token somente no backend e reinicie a API após alterar o `.env`. A gravação e o limite de 20 mensagens continuam em uma transação Redis.

Para executar os testes do chatbot sem acessar a API ou o banco: `cd backEnd` e `npm test`.

Integração baseada no [guia oficial do OpenRouter para LangChain](https://openrouter.ai/blog/tutorials/langchain-chatopenrouter-setup/).

## Configuração do frontend

Instale as dependências:

```bash
cd frontEnd
npm install
```

### Executar em desenvolvimento

```bash
cd frontEnd
npm run dev
```

O Vite exibirá o endereço local da aplicação, normalmente `http://localhost:5173`.

O frontend está configurado para acessar a API em `http://localhost:4000`.

### Compilar o frontend

```bash
cd frontEnd
npm run build
```

Para verificar o lint:

```bash
cd frontEnd
npm run lint
```

## Upload de imagens de produtos

O cadastro e a edição de produtos usam `multipart/form-data`.

- Campo do arquivo: `image`.
- Tipos aceitos: imagens.
- Tamanho máximo: 5 MB.
- Pasta no Cloudinary: `stock-system/products`.
- URL retornada pelo Cloudinary: salva em `products.image_url`.

A API não mantém o arquivo no disco local. O backend envia o buffer diretamente para o Cloudinary e salva somente a URL segura retornada pelo serviço.

## Principais rotas da API

Todas as rotas abaixo, exceto criação e login de usuário, exigem o header:

```text
Authorization: Bearer <token>
```

### Usuários

- `POST /users/create`
- `POST /users/login`
- `GET /users`
- `PATCH /users/update/:id`
- `DELETE /users/delete/:id`

### Produtos

- `GET /products`
- `POST /products/create`
- `PATCH /products/update/:id`
- `DELETE /products/:id`

Os endpoints de criação e edição de produtos aceitam os dados do produto e o arquivo `image` via `multipart/form-data`.

### Categorias e fornecedores

- `GET /categories`
- `POST /categories/create`
- `PATCH /categories/update/:id`
- `DELETE /categories/:id`
- `GET /suppliers`
- `POST /suppliers/create`
- `PATCH /suppliers/update/:id`
- `DELETE /suppliers/:id`

### Estoque

- `GET /stockInputs`
- `POST /stockInputs/input`
- `DELETE /stockInputs/:id`
- `GET /stockOutputs`
- `POST /stockOutputs/output`
- `DELETE /stockOutputs/:id`
- `GET /inputItems`
- `GET /outputItems`

### Notificações

- `POST /notifications`
- `PATCH /notifications/read`

## Estrutura resumida

```text
stock-system/
├── backEnd/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middlewares/
│   │   ├── repository/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── frontEnd/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Validação

Backend:

```bash
cd backEnd
npm run build
```

Frontend:

```bash
cd frontEnd
npm run build
```

## Observações

- O banco MySQL precisa estar disponível antes de iniciar a API.
- O Cloudinary precisa estar configurado para cadastrar ou editar produtos com imagem.
- Produtos sem imagem continuam sendo aceitos.
- O recurso “Lembrar acesso” salva somente o número de celular, nunca a senha.
