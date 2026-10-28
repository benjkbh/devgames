"""Schéma complet : celui des comptes, puis celui de chaque module.

Un module qui a des tables les déclare dans son manifeste (`Module.schema`,
`backend/modules/contrat.py`). Les `CREATE TABLE IF NOT EXISTS` ne modifient
pas une table existante : tout changement de forme passe par une migration.
"""
from ..modules import MODULES
from .comptes.schema import SCHEMA as _COMPTES

# Réglage persistant du fichier ; doit précéder toute création.
EN_TETE = 'PRAGMA journal_mode=WAL;'

# Ordre d'exécution.
MORCEAUX = (
    ('comptes', _COMPTES),
    *((m.cle, m.schema) for m in MODULES if m.schema),
)

SCHEMA = '\n\n'.join(
    [EN_TETE]
    + ['-- === %s %s\n%s' % (nom, '=' * (68 - len(nom)), ddl.strip())
       for nom, ddl in MORCEAUX])
