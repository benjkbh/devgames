"""Module d'exemple, sans route ni état : sert de modèle à copier pour un
nouveau module. À remplacer ou supprimer.

accueil   acces     ouvre la page d'accueil (aucune route)
"""
from ..contrat import Module

MODULE = Module(cle='accueil', roles=('acces',))
