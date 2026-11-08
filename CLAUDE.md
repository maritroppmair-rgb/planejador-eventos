# Planejador de Eventos · instruções para o Claude

## Guia para apresentar (sempre atualizar)
`docs/guia-para-apresentar.md` explica o site para a Marília apresentar. **Toda mudança que o usuário possa ver no site (tela nova, botão, regra de cálculo, cargo, limite, custo, link) precisa atualizar esse guia no mesmo commit.**

- Mantenha o formato atual: as mesmas seções, nesta ordem (O que é, Como entrar e cargos, Tour pelas telas, Roteiro de 5 minutos, Perguntas da banca, Custos/limites/próximos passos), frases curtas e linguagem sem jargão técnico, escrita para quem não programa.
- Atualize a data da segunda linha (`Mmm D, AAAA · @Pedro`) sempre que mexer.
- Quando algo dos "Próximos passos" ficar pronto, tire de lá e passe para o Tour ou para os limites.
- Não coloque e-mails pessoais, chaves nem ids internos: o repositório é público.

## Build
O `index.html` é gerado: edite as peças em `tools/pecas/` e rode `python3 tools/build.py`. O robô de Forms/e-mails/IA fica em `robo/` (Apps Script; cada mudança precisa ser colada e reimplantada pelo Pedro).
