+++

title = 'About'
description = ' Never Improve Blindly - I investigate backend systems before deciding what needs to change.'
layout = 'about'
hideMeta = true
ShowToc = false
ShowShareButtons = false
ShowPostNavLinks = false
disableAnchoredHeadings = true

+++

I am a backend engineer focused on system performance, reliability, and the operational cost of running software.

For close to a decade, I have worked on chat, notifications, marketplaces, and logistics systems. Much of that work starts with the same question:

**What is actually causing the problem?**

A slow API doesn't automatically need caching. A busy database doesn't automatically need a bigger instance. High traffic doesn't automatically justify another piece of infrastructure.

Measure first. Change second.

That is the principle behind how I work:

**Never Improve Blindly.**

## How I approach backend problems

I like problems where the answer is not obvious from the first dashboard.

An endpoint gets slower. Memory keeps growing. A query becomes expensive. Infrastructure cost increases. A service behaves normally in staging and falls apart under production traffic.

Before changing the architecture, I want a baseline.

Can we reproduce the problem? Where is the time actually spent? What does the query plan say? What happens under load? What changed? What is the smallest experiment that can prove or reject the assumption?

Sometimes the answer is an index, cache, or architecture change.

Sometimes the system is already good enough.

Knowing the difference matters.

## Production experience

At **Evermos (Everpro)**, I led backend engineering work for shipping and logistics systems supporting high-volume retail integrations.

The platform operated under contractual SLA constraints with financial penalties. During monitored production periods, we kept server errors below **0.1%** and p95 latency below **280ms**.

I also led a zero-downtime migration that separated log storage representing roughly **40% of database size**, reducing storage pressure and outage risk, and introduced a backend self-test framework to improve release accountability.

Before that, I worked on **Tokopedia's chat, discussion, and notification platforms** as a Software Engineer, Senior Software Engineer, and later Lead Software Engineer.

The problems changed as the systems grew: database pressure, cache behavior, memory regressions, monitoring coverage, load limits, and infrastructure cost.

One broadcast scaling project increased capacity to **24× its original state while reducing monthly infrastructure cost by 84%**.

Earlier, I helped scale Discussion APIs to **10× their original load** and worked on anti-fraud and anti-spam protections.

## What I work with

Most of my backend work has involved:

* Go
* PostgreSQL
* Redis
* NSQ
* REST APIs
* Prometheus and Grafana
* Datadog and OpenTracing
* profiling
* load and stress testing
* distributed systems
* database and infrastructure performance

The tools change depending on the problem. I care more about understanding the system than committing to a particular stack.

I studied Electrical Engineering at Institut Teknologi Sepuluh Nopember. I am also named on an [IP defensive publication about improving broadcast targeting through personalization](https://priorart.ip.com/IPCOM/000267684).

## What I am working on now

This site is where I investigate engineering problems in public.

That includes profiling Go applications, benchmarking APIs, investigating database behavior, testing infrastructure assumptions, and building [Address Quality](/projects/address-quality/), an experiment around validating messy Indonesian addresses.

I try to publish the investigation, not just the conclusion.

If an optimization works, I want the measurement.

If it doesn't work, that result is useful too.

You can browse my [projects](/projects/) or read the latest [engineering notes](/posts/).

For work conversations, you can also find me on [LinkedIn](https://www.linkedin.com/in/gary-almas-samaita/) or [GitHub](https://github.com/samaita).
