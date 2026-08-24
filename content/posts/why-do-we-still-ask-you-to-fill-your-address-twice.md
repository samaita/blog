+++
title = 'Why Do We Still Ask You to Fill Your Address Twice?'
date = 2026-08-24T16:00:00+07:00
draft = false
tags = ['address-quality', 'ux', 'indonesia']
description = 'You already typed your address. So why do you have to enter it again? A look at how Indonesian address forms work and why software should get better at understanding what you already typed.'
series = ['Address Quality']
part = 2
+++

I've noticed something about address forms in Indonesia.

You type your address. Then you fill in the same address again.

For example:

> Jl. Sudirman No. 10, Kebayoran Baru, Jakarta Selatan

Then you get:

> Province: DKI Jakarta  
> City: Jakarta Selatan  
> Kecamatan: Kebayoran Baru  
> Kelurahan: ...

You already gave the address. So why do you have to enter it again?

## I think I know why

Let's look at it from the system's side.

You can write an address in many ways.

Jakarta Selatan. Jaksel. Kebayoran Baru, Jaksel. A landmark. Missing the city name. Typing differently each time.

You know what you mean. The software does not always know.

But the software still needs structured data. It may need to know province, city or regency, kecamatan, kelurahan or desa. So we ask you to provide those fields. It solves the problem. But it also creates another one.

## You do the work

You already typed the address. Now you have to select the province. Then the city. Then the kecamatan. Then the kelurahan.

On a desktop, that's annoying. On a phone, it's worse. You open a dropdown. You search. You tap. You wait for the next dropdown to unlock. Then you do it again.

---

*One field is not a big deal. Four or five fields add up.*

## A good address doesn't help you

This is the part I find interesting.

Let's say you give me:

> Jl. Sudirman No. 10, Kebayoran Baru, Jakarta Selatan

That's a pretty useful address. Now compare it with:

> Rumah dekat masjid

The first one gives me much more information. But both users get the same form. Both users have to select the province. Both users have to select the city. Both users have to select the kecamatan. Both users have to select the kelurahan.

The form doesn't use the extra information you already gave it. That's the part that feels wrong to me.

## Why not use Google?

My first thought was simple:

**Why don't we just use Google?**

You type the address. We send it to a geocoding API. Google gives us a result. Done.

Except now we have another problem. We need to pay for the API. We need to deal with quotas and rate limits. We add another network request. We depend on another service. And we still need to turn Google's result into the address structure our application needs.

None of these are deal breakers. Google may still be the right answer for many products. But I started wondering:

**Do we really need a general-purpose geocoding service for this?**

Maybe we need something smaller.

## Maybe we only need to understand the address

Suppose you type:

> Jl. Sudirman No. 10, Kebayoran Baru, Jakarta Selatan

What if we could turn that into:

> DKI Jakarta → Jakarta Selatan → Kebayoran Baru → [kelurahan]

Then we could ask:

> **Is this correct?**

You don't enter the information again. You confirm it.

That changes the interaction. Instead of:

**You provide the data.**

It becomes:

**You provide the address. We interpret it. You confirm.**

---

*Move the work from data entry to confirmation.*

## That's the problem I wanted to test

I started with two things: the address you wrote, and a structured database of Indonesian administrative areas. Then I asked:

> Can I connect the two reliably?

Not "where is this address on a map". Something more specific:

> Which administrative area does this address refer to?

So I started building [Address Quality](https://samaita.com/projects/address-quality/).

The first benchmark was **49.1%**. That's bad. But it gave me a starting point. Now I could change something, run the benchmark again, and see what happened.

I wrote about that part here: **[Address Quality: Building Indonesian Address Validation API](https://samaita.com/posts/address-quality-building-indonesian-address-validation-api/)**

The question is still pretty simple:

**If you already gave us a good address, why should you have to structure it for us?**

Maybe the form doesn't need to get better. Maybe the software needs to get better at understanding what you already typed.

---

*Series: Part 2 of the Address Quality journey. Next: the scoring fix, and what the new number is.*
