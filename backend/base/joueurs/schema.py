"""Table des pseudos : `"joueurs.pseudo"`."""

SCHEMA = """
-- Pseudos des joueurs. Pas de compte ni de mot de passe : un pseudo appartient
-- au navigateur qui tient son jeton (cookie). Le jeton n'est JAMAIS stocké :
-- seule son empreinte SHA-256 l'est.
--
-- Un pseudo reste réservé pendant une heure après la dernière activité de son
-- joueur, ou sa déconnexion ; passé ce délai, un autre peut le prendre, et la
-- ligne est alors remplacée (l'ancien jeton ne vaut plus rien).
CREATE TABLE IF NOT EXISTS "joueurs.pseudo" (
    -- Le pseudo sans la casse : « Ana » et « ana » sont le même joueur.
    cle             TEXT     PRIMARY KEY,
    pseudo          TEXT     NOT NULL,      -- tel que le joueur l'a écrit
    -- NULL après une déconnexion : le pseudo n'a plus de détenteur.
    jeton_empreinte TEXT     UNIQUE,
    creation_date   DATETIME NOT NULL,
    -- Dernier signe de vie, ou la déconnexion : point de départ de l'heure de
    -- réservation.
    activite_date   DATETIME NOT NULL
);
"""
