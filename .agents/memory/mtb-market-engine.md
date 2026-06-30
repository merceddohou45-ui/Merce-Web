---
name: MTB market engine decisions
description: Key decisions and bugs fixed in marketEngine.ts and twelveData.ts during MTB import
---

## maxScore context-aware normalization

**Rule:** `const maxScore = h4 ? 127 : 110;`

**Why:** H4 timeframe adds 17 pts of bonus scoring (macro filter +12, EMA stack +5). With a fixed maxScore of 127 and the 88% confidence threshold, signals generated without H4 data can only reach 110/127 ≈ 86.6% — silently below threshold, breaking the "continue without H4" design intent.

**How to apply:** Any time the confidence normalization step is touched in `scoreMTF`, ensure maxScore reflects which timeframes were actually fetched.

## twelveData.ts type narrowing bug

**Rule:** Always guard `data.price` with `typeof data.price === "string"` after `"price" in data`.

**Why:** `BatchPriceResponse` is `{ [symbol: string]: { price?: string; ... } }`. TypeScript sees `BatchPriceResponse["price"]` as a valid index-access returning an object, so after `"price" in data`, `data.price` is typed as `string | { price?: string; ... }`. Without the `typeof` guard, `parseFloat(data.price)` fails the TS compiler (TS2345).

**How to apply:** When narrowing from `BatchPriceResponse | PriceResponse`, use both `"price" in data && typeof data.price === "string" && data.price`.
