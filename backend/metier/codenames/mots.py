"""Listes de mots des parties de Code Names.

Un mot par carte, d'un seul tenant (sans espace), en minuscules : l'interface
les affiche en capitales. `LISTES` associe à chaque liste ses mots, sans
doublon ; « melange » réunit les deux autres.
"""
from __future__ import annotations

# Mots de tous les jours, choisis pour avoir plusieurs sens ou plusieurs
# associations (le sel du jeu).
CLASSIQUE = tuple(dict.fromkeys('''
    afrique aiguille aile air alpes ambulance amour ampoule ange anneau
    araignée arc argent asile astronaute avion avocat baguette baleine
    balle ballon banane banc bande banque barre base bateau berlin bête
    blé bombe botte bouche bouchon bouteille bouton branche bretelle
    brosse bureau but cabine cachet cadre caisse calcul camembert canard
    canon capitale carreau carte cartouche casino ceinture centaure cercle
    champ champagne chance char chat chef chemise cheval chevalier chien
    chine chocolat chou cinéma ciseaux clé coche code coeur col colle
    comète commerce coq corde corne côte coton couche coupe courant
    couronne course couteau crane critique cuisine cycle danse dé
    dentelle diamant dinosaure docteur dragon droite eau éclair écran
    école égalité égypte élément enceinte espace espion étoile europe
    fantôme farce fer feu feuille fève figure file fin flûte force forêt
    fort fou fraise france front fuite garde gauche géant glace gorge
    goutte grâce grenade grue guerre guide héros hiver hôpital hôtel huile
    iceberg indien internet jet jeu jour journal jungle kangourou kiwi lait
    lancer langue lapin laser lettre licorne lien ligne lion lit livre
    londres lune lunettes magie main maison maître manche manège marche
    mars marteau masque médecin mémoire menu mercure meuble microscope
    miel mineur mort mouche moule mousse moustache mur napoléon neige
    ninja note noeud nuit oeil olympe ombre opéra or orange ordinateur
    oreille orgue pacifique page palais palme panier papier parachute
    paris passe patte pêche peinture pendule pensée perle physique piano
    pied pigeon pile pilote pin pirate piste pistolet plage plan plante
    plateau platine plume poêle point poison police pomme pompe pont
    port poste poudre poulet pouvoir prince princesse prison puce pyramide
    quartier queue radio raie rame rayon reine requin résistance robe
    robot roi rome rose roue rouge sable sardine satellite science scène
    sens sentinelle serpent serveur siège sirène soldat solution sorcière
    souris stade station sucre table talon tambour tank tapis tempête
    temps tennis terre tête théâtre tigre timbre titre tokyo tour tracteur
    train trait trésor triangle trou tube tuile uniforme vague vaisseau
    vampire vapeur vase vent verre vert vie vin violon voile voiture
    volume yeux zéro
'''.split()))

# Le manoir et ses hôtes : de quoi donner à la partie la couleur du lieu.
MANOIR = tuple(dict.fromkeys('''
    abbaye ail aube autel bal balustrade bague bal bannière bibliothèque
    blason bougie brume buste calèche candélabre cape cave caveau cercueil
    chandelle chapelle château chauve-souris cheminée cimetière cloche
    clocher comte comtesse corbeau corridor couvent cravache crépuscule
    crocs croix crypte cuisinière dague dentelle domestique donjon douve
    écurie éventail falaise fiacre flambeau fontaine fouet gargouille
    goule grenier griffe grille hallebarde horloge hostie hurlement
    intendant jardinier labyrinthe lanterne loup majordome malle masque
    médaillon miroir minuit morsure nuée orage orgue parchemin passage
    pieu poignard portrait poussière rideau rose sang sablier salon
    sceau secret serre servante sortilège souterrain squelette suaire
    tableau tapisserie tenture testament tombe tonnerre tour trappe velours
    veuve vitrail voile voûte
'''.split()))

LISTES: dict[str, tuple[str, ...]] = {
    'classique': CLASSIQUE,
    'manoir': MANOIR,
    'melange': tuple(dict.fromkeys(CLASSIQUE + MANOIR)),
}
LISTE_DEFAUT = 'melange'
