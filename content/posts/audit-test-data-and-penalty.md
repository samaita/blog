+++
title = 'Audit the Test Data, Then Penalize Ignored Evidence'
date = 2026-09-16T11:06:44+07:00
draft = true
tags = ['address-quality']
description = 'How checking the expected address values and penalizing candidates that ignore evidence improved the Address Quality benchmark.'
+++

The benchmark score went up after I changed the address-resolution engine.

That sounds like the usual story: change the code, run the tests, report a better number.

This time, that was not the whole story.

Before changing the engine, I found that some expected values in the test data were wrong. After fixing them, the score improved by **3.7 percentage points**.

Then I found a different problem in the ranking logic. Two candidates could both reach a confidence of 1, even when one candidate ignored part of the address. Adding a penalty for ignored evidence improved the score by another **4.7 percentage points**.

The benchmark helped me find both problems, but they needed different fixes.

## The benchmark depends on expected values

The benchmark sends each address to the API and compares the result with an expected location. A record counts as accurate when the province, city, district, and subdistrict all match the expected value.

That means the benchmark does not know the correct answer by itself. It trusts the expected value in the test data.

If the expected value is wrong, the benchmark can report the wrong result. The API may return the correct location and still be counted as a failure.

So improving accuracy does not always start with changing the API. Sometimes it starts with checking the test data.

## An address that looked correct

One address in the test set looked reasonable:

`JL. CIPANAS BARU, PANJALING, KEC. TAROGONG KALER, KAB. GARUT, JAWA BARAT 44151`

The address contains a road, a subdistrict, a district, a city, a province, and a postal code. At a glance, the hierarchy looks complete.

But **Panjalin does not exist under Tarogong Kaler**.

Panjalin is actually located in Kecamatan Sumberjaya, Kabupaten Majalengka, Jawa Barat. The road address is located within Tarogong Kaler, Pananjung. The expected subdistrict in the test data was wrong.

This is difficult to infer from the address text alone. The words look like a valid hierarchy because they are all real place names. Their relationship is the problem.

I had to check the address with an external tool, such as Google Maps, instead of assuming that the text was enough.

That check corrected the expected value. The benchmark moved from **49.1% to 52.8%** on the 106-address dataset, an improvement of **3.7 percentage points**.

The API did not get better in this step. The measurement got better because the test data became more reliable.

## You cannot infer every hierarchy from the text

This is an important limit of address benchmarks.

A location name can be real, the district can be real, and the province can be real. That does not mean the location belongs to that district.

An address is not only a collection of names. It is also a set of relationships between those names.

For that reason, expected values need their own audit process. Useful checks include:

- Is the subdistrict actually under the stated district?
- Does the district belong to the stated city?
- Does the city belong to the stated province?
- Does the postal code match the expected subdistrict?
- Does the road location support the administrative hierarchy?

The benchmark can compare API output against labels. It cannot guarantee that the labels are correct.

## Another problem appeared in the candidates

After auditing the test data, I looked at the benchmark results again.

The original `v0.1.0-alpha` benchmark had an address with two candidates that both received confidence **1**:

`JL. Raya Cimareme No.296, Cimareme, Kec. Ngamprah, Kabupaten Bandung Barat, Jawa Barat 40553`

The evidence extracted from the address was:

- Subdistrict: Cimareme
- District: Ngamprah
- City: Kabupaten Bandung Barat
- Province: Jawa Barat

The engine produced two candidates.

The first candidate was:

```text
Subdistrict: Ngamprah
District: Ngamprah
City: Kabupaten Bandung Barat
Province: Jawa Barat
```

The second candidate was:

```text
Subdistrict: Cimareme
District: Ngamprah
City: Kabupaten Bandung Barat
Province: Jawa Barat
```

The first candidate matched the province, city, and district evidence, but it did not use the evidence for Cimareme. The second candidate used all four location values. Both still reached the confidence ceiling of **1**.

But the first candidate had a clear problem. It ignored the evidence for Cimareme. The address says Cimareme, while the candidate returned Ngamprah as the subdistrict.

The second candidate used all the available evidence and returned Cimareme under Ngamprah.

The ranking logic did not distinguish them because confidence could not go above 1. Once both candidates reached the ceiling, the unused evidence did not help the correct candidate win.

## Why simply changing the score was not enough

I considered two straightforward options:

1. Change the scoring weights.
2. Allow confidence to go above 1.

Neither option solved the real problem.

I had no good reason to put Cimareme above Ngamprah only by changing a weight. Both are valid subdistrict names under Ngamprah. The useful difference was not that one name was more important than the other.

The difference was that one candidate ignored evidence that was present in the address.

That needed to affect the candidate directly.

## Adding a penalty for ignored evidence

The engine already tracks which evidence each candidate uses. It can see when an address contains evidence that did not contribute to a candidate.

I added a penalty after the normal confidence score is calculated.

In simple terms:

```text
confidence = matched evidence and hierarchy score
confidence = confidence - penalty for each unused evidence item
```

The penalty does not reward Cimareme because it is a preferred name. It lowers the score of the candidate that ignored Cimareme.

That changes the ranking for the right reason:

- Candidate using Cimareme: no unused place evidence
- Candidate using Ngamprah as the subdistrict: Cimareme is unused
- Candidate with unused evidence receives a lower score

This also keeps confidence bounded. The score still cannot exceed 1. The new rule gives the ranking process more information instead of adding another scoring scale above 1.

## The result after the penalty

With the ignored-evidence penalty in place, the engine selected the candidate that used Cimareme.

Across the same 106-address dataset, the benchmark moved from **52.8% to 57.5%** exact matches. That is an improvement of **4.7 percentage points**.

The latest benchmark result is available here:

[Address Quality v0.1.1-alpha benchmark](https://samaita.com/projects/address-quality/benchmark/v0.1.1-alpha)

The overall result is useful, but the individual cases matter more. The score tells me that the change helped somewhere. The candidate details explain why.

## The loop found two different kinds of error

The sequence was:

1. Run the benchmark.
2. Inspect failures.
3. Audit the expected values.
4. Correct the test data.
5. Run the benchmark again.
6. Inspect candidates with suspiciously high confidence.
7. Penalize candidates that ignore evidence.
8. Run the benchmark again.

The first improvement came from fixing the measurement.

The second improvement came from fixing the ranking logic.

Without the benchmark, I might have changed the scorer based on a few manual examples. I might also have blamed the API for failures caused by incorrect expected values.

A repeatable test loop makes those two problems easier to separate.

## This is why the benchmark needs to be cheap

Testing this process manually would take a long time. I would need to send every address to the API, inspect the response, compare it with the expected value, and repeat the work after every code change.

The benchmark does that loop in less than ten seconds:

```bash
make benchmark
```

The benchmark does not tell me which change to make. It gives me a repeatable way to see whether a change affected the dataset, then points me to the addresses that need investigation.

That makes it possible to try a small change, inspect the result, and run the full dataset again without turning every experiment into a long manual session.

## The next question

Auditing the expected values improved the benchmark by 3.7 percentage points. Penalizing ignored evidence improved it by another 4.7 percentage points.

That does not mean the problem is solved. The dataset still has 106 addresses, all from Bandung, and exact matching remains a strict measure.

The next question is whether the same ranking rule behaves well when the address contains conflicting evidence. What should happen when the postal code disagrees with the subdistrict? What if a road location supports one candidate but the written city points to another?

The benchmark can help answer those questions, as long as I keep checking both sides of the comparison: the API result and the expected value.

*Series: Address Quality. Previous: [How I Benchmark Address Quality](https://samaita.com/posts/how-i-benchmark-address-quality/).*
