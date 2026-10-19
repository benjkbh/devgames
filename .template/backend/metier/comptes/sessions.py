"""Sessions en mémoire : un redémarrage déconnecte tout le monde."""
from __future__ import annotations

import secrets
import threading
import time

COOKIE = 'session'

# Secondes sans tentative au bout desquelles une adresse est oubliée.
OUBLI_ESSAIS = 3600
class Sessions:
    def __init__(self, ttl: int) -> None:
        """`ttl` : durée de vie d'un jeton, en secondes."""
        self.ttl = ttl
        # jeton -> (nom du compte, expiration)
        self._jetons: dict[str, tuple[str, float]] = {}
        # adresse -> (nb d'échecs, prochain essai permis)
        self._essais: dict[str, tuple[int, float]] = {}
        self._verrou = threading.Lock()

    # -- cycle de vie ------------------------------------------------------
    def ouvrir(self, nom: str) -> str:
        jeton = secrets.token_urlsafe(32)
        with self._verrou:
            maintenant = time.time()
            for j, (_, exp) in list(self._jetons.items()):
                if exp <= maintenant:
                    del self._jetons[j]
            self._jetons[jeton] = (nom, maintenant + self.ttl)
        return jeton

    def utilisateur(self, jeton: str | None) -> str | None:
        """Nom du compte de cette session, ou None si absente ou expirée."""
        if not jeton:
            return None
        with self._verrou:
            entree = self._jetons.get(jeton)
            if entree is None:
                return None
            nom, exp = entree
            if exp <= time.time():
                del self._jetons[jeton]
                return None
            return nom

    def fermer(self, jeton: str) -> None:
        with self._verrou:
            self._jetons.pop(jeton, None)

    def nombre(self, nom: str) -> int:
        """Sessions ouvertes et non expirées d'un compte."""
        maintenant = time.time()
        with self._verrou:
            return sum(1 for proprietaire, exp in self._jetons.values()
                       if proprietaire == nom and exp > maintenant)

    def fermer_autres(self, nom: str, garder: str | None) -> int:
        """Ferme les sessions d'un compte sauf `garder` (la session en
        cours). Rend le nombre de sessions fermées."""
        fermees = 0
        with self._verrou:
            for jeton, (proprietaire, _) in list(self._jetons.items()):
                if proprietaire == nom and jeton != garder:
                    del self._jetons[jeton]
                    fermees += 1
        return fermees

    def fermer_compte(self, nom: str) -> None:
        """Ferme toutes les sessions d'un compte supprimé ou désactivé."""
        with self._verrou:
            for jeton, (proprietaire, _) in list(self._jetons.items()):
                if proprietaire == nom:
                    del self._jetons[jeton]

    # -- limitation des tentatives -----------------------------------------
    def attente(self, adresse: str) -> float:
        """Secondes restant à patienter avant un nouvel essai, 0 si aucune."""
        with self._verrou:
            _, jusqua = self._essais.get(adresse, (0, 0.0))
            return max(0.0, jusqua - time.time())

    def echec(self, adresse: str) -> None:
        """Attente en secondes : 0, 0, 1, 2, 4… plafonnée à 60.

        À n'appeler que pour une tentative évaluée, pas pendant l'attente.
        """
        maintenant = time.time()
        with self._verrou:
            self._oublier(maintenant)
            nb, _ = self._essais.get(adresse, (0, 0.0))
            nb += 1
            delai = 0 if nb < 3 else min(60, 2 ** (nb - 3))
            self._essais[adresse] = (nb, maintenant + delai)

    def _oublier(self, maintenant: float) -> None:
        """Appelé sous le verrou."""
        for adr, (_, jusqua) in list(self._essais.items()):
            if jusqua + OUBLI_ESSAIS <= maintenant:
                del self._essais[adr]

    def succes(self, adresse: str) -> None:
        with self._verrou:
            self._essais.pop(adresse, None)
def entete_cookie(valeur: str, max_age: int, secure: bool) -> str:
    parts = ['%s=%s' % (COOKIE, valeur), 'Path=/', 'HttpOnly',
             'SameSite=Strict', 'Max-Age=%d' % max_age]
    if secure:
        parts.append('Secure')
    return '; '.join(parts)
