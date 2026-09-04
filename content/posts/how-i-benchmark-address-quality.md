+++
title = 'How I Benchmark Address Quality'
date = 2026-09-04T18:00:00+07:00
draft = true
tags = ['Address-Quality']
+++

In the first post of this series I wrote about [Address Quality](https://samaita.com/projects/address-quality/), an API that validates Indonesian addresses, and I ended with a number: 49% accuracy on my own test set. A number is only useful if you know how it was produced. So before I change anything, I want to explain how I measured it.

This post is about the method, not the result. How the benchmark runs, what the test set contains, and what the score actually means. If you can see how the number was built, you can judge whether to trust it.

## What the benchmark does

The benchmark is a short script, not a big system. It reads a list of addresses, sends each one to the API, and compares what the API returned against what the address should really be.

Here is the loop:

1. Read one address and its expected answer from a test file.
2. Send the address to the `/validate` endpoint.
3. The API returns a province, a city, a district, and a subdistrict.
4. Compare each returned level against the expected answer.
5. Record whether each level matched.
6. Move to the next address.

That is the whole method. No model, no clever scoring in the harness. It is the same call a user would make, applied one address at a time.

## The test set

The test set is 106 addresses, all in Bandung. I collected them from public pages that list real addresses, and I tagged each one by hand with the correct province, city, district, and subdistrict.

I chose Bandung on purpose. It is a big city with messy addresses: words that appear at many levels, abbreviations, road names, RT and RW numbers. If the engine can read Bandung, it has a decent chance with the rest of the country.

Each row in the test file looks like this: the raw address as a user might type it, plus the four expected levels. The tagging is manual. I read each address, looked it up where I needed to, and wrote down what I believed to be the ground truth. That manual step matters, and I will come back to it.

The reference data is the official Kemendagri administrative hierarchy, derived from the [wilayah_ref project by cahyadsn](https://github.com/cahyadsn/wilayah_ref), rebuilt into a normalized SQLite database. The benchmark compares against that hierarchy indirectly, through the API.

## The scoring rule

This is the rule that turns raw output into a number, and I want it to be exact.

A record is **accurate** when all four levels match exactly: province, city, district, and subdistrict. Every one of the four must equal the tagged answer.

That is a strict rule, on purpose. If the province is right but the subdistrict is wrong, the record does not count. The per-level numbers are separate. They show how often each level alone is correct, and they tell you where the engine falls apart.

Here is what that gave me on the first run:

| Level | Correct |
|---|---|
| Province | 82.1% |
| City | 76.4% |
| District | 71.7% |
| Subdistrict | 51.9% |
| **All four levels (exact)** | **49.1%** |

The province is right most of the time. The subdistrict is where things break. And because accuracy needs every level to match, the subdistrict drags the whole number down.

## What the score means

49.1% means 52 of the 106 addresses came back with all four levels exactly right. That is the number behind "49% accuracy."

It is not a result to celebrate. It is a baseline. It tells me where the weaknesses are, and it gives me a concrete place to measure change against. Every future release runs the same test set, so I can compare before and after.

The benchmark page records more than the score. It keeps the status the API returned (valid, ambiguous, incomplete, or unknown), the confidence, and which levels matched for each record. That detail is what turns a single percentage into a list of things to investigate.

## Where the number comes from

One thing to be clear about: the number depends on the test set as much as it depends on the API. A benchmark is a conversation between the engine and its test data. If either side is wrong, the score lies.

That is why the manual tagging step is so important, and why I treat it with suspicion. When I built the test set I made mistakes. In the first post I mentioned one: the ground truth carried a misspelling. The benchmark compares against what is written in the test file, so if the test file is wrong, a correct answer can look wrong, and a wrong answer can look right.

The score describes the test data as much as it describes the engine. I am keeping that thought in front of me while I decide what to change next.

## A number you can check

The benchmark is not a private figure. You can see the live results on the [benchmark page](https://samaita.com/projects/address-quality/benchmark), and the API is live with a playground on the [project page](https://samaita.com/projects/address-quality/). If an address comes back wrong there, that is useful data. It is one more record to add to the test set.

The 49% is my starting point. My next move is to look closely at the test data itself, because I suspect the test set is hiding some of the answer. That audit is the subject of the next post.