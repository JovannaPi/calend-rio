# Calend.rio

Um calendário bonito e compartilhável para organizar provas, atividades e trabalhos — com tema, disciplina, equipe e um link mágico para compartilhar com a turma.

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:3000`. Um calendário novo é criado automaticamente e a URL passa a ter um link único, por exemplo `http://localhost:3000/?c=Ab12Cd34`.

## Como compartilhar

Clique em **Compartilhar** e copie o link. Qualquer pessoa que abrir esse link enxerga e edita os mesmos eventos — as mudanças aparecem para todo mundo em poucos segundos (sincronização automática, sem precisar dar F5).

## Funcionalidades

- Visualização em calendário mensal, com navegação entre meses.
- Cadastro de eventos com título, tipo (prova / atividade / trabalho / outro), data, hora, cor, tema/disciplina, equipe/grupo e descrição.
- Lista de eventos do dia selecionado e lista dos próximos eventos.
- Filtro por tipo de evento.
- Edição e exclusão de eventos.
- Nome do calendário editável (clique no título para renomear).
- Compartilhamento por link, sem necessidade de login — cada calendário tem um ID único.
- Visual com gradientes, glassmorphism e tipografia divertida (Fredoka + Quicksand).

## Stack

- **Frontend:** HTML, CSS e JavaScript puros, sem build step.
- **Servidor:** Node.js + Express, servindo apenas os arquivos estáticos de `public/`.
- **Dados:** [Firebase Firestore](https://firebase.google.com/docs/firestore), acessado direto do navegador (configuração em `public/firebase-config.js`). Os dados ficam salvos de forma permanente e sincronizam em tempo real entre todas as pessoas que abrirem o mesmo link.

### Configurando o Firestore

1. No [console do Firebase](https://console.firebase.google.com), abra o projeto e vá em **Build → Firestore Database → Create database**.
2. Na aba **Regras**, use algo como:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /calendars/{calendarId} {
         allow read, write: if true;
         match /events/{eventId} {
           allow read, write: if true;
         }
       }
     }
   }
   ```

   Como o app não tem login (compartilhamento é só por link), as regras liberam leitura/escrita para qualquer pessoa com o link — é o mesmo modelo de "quem tem o link, edita".

## Deploy

Qualquer plataforma que rode Node.js funciona (Render, Railway, Fly.io, etc.):

1. `npm install`
2. `npm start` (ou configure o comando de start da plataforma para isso)
