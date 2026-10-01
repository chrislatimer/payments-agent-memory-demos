import type { ActivityRecord } from './activity';

const AGENT = 'AML Investigation Agent v1.4 (delegated authority, AML-SAR-01 §2.3)';
const POLICY = 'AML-SAR-01 v4.2';

/**
 * Six investigations already on the books when the demo opens.
 *
 * Three are clean. Three carry gaps of deliberately different character, so
 * the audit is not one trick repeated:
 *
 *   SAR-2026-0412  3.4.1 — the SAR Register searched under one name only.
 *                  Consequentially 3.4.2, since the prior filing sits under a
 *                  former name and was therefore never returned. Every other
 *                  control on this case is satisfied, which is what makes it
 *                  worth catching.
 *   SAR-2026-0423  3.6.3 — Tier 2 case dispositioned 31 business days after
 *                  assignment against a 20 business day SLA.
 *   SAR-2026-0447  3.3.2 — one of three counterparties never screened.
 */
export const PRERECORDED: ActivityRecord[] = [
  {
    sar_id: 'SAR-2026-0412', subject: 'Vantor Logistics LLC', subject_id: 'SUB-3301',
    policy: POLICY, risk_tier: 2, disposition_sla: '20 business days', investigator: AGENT,
    opened: '2026-09-18T09:14:02Z', closed: '2026-09-29T16:40:11Z',
    steps: [
      { at: '09:14:02', action: 'FCCM case opened from Sentinel alert SAR-2026-0412', detail: 'typology "Rapid movement of funds", Sentinel risk tier 2, assigned 2026-09-18' },
      { at: '09:14:06', action: 'Transaction detail recorded to case file', detail: '11 transactions, review period 2026-09-14 to 2026-09-17, credits USD 742,000' },
      { at: '09:14:31', action: 'Typology confirmed against transaction detail', detail: 'present: credits cleared to third parties within 48 hours' },
      { at: '09:15:10', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating Medium, last review 2026-01-22' },
      { at: '09:15:22', action: 'Expected activity recorded from CDD record', detail: 'expected monthly credits USD 180,000, ~12 counterparties, corridors US/CA/MX' },
      { at: '09:16:04', action: 'Variance recorded to case file', detail: 'credits 4.1x expected; 4 counterparties against expected 12; AE/LU/CY outside expected corridors' },
      { at: '09:16:48', action: 'Prism screening — Vantor Logistics LLC', detail: 'no match; reference PRM-26-884120' },
      { at: '09:17:12', action: 'Prism screening — Delta Rim Shipping Ltd', detail: 'no match; reference PRM-26-884121' },
      { at: '09:17:33', action: 'Prism screening — Pell & Moro SARL', detail: 'no match; reference PRM-26-884122' },
      { at: '09:17:55', action: 'Prism screening — Anchorline Cargo Inc', detail: 'no match; reference PRM-26-884123' },
      { at: '09:18:14', action: 'Prism screening — Severn Holdings Ltd', detail: 'no match; reference PRM-26-884124' },
      { at: '09:19:55', action: 'SAR Register search — "Vantor Logistics LLC", 24 months', detail: '0 results' },
      { at: '09:20:40', action: 'Source of funds recorded to case file', detail: 'freight settlement receipts; 4 payer invoices referenced (INV-88213, 88240, 88266, 88291)' },
      { at: '09:22:51', action: 'Disposition recorded', detail: 'no further action' },
      { at: '2026-09-29 16:40', action: 'Reviewing Officer approval recorded by FCCM', detail: 'K. Oyelaran' },
    ],
    disposition: 'No further action',
    rationale:
      'Credits exceeded the expected profile but source of funds was evidenced by freight settlement receipts '
      + 'consistent with the stated business. All parties screened clean. No previous filings identified against '
      + 'the customer.',
    escalated: false,
    second_level_signoff: 'K. Oyelaran, 2026-09-29T16:40:11Z',
  },

  {
    sar_id: 'SAR-2026-0418', subject: 'Harrow & Lisk Trading Co', subject_id: 'SUB-3318',
    policy: POLICY, risk_tier: 1, disposition_sla: '10 business days', investigator: AGENT,
    opened: '2026-09-19T08:40:11Z', closed: '2026-09-21T09:05:30Z',
    steps: [
      { at: '08:40:11', action: 'FCCM case opened from Sentinel alert SAR-2026-0418', detail: 'typology "Unusual counterparty concentration", Sentinel risk tier 1' },
      { at: '08:40:19', action: 'Transaction detail recorded to case file', detail: '14 transactions, credits USD 1,880,000' },
      { at: '08:40:52', action: 'Typology confirmed against transaction detail', detail: 'present: 3 counterparties account for 92% of credits' },
      { at: '08:41:30', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating High, last review 2026-05-09' },
      { at: '08:41:44', action: 'Expected activity recorded from CDD record', detail: 'expected ~30 counterparties monthly, corridors US/GB/AE/SG' },
      { at: '08:42:20', action: 'Variance recorded to case file', detail: 'counterparty count 3 against expected 30; value within expected range' },
      { at: '08:43:02', action: 'Prism screening — Harrow & Lisk Trading Co', detail: 'no match; reference PRM-26-884455' },
      { at: '08:43:25', action: 'Prism screening — Oryx Metals FZE', detail: 'no match; reference PRM-26-884456' },
      { at: '08:43:49', action: 'Prism screening — Lindhall Commodities Pte', detail: 'no match; reference PRM-26-884457' },
      { at: '08:44:11', action: 'Prism screening — Trent Rivers Ltd', detail: 'no match; reference PRM-26-884458' },
      { at: '08:46:30', action: 'SAR Register search — "Harrow & Lisk Trading Co", 24 months', detail: '1 result: SAR-2026-0109 filed 2026-02-17' },
      { at: '08:46:52', action: 'SAR Register search — "EIN 47-5521188", 24 months', detail: '0 results' },
      { at: '08:47:02', action: 'Referred to MLRO under AML-ESC-01 §2.1', detail: 'previous filing returned at 3.4.1; case not dispositioned by Investigator' },
      { at: '08:52:10', action: 'Source of funds recorded to case file', detail: 'commodity sale contracts CT-4417, CT-4482, CT-4506' },
      { at: '09:05:30', action: 'Disposition recorded', detail: 'refer for filing' },
      { at: '09:05:34', action: 'Detection date recorded for filing deadline (3.6.4)', detail: '2026-09-21; filing deadline 2026-10-21' },
    ],
    disposition: 'Refer for filing',
    rationale: 'Previous filing within 24 months returned by the Register search. Concentration not explained by the contracts referenced. Referred to MLRO.',
    escalated: true, second_level_signoff: null,
  },

  {
    sar_id: 'SAR-2026-0423', subject: 'Quietwater Dental Group PC', subject_id: 'SUB-3342',
    policy: POLICY, risk_tier: 2, disposition_sla: '20 business days', investigator: AGENT,
    // Assigned 21 Sept, dispositioned 4 Nov. 31 business days against a 20 day SLA.
    opened: '2026-09-21T10:02:00Z', closed: '2026-11-04T15:22:08Z',
    steps: [
      { at: '10:02:00', action: 'FCCM case opened from Sentinel alert SAR-2026-0423', detail: 'typology "Structuring", Sentinel risk tier 2, assigned 2026-09-21' },
      { at: '10:02:08', action: 'Transaction detail recorded to case file', detail: '9 cash deposits, 5 branches, 8 days, credits USD 46,800' },
      { at: '10:02:40', action: 'Typology confirmed against transaction detail', detail: 'present: all deposits between USD 4,800 and 5,400' },
      { at: '10:03:15', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating Low, last review 2025-11-30' },
      { at: '10:03:28', action: 'Expected activity recorded from CDD record', detail: 'expected monthly credits USD 240,000, cash uncommon for practice receipts' },
      { at: '10:04:02', action: 'Variance recorded to case file', detail: 'cash pattern inconsistent with card-dominant receipts; value within expected range' },
      { at: '10:04:50', action: 'Prism screening — Quietwater Dental Group PC', detail: 'no match; reference PRM-26-884901' },
      { at: '10:05:14', action: 'Prism screening — cash deposit (branch)', detail: 'no counterparty party to screen; recorded' },
      { at: '10:06:30', action: 'SAR Register search — "Quietwater Dental Group PC", 24 months', detail: '0 results' },
      { at: '10:06:51', action: 'SAR Register search — "EIN 20-7781044", 24 months', detail: '0 results' },
      { at: '2026-10-14 09:30', action: 'Disposition recorded — pending information', detail: 'RFI raised to branch operations for deposit CCTV and teller records' },
      { at: '2026-11-04 14:55', action: 'Branch response received', detail: 'deposits made by practice manager, identity confirmed' },
      { at: '2026-11-04 15:22', action: 'Disposition recorded', detail: 'refer for filing' },
      { at: '2026-11-04 15:24', action: 'Detection date recorded for filing deadline (3.6.4)', detail: '2026-11-04; filing deadline 2026-12-04' },
    ],
    disposition: 'Refer for filing',
    rationale: 'Deposit pattern consistent with structuring below the currency reporting threshold. Referred to MLRO. Case held pending information from 2026-10-14 to 2026-11-04.',
    escalated: true, second_level_signoff: null,
  },

  {
    sar_id: 'SAR-2026-0431', subject: 'Calder Peak Ventures LP', subject_id: 'SUB-3390',
    policy: POLICY, risk_tier: 1, disposition_sla: '10 business days', investigator: AGENT,
    opened: '2026-09-22T14:11:00Z', closed: '2026-09-25T14:48:19Z',
    steps: [
      { at: '14:11:00', action: 'FCCM case opened from Sentinel alert SAR-2026-0431', detail: 'typology "Layering through related entities", Sentinel risk tier 1' },
      { at: '14:11:12', action: 'Transaction detail recorded to case file', detail: '28 transactions over 9 days, credits USD 6,400,000' },
      { at: '14:11:50', action: 'Typology confirmed against transaction detail', detail: 'present: 94% of value returned to origin' },
      { at: '14:12:30', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating High, last review 2026-03-18, account opened 2024-11-30' },
      { at: '14:12:44', action: 'Expected activity recorded from CDD record', detail: 'expected ~8 counterparties, corridors US/KY/CH' },
      { at: '14:13:20', action: 'Variance recorded to case file', detail: 'circular flow not consistent with stated investment holding activity' },
      { at: '14:14:05', action: 'Prism screening — Calder Peak Ventures LP', detail: 'no match; reference PRM-26-885330' },
      { at: '14:14:28', action: 'Prism screening — Calder Peak Holdings II', detail: 'no match; reference PRM-26-885331' },
      { at: '14:14:51', action: 'Prism screening — Calder Peak Opportunities', detail: 'no match; reference PRM-26-885332' },
      { at: '14:15:14', action: 'Prism screening — Helvetia Nominees AG', detail: 'no match; reference PRM-26-885333' },
      { at: '14:15:37', action: 'Prism screening — Calder Peak Credit Ltd', detail: 'no match; reference PRM-26-885334' },
      { at: '14:16:00', action: 'Prism screening — Marlow Street Nominees', detail: 'no match; reference PRM-26-885335' },
      { at: '14:18:40', action: 'SAR Register search — "Calder Peak Ventures LP", 24 months', detail: '1 result: SAR-2025-0944 filed 2025-09-30' },
      { at: '14:19:02', action: 'SAR Register search — "EIN 88-1203345", 24 months', detail: '0 results' },
      { at: '14:19:10', action: 'Referred to MLRO under AML-ESC-01 §2.1', detail: 'previous filing returned at 3.4.1' },
      { at: '14:30:02', action: 'Source of funds recorded to case file', detail: 'not established; counterparties are entities under common control, no underlying documentation provided' },
      { at: '14:48:19', action: 'Disposition recorded', detail: 'refer for filing' },
      { at: '14:48:25', action: 'Detection date recorded for filing deadline (3.6.4)', detail: '2026-09-25; filing deadline 2026-10-25' },
    ],
    disposition: 'Refer for filing',
    rationale: 'Circular flows through entities under common control. Source of funds not established. Previous filing within 24 months.',
    escalated: true, second_level_signoff: null,
  },

  {
    sar_id: 'SAR-2026-0440', subject: 'Rosalind Okafor', subject_id: 'SUB-3404',
    policy: POLICY, risk_tier: 3, disposition_sla: '30 business days', investigator: AGENT,
    opened: '2026-09-24T11:30:00Z', closed: '2026-09-30T13:15:00Z',
    steps: [
      { at: '11:30:00', action: 'FCCM case opened from Sentinel alert SAR-2026-0440', detail: 'typology "Activity inconsistent with profile", Sentinel risk tier 3' },
      { at: '11:30:09', action: 'Transaction detail recorded to case file', detail: '2 credits, review period 2026-09-08 to 2026-09-23, credits USD 61,500' },
      { at: '11:30:41', action: 'Typology confirmed against transaction detail', detail: 'present: credits 4.4x expected for a personal account' },
      { at: '11:31:15', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating Low, last review 2025-08-14' },
      { at: '11:31:28', action: 'Expected activity recorded from CDD record', detail: 'expected monthly credits USD 14,000, corridors US' },
      { at: '11:32:02', action: 'Variance recorded to case file', detail: 'single credit of USD 48,000 against expected monthly total of USD 14,000; counterparty count within expectation' },
      { at: '11:32:50', action: 'Prism screening — Rosalind Okafor', detail: 'no match; reference PRM-26-885712' },
      { at: '11:33:14', action: 'Prism screening — Okafor Family Trust', detail: 'no match; reference PRM-26-885713' },
      { at: '11:33:38', action: 'Prism screening — Greenhill Realty LLC', detail: 'no match; reference PRM-26-885714' },
      { at: '11:35:20', action: 'SAR Register search — "Rosalind Okafor", 24 months', detail: '0 results' },
      { at: '11:35:44', action: 'SAR Register search — "R. Okafor", 24 months', detail: '0 results' },
      { at: '11:38:10', action: 'Source of funds recorded to case file', detail: 'distribution from family trust; deed of appointment DA-2026-114 referenced' },
      { at: '11:44:12', action: 'Disposition recorded', detail: 'no further action' },
      { at: '2026-09-30 13:15', action: 'Reviewing Officer approval recorded by FCCM', detail: 'J. Abara' },
    ],
    disposition: 'No further action',
    rationale: 'Credits evidenced by a documented trust distribution. Both names held in the CDD record searched against the Register; no previous filings.',
    escalated: false,
    second_level_signoff: 'J. Abara, 2026-09-30T13:15:00Z',
  },

  {
    sar_id: 'SAR-2026-0447', subject: 'Tern Bay Seafood Co', subject_id: 'SUB-3415',
    policy: POLICY, risk_tier: 3, disposition_sla: '30 business days', investigator: AGENT,
    opened: '2026-09-26T09:05:00Z', closed: '2026-09-29T10:40:00Z',
    steps: [
      { at: '09:05:00', action: 'FCCM case opened from Sentinel alert SAR-2026-0447', detail: 'typology "Round-amount transfers", Sentinel risk tier 3' },
      { at: '09:05:11', action: 'Transaction detail recorded to case file', detail: '11 credits in exact USD 25,000 increments, credits USD 275,000' },
      { at: '09:05:48', action: 'Typology confirmed against transaction detail', detail: 'present' },
      { at: '09:06:20', action: 'CDD record retrieved (AML-KYC-02)', detail: 'risk rating Medium, last review 2026-02-02' },
      { at: '09:06:35', action: 'Expected activity recorded from CDD record', detail: 'expected monthly credits USD 420,000, corridors US/CA' },
      { at: '09:07:10', action: 'Variance recorded to case file', detail: 'value within expected range; amount regularity is the anomaly' },
      { at: '09:08:00', action: 'Prism screening — Tern Bay Seafood Co', detail: 'no match; reference PRM-26-886001' },
      { at: '09:08:22', action: 'Prism screening — North Reach Fisheries', detail: 'no match; reference PRM-26-886002' },
      { at: '09:08:45', action: 'Prism screening — Bayward Cold Storage', detail: 'no match; reference PRM-26-886003' },
      { at: '09:11:30', action: 'SAR Register search — "Tern Bay Seafood Co", 24 months', detail: '0 results' },
      { at: '09:11:52', action: 'SAR Register search — "EIN 92-3310447", 24 months', detail: '0 results' },
      { at: '09:14:02', action: 'Source of funds recorded to case file', detail: 'fixed-price supply agreement SA-2219 billed in USD 25,000 tranches' },
      { at: '09:26:38', action: 'Disposition recorded', detail: 'no further action — enhanced monitoring' },
      { at: '09:27:02', action: 'Referred to CDD for risk rating review (AML-KYC-02 §6)', detail: 'counterparty concentration changed since last review' },
      { at: '2026-09-29 10:40', action: 'Reviewing Officer approval recorded by FCCM', detail: 'K. Oyelaran' },
    ],
    disposition: 'No further action — enhanced monitoring',
    rationale: 'Round amounts evidenced by a fixed-price supply agreement billed in tranches. Concentration on three counterparties is a change from the profile at last review, so the customer is referred for risk rating review and placed on enhanced monitoring.',
    escalated: false,
    second_level_signoff: 'K. Oyelaran, 2026-09-29T10:40:00Z',
  },
];
