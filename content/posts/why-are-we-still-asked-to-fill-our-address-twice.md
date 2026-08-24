+++
title = 'Why Are We Still Asked to Fill Our Address Twice?'
date = 2026-08-24T16:23:45+07:00
draft = false
tags = ['address-quality', 'ux', 'indonesia']
description = 'You already typed your address. So why some sites ask you to select it again from their own dropdown? A look at how Indonesian address forms work and why software should get better at understanding what you already typed.'
series = ['Address Quality']
part = 2
+++

I've noticed something common about address forms in Indonesia. You type your address. Then you have to fill in other fields such as kelurahan(subdistrict), kecamatan(district), city, and even province. No matter how complete your address is.

For example, you have entered this address:

> Sudirman Central Business District(SCBD), Jl. Jend. Sudirman kav 52-53 No.LOT 6-8, RT.5/RW.1, Senayan, Kec. Kebayoran. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190

Complete and well structured. But then you have to select again:

> Subdistrict: Senayan
> Kecamatan: Kebayoran Baru  
> Province: DKI Jakarta  
> City: Jakarta Selatan  

You already gave the address in the form. So why do you have to enter it again in another field?

![Cannot continue unless selected](https://samaita.com/projects/address-quality/images/checkout-usecase-destination-need-to-be-filled.png)


## My Guess? People and Software Have Their Own Way

Let's look at it from the system's side. You can write an address in many ways.

Jakarta Selatan as Jaksel. Kebayoran Baru, Jaksel. A landmark. Mistype Kbayoran Baru. Missing the city name. Typing differently each time. It is normal, people make mistake and thought the address is well known.

You know what you mean. People usually figure out what someone means despite small differences and mistakes. The software? Hmm.. might not that capable.

The software still needs structured data. It may need to know province, city, district, subdistrict. So it ask you to provide those fields. It solves the problem. But it also creates another one.

## Software Asked You To Do The Work

You already typed the address. Now you have to select the province, then the city, then the district, and the kelurahan. Some even ask for Postal Code.

On a desktop, that's annoying. On a phone, it's worse. You open a dropdown, search, scroll, and pick. You wait for the next dropdown to unlock. Then you do it again and again.

---

*One field is not a big deal. Four or five fields annoying.*

![Some options even need more time to select. Which one is the correct postal code?](https://samaita.com/projects/address-quality/images/shipping-usecase-destination-need-to-be-filled-example.png)

## Complete Address Won't Save Time

This is the part I find interesting.

Let's say you input address:

> Sudirman Central Business District(SCBD), Jl. Jend. Sudirman kav 52-53 No.LOT 6-8, RT.5/RW.1, Senayan, Kec. Kebayoran. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190

That's a complete address. Other people input:

> Jl Sudirman No.6-8 SCBD Senayan, Jakarta Selatan, DKI Jakarta.

Same place, different quality. The first one gives complete and correct information. But both users get the same form. Both users have to select the province, city, district, subdistrict.

**Then what's the point of entering a full and complete address? The information isn't being used to reduce the work**. In some forms, the address may only need to pass basic validation, such as a minimum character length. I wont suprised if someone input even more vague address:

> SCBD

Or even trying to benefit from the system by intentionally making different input between the forms and the actual address.

![Some problem can be prevented before it becomes an operational burden.](https://samaita.com/projects/address-quality/images/shipping-usecase-different-form-address.png)

If your software doesn't really care about user address, that might be fine. But for use cases that rely on accurate addresses, like shipping and KYC, that may become a problem. 


## Why not use Google?

Like most developers, my first thought was simple:

**Why don't we just use Google?**

You type the address. We send it to a geocoding API. Google gives us a result. Done.

Except now we have another problem. We need to pay for the API. We need to deal with quotas and rate limits. We add another network request and another external dependency. We still need to turn Google's result into the address structure our application needs.

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

You don't enter the information again. You confirm it. That changes the interaction.

Instead of:

**You provide the data and input them all.**

It becomes:

**You provide the address. We interpret it. You confirm.**

Now, entering a complete address actually a benefits. Instead of spend time clicking through dropdowns, you can just check whether the software interpreted your address correctly.

---

*Move the work from data entry to confirmation.*

## That's the problem I wanted to test

I started with two things: the address you wrote, and a structured database of Indonesian administrative areas. Then I asked:

> Can I connect the two reliably?

Not "where is this address on a map". Something more specific:

> Which administrative area does this address refer to?

So I started building [Address Quality](https://samaita.com/projects/address-quality/). Its purpose is to interpret free-text Indonesian addresses, match them against the official Kemendagri hierarchy, and return a structured result backed by evidence.

The first benchmark was **49.1%**. That's bad, even coin toss have better odds. But it gave me a baseline. Now I could make changes, run the benchmark again, and see what happened.

I wrote about that starting part here: **[Address Quality: Building Indonesian Address Validation API](https://samaita.com/posts/address-quality-building-indonesian-address-validation-api/)**

The question is still pretty simple:

**If you already gave us a good address, why should you have to structure it for us?**

Maybe the form doesn't need to get better. Maybe the software needs to get better at understanding what you already typed.
