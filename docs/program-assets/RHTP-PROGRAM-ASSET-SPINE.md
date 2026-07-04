# RHTP Program Asset Spine

**Status:** Operational draft for program design, partner review, and pilot planning.  
**Audience:** RHTP leadership, clinical sponsor, navigator lead, data/integration lead, compliance, community partners.  
**Boundary:** This is not clinical policy, legal advice, or a patient-facing medical document. Clinical, privacy, legal, and community-partner owners must approve each asset before real patient use.

## Program Thesis

The program needs a set of reusable assets that make the patient app and navigator console safe, repeatable, and measurable. The app is only one surface. The durable program asset is the operating system behind it: protocol packs, approved content, trusted data bundles, navigator playbooks, safety guardrails, resource networks, integration maps, measurement definitions, and launch toolkits.

The first production wedge remains diabetic-retinopathy screening gaps. Every additional capability should ship as a protocol pack on the same rails.

## Source Spine

This packet is grounded in the current prototype and specs:

- `docs/superpowers/specs/2026-07-03-rhtp-production-architecture.md`
- `docs/superpowers/specs/2026-07-04-platform-deployment-and-ai-architecture.md`
- `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`
- `docs/superpowers/specs/2026-07-04-kentucky-sdoh-resource-network.md`
- `src/types.ts`
- `src/lib/retinopathy-protocol.ts`
- `src/store/useStore.ts`
- `src/lib/kentucky-sdoh-resources.ts`

External reference anchors used by this packet:

- ADA Standards of Care in Diabetes 2026, retinopathy section: https://diabetesjournals.org/care/article/49/Supplement_1/S261/163919/12-Retinopathy-Neuropathy-and-Foot-Care-Standards
- ADA Standards of Care in Diabetes 2026, cardiovascular risk section: https://diabetesjournals.org/care/article/49/Supplement_1/S216/163933/10-Cardiovascular-Disease-and-Risk-Management
- ADA Standards of Care in Diabetes 2026, glycemic goals section: https://diabetesjournals.org/care/article/49/Supplement_1/S132/163927/6-Glycemic-Goals-Hypoglycemia-and-Hyperglycemic
- CHFS kynect resources: https://www.chfs.ky.gov/agencies/ohda/Pages/kynectresources.aspx
- kynect resources community partner FAQ: https://www.chfs.ky.gov/agencies/dms/kynect/krFAQCommunityPartners.pdf
- Kentucky 211: https://kentucky211.org/

## Asset Inventory

| Asset | Purpose | First Version In This Packet | Owner To Assign |
|---|---|---|---|
| Protocol pack library | Defines each care journey as cohort rules, content, tools, escalations, metrics, and red-team gates | Retinopathy gap v1 | Clinical + product |
| Patient education content library | Approved plain-language explanations Sandy and the UI can use | Retinopathy education content requirements | Clinical content |
| Navigator playbooks | Turns returned information into reliable community health worker action | Retinopathy + SDOH navigator playbook | Navigator lead |
| Trusted data bundle | Defines minimum facts Sandy may use and what provenance is required | Retinopathy trusted data bundle v1 | Data governance |
| Consent and trust artifacts | Explains patient ownership, source use, limits, opt-out, and sharing | Trust artifact checklist | Compliance + patient advisory |
| Sandy guardrails | Voice/chat rules, escalation triggers, forbidden actions, and approved fallback patterns | Sandy operating guardrails v1 | Clinical safety + AI lead |
| Kentucky resource network | Operationalizes kynect/211/community resources for SDOH support | Kentucky SDOH ops model v1 | Community resource lead |
| Integration map | Names data sources, FHIR mappings, device feeds, claims/HIE sequence | Asset roadmap references | Data/integration lead |
| Measurement dashboard | Defines outcomes, denominators, equity cuts, and pilot proof | Dashboard metric dictionary v1 | Evaluation lead |
| Partnership package | Materials for FQHCs, payers, KHIE, kynect/211, and community partners | Partner packet outline | Program director |
| Safety/compliance package | HIPAA/BAA, AI risk, audit, incident, red-team, PHI gates | Readiness checklist v1 | Compliance |
| Implementation toolkit | Launch checklist, training plan, enrollment scripts, runbooks | Asset roadmap | Operations |

## Maturity Levels

Use the same scale for every asset:

| Level | Meaning | Allowed Use |
|---|---|---|
| L0 - Stub | Named asset with owner and purpose | Planning only |
| L1 - Draft | Usable internal draft with assumptions visible | Internal review |
| L2 - Reviewed | Clinical/legal/ops review complete | Pilot preparation |
| L3 - Pilot Ready | Approved for navigator-supervised pilot | Limited real-world use |
| L4 - Production Controlled | Versioned, governed, monitored, and audited | Production |

The packet produced here is L1 unless a file states otherwise.

## First Asset Packet Contents

- [RHTP Asset Development Roadmap](./RHTP-ASSET-DEVELOPMENT-ROADMAP.md)
- [Diabetic Retinopathy Gap Protocol Pack v1](./protocol-packs/DIABETIC-RETINOPATHY-GAP-PROTOCOL-PACK-V1.md)
- [Navigator Playbook: Retinopathy and SDOH](./navigator-playbooks/NAVIGATOR-PLAYBOOK-RETINOPATHY-SDOH-V1.md)
- [Trusted Data Bundle v1](./data/TRUSTED-DATA-BUNDLE-V1.md)
- [Sandy Guardrails v1](./sandy/SANDY-GUARDRAILS-V1.md)
- [Kentucky SDOH Resource Operations v1](./resources/KENTUCKY-SDOH-RESOURCE-OPS-V1.md)
- [Measurement Dashboard Dictionary v1](./measurement/MEASUREMENT-DASHBOARD-DICTIONARY-V1.md)
- [Partner Package Outline](./partnerships/PARTNER-PACKAGE-OUTLINE.md)
- [Safety, Compliance, and Real-PHI Readiness Checklist](./governance/SAFETY-COMPLIANCE-READINESS-CHECKLIST.md)

## Operating Rule

No protocol, content, resource match, insight, outreach message, or navigator action should go live unless it can answer four questions:

1. What source fact or patient statement caused this?
2. What protocol rule allowed this?
3. What human receives exceptions?
4. What outcome measure will prove whether it helped?
