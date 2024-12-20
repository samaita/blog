+++
title = 'Easily Switch Go Version with GVM'
date = 2024-12-20T22:00:00+07:00
draft = false
+++

There are various challenge in managing multiple golang microservice. One of them is develop the service with right golang version. I've work on a legacy service that set with go1.16. But the thing is I have go1.23.

Without using same version, it is painful just to start in local. I have to run `go mod vendor`, met incompatibilities, `go get`, `go mod vendor`, broken there broken here.. Waste of time!

The easiest solution might be just to upgrade the repository to using the latest one. Why would let it stick with outdated go version? Yes! But sometimes, it is not an option.

The simpler solution is just to change the golang version anytime you need. I've use `gvm` Golang Version Manager -- I guess. It is dead simple and super easy to use.

# Basic Usage GVM

Whenever I need to change my go version, i just have to switch. Lets say the repository is using go1.18, but I got go1.23. In terminal i just have to type:
```
gvm use go1.18
```
Or if I want to set a certain version as default
```
gvm default 1.18
```
That's it!

There might be new golang version and your gvm doesn't have it. No worry, install it so it will be available for switch.
```
gvm install 1.24
```

This service manager put my life easier to switch my golang versions. I hope gvm would help you too.

# Reference

GVM - https://github.com/benms/gvm