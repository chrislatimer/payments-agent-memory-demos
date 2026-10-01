/** Demo #1 — SAR / AML data. Authored; every record carries weight. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const subjects = [
  { subject_id: 'SUB-3301', legal_name: 'Vantor Logistics LLC',
    known_identifiers: ['Vantor Logistics LLC', 'Vantor Logistik LLC', 'Vantor Freight Services', 'EIN 84-2219073'],
    business_type: 'Freight forwarding', risk_rating: 'Medium', opened: '2023-02-14',
    expected_activity: { monthly_inbound_usd: 180000, monthly_outbound_usd: 165000, typical_counterparties: 12, corridors: ['US', 'CA', 'MX'] } },
  { subject_id: 'SUB-3318', legal_name: 'Harrow & Lisk Trading Co',
    known_identifiers: ['Harrow & Lisk Trading Co', 'EIN 47-5521188'],
    business_type: 'Commodity trading', risk_rating: 'High', opened: '2021-08-03',
    expected_activity: { monthly_inbound_usd: 900000, monthly_outbound_usd: 880000, typical_counterparties: 30, corridors: ['US', 'GB', 'AE', 'SG'] } },
  { subject_id: 'SUB-3342', legal_name: 'Quietwater Dental Group PC',
    known_identifiers: ['Quietwater Dental Group PC', 'EIN 20-7781044'],
    business_type: 'Dental practice', risk_rating: 'Low', opened: '2019-05-21',
    expected_activity: { monthly_inbound_usd: 240000, monthly_outbound_usd: 210000, typical_counterparties: 40, corridors: ['US'] } },
  { subject_id: 'SUB-3377', legal_name: 'Brightmoor Industrial Supply Inc',
    known_identifiers: ['Brightmoor Industrial Supply Inc', 'EIN 36-4410992'],
    business_type: 'Industrial supply', risk_rating: 'Medium', opened: '2020-01-09',
    expected_activity: { monthly_inbound_usd: 1400000, monthly_outbound_usd: 1350000, typical_counterparties: 55, corridors: ['US', 'MX', 'NO'] } },
  { subject_id: 'SUB-3390', legal_name: 'Calder Peak Ventures LP',
    known_identifiers: ['Calder Peak Ventures LP', 'EIN 88-1203345'],
    business_type: 'Investment holding', risk_rating: 'High', opened: '2024-11-30',
    expected_activity: { monthly_inbound_usd: 2500000, monthly_outbound_usd: 2400000, typical_counterparties: 8, corridors: ['US', 'KY', 'CH'] } },
  { subject_id: 'SUB-3404', legal_name: 'Rosalind Okafor', known_identifiers: ['Rosalind Okafor', 'R. Okafor'],
    business_type: 'Personal', risk_rating: 'Low', opened: '2018-03-12',
    expected_activity: { monthly_inbound_usd: 14000, monthly_outbound_usd: 12500, typical_counterparties: 20, corridors: ['US'] } },
  { subject_id: 'SUB-3415', legal_name: 'Tern Bay Seafood Co', known_identifiers: ['Tern Bay Seafood Co', 'EIN 92-3310447'],
    business_type: 'Seafood wholesale', risk_rating: 'Medium', opened: '2022-06-18',
    expected_activity: { monthly_inbound_usd: 420000, monthly_outbound_usd: 400000, typical_counterparties: 25, corridors: ['US', 'CA'] } },
];

const sar_alerts = [
  { sar_id: 'SAR-2026-0412', risk_tier: 2, subject_id: 'SUB-3301', typology: 'Rapid movement of funds', generated: '2026-09-18',
    risk_score: 81, status: 'INVESTIGATED', inbound_total_usd: 742000, counterparty_count: 4,
    narrative: 'Inbound value 4.1x expected monthly volume, cleared to third parties within 48 hours.' },
  { sar_id: 'SAR-2026-0418', risk_tier: 1, subject_id: 'SUB-3318', typology: 'Unusual counterparty concentration', generated: '2026-09-19',
    risk_score: 74, status: 'INVESTIGATED', inbound_total_usd: 1880000, counterparty_count: 3,
    narrative: 'Three counterparties account for 92% of inbound value against a 30-counterparty baseline.' },
  { sar_id: 'SAR-2026-0423', risk_tier: 2, subject_id: 'SUB-3342', typology: 'Structuring', generated: '2026-09-21',
    risk_score: 68, status: 'INVESTIGATED', inbound_total_usd: 46800, counterparty_count: 1,
    narrative: 'Nine cash deposits between $4,800 and $5,400 across five branches in eight days.' },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, subject_id: 'SUB-3390', typology: 'Layering through related entities', generated: '2026-09-22',
    risk_score: 89, status: 'INVESTIGATED', inbound_total_usd: 6400000, counterparty_count: 5,
    narrative: 'Funds cycled through five related entities, returning 94% of value to origin within nine days.' },
  { sar_id: 'SAR-2026-0440', risk_tier: 3, subject_id: 'SUB-3404', typology: 'Activity inconsistent with profile', generated: '2026-09-24',
    risk_score: 52, status: 'INVESTIGATED', inbound_total_usd: 61500, counterparty_count: 2,
    narrative: 'Inbound value 4.4x expected for a personal account with no stated business activity.' },
  { sar_id: 'SAR-2026-0447', risk_tier: 3, subject_id: 'SUB-3415', typology: 'Round-amount transfers', generated: '2026-09-26',
    risk_score: 59, status: 'INVESTIGATED', inbound_total_usd: 275000, counterparty_count: 3,
    narrative: 'Eleven inbound transfers in exact $25,000 increments from a single corridor.' },
  { sar_id: 'SAR-2026-0455', risk_tier: 2, subject_id: 'SUB-3377', typology: 'Rapid movement of funds', generated: '2026-09-29',
    risk_score: 66, status: 'OPEN', inbound_total_usd: 980000, counterparty_count: 6,
    narrative: 'Inbound value cleared to six counterparties within 72 hours against a 30-day baseline.' },
];

const counterparties = [
  { sar_id: 'SAR-2026-0412', risk_tier: 2, name: 'Delta Rim Shipping Ltd', country: 'AE', amount_usd: 310000 },
  { sar_id: 'SAR-2026-0412', risk_tier: 2, name: 'Pell & Moro SARL', country: 'LU', amount_usd: 188000 },
  { sar_id: 'SAR-2026-0412', risk_tier: 2, name: 'Anchorline Cargo Inc', country: 'US', amount_usd: 144000 },
  { sar_id: 'SAR-2026-0412', risk_tier: 2, name: 'Severn Holdings Ltd', country: 'CY', amount_usd: 100000 },
  { sar_id: 'SAR-2026-0418', risk_tier: 1, name: 'Oryx Metals FZE', country: 'AE', amount_usd: 880000 },
  { sar_id: 'SAR-2026-0418', risk_tier: 1, name: 'Lindhall Commodities Pte', country: 'SG', amount_usd: 620000 },
  { sar_id: 'SAR-2026-0418', risk_tier: 1, name: 'Trent Rivers Ltd', country: 'GB', amount_usd: 380000 },
  { sar_id: 'SAR-2026-0423', risk_tier: 2, name: 'Cash deposit (branch)', country: 'US', amount_usd: 46800 },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, name: 'Calder Peak Holdings II', country: 'KY', amount_usd: 2100000 },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, name: 'Calder Peak Opportunities', country: 'KY', amount_usd: 1700000 },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, name: 'Helvetia Nominees AG', country: 'CH', amount_usd: 1400000 },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, name: 'Calder Peak Credit Ltd', country: 'KY', amount_usd: 800000 },
  { sar_id: 'SAR-2026-0431', risk_tier: 1, name: 'Marlow Street Nominees', country: 'GB', amount_usd: 400000 },
  { sar_id: 'SAR-2026-0440', risk_tier: 3, name: 'Okafor Family Trust', country: 'US', amount_usd: 48000 },
  { sar_id: 'SAR-2026-0440', risk_tier: 3, name: 'Greenhill Realty LLC', country: 'US', amount_usd: 13500 },
  { sar_id: 'SAR-2026-0447', risk_tier: 3, name: 'North Reach Fisheries', country: 'CA', amount_usd: 175000 },
  { sar_id: 'SAR-2026-0447', risk_tier: 3, name: 'Bayward Cold Storage', country: 'CA', amount_usd: 75000 },
  { sar_id: 'SAR-2026-0447', risk_tier: 3, name: 'Tidemark Brokers Inc', country: 'US', amount_usd: 25000 },
  { sar_id: 'SAR-2026-0455', risk_tier: 2, name: 'Cementos Pacifico SA de CV', country: 'MX', amount_usd: 420000 },
  { sar_id: 'SAR-2026-0455', risk_tier: 2, name: 'Halvorsen Maskin AS', country: 'NO', amount_usd: 260000 },
  { sar_id: 'SAR-2026-0455', risk_tier: 2, name: 'Ridgeline Fabrication Inc', country: 'US', amount_usd: 300000 },
];

/**
 * The seeded failure lives here. The earlier filing on Vantor is recorded
 * under the former name "Vantor Logistik LLC", which is a known identifier on
 * the subject but is not the name on the alert. A search of the exact alert
 * name returns nothing, so control 3.4.1 looks satisfied and the mandatory
 * escalation under 3.4.2 never happens.
 */
const prior_sars = [
  { prior_id: 'SAR-2025-1182', filed_under_name: 'Vantor Logistik LLC', subject_id: 'SUB-3301', filed: '2025-11-04',
    typology: 'Rapid movement of funds', outcome: 'Filed with FinCEN' },
  { prior_id: 'SAR-2026-0109', filed_under_name: 'Harrow & Lisk Trading Co', subject_id: 'SUB-3318', filed: '2026-02-17',
    typology: 'Unusual counterparty concentration', outcome: 'Filed with FinCEN' },
  { prior_id: 'SAR-2025-0944', filed_under_name: 'Calder Peak Ventures LP', subject_id: 'SUB-3390', filed: '2025-09-30',
    typology: 'Layering through related entities', outcome: 'Filed with FinCEN' },
];

const out = join(process.cwd(), 'data', 'seed');
mkdirSync(out, { recursive: true });
const files = { subjects, sar_alerts, counterparties, prior_sars };
for (const [k, v] of Object.entries(files)) writeFileSync(join(out, `${k}.json`), JSON.stringify(v, null, 2) + '\n');
console.log('seeded sar:', Object.entries(files).map(([k, v]) => `${k}=${v.length}`).join('  '));
