**Insights**

Render-blocking requests Est savings of 180 ms  
Requests are blocking the page's initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking?utm_source=lighthouse&utm_medium=lr) can move these network requests out of the critical path.LCPFCPUnscored

| URL | Transfer Size | Duration |
| :---- | ----: | ----- |
| smartscott.online 1st party | **12.0 KiB** | **270 ms** |
| […css/bb83a1b4bc009610.css](https://www.smartscott.online/_next/static/css/bb83a1b4bc009610.css)(www.smartscott.online) | 10.5 KiB | 70 ms |
| […css/f6d0b33820ed37b3.css](https://www.smartscott.online/_next/static/css/f6d0b33820ed37b3.css)(www.smartscott.online) | 1.5 KiB |  200 ms  |

Improve image delivery Est savings of 848 KiB  
Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/performance/insights/image-delivery?utm_source=lighthouse&utm_medium=lr)LCPFCPUnscored

|  | URL | Resource Size | Est Savings |
| :---- | :---- | ----- | ----: |
| smartscott.online 1st party |  | **879.2 KiB** | **847.6 KiB** |
| The entrance to Club Cheeky \<img src="/brand/entrance.webp" alt="The entrance to Club Cheeky" class="h-72 w-56 object-cover sm:h-96 sm:w-72"\> | [/brand/entrance.webp](https://www.smartscott.online/brand/entrance.webp)(www.smartscott.online) | 206.4 KiB | 193.5 KiB |
|  | This image file is larger than it needs to be (1152x1536) for its displayed dimensions (288x384). Use responsive images to reduce the image download size. |  | 193.5 KiB |
| The Diamond floor at Club Cheeky \<img src="/floors/diamond.webp" alt="The Diamond floor at Club Cheeky" class="aspect-video w-full object-cover"\> | [/floors/diamond.webp](https://www.smartscott.online/floors/diamond.webp)(www.smartscott.online) | 188.1 KiB | 182.9 KiB |
|  | This image file is larger than it needs to be (1536x864) for its displayed dimensions (256x144). Use responsive images to reduce the image download size. |  | 182.9 KiB |
| The Silver floor at Club Cheeky \<img src="/floors/silver.webp" alt="The Silver floor at Club Cheeky" class="aspect-video w-full object-cover"\> | [/floors/silver.webp](https://www.smartscott.online/floors/silver.webp)(www.smartscott.online) | 178.8 KiB | 173.9 KiB |
|  | This image file is larger than it needs to be (1536x864) for its displayed dimensions (256x144). Use responsive images to reduce the image download size. |  | 173.9 KiB |
| The Gold floor at Club Cheeky \<img src="/floors/gold.webp" alt="The Gold floor at Club Cheeky" class="aspect-video w-full object-cover"\> | [/floors/gold.webp](https://www.smartscott.online/floors/gold.webp)(www.smartscott.online) | 156.6 KiB | 152.3 KiB |
|  | This image file is larger than it needs to be (1536x864) for its displayed dimensions (256x144). Use responsive images to reduce the image download size. |  | 152.3 KiB |
| The Platinum floor at Club Cheeky \<img src="/floors/platinum.webp" alt="The Platinum floor at Club Cheeky" class="aspect-video w-full object-cover"\> | [/floors/platinum.webp](https://www.smartscott.online/floors/platinum.webp)(www.smartscott.online) | 149.3 KiB | 145.1 KiB |
|  | This image file is larger than it needs to be (1536x864) for its displayed dimensions (256x144). Use responsive images to reduce the image download size. |  | 145.1 KiB |

Use efficient cache lifetimes Est savings of 332 KiB  
A long cache lifetime can speed up repeat visits to your page. [Learn more about caching](https://developer.chrome.com/docs/performance/insights/cache?utm_source=lighthouse&utm_medium=lr).LCPFCPUnscored

| Request | Cache TTL | Transfer Size |
| :---- | ----- | ----: |
| Stripe utility  |  | **263 KiB** |
| [/dahlia/stripe.js](https://js.stripe.com/dahlia/stripe.js)(js.stripe.com) | 2m | 246 KiB |
| [/out-4.5.45.js](https://m.stripe.network/out-4.5.45.js)(m.stripe.network) | 5m | 17 KiB |
| posthog.com |  | **108 KiB** |
| [/static/posthog-recorder.js?v=1.409.5](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5)(us-assets.i.posthog.com) | 4h | 57 KiB |
| [/static/surveys.js?v=1.409.5](https://us-assets.i.posthog.com/static/surveys.js?v=1.409.5)(us-assets.i.posthog.com) | 4h | 33 KiB |
| [/static/dead-clicks-autocapture.js?v=1.409.5](https://us-assets.i.posthog.com/static/dead-clicks-autocapture.js?v=1.409.5)(us-assets.i.posthog.com) | 4h | 7 KiB |
| [/static/exception-autocapture.js?v=1.409.5](https://us-assets.i.posthog.com/static/exception-autocapture.js?v=1.409.5)(us-assets.i.posthog.com) | 4h | 5 KiB |
| [/static/web-vitals.js?v=1.409.5](https://us-assets.i.posthog.com/static/web-vitals.js?v=1.409.5)(us-assets.i.posthog.com) | 4h | 3 KiB |
| […phc\_uhYkk…/config.js](https://us-assets.i.posthog.com/array/phc_uhYkkhjuUY5xhthAeMcLfnNFWAE6mbNa8VQQC8CZSPp4/config.js)(us-assets.i.posthog.com) | 5m | 1 KiB |

Legacy JavaScript Est savings of 68 KiB  
Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/articles/baseline-and-polyfills?utm_source=lighthouse&utm_medium=lr) features, unless you know you must support older browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://developer.chrome.com/docs/performance/insights/legacy-javascript?utm_source=lighthouse&utm_medium=lr)LCPFCPUnscored

| URL |  | Wasted bytes |
| :---- | :---- | ----- |
| posthog.com |  | **34.9 KiB** |
| [/static/web-vitals.js?v=1.409.5](https://us-assets.i.posthog.com/static/web-vitals.js?v=1.409.5)(us-assets.i.posthog.com) |  | 15.2 KiB |
| [../../browser-common/dist/utils/array-at-polyfill.mjs:1:52](https://us-assets.i.posthog.com/static/web-vitals.js?v=1.409.5) | Array.prototype.at |  |
| [/static/posthog-recorder.js?v=1.409.5](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5)(us-assets.i.posthog.com) |  | 10.9 KiB |
| [../../rrweb/record/dist/rrweb-record.js:1:0](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5) | Array.from |  |
| [/static/surveys.js?v=1.409.5](https://us-assets.i.posthog.com/static/surveys.js?v=1.409.5)(us-assets.i.posthog.com) |  | 8.8 KiB |
| [../../browser-common/dist/utils/uuidv7.mjs:12:21](https://us-assets.i.posthog.com/static/surveys.js?v=1.409.5) | Math.trunc |  |
| smartscott.online 1st party |  | **32.9 KiB** |
| […chunks/8958-8c60e18bac49e96b.js](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) |  | 13.1 KiB |
| […chunks/8958-8c60e18bac49e96b.js:2:138715](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | Array.prototype.at |  |
| […chunks/8958-8c60e18bac49e96b.js:2:138103](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | Array.prototype.flat |  |
| […chunks/8958-8c60e18bac49e96b.js:2:138216](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | Array.prototype.flatMap |  |
| […chunks/8958-8c60e18bac49e96b.js:2:138592](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | Object.fromEntries |  |
| […chunks/8958-8c60e18bac49e96b.js:2:138850](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | Object.hasOwn |  |
| […chunks/8958-8c60e18bac49e96b.js:2:137845](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | String.prototype.trimEnd |  |
| […chunks/8958-8c60e18bac49e96b.js:2:137760](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | String.prototype.trimStart |  |
| […chunks/e1faa60d-e468bb8cf9206d1e.js](https://www.smartscott.online/_next/static/chunks/e1faa60d-e468bb8cf9206d1e.js)(www.smartscott.online) |  | 11.2 KiB |
| […chunks/e1faa60d-e468bb8cf9206d1e.js:1:54164](https://www.smartscott.online/_next/static/chunks/e1faa60d-e468bb8cf9206d1e.js)(www.smartscott.online) | Array.from |  |
| […chunks/ebccf3b1-0286e703b61e4ce4.js](https://www.smartscott.online/_next/static/chunks/ebccf3b1-0286e703b61e4ce4.js)(www.smartscott.online) |  | 8.6 KiB |
| […chunks/ebccf3b1-0286e703b61e4ce4.js:1:39518](https://www.smartscott.online/_next/static/chunks/ebccf3b1-0286e703b61e4ce4.js)(www.smartscott.online) | Math.trunc |  |

LCP breakdown  
Each [subpart has specific improvement strategies](https://developer.chrome.com/docs/performance/insights/lcp-breakdown?utm_source=lighthouse&utm_medium=lr). Ideally, most of the LCP time should be spent on loading the resources, not within delays.LCPUnscored

| Subpart | Duration |
| :---- | ----: |
| Time to first byte | 10 ms |
| Element render delay | 460 ms |

Looking for your next crush?

\<h1 class="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight sm:text-7xl"\>

3rd party code can significantly impact load performance. [Reduce and defer loading of 3rd party code](https://developer.chrome.com/docs/performance/insights/third-parties?utm_source=lighthouse&utm_medium=lr) to prioritize your page's content.Unscored

| 3rd party | Transfer size | Main thread time |
| :---- | ----: | ----: |
| Stripe utility  | **265 KiB** | **208 ms** |
| [/dahlia/stripe.js](https://js.stripe.com/dahlia/stripe.js)(js.stripe.com) | 246 KiB | 116 ms |
| [/inner.html](https://m.stripe.network/inner.html)(m.stripe.network) | 0 KiB | 72 ms |
| [/out-4.5.45.js](https://m.stripe.network/out-4.5.45.js)(m.stripe.network) | 17 KiB | 20 ms |
| [/inner.html](https://m.stripe.network/inner.html#url=https%3A%2F%2Fwww.smartscott.online%2F&title=Club%20Cheeky%20%E2%80%94%20The%20Club%20for%20Real%20Connections&referrer=&muid=NA&sid=NA&version=6&preview=false&__shared_params__[version]=dahlia)(m.stripe.network) | 2 KiB | 0 ms |
| [/6](https://m.stripe.com/6)(m.stripe.com) | 1 KiB | 0 ms |
| posthog.com | **108 KiB** | **38 ms** |
| [/static/posthog-recorder.js?v=1.409.5](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5)(us-assets.i.posthog.com) | 57 KiB | 24 ms |
| [/static/surveys.js?v=1.409.5](https://us-assets.i.posthog.com/static/surveys.js?v=1.409.5)(us-assets.i.posthog.com) | 33 KiB | 8 ms |
| [/static/dead-clicks-autocapture.js?v=1.409.5](https://us-assets.i.posthog.com/static/dead-clicks-autocapture.js?v=1.409.5)(us-assets.i.posthog.com) | 7 KiB | 2 ms |
| [/static/web-vitals.js?v=1.409.5](https://us-assets.i.posthog.com/static/web-vitals.js?v=1.409.5)(us-assets.i.posthog.com) | 3 KiB | 2 ms |
| [/static/exception-autocapture.js?v=1.409.5](https://us-assets.i.posthog.com/static/exception-autocapture.js?v=1.409.5)(us-assets.i.posthog.com) | 5 KiB | 1 ms |
| […phc\_uhYkk…/config.js](https://us-assets.i.posthog.com/array/phc_uhYkkhjuUY5xhthAeMcLfnNFWAE6mbNa8VQQC8CZSPp4/config.js)(us-assets.i.posthog.com) | 1 KiB | 0 ms |
| [/e/](https://us.i.posthog.com/e/)(us.i.posthog.com) | 0 KiB | 0 ms |
| Sentry utility  | **1 KiB** | **0 ms** |
| […451…/envelope?sentry\_version=…](https://o4511848259715072.ingest.us.sentry.io/api/4511848262795265/envelope/?sentry_version=7&sentry_key=6aaf79deeb5b8a2e119e502317a67802&sentry_client=sentry.javascript.nextjs%2F10.69.0)(o4511848259715072.ingest.us.sentry.io) | 1 KiB | 0 ms |

**Diagnostics**

| URL | Transfer Size | Est Savings |
| :---- | ----: | ----: |
| Stripe utility  | **245.0 KiB** | **166.1 KiB** |
| [/dahlia/stripe.js](https://js.stripe.com/dahlia/stripe.js)(js.stripe.com) | 245.0 KiB | 166.1 KiB |
| smartscott.online 1st party | **237.3 KiB** | **124.4 KiB** |
| […chunks/8958-8c60e18bac49e96b.js](https://www.smartscott.online/_next/static/chunks/8958-8c60e18bac49e96b.js)(www.smartscott.online) | 125.9 KiB | 55.3 KiB |
| […chunks/ebccf3b1-0286e703b61e4ce4.js](https://www.smartscott.online/_next/static/chunks/ebccf3b1-0286e703b61e4ce4.js)(www.smartscott.online) | 75.4 KiB | 41.1 KiB |
| […chunks/5226-d658330f9fe65277.js](https://www.smartscott.online/_next/static/chunks/5226-d658330f9fe65277.js)(www.smartscott.online) | 36.0 KiB | 28.0 KiB |
| posthog.com | **88.9 KiB** | **52.2 KiB** |
| [/static/surveys.js?v=1.409.5](https://us-assets.i.posthog.com/static/surveys.js?v=1.409.5)(us-assets.i.posthog.com) | 32.4 KiB | 26.4 KiB |
| …src/extensions/surveys/surveys-extension-utils.tsx | 8.3 KiB | 7.9 KiB |
| …src/extensions/surveys.tsx | 6.3 KiB | 6.0 KiB |
| …../../../../../setup-pnpm/node\_modules/.bin/store/v11/links/@/preact/10.29.3/140084fb8a57e97c29fa8a8c859027ef9e32ecc372b13de68ff8b4819864c7f8/node\_modules/preact/dist/preact.module.js | 3.6 KiB | 3.4 KiB |
| …src/extensions/surveys/components/QuestionTypes.tsx | 2.0 KiB | 2.0 KiB |
| …../core/dist/surveys/translations.mjs | 0.9 KiB | 0.9 KiB |
| [/static/posthog-recorder.js?v=1.409.5](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5)(us-assets.i.posthog.com) | 56.6 KiB | 25.8 KiB |
| …../rrweb/record/dist/rrweb-record.js | 32.6 KiB | 14.7 KiB |
| …src/extensions/replay/external/lazy-loaded-session-recorder.ts | 9.1 KiB | 2.8 KiB |
| …src/extensions/replay/external/network-plugin.ts | 2.8 KiB | 2.0 KiB |
| …../../../../../setup-pnpm/node\_modules/.bin/store/v11/links/@/fflate/0.4.8/3d6bb6f51514b78f73eff8bf58c4fef7e18a9483e0eef595f39f3a49c6c31e1d/node\_modules/fflate/esm/browser.js | 2.1 KiB | 1.6 KiB |
| …src/extensions/replay/external/recording-strategies.ts | 2.0 KiB |  .5 KiB |

Reduce unused JavaScript Est savings of 343 KiB  
Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. [Learn how to reduce unused JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/?utm_source=lighthouse&utm_medium=lr).LCPFCPUnscored

Avoid long main-thread tasks 4 long tasks found  
Lists the longest tasks on the main thread, useful for identifying worst contributors to input delay. [Learn how to avoid long main-thread tasks](https://web.dev/articles/optimize-long-tasks?utm_source=lighthouse&utm_medium=lr)TBTUnscored

| URL | Start Time | Duration |
| :---- | ----- | ----: |
| Stripe utility  |  | **233 ms** |
| [/dahlia/stripe.js](https://js.stripe.com/dahlia/stripe.js)(js.stripe.com) | 2,234 ms | 148 ms |
| [/out-4.5.45.js](https://m.stripe.network/out-4.5.45.js)(m.stripe.network) | 3,119 ms | 85 ms |
| smartscott.online 1st party |  | **205 ms** |
| […chunks/ebccf3b1-0286e703b61e4ce4.js](https://www.smartscott.online/_next/static/chunks/ebccf3b1-0286e703b61e4ce4.js)(www.smartscott.online) | 1,508 ms | 205 ms |
| posthog.com |  | **65 ms** |
| [/static/posthog-recorder.js?v=1.409.5](https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.409.5)(us-assets.i.posthog.com) | 2,070 ms | 65 ms |

User Timing marks and measures 2 user timings  
Consider instrumenting your app with the User Timing API to measure your app's real-world performance during key user experiences. [Learn more about User Timing marks](https://developer.chrome.com/docs/lighthouse/performance/user-timings/?utm_source=lighthouse&utm_medium=lr).Unscored

| Name | Type | Start Time | Duration |
| :---- | :---- | ----: | ----- |
| sentry-tracing-init | Mark | 615.36 ms |  |
| stripe.js:init | Mark | 999.00 ms |  |

