# 🗓️ Calend.rio

Um calendário bonito e compartilhável para organizar provas, atividades e trabalhos — com tema, disciplina, equipe e um link mágico para compartilhar com a turma.

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:3000`. Um calendário novo é criado automaticamente e a URL passa a ter um link único, por exemplo `http://localhost:3000/?c=Ab12Cd34`.

## Como compartilhar

Clique em **🔗 Compartilhar** e copie o link. Qualquer pessoa que abrir esse link enxerga e edita os mesmos eventos — as mudanças aparecem para todo mundo em poucos segundos (sincronização automática, sem precisar dar F5).

## Funcionalidades

- Visualização em calendário mensal, com navegação entre meses.
- Cadastro de eventos com título, tipo (📝 prova / 📌 atividade / 👥 trabalho / ✨ outro), data, hora, cor, tema/disciplina, equipe/grupo e descrição.
- Lista de eventos do dia selecionado e lista dos próximos eventos.
- Filtro por tipo de evento.
- Edição e exclusão de eventos.
- Nome do calendário editável (clique no título para renomear).
- Compartilhamento por link, sem necessidade de login — cada calendário tem um ID único.
- Visual com gradientes, glassmorphism e tipografia divertida (Fredoka + Quicksand).

## Stack

- **Frontend:** HTML, CSS e JavaScript puros, sem build step.
- **Backend:** Node.js + Express, servindo a API e os arquivos estáticos de `public/`.
- **Dados:** armazenados em `data/calendars.json` (arquivo local). Para produção com múltiplos usuários simultâneos em maior escala, considere trocar por um banco de dados real (ex: Postgres/Supabase).

## Deploy

Qualquer plataforma que rode Node.js funciona (Render, Railway, Fly.io, etc.):

1. `npm install`
2. `npm start` (ou configure o comando de start da plataforma para isso)
3. Garanta que a pasta `data/` seja persistente entre deploys, senão os calendários são perdidos a cada novo deploy.
