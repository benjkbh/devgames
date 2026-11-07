"""Ce que le serveur et l'interface partagent : la liste des modules.

Chaque module est déclaré deux fois : par son manifeste serveur
(`backend/modules/<module>/__init__.py`) et par son manifeste d'interface
(`frontend/src/modules/<module>/index.jsx`), inscrits chacun dans un registre
(`backend/modules/__init__.py`, `frontend/src/coque/modules.jsx`). Un module
présent d'un côté seulement serait une entrée de menu sans routes, ou des
routes sans entrée de menu.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

from backend import api
from backend.modules import MODULES

FRONTEND = Path(__file__).resolve().parent.parent / 'frontend' / 'src'
REGISTRE_JSX = FRONTEND / 'coque' / 'modules.jsx'

# Dans un manifeste, `cle:` du module est à 2 espaces : seul repère
# disponible sans analyser le JavaScript. Les lignes commentées (`//`) ne
# comptent pas.
CLE_MODULE = re.compile(r"^ {2}cle: '([a-z0-9-]+)',", re.M)


def _sans_commentaires(chemin: Path) -> str:
    return '\n'.join(ligne for ligne in chemin.read_text(encoding='utf-8')
                     .splitlines() if not ligne.lstrip().startswith('//'))


class LeRegistreDuServeur(unittest.TestCase):

    def test_le_serveur_lit_les_cles_des_manifestes(self) -> None:
        self.assertEqual(api.MODULES, tuple(m.cle for m in MODULES))

    def test_chaque_route_de_module_est_sous_son_prefixe(self) -> None:
        """`/api/<module>/…` : deux modules ne se marchent pas dessus."""
        for m in MODULES:
            for _, chemin in m.routes:
                with self.subTest(module=m.cle, chemin=chemin):
                    self.assertTrue(chemin.startswith('/api/%s/' % m.cle))


@unittest.skipUnless(REGISTRE_JSX.is_file(), 'frontend absent')
class LesDeuxRegistresSontDAccord(unittest.TestCase):

    def test_les_memes_modules_dans_le_meme_ordre(self) -> None:
        """`MODULES` de `modules.jsx` liste les manifestes importés de
        `../modules/<module>`, dans l'ordre du registre du serveur."""
        source = _sans_commentaires(REGISTRE_JSX)
        dossiers = dict(re.findall(
            r"^import (\w+) from '\.\./modules/([\w-]+)';", source, re.M))
        liste = re.search(r'export const MODULES = \[([^\]]*)\]', source)
        assert liste is not None
        noms = [n.strip() for n in liste.group(1).split(',') if n.strip()]
        self.assertEqual([dossiers.get(n) for n in noms], list(api.MODULES))

    def test_chaque_manifeste_porte_sa_cle(self) -> None:
        for m in MODULES:
            with self.subTest(module=m.cle):
                source = _sans_commentaires(FRONTEND / 'modules' / m.cle
                                            / 'index.jsx')
                self.assertEqual(CLE_MODULE.findall(source), [m.cle])


if __name__ == '__main__':
    unittest.main()
