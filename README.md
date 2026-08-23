# Calend.rio

Um calendário simples para organizar provas, atividades e trabalhos, com tema, disciplina e equipe.

## Como usar

Abra `index.html` diretamente no navegador, ou sirva a pasta com um servidor estático, por exemplo:

```bash
python3 -m http.server 8000
```

e acesse `http://localhost:8000`.

## Funcionalidades

- Visualização em calendário mensal, com navegação entre meses.
- Cadastro de eventos com título, tipo (prova / atividade / trabalho / outro), data, hora, cor, tema/disciplina, equipe/grupo e descrição.
- Lista de eventos do dia selecionado e lista de próximos eventos.
- Filtro por tipo de evento.
- Edição e exclusão de eventos.
- Dados salvos localmente no navegador (`localStorage`) — sem necessidade de backend.

## Stack

HTML, CSS e JavaScript puros, sem dependências ou build step.
