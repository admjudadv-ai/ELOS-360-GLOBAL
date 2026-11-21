#!/usr/bin/env python3
"""Gera a pasta public/ de produção a partir das páginas do sistema Elos 360° Global.

Uso: python3 build.py <pasta_origem>
A origem tem index.html, banner.jpg e programas/*.html (as mesmas páginas do sistema integrado).
Injeta o adaptador /elos-shim.js, que liga as telas ao servidor próprio.
"""
import os
import re
import shutil
import sys

src = sys.argv[1]
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
SHIM = '<script src="/elos-shim.js"></script>'
PWA = '<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="#07142a">\n<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">\n<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Elos 360°">\n<script>if(\'serviceWorker\' in navigator)addEventListener(\'load\',()=>navigator.serviceWorker.register(\'/sw.js\').catch(()=>{}));</script>\n'


def inject(html: str) -> str:
    if SHIM in html:
        return html
    html = html.replace('/_blob/51b9bbe658679e189b8c5bef7c530707', '/logo-circular.png')
    html = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + '\n' + SHIM, html, count=1)
    if 'manifest.webmanifest' not in html:
        html = html.replace('</head>', PWA + '</head>', 1)
    html = html.replace('sua conta Claude', 'sua conta Elos')
    html = html.replace('href="index.html#', 'href="/sistema#')
    html = html.replace(
        'Banco de dados indisponível nesta visualização: os dados ficam só neste aparelho. Abra o sistema pelo link no claude.ai para gravar no banco.',
        'Servidor indisponível no momento: os dados ficam só neste aparelho até a conexão voltar.')
    return html


os.makedirs(os.path.join(dst, 'programas'), exist_ok=True)
for rel in ['index.html', 'site.html', 'programas/futuro-sem-fronteiras.html', 'programas/futuro-sem-fronteiras-sistema.html']:
    with open(os.path.join(src, rel), encoding='utf-8') as f:
        out = inject(f.read())
    with open(os.path.join(dst, rel), 'w', encoding='utf-8') as f:
        f.write(out)
shutil.copy(os.path.join(src, 'banner.jpg'), os.path.join(dst, 'banner.jpg'))
logo = os.path.join(os.path.dirname(dst), '..', 'logo-circular.png')
if os.path.exists(logo):
    shutil.copy(logo, os.path.join(dst, 'logo-circular.png'))
print('public/ pronto')
