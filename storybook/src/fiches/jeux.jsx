import { useState } from 'react';

import { P } from './aide';
import {
  CarteJeu, COULEURS_UNO, ENSEIGNES, Eventail, RANGS, VALEURS_UNO,
} from '@ui';

function MainUno() {
  const [choisie, setChoisie] = useState(null);
  const main = [
    { cle: 'a', couleur: 'rouge', valeur: '7', jouable: true },
    { cle: 'b', couleur: 'bleu', valeur: 'passe' },
    { cle: 'c', couleur: 'rouge', valeur: '+2', jouable: true },
    { cle: 'd', couleur: 'noir', valeur: 'joker', jouable: true },
    { cle: 'e', couleur: 'vert', valeur: '3' },
    { cle: 'f', couleur: 'jaune', valeur: 'inversion' },
  ];
  return (
    <Eventail arc libelle="Ma main">
      {main.map(({ cle, ...c }) => (
        <CarteJeu key={cle} {...c} desactivee={!c.jouable}
                  selectionnee={choisie === cle}
                  onClick={() => setChoisie(choisie === cle ? null : cle)} />
      ))}
    </Eventail>
  );
}

export const FICHES = [
  {
    cle: 'carte-jeu', nom: 'CarteJeu',
    couvre: ['COULEURS_UNO', 'VALEURS_UNO', 'ENSEIGNES', 'RANGS', 'nomCarte'],
    resume: 'Carte à jouer dessinée en SVG : carte de UNO (couleur et '
      + 'valeur) ou carte d’un jeu de 52 cartes (enseigne et rang), recto ou '
      + 'verso. Sans `onClick`, c’est une image nommée ; avec, un bouton. '
      + 'Listes exportées : `COULEURS_UNO`, `VALEURS_UNO`, `ENSEIGNES`, '
      + '`RANGS` ; `nomCarte(props)` rend le nom lisible (« 7 rouge »).',
    props: [
      P('jeu', 'uno · classique', 'Famille de la carte.', 'uno'),
      P('couleur', 'rouge · jaune · vert · bleu · noir', 'UNO : couleur. Les '
        + 'jokers sont noirs quelle que soit la valeur passée.', 'rouge'),
      P('valeur', '0…9 · passe · inversion · +2 · joker · +4', 'UNO : '
        + 'valeur ou action.', '7'),
      P('enseigne', 'pique · coeur · carreau · trefle', '52 cartes : '
        + 'enseigne.', 'coeur'),
      P('rang', 'A · 2…10 · V · D · R · joker', '52 cartes : rang ; V, D, R '
        + 'sont les figures.', 'A'),
      P('face', 'recto · verso', 'verso : carte retournée, seul le dos est '
        + 'montré (et nommé).', 'recto'),
      P('taille', 'xs · s · m · l · xl', 'Largeur : 34, 52, 72, 100 ou '
        + '140 px ; hauteur en rapport 2:3.', 'm'),
      P('couleurChoisie', 'rouge · jaune · vert · bleu', 'UNO : couleur '
        + 'annoncée sur un joker posé (liseré lumineux).'),
      P('jouable', 'booléen', 'Halo doré : la carte peut être jouée.'),
      P('selectionnee', 'booléen', 'Carte levée et cerclée de rouge. Sur '
        + 'un bouton, pose `aria-pressed`.'),
      P('desactivee', 'booléen', 'Carte assombrie ; bouton désactivé.'),
      P('inclinaison', 'nombre', 'Rotation en degrés.'),
      P('onClick', 'fonction', 'Rend la carte cliquable (`<button>`).'),
      P('libelle', 'string', 'Nom accessible ; à défaut, `nomCarte`.'),
      P('className · style', '', 'Ajoutés à l’élément racine, comme les '
        + 'autres props.'),
    ],
    exemples: [
      {
        titre: 'UNO : chiffres, actions et jokers',
        Rendu: () => (
          <div className="sb-ligne">
            {['3', '6', 'passe', 'inversion', '+2'].map((v, i) => (
              <CarteJeu key={v} valeur={v} couleur={COULEURS_UNO[i % 4]} />
            ))}
            <CarteJeu valeur="joker" />
            <CarteJeu valeur="+4" />
            <CarteJeu face="verso" />
          </div>
        ),
        code: '<CarteJeu couleur="bleu" valeur="passe" />\n'
          + '<CarteJeu valeur="+4" />\n<CarteJeu face="verso" />',
      },
      {
        titre: 'Jeu de 52 cartes',
        Rendu: () => (
          <div className="sb-ligne">
            {['A', '7', '10', 'V', 'D', 'R'].map((r, i) => (
              <CarteJeu key={r} jeu="classique" rang={r}
                        enseigne={ENSEIGNES[i % 4]} />
            ))}
            <CarteJeu jeu="classique" rang="joker" />
            <CarteJeu jeu="classique" face="verso" />
          </div>
        ),
        code: '<CarteJeu jeu="classique" enseigne="pique" rang="D" />\n'
          + '<CarteJeu jeu="classique" face="verso" />',
      },
      {
        titre: 'Tailles et joker annoncé',
        Rendu: () => (
          <div className="sb-ligne">
            {['xs', 's', 'm', 'l', 'xl'].map((t) => (
              <CarteJeu key={t} taille={t} valeur="joker" couleurChoisie="bleu" />
            ))}
          </div>
        ),
        code: '<CarteJeu taille="l" valeur="joker" couleurChoisie="bleu" />',
      },
    ],
  },
  {
    cle: 'eventail', nom: 'Eventail',
    resume: 'Cartes posées côte à côte et chevauchées, droites ou inclinées '
      + 'en arc : une main de joueur, une pioche étalée. Chaque enfant devient '
      + 'un élément de liste ; la carte survolée passe devant ses voisines.',
    props: [
      P('chevauchement', 'nombre (0 à 0,9)', 'Part de la largeur d’une '
        + 'carte recouverte par la suivante.', '0.45'),
      P('arc', 'booléen', 'Incline les cartes en éventail.'),
      P('libelle', 'string', 'Nom accessible de la liste (« Ma main »).'),
      P('className', 'string', 'Classe ajoutée à la liste.'),
      P('children', 'éléments', 'Les cartes, en général des `CarteJeu`.'),
    ],
    exemples: [
      {
        titre: 'Main de UNO cliquable',
        Rendu: MainUno,
        code: '<Eventail arc libelle="Ma main">\n'
          + '  {main.map((c) => (\n'
          + '    <CarteJeu key={c.id} {...c} onClick={() => jouer(c)} />\n'
          + '  ))}\n</Eventail>',
      },
      {
        titre: 'Carré d’as, sans arc',
        Rendu: () => (
          <Eventail chevauchement={0.6} libelle="Carré d’as">
            {ENSEIGNES.map((e) => (
              <CarteJeu key={e} jeu="classique" rang="A" enseigne={e} />
            ))}
          </Eventail>
        ),
        code: '<Eventail chevauchement={0.6}>\n  …\n</Eventail>',
      },
    ],
  },
];
