# Robô de inscrições (Apps Script)

O robô cria o Forms de inscrição de cada evento a partir do Forms padrão, traz as respostas para o app a cada 10 minutos e manda o lembrete por e-mail para os inscritos.

Ele roda na **conta Google dona do Firebase** (o Gmail da diretoria de Eventos). Os e-mails saem dessa conta com o nome "Feashion · Diretoria de Eventos".

## Instalação (uma vez, uns 15 minutos)

Faça tudo logado no Gmail dono do Firebase.

1. **Forms modelo.** Abra o Forms padrão e use ⋮ → **Fazer uma cópia**. Na cópia, confira em Configurações → Respostas que "Coletar endereços de e-mail" está em **Resposta do participante**. Copie o ID da cópia: é o trecho do link entre `/d/` e `/edit`.
2. **Projeto do robô.** Abra [script.google.com](https://script.google.com) → **Novo projeto**. Dê o nome "Robô de inscrições · Feashion".
3. **Manifesto.** Em ⚙️ Configurações do projeto, marque **"Mostrar o arquivo de manifesto appsscript.json no editor"**. Volte ao editor, abra `appsscript.json` e troque o conteúdo pelo deste repositório (`robo/appsscript.json`).
4. **Código.** Abra `Código.gs`, apague o que tiver e cole o conteúdo de `robo/Codigo.gs`. No topo, em `MODELO_FORM_ID`, cole o ID do passo 1. Salve (Ctrl+S).
5. **Autorizar e agendar.** No seletor de funções (ao lado de "Depurar"), escolha **instalar** e clique em **Executar**. O Google pede autorização: Revisar permissões → escolha a conta → "Avançado" → "Acessar Robô de inscrições (não seguro)" → Permitir. Esse aviso aparece porque o script é seu e não foi publicado; é normal. No registro de execução devem aparecer o nome do modelo, a pasta, o DEV e "Pronto".
6. **Publicar.** Clique em **Implantar → Nova implantação** → ⚙️ tipo **App da Web**. "Executar como": **Eu**. "Quem pode acessar": **Qualquer pessoa**. Implantar. Copie a **URL do app da Web** (termina em `/exec`).
7. **Ligar no site.** Mande a URL para o Claude colocar em `config.js` (`window.ROBO_URL`), ou edite direto no GitHub.

Pronto: na Base, abrindo um evento (▸), aparece **Inscrições → Criar Forms de inscrição**.

## Como usar

- **Criar Forms de inscrição:** copia o modelo para a pasta "Feashion · Inscrições" do Drive, troca título, descrição (data, horário, sala, convidado) e mensagem de confirmação, e cria a planilha de respostas. O app mostra o link para divulgar. Vale conferir o texto em "Editar Forms" antes de divulgar.
- **A cada 10 minutos:** o total de inscritos, quem quer receber novidades e o público USP são atualizados no app. O público USP vem das perguntas "Aluno USP" (Sim/Não) e "Se sim, qual instituto?" do Forms padrão: o robô reconhece a pergunta pelo título (tem "aluno" e "usp"; tem "instituto" ou "unidade") e grava `inscricao.usp`, `inscricao.naoUsp` e `inscricao.institutos` (`{sigla: inscritos}`), usados no relatório final e no Analytics. As respostas ficam em `inscricoes/{id do evento}` no Firestore. Quando o evento começa, o Forms fecha sozinho.
- **Lembrete:** sai sozinho a partir de 48 h antes do evento para cada inscrito, uma vez por pessoa. Quem se inscreve depois recebe na rodada seguinte. "Enviar lembrete agora" manda na hora para quem ainda não recebeu.
- **Limite:** Gmail comum manda no máximo **100 e-mails por dia** por script. O que passar disso fica na fila e sai no dia seguinte (o app mostra "N na fila"). Para eventos grandes, aumente `HORAS_AVISO` (por exemplo, 72).

## E-mails

No painel do evento (Base), o bloco **E-mails para os inscritos** mostra cada tipo, quem já recebeu e a cota do dia:

| Tipo | Quando sai | Padrão |
| --- | --- | --- |
| Confirmação de inscrição | até 10 min depois de cada inscrição | ligado |
| Lembrete | a partir de 48 h antes | ligado |
| Aviso no dia | 3 h antes do início | desligado |
| Agradecimento (com link de avaliação) | no dia seguinte ao evento | ligado |
| Aviso de mudança | quando data, horário, sala ou nome mudam; o app pergunta antes | manual |

Cada tipo tem o botão **Texto** (editar, ver a prévia e mandar um teste para si) e **Enviar agora**. Os textos padrão ficam em `MODELOS`, no código; o texto próprio de cada evento fica em `eventos/{id}.emails`. Quem recebeu fica em `inscricoes/{id}.envios`; quem saiu da lista de novidades fica em `descadastros`.

## E-mails das etapas do evento

A cada rodada (10 minutos), o robô olha os 15 pontos do checklist de cada evento (os mesmos prazos da caixinha Andamento do site). Manda **um** e-mail de "Sua vez" quando chega a vez de outra área: Presidência quando a ficha fica pronta, Financeiro quando a ficha é aprovada, Marketing quando o briefing é feito e AEX a partir de 30 dias antes. Quando pontos passam do prazo, manda **um** e-mail de "Atrasado" por área, juntando os pontos dela. Quem recebe: Diretor(a) e Coordenador(a) da área; na Presidência, Presidente e Vice-presidente; no Formulário da AEX, o responsável AEX do evento, se houver (o site ainda não deixa escolher; sem responsável, a diretoria de Eventos). Os avisos já mandados ficam em `eventos/{id}.etapasAvisos` (`aprov_vez`, `sala_atraso`...), para não repetir. Eventos realizados, que já passaram ou com "[teste]" no nome ficam de fora. O botão do e-mail abre a tela Pendências (`CFG.SITE`); no "Sua vez" do Orçamento, abre direto o orçamento do evento no Financeiro (`#orcamento=ID`), e o ponto fica verde quando a diretoria clica em Validar orçamento. No "Sua vez" do Marketing, abre direto a divulgação do evento (`#divulgacao=ID`), e o ponto fica verde quando a diretoria do Marketing clica em Divulgação feita. O ponto Briefing ao Marketing conta como feito quando o evento tem `briefing.enviadoEm` (botão Enviar briefing na linha do evento). O último ponto, **Relatório final gerado**, vence 7 dias depois do evento: para eventos que já aconteceram (até 30 dias), o robô olha só esse ponto, manda o "Sua vez" à diretoria de Eventos no dia seguinte ao evento e o "Atrasado" depois do prazo; o botão abre o pós-evento (`#posevento=ID`). Conta como feito quando o evento tem `relatorio.em`.

## Mailing de eventos

- **Lista:** a cada 10 minutos o robô junta quem marcou "quero receber novidades" em qualquer Forms em `mailing/{hash do e-mail}` (um registro por e-mail). Quem clicou em "sair da lista" ou foi tirado pela equipe fica em `descadastros` e não volta.
- **Envio padrão:** no dia seguinte à criação de cada evento, na hora definida na tela Mailing (padrão 08:00). Os convites só saem de segunda a sexta: evento criado na sexta ou no fim de semana manda na segunda; envio programado ou adiado que caia no fim de semana também vai para a segunda (o botão "Enviar agora" não tem essa trava). Só vale para eventos criados depois que o mailing foi ligado. Eventos marcados como fora do mailing não recebem nada.
- **Envios extras:** programados pela tela Mailing ("+ Programar e-mail"), com data, hora e texto próprio opcional. Cada envio pode ser pulado, reativado ou mandado na hora.
- **Regras:** não manda para quem já se inscreveu no evento; respeita o intervalo mínimo entre envios (padrão 2 dias); se o Forms ainda não existe, o envio espera; nada sai depois que as inscrições fecham. Se a cota diária do Gmail (cerca de 100) acabar, o resto fica na fila para o dia seguinte.
- **Link e cliques:** o botão do convite passa pelo robô, que registra o clique e abre o Forms já com "Mailing Feashion" marcado em "Como você ficou sabendo". Dados em `mailingEnvios/{evento}_{envio}`; o Analytics mostra inscrições via mailing e cliques por hora.

## Quando mudar o código

Depois de colar uma versão nova do `Codigo.gs`: **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**. Assim a URL continua a mesma.

## Se der erro

- "Login expirado": recarregue o app.
- "Seu cargo não permite": a pessoa está sem cargo na área Eventos (ou na presidência); a diretoria atribui em Membros. Diretoria de outra área não usa o robô.
- Forms padrão: o link fica em Parâmetros, no site, e o robô copia esse Forms para cada evento (o `MODELO_FORM_ID` do código só vale se Parâmetros estiver vazio). A rotina dá acesso de edição ao Forms padrão e à pasta de inscrições (com todos os Forms criados) para quem tem cargo em Eventos.
- Pasta de fotos: o botão da Ficha cria uma subpasta em "Feashion · Fotos de eventos". A rotina dá acesso de edição a essa pasta para todos os membros cadastrados no app, de qualquer área.
- Erro com "Firestore 403": a conta do script não é dona do projeto Firebase, ou a API do Firestore pede o projeto de cobrança; confira se `PROJETO` está certo.
- Execuções e erros da rotina: no script.google.com, menu **Execuções**.


## IA: Ideia de evento (BETA)

- Usa o Gemini do Google no plano gratuito. A chave fica só no robô: em Configurações do projeto → Propriedades do script, propriedade `GEMINI_KEY` (criada em aistudio.google.com → Get API key, no Gmail dono do robô).
- Para conferir a chave, rode `testarIA` no editor: 200 = funcionando.
- O modelo fica em `CFG.IA_MODELO` (padrão `gemini-3.5-flash-lite`, rápido e com pouca fila). Se ele falhar, o robô tenta na hora os de `CFG.IA_RESERVA`. O `testarIA` mostra todos os modelos que a chave pode usar e qual respondeu; se o Google tirar algum do ar, troque por um dessa lista.
- Limite de `CFG.IA_LIMITE_DIA` (30) propostas por pessoa por dia.
- O app manda para a IA a ideia escrita, os tipos de evento, os convidados (nome, empresa, cargo, temas, status e nota, sem e-mail nem telefone), o calendário, os eventos realizados e os já marcados. No plano gratuito o Google pode usar esses dados para melhorar os produtos dele.
- A IA devolve tema, tipo, datas, convidados e riscos. Público, sala e custo são calculados pelo app, com o mesmo cálculo do Planejar.
