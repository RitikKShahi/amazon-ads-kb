---
type: Reference
title: Sponsored Products Match Types
description: The three keyword match types (EXACT, PHRASE, BROAD) that control which searches trigger Sponsored Products ads.
tags: [amazon-ads, sponsored-products, targeting, keywords, match-types]
timestamp: 2026-07-14T00:00:00Z
sources:
  - url: https://advertising.amazon.com/solutions/products/sponsored-products
    official: true
    first_seen: 2026-07-14
    last_confirmed: 2026-07-14
confidence: high
---

# Sponsored Products Match Types

Sponsored Products match types determine how closely a customer's search query must match a targeted keyword for an ad to be displayed. The three match types—EXACT, PHRASE, and BROAD—offer varying levels of targeting precision and reach.

# Details

## Match Type Overview

Each match type provides different control over which searches trigger your ads, allowing advertisers to balance between precise targeting and broad discovery:

- **EXACT**: Most precise targeting, highest control
- **PHRASE**: Moderate targeting with some flexibility  
- **BROAD**: Broadest reach, most discovery potential

## EXACT Match Type

EXACT match targeting displays ads only when a shopper's search query exactly matches the targeted keyword or close variations of it.

### Matching Behavior

EXACT match triggers ads for searches that:
- Exactly match the keyword (e.g., "running shoes" matches "running shoes")
- Include close variations like misspellings, singular/plural forms, acronyms, and stemming
- Do NOT include additional words before or after the keyword

### Use Cases

EXACT match is ideal for:
- **High-intent searches**: Customers searching for specific products
- **Known converting terms**: Keywords with proven performance
- **Budget control**: Limiting spend to the most relevant searches
- **Precision testing**: Testing specific keyword performance

## PHRASE Match Type

PHRASE match targeting displays ads when a shopper's search query contains the exact keyword phrase, preserving the word order but allowing additional words before or after.

### Matching Behavior

PHRASE match triggers ads for searches that:
- Contain the keyword phrase in exact word order (e.g., "running shoes" matches "red running shoes" and "running shoes for men")
- Allow additional words before or after the keyword
- Maintain the original phrase structure and word sequence
- Include close variations like misspellings and plural forms

### Use Cases

PHRASE match is ideal for:
- **Balanced targeting**: More control than BROAD, more reach than EXACT
- **Specific product features**: Targeting searches that include specific attributes
- **Keyword modifiers**: Capturing searches with descriptive words
- **Incremental reach**: Expanding reach while maintaining relevance

## BROAD Match Type

BROAD match targeting provides the widest reach by displaying ads when a shopper's search query includes any words in the target keyword, in any order, along with related searches.

### Matching Behavior

BROAD match triggers ads for searches that:
- Include any words from the keyword in any order
- Include related searches and synonyms
- Allow significant variation from the original keyword
- May include searches that don't contain the exact keyword terms

### Use Cases

BROAD match is ideal for:
- **Discovery campaigns**: Finding new relevant keywords and customer search patterns
- **New product launches**: Identifying which search terms customers use
- **Market research**: Understanding customer search behavior
- **Keyword expansion**: Building lists of effective EXACT and PHRASE match keywords

## Strategic Selection

Choosing the right match type depends on campaign objectives:

| Goal | Recommended Match Types |
|------|------------------------|
| Maximum precision | EXACT |
| Controlled expansion | EXACT + PHRASE |
| Discovery and research | BROAD (then convert to EXACT/PHRASE) |
| Full campaign strategy | Combination of all three |

## Performance Optimization

Effective match type strategies often involve:

1. **Starting with BROAD**: Use BROAD match to discover converting search terms
2. **Harvesting keywords**: Identify high-performing search queries from BROAD match
3. **Converting to precise targeting**: Move converting terms to EXACT or PHRASE match
4. **Negative keyword refinement**: Add non-converting terms as negative keywords
5. **Continuous optimization**: Regularly update match type assignments based on performance

# Citations

- [Amazon Ads Sponsored Products](https://advertising.amazon.com/solutions/products/sponsored-products) — official, last confirmed 2026-07-14