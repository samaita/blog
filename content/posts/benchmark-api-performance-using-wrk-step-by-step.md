+++
title = 'Benchmark API Performance with WRK: A Step-by-Step Guide'
date = 2024-04-09T00:50:35+07:00
draft = true
+++

Fellas, imagine you've built a powerful API. It perform well at first. No sign of slowness, your users is happy as the app feels smooth.

The business is thriving, your user base grows. Things start slowing down. Requests take longer, and sometimes, the server crashes. Looking at the server metric, it's your API that doesn't run as fast as your first deployment.

The problem is, you notice that the API goes slow only during high concurrent requests. While at single request it does fine. Now, how will you replicate this condition?

That's where tools like WRK come in. In this article, we'll explore how WRK can help you generate load and measure your API performance.

# What is WRK?

WRK is a tool with core functionality to generate load for HTTP services. It mimic a stress test with minimal setup.

WRK gives you highlights of crucial metrics like requests per second (RPS), latency, and throughput. This helps you pinpoint any weak spots in your server's performance and gives you a heads-up on where you need to tighten things up.

Some might say load test with Locust or JMeter is better, I'd agree. But if you have no time nor resource to setup a load test, you can only guess if your code changes improved the performance.

## WRK Benefits

WRK suit best for those who need to reiterate every code changes in his API **locally**. Before even a Pull Request opened, you can get the gist of impact of your code changes.

As WRK run in local, it make technically no cost of resource and time to operate to perform. The feedback also fast, only a matter of seconds. Or minutes if you intend to. It is possible by only update a single parameter.

WRK provide parameters that can be adjusted to help you mimic a production load. It has all the necessity to help you provide load you need to measure your API performance.

## WRK Drawbacks

WRK isn't perfect. It's mainly prepared towards HTTP and HTTPS protocols.

WRK is built on C and using LuaJIT for scripting. Setting up WRK for more complex testing scenarios can be a bit of a head-scratcher for beginners. LuaJIT might be a problem for those who never use it. But you have help of LLM anyway! 😉 

# Requirements

You only need two:
1. Install WRK, find the methods that suit your OS here.
2. API to benchmark, if you have no web server ready, lets build one!

This article use Golang for web server, please ensure if you have it installed.

# Setup Web Server

## How to Check if Golang Installed

Make sure you have Golang installed!

Run this command in terminal:
```bash
go version
```
Example output

```bash
masgar@ip-127-0-0-1 ~ % go version
go version go1.21.8 darwin/arm64
```

If you dont have Golang installed, click here for instruction of how to install go.

## Building Basic Web Server

To test the capability of WRK, we build one web server first.Lets use Golang for it. 

Go to a directory, then write a file name `main.go`
```go
package main

import (
    "fmt"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, World!")
}

func main() {
    http.HandleFunc("/hello", handler)
    http.ListenAndServe(":8080", nil)
}
```

use your terminal and type `go run main.go` to run it.

To test if the web server ready, you may use this cURL in another terminal. Do not use the same terminal as your web server as we want to let the web server running.
```bash
curl -X GET http://localhost:8080/hello
```

Example output
```bash
masgar@ip-127-0-0-1 ~ % curl -X GET http://localhost:8080/hello
Hello World!
```

# Benchmark with WRK

Now that we have our web server up and running, it's time to put WRK to the test. We need to ensure first if WRK already installed.

## How to Check if WRK Installed

Open a new terminal and run this command in your terminal:
```bash
masgar@ip-127-0-0-1 ~ % wrk
```
The output will looks like:
```bash
Usage: wrk <options> <url>                            
  Options:                                            
    -c, --connections <N>  Connections to keep open   
    -d, --duration    <T>  Duration of test           
    -t, --threads     <N>  Number of threads to use   
                                                      
    -s, --script      <S>  Load Lua script file       
    -H, --header      <H>  Add header to request      
        --latency          Print latency statistics   
        --timeout     <T>  Socket/request timeout     
    -v, --version          Print version details      
                                                      
  Numeric arguments may include a SI unit (1k, 1M, 1G)
  Time arguments may include a time unit (2s, 2m, 2h)
```

If you haven't install it, do not worry. You can follow this article to install WRK: Click Here!

## Benchmark with WRK

> ⚠️ **WARNING!** ⚠️
Before we continue with how to benchmark, I'd like to remind you to not blindly benchmark your production server. WRK could generate a lot of traffic to your server. Generate it huge enough, it might broken your production and getting you in trouble. We want to benchmark your server, not break it. There is a thin line of difference.

The simplest way to run a benchmark is to run this command:

```bash
wrk -t2 -c10 -d10s http://localhost:8080/hello
```
By default, WRK will perform a benchmark with default duration of 10 seconds. After 10 seconds, your terminal will be look like this:
```bash
masgar@ip-127-0-0-1 ~ % wrk -t2 -c10 -d10s http://localhost:8080/hello
Running 10s test @ http://localhost:8080/hello
  2 threads and 10 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     3.87ms   12.84ms 185.36ms   93.32%
    Req/Sec    37.32k    12.98k   68.95k    68.50%
  743545 requests in 10.01s, 92.18MB read
Requests/sec:    74281.80
Transfer/sec:      9.21MB
```

As you see in the parameter of `-t2 -c10 -d10s`:
```bash
Running 10s test @ http://localhost:8080/hello
  2 threads and 10 connections
```
You use a scenario where test run under 10 seconds utilize 2 concurrent process with each process perform 10 simulaneous connection. Those three can be adjusted to suit more of your needs.

## Reading The Report

Lets break down the information you may gain from the report:
```bash
masgar@ip-127-0-0-1 ~ % wrk -t2 -c10 -d10s http://localhost:8080/hello
Running 10s test @ http://localhost:8080/hello
  2 threads and 10 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     3.87ms   12.84ms 185.36ms   93.32%
    Req/Sec    37.32k    12.98k   68.95k    68.50%
  743545 requests in 10.01s, 92.18MB read
Requests/sec:    74281.80
Transfer/sec:      9.21MB
```

There are 4 columns for both of Latency & Req/Sec:
1. **Avg** - The average response time of the server to handle requests. Lower is better.
2. **Stdev** - The standard deviation of the response time, indicating the variation in latency among requests. A lower standard deviation suggests more consistent performance.
3. **Max** - The maximum response time observed during the test. Lower is better.
4. **+/- Stdev** - The percentage of requests whose response time falls within one standard deviation of the average. A higher percentage indicates more predictable performance.

Then we have several additonal informations as well:
1. **Total Requests** - The total number of requests sent to the server during the test duration.
2. **Test Duration** - The duration of the test, we might defined 10s, but actual duration might excess a bit.
3. **Data Transferred** - The total amount of data transferred from the server in megabytes.
4. **Requests/sec** - The average number of requests per second handled by the server over the entire test duration.
5. **Transfer/sec** - The average data transfer rate from the server in megabytes per second.

Based on this result, we can say that the `Hello World` endpoint is high performant.

## Ensure The Test is Valid

There might be times where you gain report with additional information like this:
```bash
technologyevermos@ip-192-168-1-6 ~ % wrk http://localhost:8080/hellos
Running 10s test @ http://localhost:8080/hellos
  2 threads and 10 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    87.87us  478.23us  17.67ms   99.46%
    Req/Sec    71.66k     4.30k   74.36k    97.52%
  1440104 requests in 10.10s, 241.72MB read
  Non-2xx or 3xx responses: 1440104
Requests/sec: 142582.41
Transfer/sec:   23.93MB
```
1 million requests in 10s! Wow!

While the number is superior than previous, it is actually http error that being reported. WRK telling you that the test is invalid as most of response is not 2xx nor 3xx via `Non-2xx or 3xx responses`. In this case, it is all 404.

Now what is this report tell you?
```bash
technologyevermos@ip-192-168-1-6 ~ % wrk http://localhost:8080/hello 
Running 10s test @ http://localhost:8080/hello
  2 threads and 10 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     0.00us    0.00us   0.00us     nan%
    Req/Sec     0.00      0.00     0.00       nan%
  0 requests in 10.08s, 0.00B read
Requests/sec:    0.00
Transfer/sec:    0.00B
```

If you ever found this kind of report, WRK tell you that all HTTP call fail to get any response. The API might be too slow and it have latency over 10s, or it has 504 Bad Gateway that WRK unable to capture within 10 second of test.

If so, adjust the parameter of WRK. I'd say to increase the duration of testing from 10 seconds to 30 seconds, or reduce the number of threads and connection. It is common for endpoint to have low latency in low traffic, but exponentially increased when serve large concurrent traffic.

## Adding Header to WRK Request



## Adding Body to WRK Request