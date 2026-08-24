# Calend.rio

Um painel só seu (e de quem você convidar) — calendário de provas/atividades, biblioteca com diário de leitura por capítulo (com segredos revelados quando os dois enviarem), chat, filmes/séries para assistir juntos, relatórios e notificações. Cada pessoa entra com sua própria conta, então suas anotações pessoais ficam separadas das da outra pessoa; o que é para compartilhar (calendário, chat, avisos) todo mundo vê.

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:3000`. Na primeira vez, crie sua conta na aba **Cadastrar** (nome, e-mail e senha).

## Funcionalidades

- **Login/Cadastro** — cada pessoa tem sua própria conta.
- **Calendário** — provas, atividades, trabalhos, com tema/disciplina, equipe e descrição, compartilhado entre todos os logados.
- **Biblioteca** — livros planejados/lendo/concluídos. Ao abrir um livro, dá pra criar capítulos com:
  - sua impressão pessoal (só você vê);
  - sua teoria/segredo sobre o capítulo (fica escondida até **as duas pessoas enviarem** a delas — aí revela os dois de uma vez);
  - discussão por capítulo, liberada só depois da revelação.
- **Chat** — conversa geral em tempo real.
- **Filmes/Séries** — lista para assistir junto, com status (para assistir / assistindo / assistido).
- **Relatórios** — registro de tópicos abordados, sugestões e feedback.
- **Notificações** — avisos para o grupo.
- Visual com gradientes, glassmorphism e tipografia divertida (Fredoka + Quicksand).

## Stack

- **Frontend:** HTML, CSS e JavaScript puros (módulos ES), sem build step.
- **Servidor:** Node.js + Express, servindo apenas os arquivos estáticos de `public/`.
- **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth) (e-mail/senha).
- **Dados:** [Firebase Firestore](https://firebase.google.com/docs/firestore), acessado direto do navegador (configuração em `public/firebase-config.js`). Tudo sincroniza em tempo real entre as contas logadas.

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

## Deploy

Qualquer plataforma que rode Node.js funciona (Render, Railway, Fly.io, etc.):

1. `npm install`
2. `npm start` (ou configure o comando de start da plataforma para isso)
