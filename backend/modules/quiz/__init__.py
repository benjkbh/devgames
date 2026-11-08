"""Quiz de culture générale, sur le plateau télé : banque de questions dans
`banque.py` (fichiers de `questions/` et pays de `pays.py`), correction
proposée dans `correction.py`, règles dans `regles.py`, tables dans
`salons.py`, historique des questions vues dans `historique.py`, routes dans
`api.py`.

Routes, pour tout joueur qui a un pseudo :
    GET  /api/quiz/{salons,salon}
    POST /api/quiz/{creer,rejoindre,quitter,lever,exclure,lancer,pret,
         reprendre,fermer,regler,repondre,avancer,passer,noter,revoir,
         terminer}
"""
from ..contrat import Module
from . import api, historique, salons

MODULE = Module(cle='quiz', routes=api.ROUTES, etat=salons.Salons,
                schema=historique.SCHEMA)
