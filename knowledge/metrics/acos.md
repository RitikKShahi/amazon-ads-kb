---
type: Reference
title: ACOS (Advertising Cost of Sale)
description: A metric measuring ad spend as a percentage of attributed sales.
tags: [amazon-ads, metrics, ppc]
timestamp: 2026-07-14T00:00:00Z
sources:
  - url: https://advertising.amazon.com/about-api
    official: true
    first_seen: 2026-07-10
    last_confirmed: 2026-07-14
confidence: medium
---

# ACOS (Advertising Cost of Sale)

ACOS measures ad spend as a percentage of the sales that spend generated.
It's calculated as ad spend divided by attributed sales, expressed as a
percentage. A lower ACOS means more sales per dollar of ad spend.

# Details

- ACOS is campaign- or account-scoped: it only counts sales attributed to
  ads, not total store sales.
- Related metric: see [TACOS](/metrics/tacos.md), which measures ad spend
  against *total* sales instead of just attributed sales.

# Citations

- [Amazon Ads](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-14
