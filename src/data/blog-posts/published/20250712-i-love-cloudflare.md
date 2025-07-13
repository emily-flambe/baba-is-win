---
title: I love Cloudflare
publishDate: 12 Jul 2025
description: Guess I am a TECH BLOGGER now and maybe even a THOUGHT LEADER so buckle up chucklefucks it’s time to get aggressively ranted at about cloud platforms and my big feelings about them
thumbnail: /assets/blog/20250712-i-love-cloudflare/degenerate_coding_setup.jpg
tags: ["claude", "tech", "ai", "cloudflare"]
---

## TLDR:

I love Cloudflare Workers and use them to deploy all of my personal projects. AWS and GCP have wasted my money and time and I regard them with haughty disdain.

## Disclosure/Storytime: I interviewed with Cloudflare… twice

Cloudflare interviewed me for a Data Engineer role back in 2021. I did not advance past the coding interview, which is not surprising at all. I know what I got; it aint that.

Our story really begins in February 2025, when Cloudflare interviewed me for an Engineering Manager role on the Workers team. I advanced to an interview with their Director of Product, Brendan. I think he did not find me impressive, which is fine \- maybe someday senpai will notice me. I’m sure they hired someone great.

The sting of rejection was mitigated significantly by the fact that the role would have required me to (re-)relocate to Austin, TX, despite the job posting I applied to explicitly stating New York as the location. (Sidebar: HR at Cloudflare seems to be a bit of a mess. The recruiter spent 15 of our 20 minute chat talking about her bearded dragon. Which I didn’t mind necessarily, but still, they should get their shit together.) I think accepting the job would have been a good life choice, had it been offered to me, but going back to Austin would have been a strange pill to swallow.

In any case, in the process of interviewing for the Workers team, I naturally sought to learn more about Workers, which led me down a path that has led to my current fangirling.

## The journey begins

When I first started tinkering in February, there was a thing called Worker Pages, designed for setting up static web pages with Cloudflare Workers. They had some templates for blogs, and I chose one using Astro, and armed with Cursor (before I was Claude-pilled) I was, albeit clumsily, off to the races.

Today, I think you can still make “Pages,” but Cloudflare is clearly pushing users to use Workers for everything. I think that is a blessed decision on their part, and I have been happily using Workers to deploy apps right and left.

## Wait hold on what are Workers

I mean, https://workers.cloudflare.com/.

Workers run serverless code and are fundamentally a completely different service than AWS EC2 or Google Compute Engine. But Workers serve the same use case for me that I was previously trying to achieve with EC2 and Google Compute Engine: deploying my personal projects to the public internet.

Unlike EC2 or Google Compute Engine, Cloudflare Workers are extremely easy to configure in the UI and with the [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/). 

Also: pricing\! So far I have not spent any money on Workers. I can upgrade to a paid plan for $5/month but I haven’t yet encountered any use case or limitation that would inspire me to do so. More on that later.

I do pay a little money for

## Domain Registration

Cloudflare is a domain registrar and, in the opinion of this girlie, by far the most user friendly of the ones I have tried.

The alternatives, as I see them:

\- Google Domains isn’t even a thing anymore \- it’s fucking Squarespace now? Sundar please what the fuck is that?  
\- AWS Route 53 is not too bad, but AWS on the whole is kind of an overengineered ball of mud, at least from the perspective of a solo vibecoder.  
\- I used GoDaddy back in 2020 but I’m really not sure why you would use a registrar outside a major cloud provider in the year of our lord 2025\. Maybe if they offer unusual TLDs, like .fr, which allegedly requires you to have an in-person address in France, which I found out when I was trying to register [literallyme.fr](http://literallyme.fr). Sad\!

Registering a domain with Cloudflare makes it exceptionally easy to route traffic to them from Workers. My current setup uses [emilycogsdill.com](http://emilycogsdill.com) (you are here\!) with my various deployed workers routing traffic to subdomains, such as [anon.emilycogsdill.com](http://anon.emilycogsdill.com) or [cutty.emilycogsdill.com](http://cutty.emilycogsdill.com). There does not appear to be any limit to my ability to do this, and it’s stupid easy to do.


<figure style="width: 500px; margin: 0 auto;">
  <img src="/assets/blog/20250712-i-love-cloudflare/degenerate_coding_setup.jpg" width="1000" />
  <figcaption style="text-align: center; font-size: small;">
    <i>lmao</i>
  </figcaption>
</figure>

## Wrangler CLI rules

It just fucking makes sense, man, and you can authenticate with oauth (similar to gcloud, which I can grudgingly admit is kind of okay) without the fucking garbage nonsense AWS makes you do to configure your credential profiles.

## AWS sucks

I feel like people use AWS because it’s grandfathered into some vague notion of being “scalable” and “secure” and “configurable” and thus the appropriate choice for enterprise software. Maybe that is true, I don’t know, but it reeks of boomer tech to me.

Every time I need to do something in AWS for professional reasons, I have to boof just a little bit of ketamine to get through the experience, and as a result I have found that when you spend too much time on AWS, you become the physical embodiment of the concept of time.

## GCP sucks

Whoever names services in GCP should be fired and sent to a retirement home for people who cause *other* people to feel like they are experiencing cognitive decline. Also their documentation drifts out of date, which should make their atrociously overpaid engineers, product managers, and UX designers ashamed of themselves. Also the Cloud Shell is an abomination and fails for most things I have ever needed to do.

Meanwhile they get up on stage at conferences and show saccharine videos of, I don’t know, some people laughing as they paint the side of a new orphanage together. Children holding chickens at Uncle Ben’s farm. An old couple holding hands while looking at a sunset. Some god damn nonsense like that \- and then they talk about all the AI features that are going to reshape our reality, please clap. Shut the fuck up god damn it where is my GOD damn ketamine

…What were we talking about? Oh,

## Cloudflare Workers are easy to vibecode

I guess I’m using the term vibecode now even though I kind of hate it and it is somewhat maligned in the discourse. But fuck it, this shit is awesome and I’m tired of pretending like it’s not.

The wrangler CLI lends itself especially well to vibecoding apps into existence on Cloudflare Workers. I don’t really have much else to say here. If I really wanted to be a “thought leader” I would do my due diligence by having Claude Code deploy apps to AWS EC2 and also Google Compute Engine. But you know what, besides laziness, keeps me from doing that?

## AWS and GCP fucking set your money on fire without warning

I am not going to go into detail here. But in summary:

Money I have accidentally burned in AWS: (secret)  
Support tickets I have had with AWS to shut down services that were still inexplicably burning money: At least one  
Money I have accidentally burned in GCP: (less than AWS, still upsetting)  
Money I have accidentally burned in Cloudflare: fucking zero

Cloudflare Workers give you a TON of features and usage limits completely for free, and they are extremely transparent about what features will cost you money. I haven’t even had to do that yet, so I dunno, maybe they suck or something after you upgrade, but there’s a zero percent chance that Cloudflare is as shady and opaque about their billing as AWS and GCP.

## Other things I love about Cloudflare

### AI Workers

This is a new thing I think? I don’t really understand it completely but anyway I vibecoded myself a service that I can make authenticated requests against to use llama (or indeed any open source LLM) for free. (That is how I set up the admittedly shitty AI features in [anon.emilycogsdill.com](http://anon.emilycogsdill.com).) Genuinely amazing.

### I fucking love D1 SQL databases

In the Cloudflare dashboard you can deadass just go into a table and update values in place. It will tell you the SQL it is about to run to update the value and then you just let er rip.

I swear to god Google’s UX designers really think they’re doing something over there when they get paid $50,000 per hour to A/B test the rounded corners of a rectangular button or some shit, but Cloudflare *actually* has an intuitive interface.

# In conclusion

Cloudflare is for crafty consumers like me who demand usable services and embrace modernity. Cloudflare, I am busy right now, but maybe some other time you could try to hire me.

AWS is an abomination and only boomers use it because they haven’t done a google search since 2007 and realized there are better alternatives.

GCP pretends to be cool and hip and modern and friendly and more usable than AWS but still manages to be an overcomplicated and unusable jungle of shit. I wouldn’t hold so much against them if I didn’t know how much stupid money they all make and if Google (the internet company) weren’t so blatantly intoxicated by the smell of their own farts. Get over yourselves\! Update your documentation\! God damn it\!

Love u Cloudflare