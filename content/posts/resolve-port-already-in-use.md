+++
title = 'Resolve Port Already in Use'
date = 2023-04-13T05:49:16+07:00
draft = false
+++

Port conflict usually happen whenever a service try to run and listen to a specific port while another server currently utilizing it. For those who manage multiple service repository, this could be quite common.

The simplest way is to search and terminate the binary. But what if the binary stalled or we have no idea where did we ran it.

No worry, with a simple command, we can figure it out in less than a minute!

# How to Find Used Port

> 🔖 TLDR; use `lsof -i <port>`

Port conflict usually happen whenever a service try to run and listen to a specific port while another server currently utilizing it. This kind error message widely known as one of indicator that you are experiencing port conflict.

```bash
port 8080 already in use
```

To solve port conflict `already in use`, you have to check first: which process in your system that using port `8080`. Just then you have option to kill it, if possible.

There is a simple tool to check which process in your system that run an listen to a specific port: `lsof`[^1], it is an abbreviation of `list of open files`. The command will list all opened files in the system. Including the binary who used up the port we want to use.

Check if your system does have it by type this command in your terminal:

```bash
lsof -v
```

To use it, you may type in format:

```bash
lsof -i :<port_number>
```

Notice that I add an argument `-i` .

We are using argument `-i` since it allow `lsof` selects the listing of files any of whose internet address matches the address specified in *i*.

So, to check which process utilize port `8080`, we can use this:

```bash
sudo lsof -i :8080
```

To obtain complete information, do use `sudo` so any process run with `sudo` can be listed as well. It will return something like this:

```bash
masgar@hobi-dev:~$ sudo lsof -i :8080
COMMAND  PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
main    4336   masgar   3u  IPv6  54519       0t0 TCP  *:http-alt (LISTEN)

```

# How to Kill A Process By PID

Now that you have found the PID of a process that utilize port `8080`, you have an option to kill it or have mercy. If you choose to kill it, you can use `kill`, with format:

```bash
sudo kill -9 <PID number>
```

An argument `-9` passed so by run `kill` , you will **kill a process immediately without having to wait the process to stop gracefully.**

> ⚠️ _Do it on your own risk! The power to kill a process is no joke!_ ⚠️ 

```bash
sudo kill -9 4336
```

Done! Your port `8080` is now free, just like Dobby, the free elf. 🕊️ Wee..

If you have time to spare and want to be expert of `lsof`, I'd recommend this article: **[Linux Manual](https://man7.org/linux/man-pages/man8/lsof.8.html)** - `lsof`

# Reference

[^1]: [Linux Manual](https://man7.org/linux/man-pages/man8/lsof.8.html) - `lsof`