# Product Requirements Document (PRD)

## Factory-First Cloud ERP for Indian SMEs (working title: "FactoryERP")

|  |  |
| --- | --- |
| **Version** | 1.0 (Draft for review) |
| **Date** | 2 October 2026 |
| **Status** | Draft. Assumptions need validation through customer interviews |
| **Owner** | Founder / Product |
| **Basis** | Market research report (2 Oct 2026) and product architecture blueprint |

**How to read this document.** Evidence-backed statements cite the research report and carry a source name. Statements marked **\[A\]** are assumptions and **\[E\]** are estimates; both must be validated before commitments are made. Priority levels: **P0** = MVP (first 90 days), **P1** = by month 6, **P2** = by month 12, **P3** = later.

---

## 1. Executive Summary

FactoryERP is a cloud ERP for small and mid-size manufacturers in India, built around production, inventory, job-work and costing rather than treating manufacturing as an add-on. It targets factories with 20-100 employees and ₹5-50 crore turnover that currently run on Excel, Tally, Busy/Marg, WhatsApp and paper registers.

**Why now (research evidence)**

- India's ERP market is a first-purchase market: 2025 estimates range from USD 1.07B (Mordor) to USD 1.93B (IMARC); SMEs are the fastest-growing size band at 19.2% CAGR 2026-31 (Mordor Intelligence, 2026).
- 8.7 crore MSMEs are registered on Udyam (PIB, June 2026), and MSMEs contribute about 35.4% of manufacturing output (MSME fact sheet, Jan 2026).
- GST e-invoicing applies above ₹5 crore turnover, with 6-digit HSN codes and ITC-04 job-work reporting, pushing growing factories off simple billing tools (Taxaj 2026, Busy 2026).
- Zoho Inventory's own help centre says it does not support a manufacturing module; partners sell workarounds. Odoo has strong MRP but gates Studio, multi-company and external API behind its Custom plan, which rose 5-25% on 24 Sep 2026 (OEC.sh).

**Product thesis.** A factory ERP that goes live in days, handles job-work natively, works for operators in their language even offline, and charges per plant rather than per head.

---

## 2. Problem Statement

Small factories lose money from stock mismatches, production delays, wastage, unclear order-level costs, machine downtime, manual data entry and owner dependence **\[A, to validate in interviews\]**. Existing options fail them in different ways:

| Alternative | Why it falls short for small factories |
| --- | --- |
| Excel / paper / WhatsApp | No single truth, no audit trail, owner-dependent |
| Tally / Busy / Marg | Strong accounting and compliance; not a production system |
| Zoho One | Per-employee licensing (all employees must be licensed); no native manufacturing; no shop-floor execution (Aaxonix, partner commentary) |
| Odoo | Capable MRP but plan gating, partner dependency, implementation cost (OEC.sh, Braincuber) |
| ERPNext | Free software but lighter manufacturing and needs a technical partner (Ecosire) |
| Global ERPs (SAP B1, NetSuite, etc.) | Cost and complexity beyond target budget (Mordor: mid-market rollouts USD 150k-500k). *Not researched in depth.* |

Trade press reports that ERP projects in India often revert to spreadsheets and WhatsApp when usability and localisation are weak (Packaging South Asia).

---

## 3. Vision, Goals and Non-Goals

**Vision.** Every small factory in India runs its orders, stock, production and costs on one simple system the owner trusts and the operator actually uses.

**Business goals (first 18 months) \[E\]**

1. 20 paying factory customers by month 6; 100 by month 18.
2. Median go-live under 14 days using industry templates.
3. 90-day retention above 90% for factories live more than 30 days.
4. CAC payback under 12 months (benchmark: SMB SaaS 8-12 months, SaaSHero 2026).

**Product goals**

- G1: Order-to-invoice with correct stock and order-level costing.
- G2: Native job-work (challan to ITC-04) with no spreadsheet workaround.
- G3: Operator screens usable in 3 taps, in local languages, offline.
- G4: Coexist with Tally so CAs and owners adopt without risk.
- G5: AI that saves visible time (summaries, voice entry, document capture), always human-confirmed.

**Non-goals (MVP)** Full HRMS, POS, e-commerce storefront, CRM marketing automation, CAD/PLM, deep IoT/MES, advanced fixed assets, multi-country compliance.

---

## 4. Target Users and Personas

**Beachhead segment \[O\]:** job shops, metal fabrication/machining, plastics/injection moulding, tier-2/3 auto-component suppliers; 20-100 employees; ₹5-50 crore turnover; Tally + Excel today.

| Persona | Role in decision | Needs | Success looks like |
| --- | --- | --- | --- |
| **Owner / MD** | Economic buyer | Visibility without being on the floor, margin per order, cash | Daily WhatsApp summary; approves from phone |
| **Production head** | Champion / daily user | Plan, shortages, delays, scrap | Knows what runs today and what will be late |
| **Store keeper** | Daily user, gatekeeper | GRN, issue, count, no mismatch | Stock matches physical |
| **Accountant / CA** | Influencer | GST, e-invoice, clean export | No double entry; Tally export works |
| **Operator** | End user | Simple start/stop/qty entry in own language | Entry in under 30 seconds, works offline |

---

## 5. Competitive Positioning

**Positioning statement.** For small Indian manufacturers who outgrew Tally and Excel, FactoryERP is the cloud ERP that runs production, job-work and costing in 14 days, priced per plant, unlike Zoho (per-employee, no native manufacturing) and Odoo (per-user, plan-gated, partner-heavy).

| Dimension | Zoho One | Odoo | ERPNext | **FactoryERP** |
| --- | --- | --- | --- | --- |
| Native manufacturing | No (per Zoho KB) | Yes | Basic-good | **Core focus** |
| Job-work / ITC-04 | Manual journals | Customisation | Customisation | **Native** |
| Pricing basis | Per employee (₹1,500-2,999 reported, conflicting) | Per user (₹580-1,150+/user/month; Custom raised Sep 2026) | Free software + hosting | **Per plant, unlimited operators** |
| Offline vernacular operator app | No | Online tablet UI | No | **Yes** |
| Time to go-live | 8-12 weeks (partner claim, 20-50 staff) | Partner-dependent | Partner-dependent | **Target 14 days** |

*Pricing figures from partner and aggregator sites; verify on vendor pages before external use.*

---

## 6. Scope and Release Plan

| Release | Window | Theme |
| --- | --- | --- |
| **R1 (MVP)** | Day 0-90 | Order-to-dispatch for a single plant with job-work and GST invoicing |
| **R2** | Month 4-6 | Quality, scheduling, barcode, piece-rate, first AI features |
| **R3** | Month 7-12 | Multi-plant, OEE, API, e-commerce sync, advanced AI, security certification |

---

## 7. Functional Requirements

Format: **ID | Requirement | Priority**. "Parity" = expected from existing ERPs. "Edge" = differentiator.

### 7.1 Platform and Core

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-PL-01 | Multi-tenant SaaS with strict data isolation per tenant | P0 | Parity |
| FR-PL-02 | Role-based access control with module- and field-level permissions | P0 | Parity |
| FR-PL-03 | Immutable audit log of create/update/approve/delete with user, device, time | P0 | Parity |
| FR-PL-04 | Configurable approval workflows (PO, discount, stock adjustment, payments) | P0 | Parity |
| FR-PL-05 | UI in English and Hindi at launch; framework for additional Indian languages | P0 | Edge |
| FR-PL-06 | Excel/CSV import with validation and error report; Tally master/voucher import | P0 | Parity |
| FR-PL-07 | Document templates (invoice, challan, PO, job card) with company branding | P0 | Parity |
| FR-PL-08 | WhatsApp, SMS, email and in-app notifications with user preferences | P0 | Edge |
| FR-PL-09 | Single plant at launch; multi-company/multi-plant/multi-GSTIN | P2 | Parity |
| FR-PL-10 | Custom fields and no-code rules on core forms | P1 | Parity |
| FR-PL-11 | Public REST API and webhooks with API keys and rate limits | P2 | Parity |

### 7.2 Finance and GST

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-FI-01 | Chart of accounts, journals, ledgers, trial balance | P1 | Parity |
| FR-FI-02 | Sales/purchase invoices, credit/debit notes, receipts, payments | P0 | Parity |
| FR-FI-03 | GST-compliant invoicing with HSN (4/6 digit by turnover), tax calc, place of supply | P0 | Parity |
| FR-FI-04 | e-Invoice (IRN, QR) via a GST Suvidha Provider integration; retry queue | P0 | Parity |
| FR-FI-05 | e-Way bill generation, including inter-state job-work movement | P0 | Parity |
| FR-FI-06 | Receivable/payable ageing and payment reminders via WhatsApp | P0 | Parity |
| FR-FI-07 | Tally export/sync of masters and vouchers (coexistence mode) | P0 | Edge |
| FR-FI-08 | GSTR-2B reconciliation and ITC mismatch report | P1 | Parity |
| FR-FI-09 | TDS/TCS, bank statement import and reconciliation | P1 | Parity |
| FR-FI-10 | Multi-currency, export documentation data, budgets, fixed assets | P2 | Parity |

### 7.3 Sales and Purchase

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-SP-01 | Customer/vendor masters, price lists, credit limits | P0 | Parity |
| FR-SP-02 | Quotation to sales order to delivery challan to invoice | P0 | Parity |
| FR-SP-03 | RFQ, PO, GRN, purchase bill with 3-way match | P0 | Parity |
| FR-SP-04 | Purchase requisition auto-generated from shortage list | P0 | Edge |
| FR-SP-05 | Lead/pipeline CRM basics and follow-up reminders | P1 | Parity |
| FR-SP-06 | Vendor rating (delivery, quality, price) | P1 | Parity |
| FR-SP-07 | Customer portal for order status and invoices | P2 | Parity |

### 7.4 Inventory and Warehouse

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-IN-01 | Item master with UoM conversions, categories, variants | P0 | Parity |
| FR-IN-02 | Multi-warehouse stock, transfers, adjustments with reason codes | P0 | Parity |
| FR-IN-03 | Batch/lot tracking; append-only stock ledger as single source of stock truth | P0 | Parity |
| FR-IN-04 | FIFO and weighted-average valuation | P0 | Parity |
| FR-IN-05 | Reorder levels and low-stock alerts | P0 | Parity |
| FR-IN-06 | Physical stock count via phone with variance approval | P0 | Edge |
| FR-IN-07 | Barcode/QR label printing and scanning | P1 | Parity |
| FR-IN-08 | Bins/locations, serial numbers, expiry; ABC and dead-stock analysis | P1 | Parity |

### 7.5 Manufacturing

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-MF-01 | Multi-level BOM with versions, alternates, by-products | P0 | Parity |
| FR-MF-02 | Routings, operations, work centres with setup and run times | P0 | Parity |
| FR-MF-03 | Production plan from sales orders with material shortage list | P0 | Parity |
| FR-MF-04 | Work orders and job cards; manual and backflush material issue | P0 | Parity |
| FR-MF-05 | Scrap, rework and wastage entry with reason codes | P0 | Parity |
| FR-MF-06 | Order-level costing: material, labour, overhead, scrap; standard vs actual (basic) | P0 | Edge |
| FR-MF-07 | Full costing variance reports and per-order margin | P1 | Edge |
| FR-MF-08 | Finite-capacity scheduling with Gantt and drag-drop reschedule | P1 | Parity |
| FR-MF-09 | Machine/mould master, downtime reasons, utilisation | P1 | Parity |
| FR-MF-10 | Forward/backward traceability (raw lot to finished lot to customer) | P1 | Parity |
| FR-MF-11 | OEE dashboard; multi-plant production and inter-plant transfer | P2 | Parity |
| FR-MF-12 | Engineering change control for BOM revisions | P2 | Parity |
| FR-MF-13 | IoT/PLC counter ingestion through a gateway | P2-P3 | Delighter |

### 7.6 Job-Work (Subcontracting)

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-JW-01 | Job-work order and delivery challan for materials sent out | P0 | Edge |
| FR-JW-02 | Receipt of processed goods, process loss, job-worker charges | P0 | Edge |
| FR-JW-03 | ITC-04 report data (half-yearly above ₹5 crore, annual otherwise) | P0 | Edge |
| FR-JW-04 | Alerts before the one-year/three-year return time limits | P0 | Edge |
| FR-JW-05 | e-Way bill for inter-state job-work movement | P0 | Edge |

### 7.7 Quality and Maintenance

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-QM-01 | Incoming, in-process, final inspection checklists with photos | P1 | Parity |
| FR-QM-02 | NCR, CAPA, customer complaints, test certificates | P1 | Parity |
| FR-QM-03 | Machine register, preventive schedules, breakdown tickets with photo/voice | P1 | Parity |
| FR-QM-04 | Spare-parts stock, MTTR/MTBF reports | P2 | Parity |
| FR-QM-05 | SPC charts and supplier quality scorecards | P2 | Delighter |

### 7.8 Workforce

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-HR-01 | Employee master, attendance (app/biometric import), shifts, overtime | P1 | Parity |
| FR-HR-02 | Piece-rate and contract-labour wages from production entries | P1 | Edge |
| FR-HR-03 | PF, ESI, professional tax, payslips (or integration with an existing payroll tool) | P2 | Parity |

### 7.9 Shop-Floor App (Operator Terminal)

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-SF-01 | Job start/stop/pause, quantity good/reject, reason code in 3 taps or fewer | P0 | Edge |
| FR-SF-02 | Offline-first with local store and automatic sync; append-only events | P0 | Edge |
| FR-SF-03 | Icon- and photo-first UI; Hindi and English at launch | P0 | Edge |
| FR-SF-04 | Runs on low-end Android (2-3 GB RAM) as PWA | P0 | Edge |
| FR-SF-05 | QR scan for job card, lot and material | P1 | Edge |
| FR-SF-06 | Voice input for entries | P1 | Edge |
| FR-SF-07 | Shared-device login by PIN or QR badge | P0 | Edge |

### 7.10 Reporting and Dashboards

| ID | Requirement | Pri | Type |
| --- | --- | --- | --- |
| FR-RP-01 | Owner dashboard: today's production, dispatch, pending orders, low stock, cash in/out, machine status | P0 | Edge |
| FR-RP-02 | Standard sales, purchase, stock, ageing and GST reports with Excel/PDF export | P0 | Parity |
| FR-RP-03 | Order-wise profitability and wastage reports | P0-P1 | Edge |
| FR-RP-04 | Report builder and scheduled WhatsApp/email reports | P1 | Parity |

### 7.11 Integrations

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-IG-01 | GST e-invoice/e-way bill via GSP (buy, not build) | P0 |
| FR-IG-02 | WhatsApp Business API | P0 |
| FR-IG-03 | Tally import/export | P0 |
| FR-IG-04 | Payment gateway and UPI collection links | P1 |
| FR-IG-05 | Bank statement import/feeds | P1 |
| FR-IG-06 | Shopify, Amazon, Flipkart, WooCommerce order and stock sync | P2 |
| FR-IG-07 | Courier/logistics rate and tracking | P2 |
| FR-IG-08 | Biometric attendance devices; payroll tools (greytHR/Keka) | P1-P2 |

---

## 8. AI Requirements

**Principles.** AI suggests; humans confirm any posting that changes stock, cost or accounts. Every answer shows its source records. Tenant data stays isolated. Cost is controlled by using rules and small models for simple tasks and an LLM only where it adds value. Hindi/Punjabi accuracy is tested with real operators before release.

| ID | Feature | Behaviour | Pri |
| --- | --- | --- | --- |
| AI-01 | Daily owner summary | Morning WhatsApp digest: yesterday's output, dispatch, pending orders, risks | P1 |
| AI-02 | WhatsApp assistant | Owner asks "aaj ka dispatch?" or "ABC Ltd outstanding?"; approvals by reply | P1 |
| AI-03 | Voice entry | Operator speaks Hindi/English; draft production entry shown for confirm | P1 |
| AI-04 | Document capture | Photo of vendor bill/PO/challan becomes a draft GRN/bill | P1 |
| AI-05 | Smart import | Auto-mapping of Excel/Tally columns, duplicate and error detection | P0-P1 |
| AI-06 | Ask your data | Natural-language question returns table/chart via safe, read-only query templates | P1 |
| AI-07 | Stock and wastage anomaly detection | Flags unusual consumption or mismatch per item | P1 |
| AI-08 | Cost leakage detector | Highlights orders where usage exceeds BOM by a threshold, with likely causes | P1 |
| AI-09 | Reorder and demand forecast | Suggests purchase quantities using consumption and open orders | P1 |
| AI-10 | In-app copilot | Step-by-step help on the user's current screen | P1 |
| AI-11 | GST assistant | Warns on wrong HSN/rate, ITC mismatch, due dates | P1-P2 |
| AI-12 | Collections assistant | Prioritised reminders with suggested message | P1 |
| AI-13 | Delay prediction | Predicts late orders from capacity, materials and status | P2 |
| AI-14 | Scheduling optimiser | Heuristic/solver-based job sequencing | P2 |
| AI-15 | Predictive maintenance | Breakdown risk from downtime history and, later, sensor data | P2-P3 |
| AI-16 | Visual inspection | Defect detection from photos, per-product pilot | P3 |

**AI acceptance baseline \[A\]:** extraction fields above 90% correct on a test set before auto-fill is enabled; every AI-created record clearly labelled; user can disable AI per tenant. Customer data is not used to train shared models without explicit consent (confirm with counsel).

---

## 9. Key User Stories and Acceptance Criteria

**US-1 Create production from a sales order (Production head)**

- Given a confirmed sales order, when I generate a plan, then the system explodes the multi-level BOM and shows required vs available materials.
- Shortages offer one-click purchase requisition.
- Work orders carry order, BOM version and routing.

**US-2 Operator reports production offline**

- Given no internet, when the operator selects a job, taps start, enters good and reject quantity with reason, then the entry saves locally and appears as pending.
- On reconnect, entries sync in order without duplicates; stock and cost update.
- Entries cannot be edited, only corrected by a new entry.

**US-3 Send material for job-work (Store keeper)**

- Given a job-work order, when material is sent, then a delivery challan prints, stock moves to job-worker location, and an e-way bill is created if inter-state.
- Receipt records returned quantity, process loss and charges.
- ITC-04 data lists open and closed challans; open items alert before the time limit.

**US-4 Invoice with e-invoice (Accountant)**

- Given a dispatched order above the e-invoice threshold, when I post the invoice, then an IRN and QR are obtained and printed.
- On GSP failure, the invoice stays in a retry queue with visible status.

**US-5 Know order margin (Owner)**

- Given a completed order, the order report shows material, labour, overhead and scrap cost against invoice value, with variance versus standard.

---

## 10. Non-Functional Requirements

| Area | Requirement (starting targets) \[E\] |
| --- | --- |
| Performance | Core pages under 2 s on 4G; operator actions confirm in under 1 s locally |
| Availability | 99.5% monthly uptime in year 1; planned maintenance out of shift hours |
| Offline | Operator app works 8+ hours offline; conflict-free sync |
| Scalability | 500 tenants and 50,000 daily production events without architecture change in year 1 |
| Security | Encryption in transit and at rest, 2FA for admins, RBAC, audit log, daily backups with point-in-time restore |
| Data residency | India-region hosting; legal review of the Digital Personal Data Protection Act obligations (not researched) |
| Compliance roadmap | SOC 2 / ISO 27001 groundwork in year 1 |
| Usability | Operator tasks at 3 taps or fewer; training under 1 hour for operators |
| Compatibility | Android 8+ with 2 GB RAM; latest two versions of Chrome/Edge/Safari |
| Accessibility and localisation | Indian-language support, large touch targets, icon-first |
| Data portability | Full export in CSV/Excel at any time |

---

## 11. System Architecture Summary

- **Style:** modular monolith with clear module boundaries; services split later if needed.
- **Layers:** clients (web, PWA, shop-floor app, WhatsApp) > API gateway/auth > core modules > event bus > PostgreSQL (multi-tenant, row-level security), object storage, search/cache, AI layer.
- **Principles:** API-first, event-driven, append-only stock ledger, offline-first sync, audit everywhere, template-driven onboarding.
- **Suggested stack \[O\]:** PostgreSQL; Python (Django/FastAPI) or Node (NestJS); React web; PWA for operator app; SQLite/IndexedDB offline store; Redis queue; S3-compatible storage; India-region cloud.
- **Build vs buy:** buy GST e-invoice/e-way (GSP), WhatsApp API, payments, speech/OCR where quality is proven; build BOM, job-work, costing, operator app (the moat).
- **Core data chain:** SalesOrder > ProductionPlan > WorkOrder > JobCard > StockMovement > CostEntry; PurchaseOrder > GRN > Inspection > Bill; JobWorkOrder > ChallanOut > ChallanIn > ITC-04; Invoice > IRN > EwayBill.

See the Product Architecture document for the full diagram.

---

## 12. Compliance Requirements (India)

| Requirement | Source | Product impact |
| --- | --- | --- |
| E-invoicing for aggregate turnover above ₹5 crore (applies permanently once crossed) | Busy, Equitylist 2026 | FR-FI-04; threshold check per GSTIN/PAN |
| 6-digit HSN above ₹5 crore, 4-digit up to it (B2B) | Taxaj 2026 | Item master and invoice validation |
| 30-day IRP reporting window for ₹10 crore+ | Taxaj, Sansa Legal 2026 | Alert on late reporting |
| Job-work under delivery challan; ITC-04 half-yearly above ₹5 crore, annual up to it | Taxaj 2026 | FR-JW-01 to 05 |
| E-way bill for inter-state job-work regardless of value | Taxaj 2026 | FR-JW-05 |

*GST rules change often. Legal/CA review required before release and each quarter.*

---

## 13. Pricing and Packaging (Hypothesis)

| Tier | Price / month \[A\] | Contents |
| --- | --- | --- |
| Starter | ₹2,999 | 1 plant, 5 office users, unlimited operator terminals, inventory, BOM, work orders, GST invoicing |
| Growth | ₹7,999 | + job-work, costing, quality, barcode, WhatsApp alerts, Tally export |
| Plus | ₹15,000-25,000 | + multi-plant, maintenance, API, priority support |
| Onboarding | ₹25,000-75,000 one time | Template setup, data import, 2 on-site days |

Rationale: per-plant pricing avoids the headcount penalty of Zoho One's all-employee licensing and Odoo's per-user model. Prices are untested; run willingness-to-pay interviews and paid pilots.

---

## 14. Go-to-Market Summary

- **Beachhead:** one segment in one industrial cluster you can visit weekly.
- **Pilot:** 60-day paid pilot with outcome targets (stock variance, delivery delays, cost per order).
- **Channels:** CA and cost-accountant partners (20-30% first-year margin \[A\]), industry associations, machinery dealers, content/SEO ("job work challan format", "ITC-04 software").
- **Proof:** two measured case studies by month 6.

---

## 15. Success Metrics

| Category | Metric | Target \[E\] |
| --- | --- | --- |
| Adoption | Median days to go-live | ≤ 14 |
| Activation | Factories posting daily production by day 14 | ≥ 70% |
| Engagement | Operator entries per active factory per day | Trending up weekly |
| Value | Stock variance reduction after 90 days | ≥ 30% (self-reported baseline) |
| Retention | 90-day logo retention | ≥ 90% |
| Revenue | MRR, ARPA | Track from first pilot |
| Efficiency | CAC payback | \< 12 months |
| Satisfaction | NPS from owners and production heads | ≥ 40 |
| AI | % AI suggestions accepted; extraction accuracy | Track per feature |

Benchmark context: SMB SaaS monthly churn commonly 3-5% (Optifai 2026); the retention target is deliberately higher because factory systems embed in daily operations. This is unproven.

---

## 16. Risks and Mitigations

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | Shop-floor non-adoption | Operator-first UX, vernacular, on-site training, owner dashboards that reward data entry |
| 2 | Long sales cycles | Paid pilots, CA partners, template demos |
| 3 | Onboarding too heavy | Templates, AI import, strict MVP scope |
| 4 | GST rule changes | Buy GSP, quarterly CA review, config-driven rules |
| 5 | Zoho/Tally/Odoo respond | Deepen job-work and vernacular niche; speed |
| 6 | Support overload | In-app guides, copilot, status pages |
| 7 | Security incident | Backups, audit logs, access control, certification path |
| 8 | Founder bandwidth | One segment, one cluster, 90-day MVP gate |
| 9 | AI errors or cost | Human confirm, thresholds, per-tenant limits |
| 10 | Funding runway | Onboarding fees, annual prepay discounts |

---

## 17. Dependencies and Assumptions

**Dependencies:** GSP provider; WhatsApp Business API approval; speech/OCR vendors; India-region cloud; CA/legal review. **Assumptions to validate:** target segment and size; willingness to pay per plant; offline need; Tally coexistence over replacement; first two languages; availability of 5 friendly pilot factories.

---

## 18. Open Questions

1. Which cluster and segment first (job shop vs plastics)?
2. Native accounting at P1, or only Tally coexistence?
3. Fork an open-source core or build the factory core from scratch (recommended)?
4. Which two languages after Hindi/English?
5. First AI feature to ship: daily owner summary or WhatsApp assistant (recommended)?
6. Funding path and runway?
7. Final price points after interviews?

---

## 19. Appendix

**A. Research evidence limits.** Market-size estimates differ roughly 5x across publishers. G2 holds only 18 Odoo MRP reviews, so competitor weaknesses draw partly on partner commentary. SAP B1, NetSuite, Dynamics 365 BC, Acumatica, Epicor, Katana, Fishbowl and MRPeasy were not researched in depth. Zoho One India pricing sources conflict.

**B. Source list (from research report).**

- Mordor Intelligence, India ERP: [https://www.mordorintelligence.com/industry-reports/india-enterprise-resource-planning-market](https://www.mordorintelligence.com/industry-reports/india-enterprise-resource-planning-market)
- IMARC India ERP: [https://www.imarcgroup.com/report/en/india-enterprise-resource-planning-market](https://www.imarcgroup.com/report/en/india-enterprise-resource-planning-market)
- erp-software.org, India: [https://erp-software.org/en/erp-worldwide/india/](https://erp-software.org/en/erp-worldwide/india/)
- PIB, The MSME Story (Jun 2026): [https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jun/doc2026626903401.pdf](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/jun/doc2026626903401.pdf)
- MSME fact sheet via IANS: [https://askfuzz.ai/discover/news/msmes/indias-msmes-contribute-31-1-to-gdp-48-58-to-exports](https://askfuzz.ai/discover/news/msmes/indias-msmes-contribute-31-1-to-gdp-48-58-to-exports)
- Zoho Inventory KB: [https://www.zoho.com/inventory/kb/general-overview/zom-manufacturing-support.md](https://www.zoho.com/inventory/kb/general-overview/zom-manufacturing-support.md)
- Aaxonix (Zoho pricing, manufacturing): [https://aaxonix.com/resources/zoho-one-pricing-explained/](https://aaxonix.com/resources/zoho-one-pricing-explained/) and [https://aaxonix.com/resources/zoho-erp-manufacturing-india/](https://aaxonix.com/resources/zoho-erp-manufacturing-india/)
- OEC.sh, Odoo India pricing and Sep 2026 increase: [https://oec.sh/odoo-pricing/india](https://oec.sh/odoo-pricing/india) and [https://oec.sh/blog/odoo-price-hike-2026-09](https://oec.sh/blog/odoo-price-hike-2026-09)
- Braincuber, Odoo India cost: [https://www.braincuber.com/blog/odoo-implementation-cost-india-2026-full-breakdown](https://www.braincuber.com/blog/odoo-implementation-cost-india-2026-full-breakdown)
- Ecosire, ERPNext pricing: [https://ecosire.com/blog/erpnext-pricing-explained-2026](https://ecosire.com/blog/erpnext-pricing-explained-2026)
- G2, Odoo MRP: [https://www.g2.com/products/odoo-mrp/reviews](https://www.g2.com/products/odoo-mrp/reviews)
- Taxaj, GST for manufacturers: [https://www.taxaj.com/learn/?p=486](https://www.taxaj.com/learn/?p=486)
- Busy, e-invoicing limit: [https://busy.in/gst/e-invoicing-turnover-limit-vs-gst-threshold-whats-the-difference-and-why-it-matters/](https://busy.in/gst/e-invoicing-turnover-limit-vs-gst-threshold-whats-the-difference-and-why-it-matters/)
- Packaging South Asia, ERP adoption: [https://packagingsouthasia.com/?p=114521](https://packagingsouthasia.com/?p=114521)
- Fungies/Optifai SaaS benchmarks: [https://fungies.io/saas-market-statistics-2026-6/](https://fungies.io/saas-market-statistics-2026-6/)
- SaaSHero CAC benchmarks: [https://www.saashero.net/?p=11387](https://www.saashero.net/?p=11387)

**C. Glossary.** BOM: bill of materials. GRN: goods received note. GSP: GST Suvidha Provider. IRN: invoice reference number. ITC-04: GST form for job-work goods. MRP: material requirements planning. NCR/CAPA: non-conformance report / corrective and preventive action. OEE: overall equipment effectiveness. PWA: progressive web app.