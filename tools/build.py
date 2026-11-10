"""Gera o index.html do app a partir das mesmas peças da Sandbox PH no Claude.

Uso: python3 tools/build.py   (usa tools/pecas/ e tools/pecas/base.html)
  <html-base>         página da Sandbox antes das peças de conta (sandbox-ph.backup-v2.html)
  <pasta-das-pecas>   conta.css, conta.html, conta.js, menu.html, viewer.html
"""
import sys, time, os, re

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pecas = sys.argv[1] if len(sys.argv) > 1 else os.path.join(raiz, 'tools', 'pecas')
base = sys.argv[2] if len(sys.argv) > 2 else os.path.join(pecas, 'base.html')
s = open(base, encoding='utf-8').read()
P = lambda n: open(os.path.join(pecas, n), encoding='utf-8').read()
# telas no padrão de Salas: rodam dentro do script principal (mesmo escopo)
_f = s.index('\n})();\n</script>')
s = s[:_f] + '\n' + P('telas.js') + s[_f:]

def troca(a, b, n=1):
    global s
    assert s.count(a) == n, ('não encontrado', a[:80], s.count(a))
    s = s.replace(a, b)

# peças de conta, menu e visualizador (as mesmas da Sandbox)
k = s.index('@media (prefers-reduced-motion:reduce)'); k = s.index('</style>', k)
s = s[:k] + P('conta.css') + P('nav.css') + P('analytics.css') + P('telas.css') + s[k:]
troca('<header class="app">', '<script>try{var t=localStorage.getItem("feashion-tema");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>\n<header class="app">')
a = s.index('<div class="brand">'); b = s.index('\n    <nav class="tabs"')
s = s[:a] + P('menu.html').replace('{{BRAND}}', s[a:b]) + s[b:]
troca('</main>', P('conta.html') + P('analytics.html') + P('mailing.html') + P('ideia.html') + '</main>')
e = s.rindex('</script>') + len('</script>')
s = s[:e] + '\n' + P('conta.js') + '\n' + P('viewer.html') + '\n' + P('nav.js') + '\n' + P('analytics.js') + s[e:]

# ajustes do app fora do Claude
troca('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
troca('<title>Sandbox PH</title>', '')
troca('Diretoria de Eventos · Sandbox PH', 'Diretoria de Eventos')
troca('<label for="d-file">Arquivo <span class="rq opt">até 20 MB</span></label>', '<label for="d-file">Arquivo <span class="rq opt">até 10 MB</span></label>')
troca("if(file.size>20*1024*1024){$('dmsg').textContent='Arquivo maior que 20 MB: use um link do Drive.';return;}",
      "if(file.size>10*1024*1024){$('dmsg').textContent='Arquivo maior que 10 MB: use um link do Drive.';return;}")

versao = time.strftime('%Y%m%d%H%M%S')
head = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Planejador de Eventos · Feashion</title>
<meta name="description" content="Planejamento de eventos da Diretoria de Eventos da Feashion.">
<meta name="theme-color" content="#8a0d10">
<meta name="robots" content="noindex">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Planejador">
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;padding:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
<script src="vendor/firebase-app-compat.js"></script>
<script src="vendor/firebase-auth-compat.js"></script>
<script src="vendor/firebase-firestore-compat.js"></script>
<script src="config.js?v={versao}"></script>
<script src="plataforma.js?v={versao}"></script>
</head>
<body>
'''
open(os.path.join(raiz, 'index.html'), 'w', encoding='utf-8').write(head + s + '\n</body>\n</html>\n')
sw = open(os.path.join(raiz, 'tools', 'sw.template.js'), encoding='utf-8').read().replace('__VERSAO__', versao)
open(os.path.join(raiz, 'sw.js'), 'w', encoding='utf-8').write(sw)
print('index.html gerado, versão', versao, len(s), 'bytes')
