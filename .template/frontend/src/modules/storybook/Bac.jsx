import { Component, Fragment, useState } from 'react';

import { Alerte, Bouton, BoutonCopier, QuestionBool, Saisie, Selecteur } from '../../ui';

// Isole le composant essayé : une erreur de rendu reste dans le bac et
// n'emporte pas le catalogue.
class Isolation extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  render() {
    const { erreur } = this.state;
    if (erreur) {
      return (
        <Alerte compacte titre="Ce réglage fait échouer le composant">
          {String(erreur.message || erreur)}
        </Alerte>
      );
    }
    return this.props.children;
  }
}

const cleDe = (c) => c.cle || c.nom;

function Controle({ controle, valeur, onChange }) {
  const id = `sb-ctl-${cleDe(controle)}`;
  let champ;
  if (controle.type === 'booleen') {
    return (
      <QuestionBool libelle={controle.nom} checked={Boolean(valeur)}
            onChange={onChange} />
    );
  }
  if (controle.type === 'choix') {
    champ = (
      <Selecteur id={id} taille="s" bloc value={valeur}
                 onChange={(e) => onChange(e.target.value)}>
        {controle.options.map((o) => (
          <option key={o} value={o}>{o === '' ? '(aucun)' : o}</option>
        ))}
      </Selecteur>
    );
  } else {
    champ = (
      <Saisie id={id} taille="s" value={valeur}
              type={controle.type === 'nombre' ? 'number' : 'text'}
              onChange={(e) => onChange(controle.type === 'nombre'
                ? Number(e.target.value) : e.target.value)} />
    );
  }
  return (
    <label className="sb-controle" htmlFor={id}>
      <span>{controle.nom}</span>
      {champ}
    </label>
  );
}

// Bac à sable d'un composant : contrôles des props, aperçu isolé, code JSX
// équivalent. Les valeurs vivent dans ce composant : changer de fiche (ou
// réinitialiser) repart des défauts.
export default function Bac({ bac }) {
  const defauts = Object.fromEntries(bac.controles.map((c) => [cleDe(c), c.defaut]));
  const [valeurs, setValeurs] = useState(defauts);
  const [essai, setEssai] = useState(0);
  const { Rendu } = bac;
  const code = bac.code(valeurs);

  return (
    <div className="sb-bac">
      <div className="sb-bac-controles">
        {bac.controles.map((c, i) => (
          <Fragment key={cleDe(c)}>
            {c.groupe && c.groupe !== (bac.controles[i - 1] || {}).groupe && (
              <p className="sb-controle-groupe">{c.groupe}</p>
            )}
            <Controle controle={c} valeur={valeurs[cleDe(c)]}
                      onChange={(v) => setValeurs((prec) => ({ ...prec, [cleDe(c)]: v }))} />
          </Fragment>
        ))}
        <Bouton taille="s" variante="fantome" onClick={() => {
          setValeurs(defauts);
          setEssai((n) => n + 1);
        }}
          titre="Réinitialiser" />
      </div>
      <div className="sb-bac-scene">
        <div className="sb-bac-isole" key={essai}>
          <Isolation key={code}><Rendu v={valeurs} /></Isolation>
        </div>
        <div className="sb-code">
          <code>{code}</code>
          <BoutonCopier valeur={code} variante="fantome" />
        </div>
      </div>
    </div>
  );
}
