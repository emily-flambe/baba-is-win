---
title: Claude-Code Like a Degenerate
publishDate: 26 Jun 2025
description: An agglomeration of strats and tips and tricks that have propelled me to LLM nirvana and/or brainrot. I'm not sorry.
thumbnail: /assets/blog/2025-06-based-and-claude-pilled/claude.jpg
tags: ["ai","claude","tips","bossbitch"]
---

![A Degenerate's Guide to Claude Code](/assets/blog/2025-06-based-and-claude-pilled/cheeky.png)

# Disclaimer

As of writing, I subscribe to Claude Max (the $100/month plan). If that cash outlay seems daunting, consider how much money you spend going out to eat, and then consider the fact that I have no friends.

Okay, that's not true at all, but it is true that I have at least enough money - and personal interest - to support this level of LLM brainrot. That may not be the case for you.

Therefore: please be advised that I am making practically zero effort to use tokens efficiently. Make good choices!

# Quick tips

### use --dangerously-skip-permissions

I have aliased `claude --dangerously-skip-permissions` to `claudia` (that saucy minx!), which I use 100% of the time when working on personal projects. This unlocks truly degenerate levels of velocity!

OBVIOUSLY, you should think very carefully before doing this in codebases of any consequence, though I will say I have been using this option aggressively for several weeks and nothing unseemly has happened _yet_.

### Tell Claude to try trying

Ask Claude to think hard and, if applicable, do some research before it begins a task. Otherwise, much like a human, it will not.

Related: If you are asking Claude to write code that uses a specific API (or framework or what have you), it's a good idea to provide a link to current documentation and tell Claude to review the docs carefully before proceeding.

### Start with a detailed plan

Ask Claude to write a detailed plan before writing code. This is especially useful early in a project, and a good practice at any point in development.

### Clear your damn context

Use `/clear` early and often.

### Tell Claude what to _do_, not what _not to do_

Maybe this foible of LLMs will resolve itself in the fullness of time, but I have heard this tip a lot.

It's good advice for talking to humans, too.

### Memorize rules

Type # to open a prompt where you can give Claude instructions to remember.

In my [SuperClaude fork](https://github.com/emily-flambe/SuperClaude/tree/master), I created a file called [CHEEKY_CHANGES.md](https://github.com/emily-flambe/SuperClaude/blob/master/CHEEKY_CHANGES.md) to keep track of features I had added that went beyond the project's original functionality. This was a mistake; Claude subsequently insisted on making every subsequent change "cheeky" and proceeded to explain to me why everything it did was "cheeky".

So I asked it to stop doing that.

<figure style="float: center; width: 800px; padding-right: 20px;">
  <img src="/assets/blog/2025-06-based-and-claude-pilled/cheeky.png" width="800" />
  <figcaption style="text-align: left; font-size: small;">
    <i>Let's hope this works.</i>
  </figcaption>
</figure>

# Parallel Processing (_peak degeneracy_)

### Use Subagents

Claude has the power to spin up multiple autonomous subagents to work on subtasks in parallel. How do you get it to do that? Just ask!

I routinely instruct Claude to use subagents to work on complex coding tasks. For example: `Make a plan to implement these changes using subagents working in parallel.` This is how you reach the Claude nirvana of teeing up a grotesquely complex task, letting it spin for an hour, and coming back to a bunch of changes, about 80% of which do what they're supposed to.

You can additionally ask Claude to give you a report on what all the subagents did, and maybe even write the report to a log file... but are you really going to read all that?

### Use Git Worktrees

A true degenerate is not satisfied working on a single branch at a time. To open multiple branches and _really_ simulate a team of infinite monkeys working at your disposal, use [git worktrees](https://git-scm.com/docs/git-worktree).

I find it useful to add a rule to CLAUDE.md like: `save all new worktrees in the worktrees/ folder`. Otherwise your project will become cluttered with inconsistently named worktrees, like `worktree-comment-box-feature` or `authentication-worktree`.

Combine this strategy with subagents for endless entertainment!

# Custom Commands

Once you've used Claude Code enough, you'll start to notice that you are running certain prompts over and over, with only slight variations. A true degenerate turns those into _custom commands._

An easy-ish entrypoint into the blood magic of hyper-configured Claude Code is to start with [SuperClaude](https://github.com/NomenAK/SuperClaude) - not my invention - which configures a bunch of personas and commands to configure in the global claude configuration. It's a bit much for my personal needs, but the key insight is that adding custom commands is easy AND fun!

I [created my own fork](https://github.com/emily-flambe/SuperClaude) and have been adding commands like:

- `yolo-merge`: commits all changes to a branch, opens a pull request, and merges the pull request. My personal projects are a deranged mess; I will be shocked if anyone reviews any of this code, ever. But I still use pull requests because I have standards.
- `abort`: When a coding session isn't working out and Claude is stuck in a death-loop, this command documents findings from the current session, terminates the session, and starts a new one. Sometimes Claude Code sessions are just dumb and bad for whatever reason, and turning it off and back on again (with receipts) can be surprisingly productive.
- `pull-main`: Merges the `main` branch into the checked-out branch. Useful when juggling multiple branches in git worktrees.
- `make-make`: Sets up a Makefile and whatever scripts should be used in the Makefile.

The takeaway here is that you can vibecode your way to more efficient vibecoding, which you can use to vibecode even more efficient tools for vibecoding, which you can use to.....

# Final Thoughts

All of this will probably be obsolete in about a month.