"""Refaz as duas telas do banner do Backoffice a partir da foto original e remove a planta.

Entrada: assets/backoffice/00_backoffice_banner.png (original, telas claras; não é alterado) e as
capturas reais em 2x de output/imagegen/dynamis-telas/referencias-2x/ (fila.png e reprocessos.png,
Backoffice com dados fictícios). Os vértices abaixo foram medidos na foto, na moldura de cada monitor.
Saída: versoes/telas-escuras/backoffice/00_backoffice_banner.(png|webp), em 2x (3860 px).
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ORIGINAL = Path('image/demonstracao/assets/backoffice/00_backoffice_banner.png')
ALVO = Path('image/demonstracao/versoes/telas-escuras/backoffice')
REF = Path('output/imagegen/dynamis-telas/referencias-2x')
S = 2

# vértices no banner de 1930x476: esquerda-sup, direita-sup, direita-inf, esquerda-inf
# (o topo e a base do monitor da direita passam dos limites da imagem)
MONITORES = [
    ('fila.png', [(1291, 108), (1462, 38), (1456, 436), (1286, 396)]),
    ('reprocessos.png', [(1481, 7), (1779, -100), (1784, 505), (1482, 448)]),
]

base = cv2.cvtColor(np.asarray(Image.open(ORIGINAL).convert('RGB')), cv2.COLOR_RGB2BGR)
h, w = base.shape[:2]

# 1) retira a planta (verde) da direita, que cobria o monitor
hsv = cv2.cvtColor(base, cv2.COLOR_BGR2HSV)
verde = ((hsv[..., 0] > 25) & (hsv[..., 0] < 95) & (hsv[..., 1] > 35) & (hsv[..., 2] > 20)).astype(np.uint8)
verde[:, :1640] = 0
verde[:100, :] = 0
verde = cv2.morphologyEx(verde, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
verde = cv2.dilate(verde, np.ones((17, 17), np.uint8))
limpo = cv2.inpaint(base, verde * 255, 9, cv2.INPAINT_TELEA)
# à direita do monitor sobra uma parede escura: tira o resíduo esverdeado
faixa = cv2.cvtColor(limpo[:, 1790:], cv2.COLOR_BGR2HSV)
faixa[..., 1] = (faixa[..., 1] * 0.15).astype(np.uint8)
# escurece o recheio da planta, com transição suave no alto, para combinar com a parede
fator = np.clip((np.arange(h) - 90) / 90, 0, 1)[:, None]
faixa[..., 2] = (faixa[..., 2] * (1 - 0.6 * fator)).astype(np.uint8)
limpo[:, 1790:] = cv2.cvtColor(faixa, cv2.COLOR_HSV2BGR)

# 2) amplia a foto e encaixa as capturas com a perspectiva de cada monitor
grande = cv2.resize(limpo, (w * S, h * S), interpolation=cv2.INTER_LANCZOS4)
for arquivo, quad in MONITORES:
    tela = cv2.cvtColor(np.asarray(Image.open(REF / arquivo).convert('RGB')), cv2.COLOR_RGB2BGR)
    th, tw = tela.shape[:2]
    dst = np.float32([(x * S, y * S) for x, y in quad])
    M = cv2.getPerspectiveTransform(np.float32([(0, 0), (tw, 0), (tw, th), (0, th)]), dst)
    encaixe = cv2.warpPerspective(tela, M, (w * S, h * S), flags=cv2.INTER_AREA).astype(np.float32)
    mascara = np.zeros((h * S, w * S), np.uint8)
    cv2.fillConvexPoly(mascara, dst.astype(np.int32), 255, cv2.LINE_AA)
    mascara = cv2.GaussianBlur(mascara, (3, 3), 0).astype(np.float32)[..., None] / 255
    encaixe = cv2.GaussianBlur(encaixe * 0.95, (0, 0), 0.5)
    grande = (grande * (1 - mascara) + np.clip(encaixe, 0, 255) * mascara).astype(np.uint8)

saida = Image.fromarray(cv2.cvtColor(grande, cv2.COLOR_BGR2RGB))
saida.save(ALVO / '00_backoffice_banner.png', optimize=True)
saida.save(ALVO / '00_backoffice_banner.webp', 'WEBP', quality=92, method=6)
print(saida.size)
