"""Givre, au chalet : règles dans `regles.py`, tables dans `salons.py`,
routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/givre/{salons,salon}
    POST /api/givre/{creer,rejoindre,quitter,lever,exclure,lancer,pret,
         reprendre,fermer,retourner,piocher,prendre,garder,jeter,suivante}
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='givre', routes=api.ROUTES, etat=salons.Salons)
