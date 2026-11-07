"""Flip 7 à la fête foraine : règles dans `regles.py`, tables dans
`salons.py`, routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/flip7/{salons,salon}
    POST /api/flip7/{creer,rejoindre,quitter,lever,exclure,lancer,pret,
         reprendre,fermer,piocher,rester,cibler,suivante}
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='flip7', routes=api.ROUTES, etat=salons.Salons)
