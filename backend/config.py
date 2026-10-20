"""Seul module qui lit l'environnement : `charger()` rend une `Config`."""
from __future__ import annotations

from typing import TYPE_CHECKING

import os
from dataclasses import dataclass
from pathlib import Path

if TYPE_CHECKING:
    from collections.abc import Mapping

PAQUET = Path(__file__).resolve().parent      # <depot>/backend
RACINE = PAQUET.parent                        # racine du depot

# Nom de l'application, repris au démarrage.
NOM_APPLI = 'Mon application'


@dataclass(frozen=True)
class Config:
    # -- persistance ----------------------------------------------------------
    db_path: str
    # -- interface ------------------------------------------------------------
    listen_port: int
    static_dir: Path
    dev_origin: str             # origine Vite autorisée en CORS ; vide en prod
    trust_proxy: int            # sauts de X-Forwarded-For de confiance
    session_ttl: int            # secondes
    cookie_secure: bool

    def resume(self, comptes: int | None = None) -> list[str]:
        """Lignes du démarrage. `comptes` : nombre de comptes en base."""
        lignes = ['%s : http://0.0.0.0:%d' % (NOM_APPLI, self.listen_port)]
        if comptes is not None:
            lignes.append(
                'comptes : %s'
                % ('AUCUN - la première ouverture du site demandera de créer'
                   ' un superadministrateur'
                   if not comptes else
                   '%d, session de %d s' % (comptes, self.session_ttl)))
        lignes += self._resume_interface()
        return lignes

    def _resume_interface(self) -> list[str]:
        lignes = ['interface : %s'
                  % (self.static_dir if self.static_dir.is_dir()
                     else '%s (ABSENT - lancer le build Vite)'
                          % self.static_dir)]
        if self.dev_origin:
            lignes.append('mode développement : origine %s autorisée'
                          % self.dev_origin)
        lignes.append(
            'proxys de confiance : %s'
            % ('%d saut(s), X-Forwarded-For pris en compte' % self.trust_proxy
               if self.trust_proxy else
               "aucun - derrière un proxy, mettre TRUST_PROXY=1 sinon "
               "la temporisation de connexion s'applique à tous en bloc"))
        if not self.cookie_secure:
            lignes.append('cookie de session sans attribut Secure - mettre '
                          'COOKIE_SECURE=1 dès que le service est derrière '
                          'TLS')
        return lignes


def couleurs(env: Mapping[str, str] | None = None) -> bool:
    """Couleurs ANSI dans les logs, sauf si `NO_COLOR=1`"""
    env = os.environ if env is None else env
    return not env.get('NO_COLOR')


def charger(env: Mapping[str, str] | None = None) -> Config:
    """La configuration lue dans `env` (défaut : l'environnement du
    processus). Chaque défaut est celui de sa lecture ci-dessous."""
    env = os.environ if env is None else env
    return Config(
        db_path=env.get('DB_PATH', str(RACINE / 'data' / 'app.db')),
        listen_port=int(env.get('LISTEN_PORT', '8080')),
        static_dir=Path(env.get('STATIC_DIR',
                                str(RACINE / 'frontend' / 'dist'))),
        dev_origin=env.get('DEV_ORIGIN', ''),
        trust_proxy=int(env.get('TRUST_PROXY', '0')),
        session_ttl=int(env.get('SESSION_TTL', '3600')),
        cookie_secure=env.get('COOKIE_SECURE', '0') == '1',
    )
