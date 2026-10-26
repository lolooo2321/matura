import type { ExamImportRow } from './db'

/**
 * Real exam packages from the official NCVVO (Nacionalni centar za vanjsko vrednovanje
 * obrazovanja) "Provedeni ispiti" archive: https://www.ncvvo.hr/kategorija/drzavna-matura/provedeni-ispiti/
 *
 * Every URL below was fetched directly and confirmed to return HTTP 200 on ncvvo.hr before
 * being included here — nothing here is invented. NCVVO publishes each subject's materials
 * as a single ZIP package per exam round (not a separate exam PDF + solution PDF), so these
 * rows only populate `examPdfUrl` with the official ZIP link; `solutionPdfUrl` is left empty
 * since NCVVO does not publish a separate standalone solutions file for these rounds.
 *
 * This list covers Matematika (viša razina / level A), Fizika and Hrvatski jezik from the
 * jesenski 2020./2021. round through the drugi rok 2025./2026. round. Later rounds can be
 * added the same way once NCVVO publishes them.
 */
export const NCVVO_ARCHIVE: ExamImportRow[] = [
  // 2020./2021. — jesenski rok
  { subject: 'matematika', schoolYear: '2020./2021.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2021/08/MATA21jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2020./2021.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2021/08/FIZ21jesen.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2020./2021.', season: 'jesenski', level: 'viša razina', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2021/08/HRVA21jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2021./2022. — ljetni rok
  { subject: 'matematika', schoolYear: '2021./2022.', season: 'ljetni', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/06/MATA22ljeto1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2021./2022.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/06/FIZ22ljeto.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2021./2022.', season: 'ljetni', level: 'viša razina', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/06/HRVA22ljeto.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2021./2022. — jesenski rok
  { subject: 'matematika', schoolYear: '2021./2022.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/08/MATA22jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2021./2022.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/08/FIZ22jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2021./2022.', season: 'jesenski', level: 'viša razina', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2022/08/HRVA22jesen.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2022./2023. — ljetni rok
  { subject: 'matematika', schoolYear: '2022./2023.', season: 'ljetni', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/06/MATA23ljeto2.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2022./2023.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/06/FIZ23ljeto1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2022./2023.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/06/HRV23ljeto1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2022./2023. — jesenski (drugi) rok
  { subject: 'matematika', schoolYear: '2022./2023.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/08/MATA23jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2022./2023.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/08/FIZ23jesen.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2022./2023.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2023/08/HRV23jesen1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2023./2024. — prvi (ljetni) rok
  { subject: 'matematika', schoolYear: '2023./2024.', season: 'ljetni', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/06/MATA24_prvi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2023./2024.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/06/FIZ24prvi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2023./2024.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/06/HRV24prvi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2023./2024. — drugi (jesenski) rok
  { subject: 'matematika', schoolYear: '2023./2024.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/08/MATA24drugi1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2023./2024.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/08/FIZ24drugi1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2023./2024.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2024/08/HRV24drugi-1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2024./2025. — prvi (ljetni) rok
  { subject: 'matematika', schoolYear: '2024./2025.', season: 'ljetni', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/06/MATA25prvi_b.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2024./2025.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/06/FIZ25prvi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2024./2025.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/06/HRV25prvi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2024./2025. — drugi (jesenski) rok
  { subject: 'matematika', schoolYear: '2024./2025.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/09/MAT-A-2.ROK_.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2024./2025.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/08/FIZ25drugi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2024./2025.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2025/08/HRV25drugi.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2025./2026. — prvi (ljetni) rok
  { subject: 'matematika', schoolYear: '2025./2026.', season: 'ljetni', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/07/MAT_A_1_rok_2025_2026.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2025./2026.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/06/Fizika_1_rok_2025_2026.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2025./2026.', season: 'ljetni', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/06/Hrvatski_1_rok_2025_2026.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },

  // 2025./2026. — drugi (jesenski) rok
  { subject: 'matematika', schoolYear: '2025./2026.', season: 'jesenski', level: 'A (viša razina)', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/09/MAT_A_2_rok_2025_2026_Rev1.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'fizika', schoolYear: '2025./2026.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/08/Fizika_2_rok_2025_2026_Rev2.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
  { subject: 'hrvatski', schoolYear: '2025./2026.', season: 'jesenski', examPdfUrl: 'https://www.ncvvo.hr/wp-content/uploads/2026/08/Hrvatski_2_rok_2025_2026.zip', notes: 'Službeni ZIP paket NCVVO (ispitna knjižica).' },
]
