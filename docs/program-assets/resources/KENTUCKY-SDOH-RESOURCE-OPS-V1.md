# Kentucky SDOH Resource Operations v1

**Status:** L1 operational draft.  
**Purpose:** Define how the program should use kynect resources, Kentucky 211, and county resource data without overpromising live referral capability.

## Source-Of-Truth Stance

The preferred production path is kynect resources / Kentucky 211.

Important operating facts from public kynect materials:

- United Way/211-listed organizations can appear in kynect resources.
- Residents can add resources to "My Plan."
- A resident selecting Connect can generate a referral.
- KY Partner labeling indicates an onboarded community partner with referral access.
- Community partners may need resident consent to view full profile information.
- kynect resources can support SDOH needs assessment workflows.

## Prototype Posture

The current app uses a local Kentucky resource adapter with real source provenance. It does not create official kynect referrals.

Patient-facing language must say:

- Resources are possible matches.
- Availability and eligibility must be confirmed.
- A navigator can help connect the patient.

## Need Categories

Initial categories:

- Transportation.
- Food.
- Housing.
- Utilities.
- Health.
- Mental health.
- Financial.
- Legal.
- General support.

## Resource Record Requirements

Each resource needs:

- Resource ID.
- Name.
- Need types.
- Counties or statewide flag.
- Summary.
- Contact path.
- Source name.
- Source URL.
- Verified date.
- Referral mode.
- Trust tier.
- Review due date.

## Trust Tiers

| Tier | Meaning | Use |
|---|---|---|
| Tier 1 | Official kynect/211 or partner feed | Preferred |
| Tier 2 | State/county agency source | Usable with provenance |
| Tier 3 | Curated local guide | Usable after navigator confirmation |
| Tier 4 | Patient/community reported | Navigator verification required before sharing |

## Navigator Resource Workflow

1. Confirm patient need and urgency.
2. Confirm patient consent before sharing contact details.
3. Check the resource source and verified date.
4. Determine whether resource is kynect/211, KY Partner, local agency, or local guide.
5. Confirm availability, eligibility, and contact path.
6. Document outcome: connected, pending, ineligible, unreachable, declined, or stale.
7. Update resource catalog issue if stale.

## Stale Resource Handling

Mark a resource as stale when:

- Phone/email fails.
- Hours differ from source.
- Eligibility differs from source.
- Program is closed.
- Patient or navigator reports failed connection.

Stale resources stay visible only if labeled and reviewed by the resource owner.

## Production Integration Options

| Option | Description | When To Use |
|---|---|---|
| Partner access | Authorized kynect/211 workflow with referrals | Best for production |
| Approved cached feed | Periodic export/import from authorized source | Best for pilot if API is not available |
| Curated county catalog | Manual source-provenance catalog | Best for early prototype and tabletop |
| Navigator-only lookup | Navigator searches official system outside app | Safe fallback |

## Measurement

Track:

- Resource searches.
- Resource connection requests.
- Navigator-confirmed connections.
- Failed/stale resource attempts.
- Need type by county.
- Time from resource request to navigator action.
- Resource outcomes by source tier.
