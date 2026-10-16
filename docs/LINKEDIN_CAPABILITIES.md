# LinkedIn Capabilities & Technical Feasibility Report

**Document Status:** Complete & Verified  
**Date Checked:** October 2026  
**Primary Sources:**
- [Sign In with LinkedIn using OpenID Connect (Microsoft Learn)](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-using-openid-connect)
- [LinkedIn Connections API Guide (Microsoft Learn)](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api)
- [LinkedIn Compliance & Archiving APIs (Microsoft Learn)](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/compliance)
- [Export Connections from LinkedIn (LinkedIn Help Center)](https://www.linkedin.com/help/linkedin/answer/a1339364)

---

## 1. Executive Summary & Feasibility Verdict

CareerConnect AI's architecture is engineered around the strict realities of LinkedIn's current developer policies and API constraints:
1. **Connection Sync via API:** **Not Feasible for General Apps.** LinkedIn's `r_1st_connections` API is closed and restricted to approved enterprise/compliance partners.
2. **Automated Messaging via API:** **Not Feasible for General Apps.** Direct messaging APIs are restricted to enterprise partner programs.
3. **Primary Data Source:** **Official Member Data Export (`Connections.csv`).** Every LinkedIn member has a legal and self-serve right to download their first-degree connection archive.
4. **Outreach Execution Model:** **100% Manual.** CareerConnect AI assists with scoring and drafting personalized messages. The user copies the text, opens the LinkedIn profile in their own browser, and sends the message themselves.

---

## 2. Detailed Technical Findings

### A. Sign In with LinkedIn using OpenID Connect (OIDC)
- **Classification:** **Available now** (Self-serve)
- **Documentation Link:** [learn.microsoft.com/.../sign-in-with-linkedin-using-openid-connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-using-openid-connect)
- **How It Works:** Any registered developer can create a LinkedIn app and request access to the self-serve "Sign In with LinkedIn using OpenID Connect" product without enterprise review.
- **Available Scopes:**
  - `openid`: Mandatory scope to request OIDC authentication and receive an ID token.
  - `profile`: Grants the member's basic lite profile.
  - `email`: Grants the member's primary email address and verification state.
- **Data Returned:**
  The identity claims are returned inside the cryptographically signed JWT **ID Token** as well as via the standardized UserInfo endpoint (`GET https://api.linkedin.com/v2/userinfo`):
  - `sub`: Unique opaque identifier for the member.
  - `name`: Full name of the member.
  - `given_name`: First name.
  - `family_name`: Last name.
  - `picture`: URL to public profile avatar image.
  - `email`: Member's verified primary email address.
  - `email_verified`: Boolean indicator.
- **Critical Limitation:** OIDC returns **only identity claims**. It does **not** return the user's connection list, work history, skills, endorsements, or messages.

---

### B. Member Connections Access API
- **Classification:** **Requires LinkedIn Approval (Restricted / Partner Only)**
- **Documentation Link:** [learn.microsoft.com/.../connections-api](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api)
- **Findings:**
  - The historical `r_1st_connections` permission was deprecated for general public applications in 2015.
  - Access is restricted exclusively to approved enterprise partners (such as authorized compliance archiving systems via `r_compliance`).
  - No public or self-serve API endpoint exists that allows an ordinary web application to retrieve a member's 1st-degree connections list.
  - **Data Portability (EU DMA / GDPR):** While LinkedIn complies with EU Digital Markets Act (DMA) regulations for European Economic Area users, third-party programmatic real-time sync APIs are not offered to general developer applications.

---

### C. Member Messaging API
- **Classification:** **Requires LinkedIn Approval (Closed / Partner Only)**
- **Documentation Link:** [learn.microsoft.com/.../compliance](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/compliance)
- **Findings:**
  - LinkedIn does **not** offer a self-serve or public API for sending direct member-to-member messages or InMails.
  - Messaging access is strictly limited to closed enterprise partnership tiers (e.g. LinkedIn Talent Solutions, approved CRM partner integrations, or SEC/FINRA financial compliance archiving tools).
  - Any third-party tool claiming to offer automated messaging to ordinary users without enterprise partner approval relies on unauthorized browser automation or session hijacking, which explicitly violates LinkedIn's User Agreement and is strictly prohibited in this project.

---

### D. Member Data Export (`Connections.csv`)
- **Classification:** **Available now** (Self-serve user download)
- **Documentation Link:** [linkedin.com/help/linkedin/answer/a1339364](https://www.linkedin.com/help/linkedin/answer/a1339364)
- **How Members Obtain It:**
  1. Go to `Settings & Privacy` -> `Data Privacy`.
  2. Select `Get a copy of your data`.
  3. Select `Connections` and click `Request archive`.
  4. LinkedIn sends an email with a ZIP file containing `Connections.csv`.
- **File Structure & Preamble:**
  Raw exports from LinkedIn typically contain **3 to 4 instructional preamble lines** before the actual CSV header row:
  ```text
  Notes:
  1. When exporting your connection data, that only includes connections who have chosen to make their email address visible to connections...
  
  First Name,Last Name,URL,Email Address,Company,Position,Connected On
  ```
- **Standard Columns:**
  1. `First Name`: Connection's given name.
  2. `Last Name`: Connection's family name.
  3. `URL`: Link to member's LinkedIn profile page.
  4. `Email Address`: Member email (frequently empty unless connection allowed email visibility in privacy settings).
  5. `Company`: Current employer / organization.
  6. `Position`: Current job title / role.
  7. `Connected On`: Date connection was established (e.g., `15 Sep 2024` or `09/15/2024`).
- **Parsing Requirements:**
  - Parser must detect and skip preamble text lines until reaching the column header row.
  - Empty or missing fields (`Email Address`, `Company`, `Position`, `URL`) must be preserved as `"Unknown"` and never hallucinated.

---

### E. LinkedIn Connection Request Note Limits
- **Classification:** **Platform Policy & Input Limit**
- **Documented Limit:** **300 characters maximum** for personalized connection request notes.
- **Operational Reality:**
  - When sending an invitation to connect, LinkedIn enforces a strict 300-character ceiling for the optional note attached to the invitation.
  - Messages sent to existing 1st-degree connections (or InMails) allow longer messages (up to 8,000 characters).
  - **CareerConnect AI Enforcement:**
    - Real-time character counting is displayed on all drafts.
    - If a draft exceeds 300 characters, an honest warning is displayed: *"Draft exceeds LinkedIn's 300-character connection request note limit. It can only be sent as a standard direct message to an existing 1st-degree connection or InMail."*

---

## 3. Capability Registry & Status Matrix

The backend capability registry serves this matrix to both API consumers and the frontend:

| Feature / Action | Technical Status | UI Policy & Handling |
| :--- | :--- | :--- |
| **`linkedin_csv_import`** | **Available now** | Enabled. Primary method for loading connection data. |
| **`synthetic_data_generator`** | **Available now** | Enabled. Generates mock connection profiles for testing without real PII. |
| **`llm_outreach_drafting`** | **Available now** | Enabled. Generates structured message drafts tailored to target roles. |
| **`copy_to_send_workflow`** | **Available now** | Enabled. Copies draft to clipboard and provides direct link to connection's profile. |
| **`manual_send_tracking`** | **Available now** | Enabled. Allows user to manually log message status (e.g., "Manually Sent", "Awaiting Reply"). |
| **`linkedin_official_oauth`** | **Available now (Configurable)** | Disabled until developer client credentials are provided in `.env`. Honest badge indicates configuration state. |
| **`direct_connections_api`** | **Requires LinkedIn approval** | Disabled. Explanation: "LinkedIn Connections API requires enterprise partner approval. CSV export is used instead." |
| **`direct_linkedin_messaging`** | **Requires LinkedIn approval** | Disabled. Explanation: "Direct automated messaging requires an approved LinkedIn Partner API. Outreach must be sent manually." |
| **`automated_profile_scraping`** | **Not available / Prohibited** | Disabled permanently. Explanation: "Automated scraping is prohibited by policy and law." |

---

## 4. Architectural Decisions Based on Findings

1. **Connection Pipeline:**
   - The user imports their `Connections.csv` archive.
   - The backend validates headers, strips preambles, deduplicates entries, and stores connections under the user's isolated account.
2. **Outreach & Communication Pipeline:**
   - System scores and matches connections against the user's career targets.
   - LLM drafts personalized outreach using strict JSON schemas.
   - **Zero automated delivery:** User clicks "Copy Message", opens the contact's LinkedIn profile, and sends the message themselves.
   - The user manually records the status as "Sent Manually on LinkedIn" or "Awaiting Reply". Copying is never treated as sending.
