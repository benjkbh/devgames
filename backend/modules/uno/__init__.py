"""Module UNO : tables de jeu en mémoire, règles dans `regles.py`, tables
dans `salons.py`, routes dans `api.py`.

uno       joueur    GET /api/uno/{salons,salon} ; POST /api/uno/{creer,
                    rejoindre,quitter,exclure,regler,lancer,pret,reprendre,
                    fermer,jouer,piocher,passer,uno,contrer}
          (public)  GET /api/uno/spectateur : une table vue sans compte, sans
                    aucune main
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='uno', roles=('joueur',), routes=api.ROUTES,
                etat=salons.Salons)
