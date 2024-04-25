+++
title = 'Benchmark API Performance with WRK: A Brief Guide'
date = 2024-04-25T20:22:00+07:00
draft = false
+++

Fellas, imagine you've built a powerful API. It perform well at first. No sign of sluggish, your users is happy as the app feels smooth.

The business is thriving, your user base grows. Things start slowing down. Loading after click button take longer, and sometimes, the server crashes returning error. Looking at the server metric, it's your API that doesn't run as fast as your first deployment.

The problem, you notice that the API goes slow only during high concurrent requests. While at single request it does fine. Now, how will you replicate this condition?

That's when a handy tools like WRK comes in. In this article, let's explore how WRK can help you generate load and measure your API performance.

# What is WRK?

WRK is a tool with core functionality to generate load for HTTP services. It mimic a stress test with minimal setup. Install and run.

WRK gives you highlights of crucial metrics like requests per second (RPS), latency, and throughput. This helps you spot any weak spots in your server's performance. WRK gives you a heads-up on where you need to tighten things up.

Some might say load test with Locust or JMeter is better, I'd agree. But both need a lot of time and resource to setup. Can you setup it at everytime you need to do PR changes?

## WRK Benefits

WRK suit best for those who need to reiterate every code changes in his API **locally**. Before even a Pull Request opened, you can get the gist of impact of your code changes. No surprise after deployment. It is all testable in your local.

As WRK run in local, it make technically no cost of resource and time to operate to perform. The feedback also fast, only a matter of seconds or minutes if you intend to. It is possible by only update a single parameter in command line.

WRK provide parameters that can be adjusted to help you mimic a production load. It has all the necessity to help you provide load you need to measure your API performance. It also configurable with LuaJIT script so the request can be customizable to met your API requirement.

## WRK Drawbacks

WRK isn't perfect. It's mainly prepared towards HTTP and HTTPS protocols.

WRK is built on C and using LuaJIT for scripting. Setting up WRK for more complex testing scenarios can be a bit of a head-scratcher for beginners. LuaJIT might be a problem for those who never use it. At least for me. Not to worry, get help from LLM! 😉 

# Requirements

You only need to do two things:
1. Install WRK, best suit for UNIX-like OS. If you use homebrew, [here is the way](https://formulae.brew.sh/formula/wrk)!
2. API to benchmark, if you have no web server ready, lets build one!

This article use Golang for web server, please ensure if you have it installed.

# Setup Web Server

This section let't you build a web server with the classic-basic API of hello world. You may skip, if you have an API ready to test.

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

If you dont have Golang installed, click [here](https://go.dev/doc/install) for instruction of how to install go.

## Building Basic Web Server

To test the capability of WRK, you need build one web server first. Lets use Golang for it. 

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

To test if the web server ready, you may use this cURL in another terminal. Do not use the same terminal as your web server as you want to let the web server running.
```bash
curl -X GET http://localhost:8080/hello
```

Example output
```bash
masgar@ip-127-0-0-1 ~ % curl -X GET http://localhost:8080/hello
Hello World!
```

# Benchmark with WRK

Now that you have your web server up and running, it's time to put WRK to the test. You need to ensure first if WRK already installed.

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
Before you continue with how to benchmark, I'd like to remind you to not blindly benchmark your production server. WRK could generate a lot of traffic to your server. Generate it huge enough, it might broken your production and getting you in trouble. You want to benchmark your server, not break it. There is a thin line of difference.

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
It explain that the test was run in 10 seconds utilize 2 concurrent process with each process perform 10 simulaneous connection. Those three can be adjusted to suit your needs.

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

Then you have several additonal informations as well:
1. **Total Requests** - The total number of requests sent to the server during the test duration.
2. **Test Duration** - The duration of the test, you might defined 10s, but actual duration might excess a bit.
3. **Data Transferred** - The total amount of data transferred from the server in megabytes.
4. **Requests/sec** - The average number of requests per second handled by the server over the entire test duration.
5. **Transfer/sec** - The average data transfer rate from the server in megabytes per second.

Based on this result, you can say that the `Hello World` endpoint is high performant. 

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

While the number is superior than previous, the report indicating a lot of http error. WRK telling you that the test is invalid as most of response is not 2xx nor 3xx via `Non-2xx or 3xx responses`. In this case, it is all 404.

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

If so, adjust the parameter of WRK. I'd suggest to increase the duration of testing from 10 seconds to 30 seconds, or reduce the number of threads and connection. It is common for endpoint to have low latency in low traffic. While it exponentially increased during serving large concurrent traffic.

## Adding Header to WRK Request

When header is required to be added to the request, WRK has a way to include it into the command line. Here is how:
```bash
wrk -t12 -c400 -d30s -H "Authorization: Bearer ASDFsamaitaJKL" http://localhost:8080/hello
```

Notice that you need to add a param `-H` or `--header` followed by key value to be included as header.

When you need more than one header to be added:
```bash
wrk -t12 -c400 -d30s \
    -H "Authorization: Bearer ASDFsamaitaJKL" \
    -H "Content-Type: application/json" \
    http://localhost:8080/hello
```

## Using Script

You might notice that the help command is not mention about how to use another http method and body request. WRK using a LuaJIT script to allow more option to be set to HTTP request.

Here is the [example script for WRK](https://github.com/wg/wrk/blob/master/scripts/post.lua):

```lua
-- example HTTP POST script which demonstrates setting the
-- HTTP method, body, and adding a header

wrk.method = "POST"
wrk.body   = "foo=bar&baz=quux"
wrk.headers["Content-Type"] = "application/x-www-form-urlencoded"
```

You can change the method, body, and even set headers. It is hassle free as you can simplify our command for WRK:
```bash
wrk -t2 -c10 -d10s -s request.lua http://localhost:8080/hello
```
This example using `-s` or `--script` as param and put value `request.lua`, the script you use to define the http request body, header, and method.

What if you want to use JSON as WRK request? Here is the example script:
```lua
-- example HTTP POST script with JSON payload as a string
wrk.method = "POST"

-- Define your JSON payload as a string
local json_payload = '{"foo": "bar", "baz": "quux"}'

-- Set the request body to the JSON payload string
wrk.body = json_payload

-- Set the Content-Type header to indicate JSON payload
wrk.headers["Content-Type"] = "application/json"
```

With script, you can share it Git or Github repository among your team. So everyone can build and use standardized local loadtest. 

The script is in LuaJIT, you can do more than just passing a static variable. There is options to randomize the value. Let's learn about it later! (_TBH, i haven't tried it, so later then!_) 😁

# Conclusion

To sum it all up, benchmarking API performance is crucial for keeping web server reliable and scalable. WRK help to gain key insights into how your APIs handle a lot of traffic. And it is all done within your local. Any dev with access to terminal can do it!

Throughout this article, you have learn the most of WRK's basics. Begin by set up a basic web server in Go, installed WRK, and run tests with different settings to mimic real-life situations. The report is simple yet comprehensive enough to ensure the API performance. Customization can also be done with LuaJIT scripting. Scripts open possibility to work in collaborative with Git.

With WRK, there is always a reason to ensure API performance before even open Pull Request. Scale your system folks!