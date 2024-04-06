+++
title = 'How to Delete Multiple Local Git Branches'
date = 2022-04-06T05:33:50+07:00
draft = false
+++

For you, productive engineer, who dedicate a lot of time for a repo. Have you clean your git branch locally? Just like our home, a project's local branch need decluttering too.

In my point of view, I'd rather see clear git branch locally to help me find any unmerged branch. Or simply pursue peace of mind.

Since Git doesn't have a built in feature to delete multiple git branch in local project, deleting many branches in your local Git project might take you a while.

## How to delete git branch?

First, lets list all branch available in your local with `git branch`

```bash
masgar@mekbuk:~/go/src/github.com/masgar/test$ git branch
  feat/api-create-product
  feat/api-delete-product
  feat/api-get-products
  feat/api-update-product
* master
```

Then we delete it with `git branch -D`. The common method is to delete one by one:

```bash
git branch -D feat/api-create-product
git branch -D feat/api-delete-product
git branch -D feat/api-get-product
git branch -D feat/api-update-product
```

While it is easy to do in smaller number of branch, It might turned into disaster when there are too many branches to delete.

## How do we delete all git branch with pattern?

Here is a tip on how to delete multiple git branches by a pattern quickly.[^1]

1. Open a terminal, change folder to your Git project.
2. Type `git branch | grep "<pattern>"` to see list of git branch
3. Type in `git branch | grep "<pattern>" | xargs git branch -D`

Change the *<pattern>* with a regular expression(RegEx) that match your branch name.

## Example

For example, I want to delete all branch that contain `feat`, then the command is:

> ⚠️ _Be warned, ensure you avoid deleting unmerged branch. Use the pattern wisely_!  ⚠️ 

```bash
git branch | grep "feat" | xargs git branch -D
```
or
```bash
git branch | grep "*" | xargs git branch -D
```

There is no need to do it frequently. I'd suggest to do this at least once per 6 months or earlier if you active in development.

## Reference
[^1]: [Deleting Multiple Branches in Git by Raja Sekar Durairaj](https://medium.com/@rajsek/deleting-multiple-branches-in-git-e07be9f5073c)