"""Module Code Names au manoir : règles dans `regles.py`, listes de mots
dans `mots.py`, tables dans `salons.py`, routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/codenames/{salons,salon}
    POST /api/codenames/{creer,rejoindre,quitter,lever,exclure,pret,reprendre,
         fermer,choisir,melanger,regler,lancer,indice,marquer,reveler,
         finir}
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='codenames', routes=api.ROUTES,
                etat=salons.Salons)
