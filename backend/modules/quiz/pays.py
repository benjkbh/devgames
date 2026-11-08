"""Les pays du quiz : nom, forme « de … », capitale (et ses variantes
admises) et coordonnées de la capitale.

Les codes sont ceux du fond de carte (`frontend/src/modules/quiz/monde.json`,
tiré de Natural Earth, domaine public) : un clic sur la carte désigne un
territoire par ce code. Une capitale vide : pas de question sur elle (le pays
reste à placer sur la carte).
"""
from __future__ import annotations

from dataclasses import dataclass

_PAYS = """
AFG|Afghanistan|de l'Afghanistan|Kaboul|Kabul|34.52|69.18
AGO|Angola|de l'Angola|Luanda||-8.84|13.23
ALB|Albanie|de l'Albanie|Tirana||41.33|19.82
AND|Andorre|d'Andorre|Andorre-la-Vieille|Andorra la Vella|42.5|1.52
ARE|Émirats arabes unis|des Émirats arabes unis|Abou Dabi|Abu Dhabi;Abou Dhabi|24.47|54.37
ARG|Argentine|de l'Argentine|Buenos Aires||-34.6|-58.4
ARM|Arménie|de l'Arménie|Erevan|Yerevan|40.18|44.51
ATG|Antigua-et-Barbuda|d'Antigua-et-Barbuda|Saint John's|Saint-Jean|17.12|-61.85
AUS|Australie|de l'Australie|Canberra||-35.28|149.13
AUT|Autriche|de l'Autriche|Vienne|Wien|48.2|16.36
AZE|Azerbaïdjan|de l'Azerbaïdjan|Bakou|Baku|40.4|49.86
BDI|Burundi|du Burundi|Gitega|Bujumbura|-3.43|29.92
BEL|Belgique|de la Belgique|Bruxelles||50.84|4.33
BEN|Bénin|du Bénin|Porto-Novo|Cotonou|6.5|2.6
BFA|Burkina Faso|du Burkina Faso|Ouagadougou||12.37|-1.53
BGD|Bangladesh|du Bangladesh|Dacca|Dhaka|23.73|90.41
BGR|Bulgarie|de la Bulgarie|Sofia||42.69|23.31
BHR|Bahreïn|de Bahreïn|Manama||26.24|50.58
BHS|Bahamas|des Bahamas|Nassau||25.08|-77.35
BIH|Bosnie-Herzégovine|de la Bosnie-Herzégovine|Sarajevo||43.85|18.38
BLR|Biélorussie|de la Biélorussie|Minsk||53.9|27.56
BLZ|Belize|du Belize|Belmopan||17.25|-88.77
BOL|Bolivie|de la Bolivie|Sucre|La Paz|-19.04|-65.26
BRA|Brésil|du Brésil|Brasilia||-15.78|-47.92
BRB|Barbade|de la Barbade|Bridgetown||13.1|-59.62
BRN|Brunei|du Brunei|Bandar Seri Begawan||4.88|114.93
BTN|Bhoutan|du Bhoutan|Thimphou|Thimphu|27.47|89.64
BWA|Botswana|du Botswana|Gaborone||-24.65|25.91
CAF|République centrafricaine|de la République centrafricaine|Bangui||4.37|18.56
CAN|Canada|du Canada|Ottawa||45.42|-75.7
CHE|Suisse|de la Suisse|Berne|Bern|46.92|7.47
CHL|Chili|du Chili|Santiago|Santiago du Chili|-33.45|-70.67
CHN|Chine|de la Chine|Pékin|Beijing|39.93|116.39
CIV|Côte d'Ivoire|de la Côte d'Ivoire|Yamoussoukro||6.82|-5.28
CMR|Cameroun|du Cameroun|Yaoundé||3.87|11.51
COD|République démocratique du Congo|de la République démocratique du Congo|Kinshasa||-4.33|15.31
COG|République du Congo|de la République du Congo|Brazzaville||-4.26|15.28
COL|Colombie|de la Colombie|Bogota|Bogotá|4.6|-74.09
COM|Comores|des Comores|Moroni||-11.7|43.24
CPV|Cap-Vert|du Cap-Vert|Praia||14.92|-23.52
CRI|Costa Rica|du Costa Rica|San José||9.94|-84.09
CUB|Cuba|de Cuba|La Havane|Havane|23.13|-82.37
CYP|Chypre|de Chypre|Nicosie||35.17|33.37
CZE|Tchéquie|de la Tchéquie|Prague|Praha|50.09|14.46
DEU|Allemagne|de l'Allemagne|Berlin||52.52|13.4
DJI|Djibouti|de Djibouti|Djibouti||11.6|43.15
DMA|Dominique|de la Dominique|Roseau||15.3|-61.39
DNK|Danemark|du Danemark|Copenhague|København|55.68|12.56
DOM|République dominicaine|de la République dominicaine|Saint-Domingue|Santo Domingo|18.47|-69.9
DZA|Algérie|de l'Algérie|Alger||36.77|3.05
ECU|Équateur|de l'Équateur|Quito||-0.21|-78.5
EGY|Égypte|de l'Égypte|Le Caire|Caire|30.05|31.25
ERI|Érythrée|de l'Érythrée|Asmara||15.33|38.93
ESP|Espagne|de l'Espagne|Madrid||40.4|-3.69
EST|Estonie|de l'Estonie|Tallinn||59.43|24.73
ETH|Éthiopie|de l'Éthiopie|Addis-Abeba|Addis Ababa|9.04|38.7
FIN|Finlande|de la Finlande|Helsinki||60.18|24.93
FJI|Fidji|des Fidji|Suva||-18.13|178.44
FRA|France|de la France|Paris||48.87|2.33
FSM|Micronésie|de la Micronésie|Palikir||6.92|158.15
GAB|Gabon|du Gabon|Libreville||0.39|9.46
GBR|Royaume-Uni|du Royaume-Uni|Londres|London|51.5|-0.12
GEO|Géorgie|de la Géorgie|Tbilissi|Tbilisi|41.73|44.79
GHA|Ghana|du Ghana|Accra||5.55|-0.22
GIN|Guinée|de la Guinée|Conakry||9.53|-13.68
GMB|Gambie|de la Gambie|Banjul||13.45|-16.59
GNB|Guinée-Bissau|de la Guinée-Bissau|Bissau||11.87|-15.6
GNQ|Guinée équatoriale|de la Guinée équatoriale|Malabo|Ciudad de la Paz|3.75|8.78
GRC|Grèce|de la Grèce|Athènes||37.99|23.73
GRD|Grenade|de la Grenade|Saint George's|Saint-Georges|12.05|-61.74
GTM|Guatemala|du Guatemala|Guatemala|Guatemala City;Ciudad de Guatemala|14.62|-90.53
GUY|Guyana|du Guyana|Georgetown||6.8|-58.17
HND|Honduras|du Honduras|Tegucigalpa||14.1|-87.22
HRV|Croatie|de la Croatie|Zagreb||45.8|16.0
HTI|Haïti|d'Haïti|Port-au-Prince||18.54|-72.34
HUN|Hongrie|de la Hongrie|Budapest||47.5|19.08
IDN|Indonésie|de l'Indonésie|Jakarta|Djakarta;Nusantara|-6.17|106.83
IND|Inde|de l'Inde|New Delhi|Delhi;New Dehli|28.6|77.2
IRL|Irlande|de l'Irlande|Dublin||53.34|-6.25
IRN|Iran|de l'Iran|Téhéran||35.67|51.42
IRQ|Irak|de l'Irak|Bagdad||33.34|44.39
ISL|Islande|de l'Islande|Reykjavik||64.15|-21.95
ISR|Israël|d'Israël|||31.78|35.21
ITA|Italie|de l'Italie|Rome||41.9|12.48
JAM|Jamaïque|de la Jamaïque|Kingston||17.98|-76.77
JOR|Jordanie|de la Jordanie|Amman||31.95|35.93
JPN|Japon|du Japon|Tokyo||35.69|139.75
KAZ|Kazakhstan|du Kazakhstan|Astana|Nour-Soultan|51.18|71.43
KEN|Kenya|du Kenya|Nairobi||-1.28|36.81
KGZ|Kirghizistan|du Kirghizistan|Bichkek|Bishkek|42.88|74.58
KHM|Cambodge|du Cambodge|Phnom Penh||11.55|104.91
KIR|Kiribati|des Kiribati|Tarawa|Tarawa-Sud|1.34|173.02
KNA|Saint-Christophe-et-Niévès|de Saint-Christophe-et-Niévès|Basseterre||17.3|-62.72
KOR|Corée du Sud|de la Corée du Sud|Séoul||37.57|127.0
KWT|Koweït|du Koweït|Koweït|Koweït City;Kuwait City|29.37|47.98
LAO|Laos|du Laos|Vientiane||17.97|102.6
LBN|Liban|du Liban|Beyrouth||33.87|35.51
LBR|Liberia|du Liberia|Monrovia||6.31|-10.8
LBY|Libye|de la Libye|Tripoli||32.89|13.18
LCA|Sainte-Lucie|de Sainte-Lucie|Castries||14.0|-61.0
LIE|Liechtenstein|du Liechtenstein|Vaduz||47.13|9.52
LKA|Sri Lanka|du Sri Lanka|Sri Jayawardenapura Kotte|Kotte;Colombo|6.89|79.9
LSO|Lesotho|du Lesotho|Maseru||-29.32|27.48
LTU|Lituanie|de la Lituanie|Vilnius||54.68|25.32
LUX|Luxembourg|du Luxembourg|Luxembourg||49.61|6.13
LVA|Lettonie|de la Lettonie|Riga||56.95|24.1
MAR|Maroc|du Maroc|Rabat||34.03|-6.84
MCO|Monaco|de Monaco|||43.74|7.41
MDA|Moldavie|de la Moldavie|Chisinau|Kichinev|47.01|28.86
MDG|Madagascar|de Madagascar|Antananarivo|Tananarive|-18.91|47.51
MDV|Maldives|des Maldives|Malé||4.17|73.5
MEX|Mexique|du Mexique|Mexico|Mexico City|19.44|-99.13
MHL|Îles Marshall|des Îles Marshall|Majuro||7.1|171.38
MKD|Macédoine du Nord|de la Macédoine du Nord|Skopje||42.0|21.43
MLI|Mali|du Mali|Bamako||12.65|-8.0
MLT|Malte|de Malte|La Valette|Valletta|35.9|14.51
MMR|Birmanie|de la Birmanie|Naypyidaw|Naypyitaw;Nay Pyi Taw|19.77|96.12
MNE|Monténégro|du Monténégro|Podgorica||42.47|19.27
MNG|Mongolie|de la Mongolie|Oulan-Bator|Oulan Bator;Ulaanbaatar|47.92|106.91
MOZ|Mozambique|du Mozambique|Maputo||-25.95|32.59
MRT|Mauritanie|de la Mauritanie|Nouakchott||18.09|-15.98
MUS|Maurice|de Maurice|Port-Louis||-20.17|57.5
MWI|Malawi|du Malawi|Lilongwe||-13.98|33.78
MYS|Malaisie|de la Malaisie|Kuala Lumpur||3.17|101.7
NAM|Namibie|de la Namibie|Windhoek||-22.57|17.08
NER|Niger|du Niger|Niamey||13.52|2.11
NGA|Nigeria|du Nigeria|Abuja||9.09|7.53
NIC|Nicaragua|du Nicaragua|Managua||12.15|-86.27
NLD|Pays-Bas|des Pays-Bas|Amsterdam||52.35|4.91
NOR|Norvège|de la Norvège|Oslo||59.92|10.75
NPL|Népal|du Népal|Katmandou|Kathmandu|27.72|85.31
NRU|Nauru|de Nauru|||-0.55|166.92
NZL|Nouvelle-Zélande|de la Nouvelle-Zélande|Wellington||-41.3|174.78
OMN|Oman|d'Oman|Mascate|Muscat|23.61|58.59
PAK|Pakistan|du Pakistan|Islamabad||33.7|73.16
PAN|Panama|du Panama|Panama|Panama City|8.97|-79.53
PER|Pérou|du Pérou|Lima||-12.05|-77.05
PHL|Philippines|des Philippines|Manille|Manila|14.61|120.98
PLW|Palaos|des Palaos|Ngerulmud|Melekeok|7.49|134.63
PNG|Papouasie-Nouvelle-Guinée|de la Papouasie-Nouvelle-Guinée|Port Moresby||-9.46|147.19
POL|Pologne|de la Pologne|Varsovie||52.25|21.0
PRK|Corée du Nord|de la Corée du Nord|Pyongyang||39.02|125.75
PRT|Portugal|du Portugal|Lisbonne||38.72|-9.15
PRY|Paraguay|du Paraguay|Asuncion|Asunción|-25.29|-57.64
QAT|Qatar|du Qatar|Doha||25.29|51.53
ROU|Roumanie|de la Roumanie|Bucarest||44.44|26.1
RUS|Russie|de la Russie|Moscou||55.75|37.61
RWA|Rwanda|du Rwanda|Kigali||-1.95|30.06
SAU|Arabie saoudite|de l'Arabie saoudite|Riyad|Riyadh|24.64|46.77
SDN|Soudan|du Soudan|Khartoum||15.59|32.53
SDS|Soudan du Sud|du Soudan du Sud|Djouba|Juba|4.85|31.58
SEN|Sénégal|du Sénégal|Dakar||14.72|-17.48
SGP|Singapour|de Singapour|||1.29|103.85
SLB|Îles Salomon|des Îles Salomon|Honiara||-9.44|159.95
SLE|Sierra Leone|de la Sierra Leone|Freetown||8.47|-13.24
SLV|Salvador|du Salvador|San Salvador||13.71|-89.2
SMR|Saint-Marin|de Saint-Marin|||43.94|12.44
SOM|Somalie|de la Somalie|Mogadiscio|Mogadishu|2.07|45.36
SRB|Serbie|de la Serbie|Belgrade||44.82|20.47
STP|Sao Tomé-et-Principe|de Sao Tomé-et-Principe|Sao Tomé|São Tomé|0.33|6.73
SUR|Suriname|du Suriname|Paramaribo||5.84|-55.17
SVK|Slovaquie|de la Slovaquie|Bratislava||48.15|17.12
SVN|Slovénie|de la Slovénie|Ljubljana||46.06|14.51
SWE|Suède|de la Suède|Stockholm||59.35|18.1
SWZ|Eswatini|de l'Eswatini|Mbabane|Lobamba|-26.32|31.13
SYC|Seychelles|des Seychelles|Victoria||-4.62|55.45
SYR|Syrie|de la Syrie|Damas||33.5|36.3
TCD|Tchad|du Tchad|N'Djamena|Ndjamena|12.12|15.05
TGO|Togo|du Togo|Lomé||6.13|1.22
THA|Thaïlande|de la Thaïlande|Bangkok||13.75|100.51
TJK|Tadjikistan|du Tadjikistan|Douchanbé|Dushanbe|38.56|68.77
TKM|Turkménistan|du Turkménistan|Achgabat|Ashgabat|37.95|58.38
TLS|Timor oriental|du Timor oriental|Dili||-8.56|125.58
TON|Tonga|des Tonga|Nuku'alofa||-21.14|-175.22
TTO|Trinité-et-Tobago|de Trinité-et-Tobago|Port-d'Espagne|Port of Spain|10.65|-61.52
TUN|Tunisie|de la Tunisie|Tunis||36.8|10.18
TUR|Turquie|de la Turquie|Ankara||39.93|32.86
TUV|Tuvalu|des Tuvalu|Funafuti||-8.52|179.22
TZA|Tanzanie|de la Tanzanie|Dodoma|Dar es Salaam|-6.17|35.74
UGA|Ouganda|de l'Ouganda|Kampala||0.32|32.58
UKR|Ukraine|de l'Ukraine|Kiev|Kyiv;Kiyv|50.44|30.51
URY|Uruguay|de l'Uruguay|Montevideo||-34.86|-56.17
USA|États-Unis|des États-Unis|Washington|Washington DC|38.9|-77.01
UZB|Ouzbékistan|de l'Ouzbékistan|Tachkent|Tashkent|41.31|69.29
VAT|Vatican|du Vatican|||41.9|12.45
VCT|Saint-Vincent-et-les-Grenadines|de Saint-Vincent-et-les-Grenadines|Kingstown||13.15|-61.21
VEN|Venezuela|du Venezuela|Caracas||10.5|-66.92
VNM|Viêt Nam|du Viêt Nam|Hanoï||21.04|105.85
VUT|Vanuatu|du Vanuatu|Port-Vila||-17.73|168.32
WSM|Samoa|des Samoa|Apia||-13.84|-171.74
YEM|Yémen|du Yémen|Sanaa||15.36|44.2
ZAF|Afrique du Sud|de l'Afrique du Sud|Pretoria|Le Cap;Bloemfontein;Tshwane|-25.7|28.23
ZMB|Zambie|de la Zambie|Lusaka||-15.41|28.28
ZWE|Zimbabwe|du Zimbabwe|Harare||-17.82|31.04
"""

# Territoires du fond de carte rattachés à un pays pour la correction.
ALIAS = {'SOL': 'SOM', 'CYN': 'CYP', 'KAS': 'IND'}

# Pays trop petits pour viser juste : un point à moins de `RAYON_PETIT` km
# de leur capitale compte.
PETITS = {
    'AND', 'ATG', 'BHR', 'BRB', 'BRN', 'COM', 'CPV', 'DMA', 'FSM', 'GRD',
    'KIR', 'KNA', 'LCA', 'LIE', 'LUX', 'MCO', 'MDV', 'MHL', 'MLT', 'MUS',
    'NRU', 'PLW', 'SGP', 'SLB', 'SMR', 'STP', 'SYC', 'TON', 'TTO', 'TUV',
    'VAT', 'VCT', 'VUT', 'WSM', 'CYP', 'BHS',
}
RAYON_PETIT = 120


@dataclass(frozen=True)
class Pays:
    code: str
    nom: str
    de: str
    capitale: str
    variantes: tuple[str, ...]
    lat: float
    lon: float


def _lire() -> dict[str, Pays]:
    pays = {}
    for ligne in _PAYS.strip().splitlines():
        code, nom, de, cap, variantes, lat, lon = ligne.split('|')
        pays[code] = Pays(code, nom, de, cap,
                          tuple(v for v in variantes.split(';') if v),
                          float(lat), float(lon))
    return pays


PAYS: dict[str, Pays] = _lire()
