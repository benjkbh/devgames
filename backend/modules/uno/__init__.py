"""Module UNO : tables de jeu en mémoire, règles dans `regles.py`, tables
dans `salons.py`, routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/uno/{salons,salon}
    POST /api/uno/{creer,rejoindre,quitter,lever,exclure,regler,lancer,pret,
         reprendre,fermer,jouer,piocher,passer,uno,contrer}
Sans pseudo : GET /api/uno/spectateur, une table vue sans aucune main.
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='uno', routes=api.ROUTES,
                etat=salons.Salons)
