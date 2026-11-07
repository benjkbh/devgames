"""Trio, à l'observatoire : règles dans `regles.py`, tables dans
`salons.py`, routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/trio/{salons,salon}
    POST /api/trio/{creer,rejoindre,quitter,lever,exclure,lancer,pret,
         reprendre,fermer,demander,retourner}
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='trio', routes=api.ROUTES, etat=salons.Salons)
