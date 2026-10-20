"""Ce que le serveur et l'interface partagent : `backend/partage/`."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

from backend import api
from backend.partage import CONSTANTES

MODULES_JSX = (Path(__file__).resolve().parent.parent / 'frontend' / 'src'
               / 'coque' / 'modules.jsx')


class ConstantesPartagees(unittest.TestCase):

    def test_le_serveur_lit_les_modules_du_fichier(self) -> None:
        self.assertEqual(
            api.ROLES,
            {m: tuple(r) for m, r in CONSTANTES['modules'].items()})

    def test_chaque_module_a_au_moins_un_role(self) -> None:
        for module, roles in CONSTANTES['modules'].items():
            with self.subTest(module=module):
                self.assertTrue(roles)

    @unittest.skipUnless(MODULES_JSX.is_file(), 'frontend absent')
    def test_le_registre_de_l_interface_suit_le_fichier(self) -> None:
        """`modules.jsx` : mêmes modules, mêmes rôles, même ordre. Les
        entrées commentées (`//`) ne comptent pas."""
        source = '\n'.join(
            ligne for ligne in MODULES_JSX.read_text(encoding='utf-8')
            .splitlines() if not ligne.lstrip().startswith('//'))
        corps = source[source.index('export const MODULES'):
                       source.index('export const cleDroit')]
        modules: dict[str, list[str]] = {}
        courant = None
        for m in re.finditer(r"^    cle: '(\w+)'|^        cle: '(\w+)'",
                             corps, re.M):
            if m.group(1):
                courant = m.group(1)
                modules[courant] = []
            elif courant:
                modules[courant].append(m.group(2))
        self.assertEqual(modules,
                         {m: list(r) for m, r in CONSTANTES['modules'].items()})


if __name__ == '__main__':
    unittest.main()
