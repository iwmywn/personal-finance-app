# vozix Domain Glossary

Core domain vocabulary and ubiquitous language for personal finance tracking in vozix.

## Language

### Schedules & Occurrences

**Recurring Schedule**:
A template defining financial parameters (amount, category, flow type, frequency, date boundaries) used to generate recurring transactions automatically over time.
_Avoid_: Recurring transaction, subscription, cron rule

**Occurrence**:
A concrete transaction produced from a recurring schedule representing a scheduled due date.
_Avoid_: Generated transaction, schedule instance, recurring item

### Currency & Valuation

**Base Currency**:
The system standard reference currency (USD) against which all exchange rates and currency conversions are pegged.
_Avoid_: Primary currency, default currency

**Exchange Rate**:
The relative conversion ratio between a foreign currency and the base currency for a specific UTC date.
_Avoid_: FX quote, currency price, conversion multiplier

**Rate Provider**:
An external source that supplies historical and current exchange rate data.
_Avoid_: Currency API, rate service

**Rate Synchronization**:
The process of fetching missing exchange rates from a rate provider, persisting them, and updating the missing rates queue.
_Avoid_: Rate scraping, FX polling, rate sync cron

**Nearest-Rate Interpolation**:
The heuristic algorithm that resolves the chronologically closest available exchange rate when an exact calendar date snapshot is missing.
_Avoid_: Rate fuzzy matching, date snapping, rate estimation
