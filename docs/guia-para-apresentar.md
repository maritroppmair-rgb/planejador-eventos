# Planejador de Eventos · guia para apresentar

Nov 10, 2026 · @Pedro

## O que é o Planejador

O Planejador é o app da Diretoria de Eventos: ele ajuda a decidir sala, data e compras de cada evento com base nos números dos eventos anteriores, e guarda tudo num lugar só.

**O problema que ele resolve.** Hoje as informações de eventos ficam espalhadas em planilhas, Forms e conversas. Sem histórico organizado, a gente escolhe sala grande demais (fica vazia) ou pequena demais (gente em pé), compra coffee no chute e repete erros de um semestre para o outro. O relatório do FBW mostrou bem isso.

**A ideia central, em uma frase:** antes de reservar qualquer coisa, a gente diz quantas inscrições espera, e o app responde quantas pessoas devem aparecer de verdade, qual sala cabe esse público e quanto comprar.

Como ele chega nessa resposta, sem jargão:

- **Público provável, não um número único.** Nem todo inscrito aparece. O app olha a taxa de comparecimento dos eventos passados e mostra uma faixa: "na maioria dos cenários, entre X e Y pessoas".
- **Nota da data.** Cada data recebe uma nota conforme o calendário (provas, feriados, semana de outros eventos) e a chance de chuva no horário do evento, porque tudo isso mexe no comparecimento. Se a sala escolhida não tem ar-condicionado, o calor também tira pontos a partir de 27 °C. A nota de cada evento salvo é atualizada sozinha 16 e 7 dias antes, com a previsão do tempo mais recente.
- **Sala sugerida.** Ele mostra a melhor sala e mais duas alternativas, com a chance de caber todo mundo e a ocupação esperada.
- **Compras.** O coffee é calculado para cobrir a grande maioria dos cenários, porque faltar é pior que sobrar.
- **Aprende com o uso.** Depois do evento, registramos o resultado real. Cada evento registrado deixa a próxima previsão melhor.

Ele funciona no computador e no celular (dá para instalar como app) e todos da equipe veem os mesmos dados ao mesmo tempo. O app já está pronto para receber as outras áreas da Feashion: cada pessoa entra com as suas áreas e vê o que é delas.

## Como entrar e quem pode fazer o quê

Só entra quem está na lista de acesso, com a conta Google do e-mail USP. O que cada pessoa vê e pode fazer depende das áreas dela e do cargo em cada uma.

**Endereço:** [maritroppmair-rgb.github.io/planejador-eventos](https://maritroppmair-rgb.github.io/planejador-eventos/)

**Esse link é temporário.** O app está hoje na conta do GitHub da Marília e numa conta de teste do Firebase. Com a ideia aprovada, criamos as duas contas no nome da Feashion e passamos o app para elas, com um endereço definitivo e com o nome da Feashion. Os dados vão junto (o app tem backup completo), então nada se perde na troca.

1. Abra o link e clique em **Entrar com Google**, usando o e-mail @usp.br.
2. Se o e-mail não estiver na lista, aparece uma tela de acesso negado. A diretoria de Eventos ou a presidência libera em **Membros → Quem pode entrar**.
3. No primeiro acesso, preencha o perfil: nome, como prefere ser chamado(a), celular, semestre de ingresso, foto e **as suas áreas** (Eventos, Financeiro, RH, C&D, Marketing). Dá para marcar mais de uma.
4. Em cada área, a pessoa entra **sem cargo**. Quem atribui é a diretoria daquela área ou a presidência, clicando na pessoa em **Membros**. Quem já usava o app continua em Eventos, com o cargo que tinha.

**A ordem dos cargos, de cima para baixo:** DEV, Presidente, Vice-presidente, Diretor(a), Coordenador(a), Membro(a), Trainee e Sem cargo. Só quem está acima muda o cargo de quem está abaixo, e ninguém muda o próprio cargo. A presidência fica fora das áreas: só o DEV nomeia Presidente, e o Presidente nomeia Vice-presidente.

| Cargo | Na própria área | Nas outras áreas |
| --- | --- | --- |
| Presidente e Vice-presidente | Tudo, em todas as áreas, inclusive Lixeira e Histórico | Tudo |
| Diretor(a) | Tudo, inclusive atribuir cargos abaixo do dele(a) e ver Lixeira e Histórico | Só visualiza |
| Coordenador(a) | Cria, edita e exclui | Não vê as telas |
| Membro(a) | O mesmo que Coordenador(a) | Não vê as telas |
| Trainee | Cria e edita, mas não exclui | Não vê as telas |
| Sem cargo | Só visualiza | Não vê as telas |

Quem tem mais de uma área soma as permissões. Calendário, Documentos, Membros e Meu perfil aparecem para todos. Parâmetros e a lista de acesso só são alterados pela diretoria de Eventos, pela presidência e pelo DEV. As permissões de edição valem nas telas e também no banco de dados: mesmo quem tentasse burlar a tela não conseguiria gravar o que o cargo não permite. O cargo DEV é só do Pedro, para manutenção técnica, e hoje tem as mesmas permissões da presidência; durante a apresentação, o perfil dele fica oculto na tela de Membros.

## Tour pelas telas

**Escolher a área.** Embaixo de "Planejador de Eventos", no topo, fica a área em que você está: **Diretoria de Eventos ▾**. Clicando, abre a lista das áreas que você pode ver; as que você só pode ver aparecem com "só leitura". Quem tem uma área só vê o nome dela, sem seta. O app lembra a última área escolhida. No celular, a escolha fica no topo do menu.

O menu lateral (☰ no canto superior esquerdo abre e fecha) mostra as telas da área escolhida e, embaixo, o grupo **Geral**, igual em todas: Calendário, Documentos, Membros e, para a diretoria para cima, Lixeira e Histórico. Em Eventos, o menu tem os grupos Eventos, Recursos e Ajustes, com as telas da tabela abaixo. O círculo com a foto, no canto superior direito, leva a Meu perfil, Membros, Aparência (claro/escuro) e Sair.

| Tela | Para que serve | O que vale mostrar |
| --- | --- | --- |
| **Ideia de evento** (BETA) | Descrever em texto corrido o evento ou a série que se quer; a IA propõe nome, formato, datas e convidados da nossa lista | Que público, sala e coffee da proposta são calculados pelo próprio Planejar, que dá para pedir ajustes ou trocar um evento da série, e o medidor "Para sair do BETA" |
| **Planejar** | Montar um evento novo: tipo, data, inscrições esperadas e necessidades da sala | A faixa de público provável, a sala sugerida com 2 alternativas, as compras calculadas e a previsão do tempo na nota da data |
| **Base** | Histórico de todos os eventos salvos, com o resultado real de cada um | Registrar resultado (inscritos, presentes, compras), os indicadores com semáforo e o selo ⚠ clima quando a previsão do tempo piora a data de um evento |
| **Analytics** | Visão geral em gráficos, com filtro por semestre e tipo | Comparecimento por tipo, previsto × real e custo por presente contra a meta |
| **Mailing** | Lista de quem pediu para receber os próximos eventos (marcado no Forms), sem e-mail repetido, e os convites programados | Que cada evento novo vira um convite automático no dia útil seguinte, e que o Analytics mostra quantas inscrições vieram do mailing e em que horário |
| **Convidados** | Lista de palestrantes e contatos, com nota e status | A cobertura por tema, que mostra onde faltam nomes |
| **Salas** | Cadastro das salas da FEA com capacidade, recursos (inclusive ar-condicionado) e se o espaço ou o coffee é ao ar livre (o padrão é sala coberta, com coffee na própria sala) | A busca e os ícones de recursos; clicar numa sala abre o painel com todos os detalhes. A sugestão do Planejar vem daqui |
| **Calendário** | Datas importantes do semestre (provas, feriados, outros eventos) e a previsão do tempo dos próximos 16 dias | Que isso alimenta a nota da data (feriados e férias aparecem com o dia inteiro hachurado), e o ícone discreto de tempo em cada dia (máxima e chance de chuva), atualizado sempre que o site abre |
| **Documentos** | Manuais, relatórios, notas fiscais e links de todas as áreas, organizados em pastas: Geral e uma pasta para cada evento | Que o documento ligado a um evento entra sozinho na pasta dele, o filtro pela área de quem subiu e que o PDF abre dentro do próprio app |
| **Parâmetros** | As regras do cálculo: metas de custo, margens, limites e quanto a chuva pesa na nota da data; também o backup | Só a diretoria de Eventos e a presidência alteram, com dupla confirmação. Se o último backup tiver mais de 30 dias, aparece um aviso no topo para elas |
| **Membros** | Equipe, com as áreas e o cargo de cada um, e a lista de quem pode entrar | O filtro por área e, ao clicar numa pessoa, os cargos de cada área (só aparecem para mudar os cargos abaixo do seu) |
| **Lixeira** | O que foi excluído de eventos, salas, calendário, convidados e documentos, por 30 dias | Restaurar com um clique. Só a diretoria para cima vê; a diretoria restaura o que é da própria área, a presidência restaura tudo |
| **Histórico** | Quem criou, editou ou excluiu o quê, e quando | O filtro por área, pessoa e ação. Só a diretoria para cima vê |

As telas das outras áreas já estão no menu, ainda em branco, para serem desenhadas uma a uma com cada área:

| Área | Telas |
| --- | --- |
| **Financeiro** | Custos por evento, Caixa e Orçamento |
| **Marketing** | Posts e Métricas |
| **C&D** | Capacitações e Trilha do trainee |
| **RH** | Visão geral (o conteúdo ainda será definido com a área) |

Na **Base**, o comparecimento é calculado como (presentes − quem veio sem se inscrever) ÷ inscritos, para medir quantos inscritos de fato apareceram. Eventos marcados como \[teste\] ficam fora dos indicadores.

## Roteiro de demonstração de 5 minutos

A demonstração conta uma história só: planejar um evento, ver o resultado e mostrar que o app aprende com ele.

1. **Abertura (30 s).** "Hoje a gente decide sala e compras no chute. O Planejador usa o histórico da diretoria para decidir com números." Mostre o app já logado, na tela Planejar.
2. **Planejar (1 min 30).** Escolha um tipo de evento, uma data e, por exemplo, 120 inscrições esperadas. Clique em calcular e leia em voz alta: a faixa de público provável, a sala sugerida e as duas alternativas, e a quantidade de coffee.
   - Frase-chave: "Ele não me dá um número mágico, dá uma faixa e a chance de caber todo mundo."
3. **Mudar a data (30 s).** Troque para uma data em semana de provas e mostre que a nota da data e a previsão mudam. Se houver chuva prevista para os próximos dias, mostre a linha da previsão do tempo na nota.
4. **Salvar e ir para a Base (1 min).** Salve o evento. Na Base, abra um evento já realizado e mostre o resultado registrado e o semáforo de comparecimento e custo.
5. **Analytics (1 min).** Mostre o gráfico previsto × real e o custo por presente contra a meta. Frase-chave: "Cada evento registrado melhora a próxima previsão."
6. **Fechamento (30 s).** Mostre o app no celular, a tela de Membros com as áreas e cargos e diga que roda de graça e é de quem estiver na diretoria.

Antes da apresentação: entre no app pelo notebook que vai usar, deixe o evento de exemplo pronto e confira a internet da sala. Se a internet cair, o app continua abrindo com os dados já carregados.

## Perguntas prováveis da banca

As respostas curtas abaixo cobrem custo, confiabilidade da previsão, segurança e continuidade.

**"Quanto custa?"** Zero. O site fica no GitHub Pages e os dados no Firebase, ambos no plano gratuito, que sobra para o tamanho da equipe. A IA da Ideia de evento (Gemini, do Google) também usa o plano gratuito.

**"Como a previsão funciona? Dá para confiar?"** Ela usa a taxa de comparecimento dos eventos passados e mostra uma faixa, não um número exato. Com poucos eventos no histórico a faixa é mais larga; conforme registramos resultados, ela fica mais precisa. A tela Analytics mostra o previsto contra o real, então dá para conferir.

**"E se a previsão errar?"** A sala tem margem de segurança ajustável, e o app avisa quando a escolha é arriscada e pede uma justificativa. O erro fica registrado e corrige as próximas previsões.

**"A IA decide sozinha?"** Não. Ela só propõe. Os números de público, sala e compras são recalculados pelo próprio Planejar, convidados fora da nossa lista e datas que já passaram são descartados, e a diretoria revisa antes de salvar. A IA não recebe os contatos dos convidados.

**"De onde vem a previsão do tempo?"** Do Open-Meteo, um serviço gratuito. Para datas até 16 dias à frente o app usa a previsão do tempo de verdade, no horário do evento. Para datas mais distantes usa o histórico de 20 anos da região da FEA: em janeiro chove em cerca de um terço dos fins de tarde, no inverno em quase nenhum. A nota de cada evento salvo é atualizada sozinha 16 e 7 dias antes da data, e o app avisa se a sala não tem ar-condicionado num dia quente ou se o espaço é aberto com chuva prevista.

**"Os dados estão seguros?"** Só entra quem está na lista, com login Google do e-mail USP. As permissões por área e cargo são checadas no próprio banco de dados, não só na tela. Tem backup completo em Parâmetros, com aviso quando o último tiver mais de 30 dias.

**"E se alguém apagar algo sem querer?"** O que é excluído vai para a Lixeira e fica lá por 30 dias; a diretoria da área restaura com um clique. E o Histórico mostra quem criou, editou ou excluiu cada coisa, e quando.

**"E na passagem de gestão?"** Tudo fica no app, não na cabeça de alguém. A nova diretoria recebe acesso, ganha da presidência o cargo de Diretor(a) na sua área e continua de onde parou, com o histórico inteiro.

**"Quem mantém o app?"** O uso do dia a dia não exige programar: salas, convidados, datas e parâmetros são editados pelas telas. Ajustes técnicos têm suporte de quem desenvolveu.

**"Por que não uma planilha?"** A planilha guarda dados, mas não calcula a faixa de público, não sugere sala, não controla quem edita e não funciona bem no celular.

## Custos, limites e próximos passos

O app custa zero hoje, tem limites conhecidos e os próximos passos automatizam inscrições e avisos por e-mail.

**Limites atuais (vale ser honesta se perguntarem):**

- Arquivos anexados têm até 10 MB cada.
- Por enquanto só Eventos tem telas prontas. As telas de Financeiro, Marketing, C&D e RH já aparecem no menu, mas ainda em branco.
- O Calendário aparece para todas as áreas, mas por enquanto só quem é de Eventos edita.
- Esconder as telas de outras áreas é feito no app; quem tem acesso ainda consegue ler os dados das outras áreas no banco. Editar e excluir, não.
- A Lixeira guarda eventos, salas, calendário, convidados e documentos. Perfis, lista de acesso e mailing ficam no Histórico, mas não vão para a Lixeira.
- A previsão ainda tem poucos eventos de base; ela melhora a cada resultado registrado.
- A previsão do tempo de verdade só existe para os próximos 16 dias; antes disso, a nota da data usa o histórico de chuva e temperatura da época. A atualização automática acontece na primeira vez que alguém da equipe abre o app depois de cada marco.
- A Ideia de evento faz até 30 propostas por pessoa por dia e fica marcada como BETA até a Base ter pelo menos 8 eventos realizados de cada tipo principal, em 2 semestres, com erro médio da previsão abaixo de 15%. A própria tela mostra quanto falta.
- O link do site é temporário: o app ainda está numa conta de teste. Com a ideia aprovada, ele passa para contas do GitHub e do Firebase da Feashion, com um link definitivo.

**Próximos passos:**

1. **Forms de inscrição automático:** a partir do Forms padrão da diretoria, o app gera o Forms de cada evento já com nome, data, horário, sala e convidado preenchidos.
2. **Inscrições entrando sozinhas no app:** as respostas do Forms aparecem no evento, sem copiar planilha.
3. **E-mails e mailing (já no app, em fase de testes):** confirmação, lembrete, aviso de mudança e agradecimento para os inscritos, e o convite do mailing para quem quer saber dos próximos eventos, tudo de graça.
4. **Planejamento com IA (já no app, em BETA):** a pessoa descreve em texto corrido o evento que quer, e a IA propõe nome, formato, convidados da nossa lista, datas e, para séries, cada evento da série, usando o histórico de eventos como base. Público, sala e compras saem do cálculo do Planejar, e a diretoria revisa e aprova antes de salvar. O selo BETA sai sozinho quando a Base tiver eventos suficientes.
5. **Telas das outras áreas (já no menu, em branco):** Financeiro (custos por evento, caixa e orçamento), Marketing (posts e métricas), C&D (capacitações e trilha do trainee) e RH, desenhadas uma a uma com cada área, já com as permissões por área prontas.
6. **Depois:** presença no evento, séries agrupadas na Base e domínio próprio para o site.
