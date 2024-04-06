+++
title = 'Measure Code Performance With Benchmark in Go'
date = 2023-01-06T05:44:20+07:00
draft = false
+++

Golang provide a way to know our code efficiency by benchmark our code. By benchmarking our code, we able to see how fast our code can run and even gain more insight.

An efficient code displayed from the resource required to complete it execution. The faster it can run, the better. The lower resource required, the better.

This concept also applied for codes that run with serverless platform such as AWS Lambda or Google Cloud Function. You are charged based on the number of requests for your functions and the duration it takes to execute.

Unless you have unlimited budget, you should have concerned more about: Does my code running efficiently?

Golang provide a way to know our code efficiency by benchmark our code. By benchmarking our code, we able to see how fast our code can run and even gain more insight.

# Three Benefits of Benchmark:

1. **Measure the performance of your code.** By running a benchmark, you can see how many iterations per second your code is able to run. This can help you identify performance bottlenecks and optimize your code.
2. **Easier to compare the performance of different implementations of a function.** When you are in doubt, comparing two algorithm performance might help. Having a benchmark strengthen your argument.
3. **Ensure your code is correct.** You can test your code under different conditions and input sizes. This can help you to find and fix bugs that might not appeared with smaller input or concurrence.

# How to Benchmark
Go has a built-in function to perform benchmark on our own code. Here is how:

## Creating Benchmark

Creating a benchmark in Go is a two-step process.

The first step is to create a benchmark function. To do a benchmark in Golang, you can use the `testing` package. The `testing` package has a `Benchmark` function that you can use to run benchmark tests.

The next step is to write a test that calls the benchmark function.

Here is a code snippet as example:

```go
package main

import (
	"fmt"
	"testing"
)

// BenchmarkExample is the core test, it called the function N times
func BenchmarkExample(b *testing.B) {
	// run the function being tested b.N times
	for n := 0; n < b.N; n++ {
		// call the function
		example()
	}
}

func example() {
	// this is the function being tested
	fmt.Println("Hello World")
}

func main() {
	// run the benchmark
	testing.Benchmark(BenchmarkExample)
}

```

Here is the example folder structure:

```bash
benchmark/
├─ main_test.go
├─ go.mod

```

To run it, use a terminal and execute this:

```bash
go test -bench .
```

By using `-bench` , the command will only perform test for benchmark test and skip the rest.

The function Hello World is too simple isn’t it? Let’s give a try with another example: **Bubble Sort.** You may see how the Bubble Sort works from running it in **[Golang Playground](https://go.dev/play/p/H4Jjjxp7g2b).**

Here is our snippet code looks like:

```go
package main

import "testing"

// BenchmarkExample is the core test, it called the function N times
func BenchmarkExample(b *testing.B) {
  // generate input once, [0,1,2,3,4,5 ... 100]
	input := makeSlice(0, 100, 1)
	// run the function being tested b.N times
	for n := 0; n < b.N; n++ {
		// call the function
		bubbleSortDesc(input)
	}
}
func main() {
	// run the benchmark
	testing.Benchmark(BenchmarkExample)
}

// makeSlice generate slice from min to max with increment
func makeSlice(min, max, incr int) []int {
	a := make([]int, max-min+1)
	for i := range a {
		a[i] = min + incr
	}
	return a
}

// bubbleSortDesc return a sorted descending slice
func bubbleSortDesc(arr []int) {
	n := len(arr)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if arr[j] < arr[j+1] {
				// Swap elements
				arr[j], arr[j+1] = arr[j+1], arr[j]
			}
		}
	}
}
```

_*BubbleSort function was written by ChatGPT_

## Reading Benchmark’s Result

After write the test, let’s try to run the benchmark command. Lets use additional flag `-benchmem` to verbose memory usage information.

```bash
go test  -bench . -benchmem
```

After a while, we will see some output:

```bash
goos: darwin
goarch: arm64
pkg: example.com/m
BenchmarkBubbleSort-8             336618              3530 ns/op               0 B/op          0 allocs/op
PASS
ok      example.com/m   2.380s
```

Here is how to read it:

- `goos` - operating system, its Darwin for MacOS.
- `goarch` - CPU architecture, its arm64 as it ran using M1.
- `pkg` - package name, depend on what we have set using `go mod init`

Now we see another line with five tabs:

- `BenchmarkExample-8` - name of the benchmark function, the `8` suffix describe amount of CPU used.
- `323156` - total number of the loop was executed, `for n := 0; n < b.N; n++ {` , the higher the better.
- `3685 ns/op` - time required to complete each loop on average. It written in nanoseconds per operation, the lower the better.
- `0 B/op` - memory required each loop. It written in Bytes per operation, the lower the better.
- `0 allocs/op` - memory allocations per operation, the lower the better.

The last two lines describe the state of the benchmark test and time required to complete all tests.

## Compare Benchmark’s Result

Now that we have the Bubble Sort’s performance, we need another algorithm to compare with. Let’s use another popular sorting algorithm: **Quick Sort.**

Instead of rewrite the entire test file, we just need to add another test for Quick Sort.

Here is the final code snippet.

```go
package main

import "testing"

// BenchmarkQuickSort is the quick sort test, it called the function N times
func BenchmarkQuickSort(b *testing.B) {
	// generate input once, [0,1,2,3,4,5 ... 100]
	input := makeSlice(0, 100, 1)
	// run the function being tested b.N times
	for n := 0; n < b.N; n++ {
		// call the function
		quickSortDesc(input)
	}
}

// BenchmarkBubbleSort is the bubble sort test, it called the function N times
func BenchmarkBubbleSort(b *testing.B) {
	// generate input once, [0,1,2,3,4,5 ... 100]
	input := makeSlice(0, 100, 1)
	// run the function being tested b.N times
	for n := 0; n < b.N; n++ {
		// call the function
		bubbleSortDesc(input)
	}
}

func main() {
	// run the benchmark
	testing.Benchmark(BenchmarkQuickSort)
	testing.Benchmark(BenchmarkBubbleSort)
}

// makeSlice generate slice from min to max with increment
func makeSlice(min, max, incr int) []int {
	a := make([]int, max-min+1)
	for i := range a {
		a[i] = min + incr
	}
	return a
}

// quickSortDesc return a sorted descending slice
func quickSortDesc(arr []int) []int {
	if len(arr) <= 1 {
		return arr
	}

	pivot := arr[len(arr)/2]
	left := make([]int, 0, len(arr))
	right := make([]int, 0, len(arr))
	for _, v := range arr {
		if v > pivot {
			left = append(left, v)
		} else if v < pivot {
			right = append(right, v)
		}
	}

	left = quickSortDesc(left)
	right = quickSortDesc(right)

	left = append(left, pivot)
	left = append(left, right...)

	return left
}

// bubbleSortDesc return a sorted descending slice
func bubbleSortDesc(arr []int) {
	n := len(arr)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if arr[j] < arr[j+1] {
				// Swap elements
				arr[j], arr[j+1] = arr[j+1], arr[j]
			}
		}
	}
}
```

_*BubbleSort function was written by ChatGPT_

After run the benchmark, we will have these kind of result:

```go
goos: darwin
goarch: arm64
pkg: example.com/m
BenchmarkQuickSort-8             4066788               288.4 ns/op          1792 B/op          2 allocs/op
BenchmarkBubbleSort-8             322953               3501 ns/op              0 B/op          0 allocs/op
PASS
ok      example.com/m   2.737s
```

As we already know, Quick Sort perform much more efficient result in given input. Time required to perform Bubble Sort is much longer than Quick Sort. Even with the cost of memory allocation, Quick Sort is clear winner.

But do remind, each algorithm has their best case. Here is another test result with input of a slice of 10 instead of 100:

```go
goos: darwin
goarch: arm64
pkg: example.com/m
BenchmarkQuickSort-8            20601570                58.01 ns/op          192 B/op          2 allocs/op
BenchmarkBubbleSort-8           30120543                38.13 ns/op            0 B/op          0 allocs/op
PASS
ok      example.com/m   3.778s

```

Now Bubble Sort is a winner. With lower input size, using Quick Sort is a bit slow but still have a great performance.

# Final Words

By benchmarking our code, we able to see how fast our code can run and even gain more insight. Benchmark help you to identify you identify performance bottlenecks and optimize your code before the code being deployed.

With its benefits and simple implementation, Benchmark in Go is one of the high return investment that you should never underestimate.

# Reference
[^1]: [Benchmarking in Golang: Improving function performance](https://blog.logrocket.com/benchmarking-golang-improve-function-performance/)