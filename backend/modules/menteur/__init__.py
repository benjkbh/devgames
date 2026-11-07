"""Le Menteur, à la taverne des pirates : règles dans `regles.py`,
tables dans `salons.py`, routes dans `api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/menteur/{salons,salon}
    POST /api/menteur/{creer,rejoindre,quitter,lever,exclure,lancer,pret,
         reprendre,fermer,poser,menteur,accepter}
"""
from ..contrat import Module
from . import api, salons

MODULE = Module(cle='menteur', routes=api.ROUTES, etat=salons.Salons)
