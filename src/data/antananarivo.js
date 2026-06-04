/**
 * antananarivo.js — Base de données des lieux d'Antananarivo
 * ─────────────────────────────────────────────────────────────
 * Catégories :
 *   quartier   🏘️  Quartiers / fokontany
 *   marche     🛒  Marchés
 *   hopital    🏥  Hôpitaux / cliniques
 *   universite 🎓  Universités / grandes écoles
 *   commerce   🏬  Centres commerciaux / supermarchés
 *   carburant  ⛽  Stations-service
 *   arret      🚌  Arrêts de bus / gares routières
 *   repere     📍  Points de repère notables
 *   hotel      🏨  Hôtels
 */

export const TYPES = {
  quartier:   { icon: '🏘️', label: 'Quartier',       color: '#6366f1' },
  marche:     { icon: '🛒', label: 'Marché',          color: '#f59e0b' },
  hopital:    { icon: '🏥', label: 'Hôpital',         color: '#ef4444' },
  universite: { icon: '🎓', label: 'Université',      color: '#8b5cf6' },
  commerce:   { icon: '🏬', label: 'Commerce',        color: '#10b981' },
  carburant:  { icon: '⛽', label: 'Station-service',  color: '#f97316' },
  arret:      { icon: '🚌', label: 'Arrêt / Gare',    color: '#3b82f6' },
  taxi_be:    { icon: '🚐', label: 'Arrêt taxi-be',   color: '#0ea5e9' },
  carrefour:  { icon: '🔀', label: 'Carrefour',       color: '#64748b' },
  route:      { icon: '🛣️', label: 'Route principale', color: '#78716c' },
  repere:     { icon: '📍', label: 'Repère',           color: '#ec4899' },
  hotel:      { icon: '🏨', label: 'Hôtel',           color: '#14b8a6' },
}

// ─────────────────────────────────────────────────────────────
// QUARTIERS & FOKONTANY
// ─────────────────────────────────────────────────────────────
const QUARTIERS = [
  // ── Arrondissement I (Analakely / Centre-ville) ──
  { id: 'analakely',        name: 'Analakely',           lat: -18.9167, lng: 47.5358, type: 'quartier', arr: 1 },
  { id: 'tsaralalana',      name: 'Tsaralalàna',         lat: -18.9108, lng: 47.5258, type: 'quartier', arr: 1 },
  { id: 'antanimena',       name: 'Antanimena',          lat: -18.9175, lng: 47.5415, type: 'quartier', arr: 1 },
  { id: 'ambohijatovo',     name: 'Ambohijatovo',        lat: -18.9185, lng: 47.5372, type: 'quartier', arr: 1 },
  { id: 'ambodivona',       name: 'Ambodivona',          lat: -18.9220, lng: 47.5345, type: 'quartier', arr: 1 },
  { id: 'tsiadana',         name: 'Tsiadana',            lat: -18.9148, lng: 47.5298, type: 'quartier', arr: 1 },
  { id: 'faravohitra',      name: 'Faravohitra',         lat: -18.9082, lng: 47.5388, type: 'quartier', arr: 1 },
  { id: 'andohalo',         name: 'Andohalo',            lat: -18.9225, lng: 47.5358, type: 'quartier', arr: 1 },
  { id: 'tsiazotafo',       name: 'Tsiazotafo',          lat: -18.9128, lng: 47.5292, type: 'quartier', arr: 1 },

  // ── Arrondissement II (Ouest) ──
  { id: 'isotry',           name: 'Isotry',              lat: -18.9256, lng: 47.5188, type: 'quartier', arr: 2 },
  { id: 'anosibe',          name: 'Anosibe',             lat: -18.9335, lng: 47.5178, type: 'quartier', arr: 2 },
  { id: 'ampefiloha',       name: 'Ampefiloha',          lat: -18.9248, lng: 47.5370, type: 'quartier', arr: 2 },
  { id: 'ankadivato',       name: 'Ankadivato',          lat: -18.9352, lng: 47.5212, type: 'quartier', arr: 2 },
  { id: 'ankadifotsy',      name: 'Ankadifotsy',         lat: -18.9348, lng: 47.5268, type: 'quartier', arr: 2 },
  { id: 'ambanidia',        name: 'Ambanidia',           lat: -18.9212, lng: 47.5388, type: 'quartier', arr: 2 },
  { id: '67ha',             name: '67 Ha',               lat: -18.9442, lng: 47.5382, type: 'quartier', arr: 2 },
  { id: 'mahamasina',       name: 'Mahamasina',          lat: -18.9298, lng: 47.5352, type: 'quartier', arr: 2 },
  { id: 'anosy',            name: 'Anosy',               lat: -18.9295, lng: 47.5418, type: 'quartier', arr: 2 },
  { id: 'ankaditapaka',     name: 'Ankaditapaka',        lat: -18.9355, lng: 47.5442, type: 'quartier', arr: 2 },
  { id: 'manjakaray',       name: 'Manjakaray',          lat: -18.9280, lng: 47.5280, type: 'quartier', arr: 2 },

  // ── Arrondissement III (Nord) ──
  { id: 'behoririka',       name: 'Behoririka',          lat: -18.9215, lng: 47.5312, type: 'quartier', arr: 3 },
  { id: 'ankorondrano',     name: 'Ankorondrano',        lat: -18.9022, lng: 47.5382, type: 'quartier', arr: 3 },
  { id: 'andravoahangy',    name: 'Andravoahangy',       lat: -18.9038, lng: 47.5432, type: 'quartier', arr: 3 },
  { id: 'ankadifotsy_nord', name: 'Ankadifotsy Nord',    lat: -18.8998, lng: 47.5298, type: 'quartier', arr: 3 },
  { id: 'ambohibe',         name: 'Ambohibe',            lat: -18.8752, lng: 47.5558, type: 'quartier', arr: 3 },
  { id: 'ivandry',          name: 'Ivandry',             lat: -18.8952, lng: 47.5522, type: 'quartier', arr: 3 },
  { id: 'ambatobe',         name: 'Ambatobe',            lat: -18.8805, lng: 47.5332, type: 'quartier', arr: 3 },
  { id: 'ambohipo',         name: 'Ambohipo',            lat: -18.8802, lng: 47.5452, type: 'quartier', arr: 3 },
  { id: 'ambodimita',       name: 'Ambodimita',          lat: -18.8880, lng: 47.5480, type: 'quartier', arr: 3 },
  { id: 'soavimasoandro',   name: 'Soavimasoandro',      lat: -18.9698, lng: 47.5102, type: 'quartier', arr: 3 },
  { id: 'sabotsy_namehana', name: 'Sabotsy Namehana',    lat: -18.8498, lng: 47.5682, type: 'quartier', arr: 3 },
  { id: 'ambohitrarahaba',  name: 'Ambohitrarahaba',     lat: -18.9002, lng: 47.4902, type: 'quartier', arr: 3 },

  // ── Arrondissement IV (Ouest-Centre) ──
  { id: 'ambohimanarina',   name: 'Ambohimanarina',      lat: -18.9102, lng: 47.4982, type: 'quartier', arr: 4 },
  { id: 'itaosy',           name: 'Itaosy',              lat: -18.9598, lng: 47.4902, type: 'quartier', arr: 4 },
  { id: 'andoharanofotsy',  name: 'Andoharanofotsy',     lat: -18.9848, lng: 47.5198, type: 'quartier', arr: 4 },
  { id: 'ankadimbahoaka',   name: 'Ankadimbahoaka',      lat: -18.9502, lng: 47.5352, type: 'quartier', arr: 4 },
  { id: 'tanjombato',       name: 'Tanjombato',          lat: -18.9598, lng: 47.5352, type: 'quartier', arr: 4 },
  { id: 'mandroseza',       name: 'Mandroseza',          lat: -18.9752, lng: 47.5152, type: 'quartier', arr: 4 },
  { id: 'alasora',          name: 'Alasora',             lat: -18.9798, lng: 47.5402, type: 'quartier', arr: 4 },
  { id: 'ampasika',         name: 'Ampasika',            lat: -18.9620, lng: 47.5280, type: 'quartier', arr: 4 },
  { id: 'anosizato',        name: 'Anosizato',           lat: -18.9650, lng: 47.5280, type: 'quartier', arr: 4 },
  { id: 'manandriana',      name: 'Manandriana',         lat: -18.9548, lng: 47.5058, type: 'quartier', arr: 4 },

  // ── Arrondissement V (Nord-Ouest) ──
  { id: 'ambohidratrimo',   name: 'Ambohidratrimo',      lat: -18.7702, lng: 47.4802, type: 'quartier', arr: 5 },
  { id: 'imerintsiatosika', name: 'Imerintsiatosika',    lat: -18.8102, lng: 47.4602, type: 'quartier', arr: 5 },
  { id: 'talatamaty',       name: 'Talatamaty',          lat: -18.8502, lng: 47.4952, type: 'quartier', arr: 5 },
  { id: 'ivato',            name: 'Ivato',               lat: -18.8002, lng: 47.4782, type: 'quartier', arr: 5 },
  { id: 'ambohimanga',      name: 'Ambohimanga',         lat: -18.7502, lng: 47.4802, type: 'quartier', arr: 5 },

  // ── Arrondissement VI (Sud-Est) ──
  { id: 'bongatsara',       name: 'Bongatsara',          lat: -18.9982, lng: 47.5502, type: 'quartier', arr: 6 },
  { id: 'ambohimalaza',     name: 'Ambohimalaza',        lat: -19.0102, lng: 47.5702, type: 'quartier', arr: 6 },
]

// ─────────────────────────────────────────────────────────────
// MARCHÉS
// ─────────────────────────────────────────────────────────────
const MARCHES = [
  { id: 'mkt_analakely',     name: 'Marché Analakely',          lat: -18.9167, lng: 47.5352, type: 'marche' },
  { id: 'mkt_anosibe',       name: 'Marché Anosibe',            lat: -18.9328, lng: 47.5175, type: 'marche' },
  { id: 'mkt_andravoahangy', name: 'Marché Andravoahangy',      lat: -18.9042, lng: 47.5435, type: 'marche' },
  { id: 'mkt_isotry',        name: 'Marché Isotry',             lat: -18.9258, lng: 47.5185, type: 'marche' },
  { id: 'mkt_67ha',          name: 'Marché 67 Ha',              lat: -18.9445, lng: 47.5375, type: 'marche' },
  { id: 'mkt_antaninarenina',name: 'Marché Antaninarenina',     lat: -18.9148, lng: 47.5368, type: 'marche' },
  { id: 'mkt_sabotsy',       name: 'Sabotsy (marché du samedi)',lat: -18.8500, lng: 47.5682, type: 'marche' },
  { id: 'mkt_tanjombato',    name: 'Marché Tanjombato',         lat: -18.9595, lng: 47.5345, type: 'marche' },
  { id: 'mkt_ambohipo',      name: 'Marché Ambohipo',           lat: -18.8808, lng: 47.5448, type: 'marche' },
]

// ─────────────────────────────────────────────────────────────
// HÔPITAUX / CLINIQUES
// ─────────────────────────────────────────────────────────────
const HOPITAUX = [
  { id: 'chu_jra',          name: 'CHU JRA (Hôp. Joseph Ravoahangy)', lat: -18.9248, lng: 47.5378, type: 'hopital' },
  { id: 'hc_befelatanana',  name: 'Hôpital Befelatanana',             lat: -18.9195, lng: 47.5382, type: 'hopital' },
  { id: 'hc_androva',       name: 'Hôpital Androva',                  lat: -18.9202, lng: 47.5162, type: 'hopital' },
  { id: 'hc_manarapenitra', name: 'Hôpital Manarapenitra',            lat: -18.9098, lng: 47.5478, type: 'hopital' },
  { id: 'clinique_adv',     name: 'Clinique Adventiste',              lat: -18.8998, lng: 47.5318, type: 'hopital' },
  { id: 'clinique_ampefiloha', name: 'Clinique Ampefiloha',           lat: -18.9245, lng: 47.5368, type: 'hopital' },
  { id: 'hopital_joseph',   name: 'Hôpital Joseph',                   lat: -18.9055, lng: 47.5322, type: 'hopital' },
  { id: 'polyclinique_ilafy',name: 'Polyclinique d\'Ilafy',           lat: -18.8650, lng: 47.5550, type: 'hopital' },
  { id: 'pharmacie_analakely',name: 'Pharmacie Analakely',            lat: -18.9165, lng: 47.5355, type: 'hopital' },
]

// ─────────────────────────────────────────────────────────────
// UNIVERSITÉS / GRANDES ÉCOLES
// ─────────────────────────────────────────────────────────────
const UNIVERSITES = [
  { id: 'univ_tana',    name: 'Université d\'Antananarivo',       lat: -18.9062, lng: 47.5372, type: 'universite' },
  { id: 'ens_tana',     name: 'ENS (École Normale Supérieure)',   lat: -18.9068, lng: 47.5382, type: 'universite' },
  { id: 'inscae',       name: 'INSCAE',                           lat: -18.9228, lng: 47.5392, type: 'universite' },
  { id: 'ist_tana',     name: 'IST (Institut Sup. Technologie)',  lat: -18.9098, lng: 47.5298, type: 'universite' },
  { id: 'essca_tana',   name: 'ESSCA Madagascar',                 lat: -18.9022, lng: 47.5388, type: 'universite' },
  { id: 'cite_univ',    name: 'Cité Universitaire',               lat: -18.9058, lng: 47.5362, type: 'universite' },
  { id: 'enam',         name: 'ENAM (École Nationale Admin.)',    lat: -18.9215, lng: 47.5395, type: 'universite' },
  { id: 'efmg',         name: 'EFMG (Fac. Médecine)',             lat: -18.9058, lng: 47.5365, type: 'universite' },
]

// ─────────────────────────────────────────────────────────────
// CENTRES COMMERCIAUX / SUPERMARCHÉS
// ─────────────────────────────────────────────────────────────
const COMMERCES = [
  { id: 'shoprite_ankorondrano', name: 'Shoprite Ankorondrano',        lat: -18.9018, lng: 47.5385, type: 'commerce' },
  { id: 'jumbo_behoririka',      name: 'Jumbo Score Behoririka',       lat: -18.9212, lng: 47.5292, type: 'commerce' },
  { id: 'leader_ivandry',        name: 'Leader Price Ivandry',         lat: -18.8948, lng: 47.5502, type: 'commerce' },
  { id: 'starlite_ankorondrano', name: 'Starlite Ankorondrano',        lat: -18.9025, lng: 47.5395, type: 'commerce' },
  { id: 'cap_masoandro',         name: 'Cap Masoandro (Tanjombato)',   lat: -18.9598, lng: 47.5362, type: 'commerce' },
  { id: 'galerie_analakely',     name: 'Galerie Analakely',            lat: -18.9162, lng: 47.5358, type: 'commerce' },
  { id: 'city_sport',            name: 'City Sport Ankorondrano',      lat: -18.9020, lng: 47.5390, type: 'commerce' },
  { id: 'apollo_behoririka',     name: 'Supermarché Apollo',           lat: -18.9218, lng: 47.5305, type: 'commerce' },
  { id: 'hypermarket_ankorondrano', name: 'Hypermarché Ankorondrano',  lat: -18.9015, lng: 47.5388, type: 'commerce' },
  { id: 'mall_ambatobe',         name: 'Ambatobe Shopping',            lat: -18.8802, lng: 47.5338, type: 'commerce' },
]

// ─────────────────────────────────────────────────────────────
// STATIONS-SERVICE
// ─────────────────────────────────────────────────────────────
const CARBURANTS = [
  { id: 'total_ankorondrano',  name: 'Total Ankorondrano',           lat: -18.9015, lng: 47.5392, type: 'carburant' },
  { id: 'total_mahamasina',    name: 'Total Mahamasina',             lat: -18.9312, lng: 47.5358, type: 'carburant' },
  { id: 'total_ivandry',       name: 'Total Ivandry',                lat: -18.8958, lng: 47.5518, type: 'carburant' },
  { id: 'total_tanjombato',    name: 'Total Tanjombato',             lat: -18.9595, lng: 47.5358, type: 'carburant' },
  { id: 'shell_analakely',     name: 'Shell Analakely',              lat: -18.9152, lng: 47.5342, type: 'carburant' },
  { id: 'shell_67ha',          name: 'Shell 67 Ha',                  lat: -18.9448, lng: 47.5378, type: 'carburant' },
  { id: 'shell_andravoahangy', name: 'Shell Andravoahangy',          lat: -18.9035, lng: 47.5438, type: 'carburant' },
  { id: 'jovenna_behoririka',  name: 'Jovenna Behoririka',           lat: -18.9218, lng: 47.5298, type: 'carburant' },
  { id: 'galana_isotry',       name: 'Galana Isotry',                lat: -18.9262, lng: 47.5182, type: 'carburant' },
  { id: 'engen_ankadifotsy',   name: 'Engen Ankadifotsy',            lat: -18.9345, lng: 47.5265, type: 'carburant' },
]

// ─────────────────────────────────────────────────────────────
// ARRÊTS DE BUS / GARES ROUTIÈRES
// ─────────────────────────────────────────────────────────────
const ARRETS = [
  { id: 'gare_soarano',        name: 'Gare Soarano (Taxi-brousse)',  lat: -18.9098, lng: 47.5178, type: 'arret' },
  { id: 'arret_behoririka',    name: 'Terminus Behoririka',          lat: -18.9218, lng: 47.5308, type: 'arret' },
  { id: 'arret_analakely',     name: 'Arrêt Analakely (Centre)',     lat: -18.9168, lng: 47.5362, type: 'arret' },
  { id: 'arret_anosibe',       name: 'Terminus Anosibe',             lat: -18.9332, lng: 47.5178, type: 'arret' },
  { id: 'arret_andravoahangy', name: 'Terminus Andravoahangy',       lat: -18.9042, lng: 47.5432, type: 'arret' },
  { id: 'gare_ampasapito',     name: 'Gare routière Ampasapito',     lat: -18.9152, lng: 47.5208, type: 'arret' },
  { id: 'arret_67ha',          name: 'Terminus 67 Ha',               lat: -18.9445, lng: 47.5382, type: 'arret' },
  { id: 'arret_tanjombato',    name: 'Terminus Tanjombato',          lat: -18.9598, lng: 47.5348, type: 'arret' },
  { id: 'arret_ivandry',       name: 'Arrêt Ivandry',                lat: -18.8955, lng: 47.5518, type: 'arret' },
  { id: 'arret_mahamasina',    name: 'Arrêt Mahamasina (Stade)',     lat: -18.9288, lng: 47.5348, type: 'arret' },
]

// ─────────────────────────────────────────────────────────────
// POINTS DE REPÈRE NOTABLES
// ─────────────────────────────────────────────────────────────
const REPERES = [
  { id: 'rova',              name: 'Rova (Palais de la Reine)',   lat: -18.9228, lng: 47.5355, type: 'repere' },
  { id: 'palais_pres',       name: 'Palais Présidentiel',         lat: -18.9195, lng: 47.5362, type: 'repere' },
  { id: 'lac_anosy',         name: 'Lac Anosy',                   lat: -18.9292, lng: 47.5418, type: 'repere' },
  { id: 'stade_mahamasina',  name: 'Stade de Mahamasina',         lat: -18.9285, lng: 47.5348, type: 'repere' },
  { id: 'aeroport_ivato',    name: 'Aéroport d\'Ivato',           lat: -18.7972, lng: 47.4782, type: 'repere' },
  { id: 'place_hira',        name: 'Place du 13 Mai',             lat: -18.9178, lng: 47.5362, type: 'repere' },
  { id: 'hotel_ville',       name: 'Hôtel de Ville (Commune)',    lat: -18.9168, lng: 47.5352, type: 'repere' },
  { id: 'cathedrale',        name: 'Cathédrale Ambohimanoro',     lat: -18.9185, lng: 47.5368, type: 'repere' },
  { id: 'alliance_fr',       name: 'Alliance Française',          lat: -18.9008, lng: 47.5382, type: 'repere' },
  { id: 'ambassade_fr',      name: 'Ambassade de France',         lat: -18.9152, lng: 47.5402, type: 'repere' },
  { id: 'bank_bfv',          name: 'BFV-SG Analakely',            lat: -18.9162, lng: 47.5355, type: 'repere' },
  { id: 'bank_boa',          name: 'BOA Analakely',               lat: -18.9165, lng: 47.5358, type: 'repere' },
  { id: 'telma',             name: 'Siège TELMA',                 lat: -18.9025, lng: 47.5388, type: 'repere' },
  { id: 'cnaps',             name: 'CNAPS Ampandrianomby',        lat: -18.9118, lng: 47.5428, type: 'repere' },
  { id: 'paositra',          name: 'Paositra Malagasy (Poste)',   lat: -18.9158, lng: 47.5348, type: 'repere' },
]

// ─────────────────────────────────────────────────────────────
// HÔTELS
// ─────────────────────────────────────────────────────────────
const HOTELS = [
  { id: 'carlton',          name: 'Hôtel Carlton Anosy',          lat: -18.9295, lng: 47.5422, type: 'hotel' },
  { id: 'colbert',          name: 'Hôtel Colbert',                lat: -18.9202, lng: 47.5392, type: 'hotel' },
  { id: 'radisson_tana',    name: 'Radisson Blu Antananarivo',    lat: -18.9018, lng: 47.5388, type: 'hotel' },
  { id: 'ibis_ankorondrano',name: 'ibis Styles Ankorondrano',     lat: -18.9022, lng: 47.5385, type: 'hotel' },
  { id: 'sakamanga',        name: 'Hôtel Sakamanga',              lat: -18.9148, lng: 47.5392, type: 'hotel' },
  { id: 'sunny',            name: 'Hôtel Sunny',                  lat: -18.9168, lng: 47.5362, type: 'hotel' },
]

// ─────────────────────────────────────────────────────────────
// ARRÊTS TAXI-BE — sur les routes principales
// ─────────────────────────────────────────────────────────────
const TAXI_BE = [
  // ── Ligne centre ↔ Andravoahangy (corridor NE) ──
  { id: 'tb_andravoahangy_1',   name: 'Taxi-be Andravoahangy Centre',      lat: -18.9048, lng: 47.5428, type: 'taxi_be' },
  { id: 'tb_andravoahangy_2',   name: 'Taxi-be Andravoahangy Marché',      lat: -18.9038, lng: 47.5440, type: 'taxi_be' },
  { id: 'tb_ambohibao',         name: 'Taxi-be Ambohibao',                  lat: -18.8968, lng: 47.5508, type: 'taxi_be' },
  { id: 'tb_sabotsy_1',         name: 'Taxi-be Sabotsy Carrefour',          lat: -18.8488, lng: 47.5668, type: 'taxi_be' },
  { id: 'tb_ambohibe_1',        name: 'Taxi-be Ambohibe Entrée',            lat: -18.8778, lng: 47.5548, type: 'taxi_be' },
  // ── Ligne centre ↔ Ivandry (corridor N) ──
  { id: 'tb_ivandry_1',         name: 'Taxi-be Ivandry Carrefour',          lat: -18.8958, lng: 47.5508, type: 'taxi_be' },
  { id: 'tb_ivandry_2',         name: 'Taxi-be Ivandry Mairie',             lat: -18.8928, lng: 47.5525, type: 'taxi_be' },
  { id: 'tb_ambatobe_1',        name: 'Taxi-be Ambatobe Entrée',            lat: -18.8828, lng: 47.5328, type: 'taxi_be' },
  { id: 'tb_ambohipo_1',        name: 'Taxi-be Ambohipo Carrefour',         lat: -18.8818, lng: 47.5448, type: 'taxi_be' },
  // ── Ligne centre ↔ Ankorondrano (corridor N) ──
  { id: 'tb_ankorondrano_1',    name: 'Taxi-be Ankorondrano Shoprite',      lat: -18.9008, lng: 47.5378, type: 'taxi_be' },
  { id: 'tb_ankorondrano_2',    name: 'Taxi-be Ankorondrano Grand Hôtel',   lat: -18.9028, lng: 47.5395, type: 'taxi_be' },
  { id: 'tb_ankadivato_1',      name: 'Taxi-be Ankadivato RN4',             lat: -18.9118, lng: 47.5178, type: 'taxi_be' },
  // ── Ligne centre ↔ Tanjombato (corridor S) ──
  { id: 'tb_tanjombato_1',      name: 'Taxi-be Tanjombato Marché',          lat: -18.9588, lng: 47.5358, type: 'taxi_be' },
  { id: 'tb_tanjombato_2',      name: 'Taxi-be Tanjombato Cap Masoandro',   lat: -18.9608, lng: 47.5368, type: 'taxi_be' },
  { id: 'tb_ankadimbahoaka_1',  name: 'Taxi-be Ankadimbahoaka Entrée',      lat: -18.9488, lng: 47.5348, type: 'taxi_be' },
  { id: 'tb_anosizato_1',       name: 'Taxi-be Anosizato Carrefour',        lat: -18.9638, lng: 47.5288, type: 'taxi_be' },
  // ── Ligne centre ↔ Itaosy (corridor SW) ──
  { id: 'tb_itaosy_1',          name: 'Taxi-be Itaosy Carrefour',           lat: -18.9568, lng: 47.4918, type: 'taxi_be' },
  { id: 'tb_itaosy_2',          name: 'Taxi-be Itaosy Marché',              lat: -18.9588, lng: 47.4888, type: 'taxi_be' },
  { id: 'tb_ambohimanarina_1',  name: 'Taxi-be Ambohimanarina Rue',         lat: -18.9118, lng: 47.4998, type: 'taxi_be' },
  // ── Ligne centre ↔ Anosibe / 67Ha (corridor SW) ──
  { id: 'tb_anosibe_1',         name: 'Taxi-be Anosibe Terminus',           lat: -18.9338, lng: 47.5168, type: 'taxi_be' },
  { id: 'tb_67ha_1',            name: 'Taxi-be 67 Ha Terminus',             lat: -18.9438, lng: 47.5378, type: 'taxi_be' },
  { id: 'tb_67ha_2',            name: 'Taxi-be 67 Ha Marché',               lat: -18.9458, lng: 47.5368, type: 'taxi_be' },
  { id: 'tb_mahamasina_1',      name: 'Taxi-be Mahamasina Stade',           lat: -18.9288, lng: 47.5348, type: 'taxi_be' },
  { id: 'tb_ankadifotsy_1',     name: 'Taxi-be Ankadifotsy Carrefour',      lat: -18.9338, lng: 47.5258, type: 'taxi_be' },
  // ── Ligne centre ↔ Soavimasoandro ──
  { id: 'tb_soavimasoandro_1',  name: 'Taxi-be Soavimasoandro',             lat: -18.9688, lng: 47.5108, type: 'taxi_be' },
  { id: 'tb_alasora_1',         name: 'Taxi-be Alasora Entrée',             lat: -18.9778, lng: 47.5388, type: 'taxi_be' },
  // ── Ligne centre ↔ Analakely (cœur) ──
  { id: 'tb_analakely_centre',  name: 'Taxi-be Analakely Place',            lat: -18.9158, lng: 47.5355, type: 'taxi_be' },
  { id: 'tb_behoririka_1',      name: 'Taxi-be Behoririka Terminus',        lat: -18.9208, lng: 47.5308, type: 'taxi_be' },
  { id: 'tb_tsaralalana_1',     name: 'Taxi-be Tsaralalàna Avenue',         lat: -18.9118, lng: 47.5268, type: 'taxi_be' },
  // ── Taxi-be Ambohidratrimo (route N) ──
  { id: 'tb_talatamaty_1',      name: 'Taxi-be Talatamaty Carrefour',       lat: -18.8508, lng: 47.4948, type: 'taxi_be' },
  { id: 'tb_ambohidratrimo_1',  name: 'Taxi-be Ambohidratrimo Centre',      lat: -18.7718, lng: 47.4818, type: 'taxi_be' },
  { id: 'tb_ivato_1',           name: 'Taxi-be Ivato Aéroport',             lat: -18.7988, lng: 47.4798, type: 'taxi_be' },
  // ── Arrêts intermédiaires courants ──
  { id: 'tb_ampasapito',        name: 'Taxi-be Ampasapito Gare',            lat: -18.9148, lng: 47.5198, type: 'taxi_be' },
  { id: 'tb_ampitatafika',      name: 'Taxi-be Ampitatafika',               lat: -18.9888, lng: 47.5458, type: 'taxi_be' },
  { id: 'tb_andoharanofotsy_1', name: 'Taxi-be Andoharanofotsy',            lat: -18.9838, lng: 47.5188, type: 'taxi_be' },
  { id: 'tb_bongatsara_1',      name: 'Taxi-be Bongatsara Carrefour',       lat: -18.9978, lng: 47.5488, type: 'taxi_be' },
]

// ─────────────────────────────────────────────────────────────
// CARREFOURS — intersections principales accessibles moto
// ─────────────────────────────────────────────────────────────
const CARREFOURS = [
  { id: 'cf_analakely',         name: 'Carrefour Analakely',                lat: -18.9162, lng: 47.5355, type: 'carrefour' },
  { id: 'cf_ambanidia',         name: 'Carrefour Ambanidia',                lat: -18.9208, lng: 47.5392, type: 'carrefour' },
  { id: 'cf_antanimena',        name: 'Carrefour Antanimena',               lat: -18.9178, lng: 47.5408, type: 'carrefour' },
  { id: 'cf_tsaralalana',       name: 'Carrefour Tsaralalàna',              lat: -18.9112, lng: 47.5262, type: 'carrefour' },
  { id: 'cf_ankorondrano',      name: 'Carrefour Ankorondrano',             lat: -18.9018, lng: 47.5388, type: 'carrefour' },
  { id: 'cf_andravoahangy',     name: 'Carrefour Andravoahangy',            lat: -18.9042, lng: 47.5435, type: 'carrefour' },
  { id: 'cf_behoririka',        name: 'Carrefour Behoririka',               lat: -18.9215, lng: 47.5305, type: 'carrefour' },
  { id: 'cf_mahamasina',        name: 'Carrefour Mahamasina Stade',         lat: -18.9282, lng: 47.5348, type: 'carrefour' },
  { id: 'cf_anosy',             name: 'Carrefour Lac Anosy',                lat: -18.9298, lng: 47.5422, type: 'carrefour' },
  { id: 'cf_anosibe',           name: 'Carrefour Anosibe',                  lat: -18.9328, lng: 47.5172, type: 'carrefour' },
  { id: 'cf_ankadifotsy',       name: 'Carrefour Ankadifotsy',              lat: -18.9342, lng: 47.5262, type: 'carrefour' },
  { id: 'cf_67ha',              name: 'Carrefour 67 Ha',                    lat: -18.9445, lng: 47.5375, type: 'carrefour' },
  { id: 'cf_ambohidahy',        name: 'Carrefour Ambohidahy',               lat: -18.9252, lng: 47.5388, type: 'carrefour' },
  { id: 'cf_fanalamanga',       name: 'Carrefour Fanalamanga',              lat: -18.9188, lng: 47.5358, type: 'carrefour' },
  { id: 'cf_ampefiloha',        name: 'Carrefour Ampefiloha',               lat: -18.9242, lng: 47.5365, type: 'carrefour' },
  { id: 'cf_tanjombato',        name: 'Carrefour Tanjombato',               lat: -18.9592, lng: 47.5355, type: 'carrefour' },
  { id: 'cf_ankadimbahoaka',    name: 'Carrefour Ankadimbahoaka',           lat: -18.9498, lng: 47.5348, type: 'carrefour' },
  { id: 'cf_anosizato',         name: 'Carrefour Anosizato',                lat: -18.9648, lng: 47.5275, type: 'carrefour' },
  { id: 'cf_ivandry',           name: 'Carrefour Ivandry',                  lat: -18.8952, lng: 47.5512, type: 'carrefour' },
  { id: 'cf_ambatobe',          name: 'Carrefour Ambatobe',                 lat: -18.8808, lng: 47.5328, type: 'carrefour' },
  { id: 'cf_ambohipo',          name: 'Carrefour Ambohipo',                 lat: -18.8808, lng: 47.5448, type: 'carrefour' },
  { id: 'cf_itaosy',            name: 'Carrefour Itaosy',                   lat: -18.9572, lng: 47.4908, type: 'carrefour' },
  { id: 'cf_ambohimanarina',    name: 'Carrefour Ambohimanarina',           lat: -18.9108, lng: 47.4988, type: 'carrefour' },
  { id: 'cf_isotry',            name: 'Carrefour Isotry',                   lat: -18.9258, lng: 47.5182, type: 'carrefour' },
  { id: 'cf_ankaditapaka',      name: 'Carrefour Ankaditapaka',             lat: -18.9352, lng: 47.5438, type: 'carrefour' },
  { id: 'cf_talatamaty',        name: 'Carrefour Talatamaty RN1',           lat: -18.8512, lng: 47.4942, type: 'carrefour' },
  { id: 'cf_andoharanofotsy',   name: 'Carrefour Andoharanofotsy RN7',      lat: -18.9845, lng: 47.5195, type: 'carrefour' },
  { id: 'cf_bongatsara',        name: 'Carrefour Bongatsara RN2',           lat: -18.9982, lng: 47.5498, type: 'carrefour' },
  { id: 'cf_alasora',           name: 'Carrefour Alasora',                  lat: -18.9788, lng: 47.5395, type: 'carrefour' },
  { id: 'cf_soavimasoandro',    name: 'Carrefour Soavimasoandro',           lat: -18.9692, lng: 47.5095, type: 'carrefour' },
  { id: 'cf_mandroseza',        name: 'Carrefour Mandroseza',               lat: -18.9748, lng: 47.5148, type: 'carrefour' },
  { id: 'cf_sabotsy',           name: 'Carrefour Sabotsy Namehana',         lat: -18.8495, lng: 47.5675, type: 'carrefour' },
  { id: 'cf_ambohitrarahaba',   name: 'Carrefour Ambohitrarahaba',          lat: -18.8998, lng: 47.4895, type: 'carrefour' },
  { id: 'cf_manjakaray',        name: 'Carrefour Manjakaray',               lat: -18.9275, lng: 47.5278, type: 'carrefour' },
  { id: 'cf_faravohitra',       name: 'Carrefour Faravohitra',              lat: -18.9078, lng: 47.5382, type: 'carrefour' },
]

// ─────────────────────────────────────────────────────────────
// ROUTES PRINCIPALES — accès de quartiers sur routes moto
// ─────────────────────────────────────────────────────────────
const ROUTES = [
  // ── RN1 (direction Mahajanga, Nord-Ouest) ──
  { id: 'rn1_pk5',    name: 'RN1 — PK 5 (direction Mahajanga)',       lat: -18.8638, lng: 47.5028, type: 'route' },
  { id: 'rn1_pk8',    name: 'RN1 — PK 8 Ambohidratrimo',              lat: -18.8208, lng: 47.4888, type: 'route' },
  { id: 'rn1_ivato',  name: 'RN1 — Embranchement Ivato',              lat: -18.8008, lng: 47.4778, type: 'route' },
  // ── RN2 (direction Toamasina, Est) ──
  { id: 'rn2_pk5',    name: 'RN2 — PK 5 Bongatsara',                  lat: -18.9988, lng: 47.5518, type: 'route' },
  { id: 'rn2_pk10',   name: 'RN2 — PK 10 Ambohimalaza',               lat: -19.0108, lng: 47.5698, type: 'route' },
  { id: 'rn2_sabotsy',name: 'RN2 — Entrée Sabotsy Namehana',          lat: -18.8518, lng: 47.5658, type: 'route' },
  // ── RN7 (direction Antsirabe, Sud) ──
  { id: 'rn7_pk5',    name: 'RN7 — PK 5 Andoharanofotsy',             lat: -18.9858, lng: 47.5188, type: 'route' },
  { id: 'rn7_pk10',   name: 'RN7 — PK 10 Ambohidratrimo-Atsimo',     lat: -19.0108, lng: 47.5008, type: 'route' },
  // ── Blvd de l'Europe / Route circulaire ──
  { id: 'blvd_europe_n',    name: 'Blvd de l\'Europe Nord',           lat: -18.9025, lng: 47.5328, type: 'route' },
  { id: 'blvd_europe_s',    name: 'Blvd de l\'Europe Sud',            lat: -18.9328, lng: 47.5298, type: 'route' },
  { id: 'rue_rainitovo',    name: 'Rue Rainitovo (Centre)',            lat: -18.9158, lng: 47.5345, type: 'route' },
  { id: 'ave_independance', name: 'Avenue de l\'Indépendance',         lat: -18.9178, lng: 47.5362, type: 'route' },
  { id: 'ave_26juin',       name: 'Avenue du 26 Juin',                 lat: -18.9068, lng: 47.5385, type: 'route' },
  { id: 'route_ivandry',    name: 'Route d\'Ivandry (principale)',     lat: -18.8888, lng: 47.5495, type: 'route' },
  { id: 'route_ambatobe',   name: 'Route d\'Ambatobe',                 lat: -18.8838, lng: 47.5318, type: 'route' },
  { id: 'route_tanjombato', name: 'Route de Tanjombato',               lat: -18.9428, lng: 47.5355, type: 'route' },
  { id: 'route_itaosy',     name: 'Route d\'Itaosy (principale)',      lat: -18.9428, lng: 47.5088, type: 'route' },
  { id: 'route_manjalaza',  name: 'Route Manjalaza',                   lat: -18.9558, lng: 47.5228, type: 'route' },
  { id: 'route_rn3',        name: 'RN3 — Direction Antsirabe',         lat: -18.9748, lng: 47.5168, type: 'route' },
  { id: 'lalana_ranaivo',   name: 'Lalana Dr Ranaivo (Analakely)',     lat: -18.9155, lng: 47.5362, type: 'route' },
]

// ─────────────────────────────────────────────────────────────
// FOKONTANY SUPPLÉMENTAIRES
// ─────────────────────────────────────────────────────────────
const FOKONTANY_SUP = [
  // ── Arrondissement I ──
  { id: 'fkt_amparibe',        name: 'Amparibe',                           lat: -18.9135, lng: 47.5338, type: 'quartier', arr: 1 },
  { id: 'fkt_androhibe',       name: 'Androhibe',                          lat: -18.9148, lng: 47.5418, type: 'quartier', arr: 1 },
  { id: 'fkt_isoraka',         name: 'Isoraka',                            lat: -18.9195, lng: 47.5355, type: 'quartier', arr: 1 },
  { id: 'fkt_namehana',        name: 'Namehana Centre',                    lat: -18.9168, lng: 47.5285, type: 'quartier', arr: 1 },
  { id: 'fkt_ambohijatovo_s',  name: 'Ambohijatovo Atsimo',                lat: -18.9198, lng: 47.5375, type: 'quartier', arr: 1 },
  // ── Arrondissement II ──
  { id: 'fkt_anatihazo',       name: 'Anatihazo',                          lat: -18.9268, lng: 47.5195, type: 'quartier', arr: 2 },
  { id: 'fkt_ambodivona2',     name: 'Ambodivona Atsimo',                  lat: -18.9248, lng: 47.5325, type: 'quartier', arr: 2 },
  { id: 'fkt_tsarahonenana',   name: 'Tsarahonenana',                      lat: -18.9318, lng: 47.5268, type: 'quartier', arr: 2 },
  { id: 'fkt_andranonahoatra', name: 'Andranonahoatra',                    lat: -18.9238, lng: 47.5198, type: 'quartier', arr: 2 },
  { id: 'fkt_andavamamba',     name: 'Andavamamba',                        lat: -18.9368, lng: 47.5348, type: 'quartier', arr: 2 },
  { id: 'fkt_ambolokandrina',  name: 'Ambolokandrina',                     lat: -18.9448, lng: 47.5408, type: 'quartier', arr: 2 },
  { id: 'fkt_manarintsoa',     name: 'Manarintsoa Atsimo',                 lat: -18.9408, lng: 47.5215, type: 'quartier', arr: 2 },
  // ── Arrondissement III ──
  { id: 'fkt_ambodirano',      name: 'Ambodirano',                         lat: -18.8938, lng: 47.5368, type: 'quartier', arr: 3 },
  { id: 'fkt_anjanahary',      name: 'Anjanahary',                         lat: -18.8858, lng: 47.5388, type: 'quartier', arr: 3 },
  { id: 'fkt_ambohijanaka',    name: 'Ambohijanaka',                       lat: -18.9068, lng: 47.5455, type: 'quartier', arr: 3 },
  { id: 'fkt_antanandrano',    name: 'Antanandrano',                       lat: -18.8758, lng: 47.5648, type: 'quartier', arr: 3 },
  { id: 'fkt_ankadimanga',     name: 'Ankadimanga',                        lat: -18.9038, lng: 47.5302, type: 'quartier', arr: 3 },
  { id: 'fkt_ankazomanga',     name: 'Ankazomanga',                        lat: -18.8888, lng: 47.5258, type: 'quartier', arr: 3 },
  { id: 'fkt_ambohijanahy',    name: 'Ambohijanahy',                       lat: -18.9118, lng: 47.5488, type: 'quartier', arr: 3 },
  { id: 'fkt_antehiroka',      name: 'Antehiroka',                         lat: -18.8658, lng: 47.5128, type: 'quartier', arr: 3 },
  { id: 'fkt_ambodivonkely',   name: 'Ambodivonkely',                      lat: -18.8918, lng: 47.5478, type: 'quartier', arr: 3 },
  { id: 'fkt_ankadivoribe',    name: 'Ankadivoribe',                       lat: -18.8728, lng: 47.5508, type: 'quartier', arr: 3 },
  // ── Arrondissement IV ──
  { id: 'fkt_ambatovinaky',    name: 'Ambatovinaky',                       lat: -18.9558, lng: 47.5318, type: 'quartier', arr: 4 },
  { id: 'fkt_amboasary',       name: 'Amboasary',                          lat: -18.9648, lng: 47.5368, type: 'quartier', arr: 4 },
  { id: 'fkt_andranovelona',   name: 'Andranovelona',                      lat: -18.9508, lng: 47.5058, type: 'quartier', arr: 4 },
  { id: 'fkt_tsimahafotsy',    name: 'Tsimahafotsy',                       lat: -18.9748, lng: 47.5358, type: 'quartier', arr: 4 },
  { id: 'fkt_anosibe2',        name: 'Anosibe Atsimo',                     lat: -18.9728, lng: 47.5458, type: 'quartier', arr: 4 },
  { id: 'fkt_ambavahadimitafo',name: 'Ambavahadimitafo',                   lat: -18.9438, lng: 47.4958, type: 'quartier', arr: 4 },
  { id: 'fkt_ambohimasina',    name: 'Ambohimasina',                       lat: -18.9618, lng: 47.4878, type: 'quartier', arr: 4 },
  { id: 'fkt_andavamamba2',    name: 'Andavamamba Atsimo',                 lat: -18.9478, lng: 47.5175, type: 'quartier', arr: 4 },
  // ── Arrondissement V ──
  { id: 'fkt_fieferana',       name: 'Fieferana',                          lat: -18.8318, lng: 47.4958, type: 'quartier', arr: 5 },
  { id: 'fkt_mahitsy',         name: 'Mahitsy',                            lat: -18.7518, lng: 47.4488, type: 'quartier', arr: 5 },
  { id: 'fkt_anosiala',        name: 'Anosiala',                           lat: -18.8108, lng: 47.4628, type: 'quartier', arr: 5 },
  { id: 'fkt_merimandroso',    name: 'Merimandroso',                       lat: -18.8388, lng: 47.4708, type: 'quartier', arr: 5 },
  // ── Arrondissement VI ──
  { id: 'fkt_tsiazotafo2',     name: 'Tsiazotafo Atsimo',                  lat: -19.0158, lng: 47.5608, type: 'quartier', arr: 6 },
  { id: 'fkt_amboatavo',       name: 'Amboatavo',                          lat: -18.9958, lng: 47.5358, type: 'quartier', arr: 6 },
  { id: 'fkt_ambatofotsy',     name: 'Ambatofotsy',                        lat: -19.0058, lng: 47.5258, type: 'quartier', arr: 6 },
]

// ─────────────────────────────────────────────────────────────
// EXPORT UNIFIÉ
// ─────────────────────────────────────────────────────────────
export const ALL_LOCATIONS = [
  ...QUARTIERS,
  ...MARCHES,
  ...HOPITAUX,
  ...UNIVERSITES,
  ...COMMERCES,
  ...CARBURANTS,
  ...ARRETS,
  ...REPERES,
  ...HOTELS,
  ...TAXI_BE,
  ...CARREFOURS,
  ...ROUTES,
  ...FOKONTANY_SUP,
]

// ── Normalisation pour la recherche (insensible accents/casse) ─
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '')
    .trim()
}

/**
 * Cherche dans la base par nom.
 * Retourne les résultats triés : correspondances de début en premier,
 * puis correspondances internes.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {Array}
 */
export function searchLocations(query, limit = 8) {
  if (!query || query.trim().length < 2) return []
  const q = normalize(query)

  const starts = []
  const contains = []

  for (const loc of ALL_LOCATIONS) {
    const norm = normalize(loc.name)
    if (norm.startsWith(q))  { starts.push(loc);   continue }
    if (norm.includes(q))    { contains.push(loc) }
  }

  return [...starts, ...contains].slice(0, limit)
}

/**
 * Résoudre un nom exact (pour les données mock).
 */
export function findByName(name) {
  const q = normalize(name)
  return ALL_LOCATIONS.find(l => normalize(l.name) === q) || null
}
