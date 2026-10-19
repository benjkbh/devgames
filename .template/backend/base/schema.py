"""Schéma complet, assemblé depuis celui de chaque module.

Un module qui a des tables apporte `base/<module>/schema.py` (une constante
`SCHEMA`) et s'ajoute à `MORCEAUX`. Les `CREATE TABLE IF NOT EXISTS` ne
modifient pas une table existante : tout changement de forme passe par une
migration.
"""
from .comptes.schema import SCHEMA as _COMPTES

# Réglage persistant du fichier ; doit précéder toute création.
EN_TETE = 'PRAGMA journal_mode=WAL;'

# Ordre d'exécution.
MORCEAUX = (
    ('comptes', _COMPTES),
)

SCHEMA = '\n\n'.join(
    [EN_TETE]
    + ['-- === %s %s\n%s' % (nom, '=' * (68 - len(nom)), ddl.strip())
       for nom, ddl in MORCEAUX])
