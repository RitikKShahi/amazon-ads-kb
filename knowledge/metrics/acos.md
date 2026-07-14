---
type: Reference
title: ACOS (Advertising Cost of Sale)
description: A metric measuring advertising spend as a percentage of advertising revenue, used to evaluate campaign profitability.
tags: [amazon-ads, metrics, ppc, performance]
timestamp: 2026-07-14T00:00:00Z
sources:
  - url: https://advertising.amazon.com/library/guides/acos-advertising-cost-of-sales
    official: true
    first_seen: 2026-07-14
    last_confirmed: 2026-07-14
  - url: https://advertising.amazon.com/library/guides/basics-of-success-understanding-amazon-advertising
    official: true
    first_seen: 2026-07-14
    last_confirmed: 2026-07-14
  - url: https://advertising.amazon.com/about-api
    official: true
    first_seen: 2026-07-10
    last_confirmed: 2026-07-14
  - url: https://www.helium10.com/blog/what-is-amazon-tacos
    official: false
    first_seen: 2026-07-14
    last_confirmed: 2026-07-14
confidence: high
---

# ACOS (Advertising Cost of Sale)

ACOS (Advertising Cost of Sale) measures the ratio of advertising spend to advertising revenue, expressed as a percentage. It indicates how much of every dollar earned from advertising is spent on ads, helping advertisers determine if campaigns are profitable and evaluate advertising investment efficiency.

# Details

## Definition and Calculation

ACOS is a Key Performance Indicator (KPI) used to measure the success of advertising campaigns by comparing ad spend against the revenue generated from that spend. The formula is:

```
ACOS = (ad spend ÷ ad revenue) × 100
```

ACOS is calculated as ad spend divided by attributed sales and is used to measure the performance of Sponsored Products and Sponsored Brands campaigns. For Sponsored Products campaigns, ACOS represents the ratio of ad spend to promoted product sales. For Sponsored Brands campaigns, it represents the ratio of ad spend to overall brand sales.

## What is a Good ACOS?

There is no single definitive number for what constitutes a good ACOS — targets depend on factors including industry, company size, and campaign frequency. Each brand has different ACOS targets based on their goals:

- **For increasing sales**: Focus on growth and customer acquisition
- **For increasing brand awareness**: May accept higher ACOS to gain visibility
- **For maintaining profit**: ACOS must be lower than profit margins

The **break-even ACOS** is directly related to profit margins. To maintain profit, ACOS must be lower than the profit margin. If ACOS is higher than profit margin, you're spending more on ads than you earn. The first step should be achieving break-even ACOS and comparing it with profit margins.

## Usage Considerations

ACOS should not be the only campaign metric to focus on — it's one facet of advertising campaigns and doesn't account for variables between different campaigns. It should be considered alongside other metrics including:

- [Impressions](/metrics/impressions.md)
- [Conversion Rate (CVR)](/metrics/conversions.md)
- [CTR](/metrics/ctr.md)
- [ROI](/metrics/roi.md)
- [ROAS](/metrics/roas.md)

New campaigns tend to have a high ACOS simply due to their novelty, which doesn't mean the campaign is a failure. Setting too low of an ACOS goal in the beginning can cause premature elimination of keywords that may eventually convert. When launching new products, high initial ACOS is often necessary as PPC serves as cost of initial research to discover converting keywords.

## Relationship to TACOS

ACOS measures the efficacy of advertising campaigns while [TACOS](/metrics/tacos.md) provides a holistic view of all sales in relation to advertising spend. Focusing only on ACOS creates tunnel vision and prevents seeing the big picture of PPC campaign strategy. While ACOS only considers ad-attributed sales, TACOS accounts for both ad and organic sales, acknowledging the symbiotic relationship between paid and organic sales that ACOS does not explicitly capture.

## Note

Multiple official Amazon sources provide consistent definitions of ACOS. An unofficial source (Helium10) emphasizes the limitation of focusing solely on ACOS without considering TACOS and organic sales impact. This aligns with Amazon's guidance to consider ACOS alongside other metrics rather than in isolation.

# Citations

- [Amazon Ads ACOS Guide](https://advertising.amazon.com/library/guides/acos-advertising-cost-of-sales) — official, last confirmed 2026-07-14
- [Amazon Ads Basics of Success](https://advertising.amazon.com/library/guides/basics-of-success-understanding-amazon-advertising) — official, last confirmed 2026-07-14
- [Amazon Ads API Documentation](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-14
- [Helium10: What is Amazon TACOS](https://www.helium10.com/blog/what-is-amazon-tacos) — unofficial, last confirmed 2026-07-14