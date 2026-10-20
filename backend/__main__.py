from __future__ import annotations

import datetime
import signal
import sys

from . import base, config, serveur
from .metier.comptes import utilisateurs

# Couleurs ANSI par niveau. Actives par défaut
COULEURS = {'info': '32', 'alerte': '33', 'erreur': '1;31'}
GRIS = '90'
AVEC_COULEUR = config.couleurs()


def _teinte(code: str, texte: str) -> str:
    return f'\x1b[{code}m{texte}\x1b[0m' if AVEC_COULEUR else texte


def logging(level: str, message: str) -> None:
    now = datetime.datetime.now()
    code = COULEURS.get(level, '0')
    ligne = f'{_teinte(GRIS, f"[{now}]")} {_teinte(code, f"[{level}]")} : '
    # Le message d'une erreur ou d'une alerte est coloré en entier
    print(ligne + (_teinte(code, message) if level != 'info' else message),
          flush=True)


def _arret_demande(signum: int, frame: object) -> None:
    """SIGTERM (docker stop) suit le même chemin d'arrêt que Ctrl-C."""
    raise KeyboardInterrupt


def main() -> int:
    logging('info', 'démarrage')
    cfg = config.charger()
    try:
        base.initialiser(cfg.db_path, logging)
    except base.BaseInaccessible as e:
        logging('erreur', str(e))
        return 1

    for ligne in cfg.resume(len(utilisateurs.lister(cfg.db_path))):
        logging('info', ligne)

    srv = serveur.creer(cfg, logging)
    signal.signal(signal.SIGTERM, _arret_demande)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        logging('info', 'arrêt demandé')
    finally:
        srv.server_close()
    return 0


if __name__ == '__main__':
    # Le code de retour remonte au shell pour signaler l'échec au conteneur.
    sys.exit(main())
