"""Tables des comptes : `"comptes.utilisateur"` et `"comptes.droit"`."""

SCHEMA = """
-- Comptes et droits.
--
-- Le mot de passe n'est JAMAIS stocké : seule une empreinte scrypt salée l'est
-- (voir utilisateurs.py).
CREATE TABLE IF NOT EXISTS "comptes.utilisateur" (
    nom                    TEXT     PRIMARY KEY,
    mot_de_passe_empreinte TEXT     NOT NULL,   -- algo$parametres$sel$condensat
    -- Le superadmin court-circuite la table des droits : il voit tous les
    -- modules, présents ET À VENIR. Sans cela, ajouter un module obligerait à
    -- ré-accorder un droit à quelqu'un pour pouvoir en accorder aux autres.
    superadmin             INTEGER  NOT NULL DEFAULT 0,
    -- Le compte créé à l'INSTALLATION, et lui seul. C'est le seul qui puisse
    -- accorder ou retirer le drapeau superadmin - un superadministrateur qui
    -- peut rétrograder ses pairs peut rétrograder tout le monde, et le dernier
    -- resté debout garde l'outil.
    --
    -- Un drapeau plutôt qu'un « plus ancien compte » déduit : la déduction se
    -- déplace dès qu'on supprime un compte, et le pouvoir changerait de mains
    -- sans que personne ne l'ait décidé.
    fondateur              INTEGER  NOT NULL DEFAULT 0,
    actif                  INTEGER  NOT NULL DEFAULT 1,
    creation_date          DATETIME NOT NULL,
    modification_date      DATETIME
);

-- Une ligne par accès accordé. Une table plutôt qu'une colonne à valeurs
-- multiples : le jour où un droit porte autre chose qu'un booléen - lecture
-- seule contre écriture, par exemple - il y a une place pour l'écrire.
--
-- `ON DELETE CASCADE` : supprimer un compte ne doit pas laisser ses droits
-- derrière lui. Le pragma `foreign_keys` est posé à chaque connexion.
CREATE TABLE IF NOT EXISTS "comptes.droit" (
    utilisateur_nom TEXT NOT NULL
                    REFERENCES "comptes.utilisateur"(nom) ON DELETE CASCADE,
    module          TEXT NOT NULL,
    PRIMARY KEY (utilisateur_nom, module)
);
"""
