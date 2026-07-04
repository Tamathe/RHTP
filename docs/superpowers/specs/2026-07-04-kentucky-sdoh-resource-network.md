# Kentucky SDOH Resource Network Design

## Goal
Connect the patient-facing SDOH experience to Kentucky-specific community resources, starting with a local prototype catalog that is shaped like a future kynect resources / Kentucky 211 connector.

## Source-Of-Truth Position
The production source-of-truth path should be kynect resources and Kentucky 211. CHFS describes kynect resources as a managed Kentucky directory built with United Way of Kentucky, covering housing, food, employment, transportation, health, finances, education, mental health and addiction, and legal help. Kentucky 211 provides 24/7 community-service navigation. Public materials also show kynect resources sharing SDOH information with KHIE workflows and receiving resource data from United Way 211.

The prototype must not pretend to create official referrals through kynect. It should show patient-facing matches with clear provenance and route "help me connect" actions to the navigator queue.

## First Prototype Scope
- Add a Kentucky resource matcher for SDOH needs.
- Support initial needs: transportation, food, housing, utilities, health, mental health, finances, legal, and general help.
- Filter by patient county and need type.
- Prefer local/county resources before statewide directories.
- Show source name, source URL, last verified date, and referral mode.
- Add a patient-facing resource panel to the Plan screen near the existing barrier buttons.
- Add a navigator handoff action when the patient wants help connecting to a resource.

## Data Model
Each resource record needs:
- `id`
- `name`
- `needTypes`
- `counties`
- `summary`
- `contact`
- `sourceName`
- `sourceUrl`
- `verifiedAt`
- `referralMode`

`counties` may contain `statewide` when a resource is available across Kentucky or is a directory/intake route.

## Patient Flow
1. Patient opens the Plan screen.
2. Resource panel defaults to the patient's county and transportation, because the current retinopathy wedge already collects transportation barriers.
3. Patient can switch needs.
4. The app shows matching Kentucky resources with provenance.
5. Patient can tap "Ask navigator to connect me."
6. The navigator queue receives a structured `sdoh_resource_connection` item with resource name, need type, county, and source.

## Navigator Flow
The navigator queue should label the item as "SDOH resource connection." The summary should identify the requested resource and need. The suggested action should tell the navigator to confirm availability/eligibility through kynect/211 or the listed source before telling the patient the connection is complete.

## Safety And Trust Boundary
- The app may suggest resources and collect consented help requests.
- The app must not guarantee availability, eligibility, transportation pickup, financial assistance, or referral completion.
- Official referrals and eligibility-sensitive actions should be navigator-mediated until partner access and data-sharing agreements are in place.
- Every resource shown should carry provenance.

## Sources Used For Prototype Seed
- CHFS kynect resources: https://www.chfs.ky.gov/agencies/ohda/Pages/kynectresources.aspx
- Kentucky 211: https://kentucky211.org/
- KYTC Human Services Transportation: https://transportation.ky.gov/TransportationDelivery/Pages/Human-Services-Transportation.aspx
- Kentucky Public Transit Association county directory: https://www.kypublictransit.org/transit-by-county
- Perry County Resource Guide: https://kirpky.com/wp-content/uploads/2024/09/Perry-County-Resource-Guide_Aug2024_FINAL-Public-version.pdf

## Out Of Scope
- Live kynect login or referral creation.
- Scraping resource directories at runtime.
- Real-time availability checks.
- Storing PHI outside the existing local prototype store.
