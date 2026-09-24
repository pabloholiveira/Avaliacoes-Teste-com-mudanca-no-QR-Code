"""
Gera o QR code de cada cliente da pasta clientes/.

Instalação:
    pip install "qrcode[pil]"

Uso:
    python gerar_qrcode.py https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/

Se a URL base for omitida, usa BASE_PADRAO abaixo.
Os PNGs saem em qrcodes/qr-<slug>.png
"""

import json
import sys
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_Q

BASE_PADRAO = "https://pabloholiveira.github.io/Avaliacoes-Teste-com-mudanca-no-QR-Code/"

PASTA_CLIENTES = Path("clientes")
PASTA_SAIDA = Path("qrcodes")


def gerar(slug: str, url: str) -> Path:
    qr = qrcode.QRCode(
        version=None,
        # Q = tolera ~25% de dano; a placa fica exposta a desgaste.
        error_correction=ERROR_CORRECT_Q,
        box_size=20,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    destino = PASTA_SAIDA / f"qr-{slug}.png"
    img.save(destino)
    return destino


def main() -> None:
    base = sys.argv[1] if len(sys.argv) > 1 else BASE_PADRAO
    if not base.endswith("/"):
        base += "/"

    arquivos = sorted(PASTA_CLIENTES.glob("*.json"))
    if not arquivos:
        print(f"Nenhum cliente em {PASTA_CLIENTES}/ — gere os JSONs pelo admin.html")
        return

    PASTA_SAIDA.mkdir(exist_ok=True)
    for arquivo in arquivos:
        slug = arquivo.stem
        cfg = json.loads(arquivo.read_text(encoding="utf-8"))
        url = f"{base}?c={slug}"
        destino = gerar(slug, url)
        print(f"{cfg.get('businessName', slug)}: {destino}  ->  {url}")


if __name__ == "__main__":
    main()
