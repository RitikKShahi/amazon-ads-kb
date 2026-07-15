---
type: Reference
title: Amazon Ads API Access and Authentication
description: The application, approval process, and access models for using the Amazon Ads API
tags: [amazon-ads, api, authentication, access-control]
timestamp: 2026-07-15T00:00:00Z
sources:
  - url: https://advertising.amazon.com/about-api
    official: true
    first_seen: 2026-07-15
    last_confirmed: 2026-07-15
confidence: medium
---

# Amazon Ads API Access and Authentication

The Amazon Ads API requires an application and approval process before access is granted, with different access models depending on the user type and intended use case. The application and approval process varies based on organization categorization.

# Details

## Access Requirements

The Amazon Ads API requires a formal application and approval process before access is granted. However, the requirement to apply varies by user type:

- **Developers building applications** with the Amazon Ads API should apply for access
- **Advertisers using third-party tools** do not need to apply directly

## Access Models

### Partner Access
Partner access to the Amazon Ads API is designed for third-party businesses that build applications to automate advertising on behalf of others. Partners must register via the Amazon Partner Network to license their applications. This includes:

- Advertising solution providers who build paid tools for others
- Agencies with engineering resources managing significant campaign volume
- Software companies serving multiple advertisers

Two primary access paths exist:
- **Partners**: Register to call the API and license applications to others
- **Direct advertisers**: Register to access the API on behalf of their own accounts

### Direct Advertiser Access
Direct advertiser access allows advertisers to automate advertising activities on behalf of their own accounts. This model is for:

- Advertisers with engineering resources managing significant spend
- Companies managing their own advertising campaigns

Direct advertisers can access the API to automate, scale, and optimize their own advertising activities and reporting by requesting registration on behalf of their advertising account.

## Primary User Types

Three primary user types for the Amazon Ads API:

1. **Advertising solution providers** - third-party businesses building advertising automation tools
2. **Agencies with engineering resources** - managing advertising for multiple clients
3. **Advertisers with engineering resources** - managing their own advertising accounts with significant campaign volumes

## Cost

There are no additional fees from Amazon Ads to use the API beyond standard Amazon selling account fees and advertising campaign costs.

## Finding Partners

The Amazon Ads partner directory allows advertisers to find solution providers by filtering based on:

- Products supported
- Marketplaces served
- Service model (managed service vs. self-service tools)

# Citations

- [Amazon Ads API Overview](https://advertising.amazon.com/about-api) — official, last confirmed 2026-07-15
