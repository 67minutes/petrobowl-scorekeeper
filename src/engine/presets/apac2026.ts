import type { Tournament } from '../types';
import { blankTournament, groupStage, knockoutStage, makeTeams } from './index';

export const APAC_2026_TEAMS = [
  { name: 'Universiti Malaysia Pahang Al-Sultan Abdullah', shortName: 'UMPSA', country: 'Malaysia' },
  { name: 'Universitas Indonesia', shortName: 'UI', country: 'Indonesia' },
  { name: 'Universiti Teknologi PETRONAS', shortName: 'UTP', country: 'Malaysia' },
  { name: 'Universitas Pembangunan Nasional "Veteran" Yogyakarta', shortName: 'UPNVY', country: 'Indonesia' },
  { name: 'Batangas State University – The National Engineering University', shortName: 'BatStateU', country: 'Philippines' },
  { name: 'Politeknik Energi dan Mineral Akamigas Cepu', shortName: 'PEM Akamigas', country: 'Indonesia' },
  { name: 'China University of Petroleum (East China)', shortName: 'UPC', country: 'China' },
  { name: 'Universitas Islam Riau', shortName: 'UIR', country: 'Indonesia' },
  { name: 'Institut Teknologi Sepuluh Nopember', shortName: 'ITS', country: 'Indonesia' },
  { name: 'Trisakti University', shortName: 'Trisakti', country: 'Indonesia' },
  { name: 'Universitas Gadjah Mada', shortName: 'UGM', country: 'Indonesia' },
  { name: 'Universitas Padjadjaran', shortName: 'Unpad', country: 'Indonesia' },
  { name: 'Institut Teknologi Bandung', shortName: 'ITB', country: 'Indonesia' },
];

/**
 * Petrobowl APAC 2026
 * - 13 teams, groups A/B/C of 3 and D of 4, single round robin
 * - top 2 per group advance to an 8-team knockout (QF → SF → Final)
 * - +10 correct (first response or steal), −5 incorrect; W2 / D1 / L0
 */
export function apac2026(): Tournament {
  const t = blankTournament('Petrobowl APAC 2026');
  t.subtitle = 'SPE Asia Pacific Petrobowl Championship';
  t.teams = makeTeams(APAC_2026_TEAMS);
  const groups = groupStage('Group Stage', [3, 3, 3, 4], 2);
  groups.drawOptions = { separateCountries: true, locks: {}, pots: [] };
  const ko = knockoutStage('Knockout Stage', groups, 8, false);
  t.stages = [groups, ko];
  return t;
}
