+++
title = 'Finding the Name Is Not Enough'
date = 2026-08-31T18:15:20+07:00
draft = true
tags = ['address-quality', 'engineering', 'indonesia']
description = 'How Address Quality turns place names into possible locations, then uses the administrative hierarchy to decide which possibility makes sense.'
series = ['Address Quality']
part = 4
+++

## Start with one complete address

Take this address:

```text
JL. LLRE MARTADINATA ST NO.97, CITARUM, Kec. BANDUNG WETAN,
BANDUNG CITY, WEST JAVA 40115
```

A person familiar with Bandung can probably read it without much effort. It points to:

```text
West Java
-> Bandung City
-> Bandung Wetan
-> Citarum
-> 40115
```

Software does not get that understanding for free.

It sees a line of words. Some describe a road. Some describe administrative areas. Some may be names that exist in several parts of Indonesia. The postal code helps, but it should not be the only thing holding the result together.

This is the basic problem behind [Address Quality](https://samaita.com/projects/address-quality/). How can the software turn those words into one administrative location without pretending that every name match is already an answer?

The first version uses a simple idea:

> A word match creates a possibility. A matching hierarchy makes it credible.

That difference between a possibility and a credible location is where most of the algorithm lives.

## Find the longest known place name

The engine first looks for administrative names it recognizes in the address.

In this example, `Citarum` is a known subdistrict. `Bandung Wetan` is a known district. `Bandung` is also a known administrative name. The postal code `40115` is another clue.

I call a recognized clue **evidence**. Evidence is a phrase from the input that may refer to one or more administrative entities. It is not the final answer.

The phrase part matters.

`Bandung Wetan` is one district name. The matcher searches for the longest known phrase starting at each point in the address, so it recognizes `Bandung Wetan` before considering the shorter `Bandung` at that same position.

If I split it into two independent clues, I would manufacture evidence that the person did not provide:

```text
Wrong idea:
"Bandung Wetan" -> "Bandung" + "Wetan"
```

Now `Bandung` could appear to support every city, district, or subdistrict with that name. The software would have created ambiguity by breaking a valid place name apart.

Preserving the longest phrase does not mean every phrase has only one meaning. The same normalized name can still exist at different administrative levels or in different regions. It only means the engine should not weaken a known phrase before it starts resolving what that phrase could mean.

## Turn evidence into candidates

Finding `Citarum` in the reference data tells the engine that Citarum is possible. It still needs to ask: which Citarum, and where does it belong?

Each matched administrative entity becomes a starting point. The engine then restores the parent hierarchy available from that point.

For the Citarum in this address, the reference hierarchy gives:

```text
Citarum
-> Bandung Wetan
-> Kota Bandung
-> Jawa Barat
-> 40115
```

That restored path is a **candidate**: a possible administrative location that could explain the evidence.

The engine does not literally begin at province and search downward. Matches are discovered independently. A province match can start one candidate. A city match can start another. A district or subdistrict match can start another.

The hierarchy is filled upward from each matched entity where the parent relationship is known. A subdistrict can restore its district, city, and province. A district can restore its city and province, but it cannot invent a subdistrict below it.

This distinction helps:

| Term | Meaning |
|---|---|
| Evidence | A recognized phrase or postal code from the input that may point to one or more entities |
| Candidate | The administrative path the engine can build from one of those matched entities |

Several pieces of evidence can support the same candidate. `Citarum`, `Bandung Wetan`, `Bandung`, and `40115` can all point toward the same Bandung hierarchy.

Ambiguous names can do the opposite. One phrase may refer to entities in different hierarchies, producing several candidates. The engine keeps those possibilities instead of choosing the first database row it finds.

## Let the hierarchy choose the winner

Once the candidates exist, the engine asks how much of the address each one explains.

The expected candidate has a useful advantage. Its pieces agree:

```text
Citarum belongs to Bandung Wetan
Bandung Wetan belongs to Kota Bandung
Kota Bandung belongs to Jawa Barat
40115 supports Citarum
```

The candidate is not credible only because `Citarum` appeared in the input. It is credible because the other recognized evidence supports the same hierarchy.

Another candidate might match one name from the address. That makes it possible, but not equally convincing. If it cannot explain Bandung Wetan, the city, or the postal code, it should rank below the candidate that connects those clues.

The engine checks that city and province agree, district and city agree, and subdistrict and district agree. It also checks which evidence belongs to each candidate and whether the postal code supports the resolved subdistrict.

It then ranks the candidates by their support. If confidence is tied, the engine prefers the candidate with more of the administrative path filled, then the one with fewer conflicts.

I do not want to present this as a perfect measure of truth. A hierarchy can be internally valid and still be the wrong interpretation of a messy address. But checking agreement across several levels is stronger than trusting one matching word.

That is the base resolution logic in one sentence:

> Find the possible places first. Trust the one that explains the address as one consistent hierarchy.

## Real addresses do not always give enough evidence

The example above is generous. It includes a subdistrict, district, city, province, and postal code. Most real addresses are less cooperative.

Someone may write only a road and city. A place name may be misspelled. An old postal code may disagree with current reference data. The same name may exist at several levels, and the remaining text may not be enough to separate them.

Longest-phrase matching cannot fix a spelling it does not recognize. Hierarchy checks cannot recover evidence that was never written. A candidate may still look reasonable while leaving part of the address unexplained.

So the first version is not trying to make uncertainty disappear. It is trying to keep a name match in its proper place.

A match is a possibility. The hierarchy tells us whether the rest of the address supports it.

That is more useful than treating the first familiar word as the answer, but it still leaves the hardest question for later: what should the engine do when the address does not provide enough evidence to choose safely?
