+++
title = 'How I Benchmark Address Quality'
date = 2026-09-08T17:08:45+07:00
draft = true
tags = [address-quality]
+++

In the [previous post](https://samaita.com/posts/how-i-built-address-quality-api-to-read-indonesian-addresses/), I wrote about how Address Quality interprets an address. It extracts evidence, builds possible candidates, then ranks them based on how well they match the available evidence.

I can try several addresses and see that the engine returns something reasonable. But that doesn't tell me much about how well it actually works.

**How do I know if the engine behaves like I intended?**

Trying addresses manually is useful while building it, but it becomes a problem when I start changing the engine. If I change the ranking logic and five addresses suddenly look better, I still don't know whether the engine actually improved or I just happened to test five addresses that worked.

I needed something I could run again and compare.

## Testing On 106 Addresses

I gathered 106 different addresses available online, all from Bandung. Most of them are normal addresses. I didn't intentionally make them messy or fill the dataset with difficult edge cases.

I made small adjustments to some of them where needed, then manually labeled each address with the province, city, district, and subdistrict that it should point to.

For example:

```text id="xjd2te"
Address:
Jl. Wastukencana No. 2, Babakan Ciamis,
Sumur Bandung, Kota Bandung, Jawa Barat

Expected:
Province: Jawa Barat
City: Kota Bandung
District: Sumur Bandung
Subdistrict: Babakan Ciamis
```

I repeated this for all 106 addresses. At this point I had the input and what I believed the correct answer should be.

That gave me something to compare the engine against.

## Then I asked the API the same question

The benchmark takes each address and sends it to the `/validate` endpoint. The API interprets it and returns the province, city, district, and subdistrict it thinks the address points to.

For every address, I now have two answers:

```text id="c5b2u7"
Address
   │
   ├── Manual label
   │      └── Province → City → District → Subdistrict
   │
   └── API result
          └── Province → City → District → Subdistrict
```

The benchmark compares them. If the API points to the same province, city, district, and subdistrict as my manual label, I count it as an exact match. I also keep the result for each level separately, so I can see where the engine starts getting things wrong.

Then it moves to the next address and does the same thing again.

The benchmark itself is not complicated:

**get an address → label it manually → call the API → compare the result**

I just needed to repeat that process consistently for all 106 addresses.

## So, how well did it work?

After running all 106 addresses through the API, this is what I got:

| Level               |   Correct |
| ------------------- | --------: |
| Province            |     82.1% |
| City                |     76.4% |
| District            |     71.7% |
| Subdistrict         |     51.9% |
| **All four levels** | **49.1%** |

For the main accuracy number, I use an exact match. Province, city, district, and subdistrict all need to point to the same place as my manual label.

Only 52 of the 106 addresses passed that check.

**49.1%, even a coin toss has better chance. LOL.**

Strangely enough, I was still happy with it. Not because 49.1% is good, but because I finally had something I didn't have before: a baseline.

## Now I can run the same experiment again

Before having this benchmark, I could change the matching or ranking logic, try several addresses manually, and decide that the result looked better. The problem is that "looks better" doesn't tell me whether the change improved the engine as a whole.

Now I can make a change and run the same benchmark again with one command.

```bash id="gq8a3x"
<actual benchmark command>
```

The same 106 addresses go through the same API and get compared against the same labels. If the result changes from 49.1%, I have somewhere to start investigating.

I can check which addresses changed, which administrative level improved, and whether fixing one case broke another. The benchmark doesn't tell me what I should change, but it gives me a repeatable way to see what happened after I changed something.

That is the loop I wanted:

**change → benchmark → compare**

## There is a problem with this baseline

There are some obvious limits to the 49.1% number. All 106 addresses are from Bandung, so I cannot use this benchmark to claim that Address Quality has 49.1% accuracy across Indonesia. The number only tells me how the engine performed against these particular addresses and labels.

But there is another assumption that matters even before I think about expanding the dataset.

**I assume my manual labels are correct.**

I labeled 106 addresses manually. If I made a mistake during labelling, the API could return the correct location and the benchmark would count it as wrong. The opposite could happen too: a wrong API result could accidentally agree with a wrong label.

So I had a baseline, but before changing the engine based on that baseline, I needed to know whether I could trust it.

That gave me the next thing to investigate:

**Can I audit my own benchmark?**
