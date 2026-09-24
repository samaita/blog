+++
title = 'The Address Says Sumedang, Google Maps Says Bandung. How Address Quality Handle This?'
date = 2026-09-23T19:00:00+07:00
draft = true
tags = ['address-quality', 'geocoding']
description = 'An address can have a valid administrative hierarchy while geographic evidence points somewhere else. Address Quality needs to represent that disagreement.'
series = ['Address Quality']
+++

One of the benchmark test make an interesting case. `Jl. Raya Dangdeur No.145` gave me two answers: the written address says `Kabupaten Sumedang`, while Google Maps says `Kabupaten Bandung`.

```text
JL. RAYA DANGDEUR NO.145 RT.02 RW.11
DESA MEKAR GALIH KEC. CIKERUH,
MEKAR GALIH JATINANGOR KAB. SUMEDANG,
JAWA BARAT
```

`Mekargalih` belongs to `Jatinangor`, `Jatinangor` belongs to `Kabupaten Sumedang`, and it belongs to `Jawa Barat`. Even `Cikeruh` makes sense here: it was the [former name of Kecamatan Jatinangor](https://portal-skpd.sumedangkab.go.id/storage/regulasi/1.%20Dokumen%20LKIP%20Kec%20Jatinangor%20Tahun%202021.080622_15_35_23pdf.pdf). The hierarchy has no problem. The text gives me a strong `Sumedang` candidate.

But my benchmark labels the same address as `Bojongloa`, `Rancaekek`, `Kabupaten Bandung`. The two places meet near Jalan Raya Dangdeur. An [official boundary regulation](https://peraturan.bpk.go.id/Details/266140/perbup-kab-sumedang-no-340-tahun-2022) names `Mekargalih` and `Bojongloa` at the border.

## The road open for another candidate

My administrative data knows villages and districts. It does not know where `Jalan Raya Dangdeur No.145` sits. When I look up that road and number in Google Maps, it returns:

```text
Jl. Raya Dangdeur No.145, Bojongloa, Kec. Rancaekek,
Kabupaten Bandung, Jawa Barat 40394
```

Google Maps also says, "The location shown is not precise." Its result might be wrong too: it could pick a nearby building or place No.145 on the wrong side of the border. `Bojongloa` is a candidate, not proof.

Google Maps also lists ERAFONE Dangdeur Rancaekek at `Jl. Raya Dangdeur No.21, Bojongloa`. It might give strong signal of the road on the `Kabupaten Bandung` side. But it still cannot tell me exactly where No.145 stands.

Together, these sources give me two candidates:

```text
From the hierarchy: Mekargalih → Jatinangor → Kabupaten Sumedang
From the road:      Bojongloa  → Rancaekek → Kabupaten Bandung
```

Both hierarchies are real. The text check tells me that the Sumedang names agree. It cannot tell me whether No.145 actually stands there. For that, I need geographic evidence.

## When the signals disagree

My current ranking would put Sumedang first because it matches the names in the address. Google Maps points to `Bojongloa`, but warns that its location is not precise. A [business directory](https://media.neliti.com/media/publications/48516-ID-direktori-awal-usahaperusahaan-skala-menengah-besar-sensus-ekonomi-2016-buku-1.pdf) lists No.145 in `Mekargalih`. My benchmark label says `Bojongloa`. I still do not know which side of the boundary the building is on.

I've met similar confusion when multiple data source used. User says A, Google Maps says B, another source tell otherwise.

Address Quality doesn't built to be a source of truth. Address Quality built to help point out ambiguity and give the reason. This is where Address Quality should return `AMBIGUOUS` due to conflicting evidence. It can rank the candidates, but it should show why neither one is confirmed:

```text
Status: AMBIGUOUS
Text:   Mekargalih, Jatinangor, Kabupaten Sumedang
Map:    Bojongloa, Rancaekek, Kabupaten Bandung
Reason: The administrative text and map result disagree.
```
Google Maps is useful evidence. Its API could provide that geographic signal to Address Quality, but its answer cannot be the sole ground truth.

This case is an example that not every location can be correctly determine from the address alone. And when the address is conflicting between multiple evidence, the API should tell it confidence and reasoning.

Address Quality should never give a true or false answer. It is not Address Quality to push suggestion nor recommendation. Address Quality anwer with reasoning, both with administrative and geographic. 