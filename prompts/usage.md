# Veritas Lens - Operation Manual
## Overview
Veritas Lens is an autonomous, bias-minimized news aggregation platform running at the edge. It ingests global RSS feeds, clusters reporting into factual intersections, and neutralizes editorial slant to provide a 'Truth-First' intelligence digest.
## User Onboarding (The Walkthrough)
New operators are greeted with a visually immersive 4-step guided tour:
1. **Digital Broadsheet**: An overview of the high-authority Morning Briefing interface.
2. **Neutralization Cycle**: Explanation of the Trigger-Pull architecture and Centroid Synthesis.
3. **Reliability Registry**: Guidance on configuring publisher identities and political slant profiles.
4. **Audit Trail**: How to perform granular verification of synthesized clusters via the Deep Dive sheet.
## System Architecture
### 1. Ingestion Pipeline
The worker fetches raw XML from configured RSS endpoints using randomized User-Agents and exponential backoff retry logic.
### 2. Centroid Synthesis Algorithm
- **Normalization**: RSS items are cleaned of HTML boilerplate and normalized into Article objects.
- **Clustering**: articles are grouped using Jaccard Similarity on title and content snippet tokens.
- **Centroid Selection**: The article with the highest total similarity to its peers in the cluster is selected as the 'Representative Centroid'.
- **Slant Indexing**: Weighted average of configured source slants determines the cluster's political orientation.
### 3. Information Topology
Visualized via Recharts, the dashboard displays a Scatter plot of the reporting landscape:
- **X-Axis**: Political Slant Profile (Progressive to Conservative).
- **Y-Axis**: Reporting Density (Source Count).
- **Z-Axis (Radius)**: Network Consensus (Inverse of Information Entropy).
## Production Readiness Checklist
- [x] **A11y Compliant**: Radix UI aria-labels and descriptive headers.
- [x] **Internationalization Ready**: UTF-8 safe CSV encoding for global characters.
- [x] **Resilience**: Automatic sample seeding ensure no 'Empty State' fatigue for new users.
- [x] **Persistence**: Durable Objects handle high-concurrency state management.
## Support & Verification
Every synthesized story includes an 'Audit Trail' allowing operators to verify facts directly against the original source reporting. Intelligence reports can be exported as CSV for external forensic analysis.