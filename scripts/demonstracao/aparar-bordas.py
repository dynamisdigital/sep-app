"""Gera cópias das fotografias da demonstração sem as bordas brancas.

Os originais em image/demonstracao/assets não são alterados (hash em originais-sha256.json).
Saída: image/demonstracao/versoes/bordas-corrigidas/<originais|telas-escuras>/<perfil>/<arquivo>
Uso: python scripts/demonstracao/aparar-bordas.py [--listar]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path('image/demonstracao')
ORIGENS = {'originais': RAIZ / 'assets', 'telas-escuras': RAIZ / 'versoes/telas-escuras'}
SAIDA = RAIZ / 'versoes/bordas-corrigidas'
LIMITE = 0.25


def claro(a: np.ndarray) -> np.ndarray:
    return (a[..., :3].min(axis=2) > 225) | (a[..., 3] < 200)


def aparar(a: np.ndarray):
    h, w = a.shape[:2]
    m = claro(a)
    t = {}
    for lado, linhas, dim in (
        ('e', lambda n: m[:, n], w),
        ('d', lambda n: m[:, w - 1 - n], w),
        ('t', lambda n: m[n, :], h),
        ('b', lambda n: m[h - 1 - n, :], h),
    ):
        ruim = [n for n in range(int(dim * LIMITE)) if linhas(n).mean() > 0.55]
        t[lado] = (ruim[-1] + 1) if ruim else 0
    if not any(t.values()):
        return None
    # cantos arredondados deixam pontas claras: avança até os quatro cantos ficarem limpos
    for _ in range(int(min(h, w) * 0.06)):
        c = max(4, int(min(h, w) * 0.04))
        sub = m[t['t'] : h - t['b'], t['e'] : w - t['d']]
        cantos = [sub[:c, :c], sub[:c, -c:], sub[-c:, :c], sub[-c:, -c:]]
        if not any(x.mean() > 0.01 for x in cantos):
            break
        t['e'] += 1
        t['d'] += 1
        t['t'] += 1
        t['b'] += 1
    return t['e'], t['t'], w - t['d'], h - t['b']


def main():
    listar = '--listar' in sys.argv
    relatorio = {}
    for versao, origem in ORIGENS.items():
        for p in sorted(origem.rglob('*')):
            if p.suffix.lower() not in ('.png', '.webp') or 'mockups' in p.parts:
                continue
            im = Image.open(p).convert('RGBA')
            caixa = aparar(np.asarray(im))
            if not caixa:
                continue
            rel = p.relative_to(origem)
            relatorio[f'{versao}/{rel.as_posix()}'] = list(caixa)
            if listar:
                continue
            destino = SAIDA / versao / rel
            destino.parent.mkdir(parents=True, exist_ok=True)
            novo = im.crop(caixa)
            if p.suffix.lower() == '.webp':
                novo.save(destino, 'WEBP', quality=92, method=6)
            else:
                novo.save(destino, 'PNG', optimize=True)
    for k, v in relatorio.items():
        print(k, v)
    print(len(relatorio), 'imagens aparadas')
    if not listar:
        (SAIDA / 'aparadas.json').write_text(json.dumps(relatorio, indent=2), encoding='utf-8')


main()
