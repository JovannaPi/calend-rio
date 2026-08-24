# Calend.rio

Um painel de casal/clube completo: calendário de provas/atividades, uma biblioteca de leitura compartilhada (com diário por capítulo, teorias secretas reveladas quando as duas pessoas enviarem, discussão liberada após a revelação, estatísticas, premiações e uma página de memórias por livro concluído), chat, filmes/séries, rolês com ranking de locais, metas financeiras, relatórios e notificações. Cada pessoa entra com sua própria conta — suas anotações pessoais (diário, teorias, cartas) ficam separadas até o momento certo de revelar; o que é pra compartilhar (calendário, chat, avisos) todo mundo vê.

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:3000`. Na primeira vez, crie sua conta na aba **Cadastrar** (nome, e-mail e senha).

## Funcionalidades

- **Login/Cadastro** — cada pessoa tem sua própria conta.
- **Calendário** — provas, atividades, trabalhos, com tema/disciplina, equipe e descrição, compartilhado entre todos os logados.
- **Biblioteca** — livros planejados, lendo, prontos pra trocar, concluídos e abandonados. Busca automática de livro (Google Books/Open Library), roleta pra sortear o próximo, progresso de leitura por capítulo, e uma "carta pro futuro" selada ao começar um livro (só revela quando as duas terminam).
- **Diário** — impressão, emoções e frase favorita por capítulo (privado, cada um só vê o seu).
- **Secreto** — sua teoria sobre o capítulo fica travada até a outra pessoa também enviar a dela; aí revela as duas juntas.
- **Discussão** — chat por capítulo, liberado só depois da revelação do Secreto.
- **Estatísticas** — meta anual, hall da fama, sequência de leitura, notas médias, gêneros mais lidos, sugestões por pessoa.
- **Premiações** — melhor personagem, cena favorita, teoria mais maluca e maior surpresa de cada livro (também reveladas só depois que as duas responderem).
- **Memórias** — mural de frases favoritas e uma "cápsula do tempo" por livro concluído, com fotos, diário completo, premiações e as cartas seladas.
- **Config** — nome do clube, citação (aparece no topo), foto, meta anual de livros e backup completo em `.json`.
- **Chat** — conversa geral em tempo real.
- **Filmes/Séries** — lista para assistir junto, com status (para assistir / assistindo / assistido).
- **Rolês** — planejar saídas com data, local, link do mapa e foto; ao marcar como feito, dá pra avaliar de 1 a 5 estrelas, o que alimenta o **ranking de locais**.
- **Metas** — metas financeiras de longo prazo (ex: comprar casa, comprar carro/moto), com barra de progresso e registro de quanto já foi guardado.
- **Relatórios** — registro de tópicos abordados, sugestões e feedback.
- **Notificações** — avisos para o grupo, e um sino no topo com o feed de atividades da outra pessoa.
- Visual com gradientes, glassmorphism e tipografia divertida (Fredoka + Quicksand).

## Stack

- **Frontend:** HTML, CSS e JavaScript puros (módulos ES), sem build step.
- **Servidor:** Node.js + Express, servindo apenas os arquivos estáticos de `public/`.
- **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth) (e-mail/senha).
- **Dados:** [Firebase Firestore](https://firebase.google.com/docs/firestore), acessado direto do navegador (configuração em `public/firebase-config.js`). Tudo sincroniza em tempo real entre as contas logadas.
- **Fotos:** [Cloudinary](https://cloudinary.com) (hospedagem gratuita de imagens) + um [Worker da Cloudflare](https://workers.cloudflare.com) que assina os uploads — porque o Firebase Storage passou a exigir o plano pago (Blaze) só pra habilitar. Ver seção abaixo.

### Configurando o Firebase

1. **Autenticação** — no [console do Firebase](https://console.firebase.google.com), vá em **Build → Authentication → Get started**, aba **Sign-in method**, e ative o provedor **E-mail/senha**.
2. **Firestore** — em **Build → Firestore Database → Create database**.
3. Na aba **Regras** do Firestore, use:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isSignedIn() { return request.auth != null; }

       match /users/{userId} {
         allow read: if isSignedIn();
         allow create, update: if isSignedIn() && request.auth.uid == userId;
       }

       match /events/{id} {
         allow read, write: if isSignedIn();
       }

       match /messages/{id} {
         allow read: if isSignedIn();
         allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
       }

       match /watchlist/{id} {
         allow read, write: if isSignedIn();
       }

       match /reports/{id} {
         allow read: if isSignedIn();
         allow create: if isSignedIn() && request.resource.data.authorUid == request.auth.uid;
       }

       match /notifications/{id} {
         allow read: if isSignedIn();
         allow create: if isSignedIn() && request.resource.data.authorUid == request.auth.uid;
       }

       match /roles/{id} {
         allow read, write: if isSignedIn();
       }

       match /metas/{id} {
         allow read, write: if isSignedIn();
       }

       match /config/{id} {
         allow read, write: if isSignedIn();
       }

       match /atividades/{id} {
         allow read: if isSignedIn();
         allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
       }

       match /memorias_fotos/{id} {
         allow read, write: if isSignedIn();
       }

       match /premiacoes/{livroId} {
         allow read, write: if isSignedIn();
       }

       match /livros/{livroId} {
         allow read, write: if isSignedIn();
         match /capitulos/{capId} {
           allow read, write: if isSignedIn();
           match /comentarios/{comId} {
             allow read: if isSignedIn();
             allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
           }
         }
       }
     }
   }
   ```

   Isso exige estar logado para ler/escrever qualquer coisa — sem login, o Firestore recusa a conexão.

### Configurando fotos (Cloudinary + Worker da Cloudflare)

O upload de foto (Rolês, Memórias, Config) precisa desses dois serviços gratuitos configurados. Sem eles, os campos de foto continuam funcionando normalmente — só o botão de upload não vai funcionar até isso ser configurado.

1. **Cloudinary** — crie uma conta grátis em [cloudinary.com](https://cloudinary.com). No Dashboard, anote: **Cloud name**, **API Key** e **API Secret**.
2. **Worker da Cloudflare** — em [dash.cloudflare.com](https://dash.cloudflare.com), crie um Worker novo (Workers & Pages → Create → Create Worker), cole o conteúdo de `cloudflare-worker/worker.js` deste repositório no editor, e publique.
3. No Worker, edite a constante `ORIGEM_PERMITIDA` no topo do arquivo pra ser a URL onde o Calend.rio está publicado (ex: sua URL do Render).
4. Em **Settings → Variables and Secrets** do Worker, adicione como **Secret**:
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (do Cloudinary)
   - `FIREBASE_WEB_API_KEY` — o mesmo `apiKey` que já está em `public/firebase-config.js`
   - `FIREBASE_PROJECT_ID` — `calendario-3b725`
5. Copie a URL do Worker publicado (algo como `https://calend-rio-fotos.SEU-SUBDOMINIO.workers.dev`) e cole na constante `URL_UPLOAD_FOTO` em `public/upload.js`.

## Deploy

Qualquer plataforma que rode Node.js funciona (Render, Railway, Fly.io, etc.):

1. `npm install`
2. `npm start` (ou configure o comando de start da plataforma para isso)
