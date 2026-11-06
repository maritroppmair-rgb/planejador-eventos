# Robô de inscrições (Apps Script)

O robô cria o Forms de inscrição de cada evento a partir do Forms padrão, traz as respostas para o app a cada 10 minutos e manda o lembrete por e-mail para os inscritos.

Ele roda na **conta Google dona do Firebase** (hoje, o Gmail pessoal do Pedro). Os e-mails saem dessa conta com o nome "Feashion · Diretoria de Eventos".

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
- **A cada 10 minutos:** o total de inscritos e quem quer receber novidades são atualizados no app. As respostas ficam em `inscricoes/{id do evento}` no Firestore. Quando o evento começa, o Forms fecha sozinho.
- **Lembrete:** sai sozinho a partir de 48 h antes do evento para cada inscrito, uma vez por pessoa. Quem se inscreve depois recebe na rodada seguinte. "Enviar lembrete agora" manda na hora para quem ainda não recebeu.
- **Limite:** Gmail comum manda no máximo **100 e-mails por dia** por script. O que passar disso fica na fila e sai no dia seguinte (o app mostra "N na fila"). Para eventos grandes, aumente `HORAS_AVISO` (por exemplo, 72).

## Quando mudar o código

Depois de colar uma versão nova do `Codigo.gs`: **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**. Assim a URL continua a mesma.

## Se der erro

- "Login expirado": recarregue o app.
- "Seu cargo não permite": a pessoa está sem cargo; a diretoria atribui em Membros.
- Erro com "Firestore 403": a conta do script não é dona do projeto Firebase, ou a API do Firestore pede o projeto de cobrança; confira se `PROJETO` está certo.
- Execuções e erros da rotina: no script.google.com, menu **Execuções**.
