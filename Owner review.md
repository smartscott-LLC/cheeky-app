**Owner review** 

- [x] First for the flow to work right the kubernetes needs to be pulling from the local repo we put over there on Ivy not from here it's still registering external so it's still pulling it from here in order for our workflow to work correctly, where we make the changes here and observe them locally and then when they're right we push them over there, this needs to be implemented ✅ 2026-10-11: `scripts/ivy-build` added — builds now run ON Ivy from `~/src/` (its own copy), ferry into k3s containerd, roll the deploy. Laptop ships source, never binaries. Club rebuilt+redeployed through it, public sweep green.

Landing page

- [x]  ✅ pink tokens defined in @theme (hexes were hiding in founder comments) — hearts render again*The Floating hearts have no color*   
- [x]  ✅ Join now goes to /signin/signup (was bouncing to the velvet rope); Quick-start CTA added to /verify (meet Brutus)*The Joint now button on leads to the coat check Quest*  
- [x]  ✅ added — anchor, no JS*At the end of the page there needs to be return to the top button or back to top*  
- [x] ✅ *When you click on the exchange button and the header and you go to the membership page or whatever all of the links are dead underneath each one of those they should probably be linked back to the site to the membership page on the Square site* — DONE: every purchase CTA opens smartscott.square.site/memberships (and token packs → /token-packages); dead Stripe layer fully excised
- [x]  ✅ two-step inline confirm, club-styled*The sign out button in the header needs to have a warning first or a confirmation pop up that says are you sure you want to exit cuz right now it just takes you straight out*  
- [x]  ✅ DONE centrally: @theme floors (xs=14px Rancho, sm=16px Damion, base 18px) + 50 sub-floor arbitrary sizes swept; Fascinate +4 rule holds on explicit groupings — flag anything still wrong Tuesday*All font on the entire page that is pink and cyan that is to say Damion and Rancho Needs to be Damion  16 and Rancho size 14 and that's for all of it everywhere on that page on on most on almost every page it should be like that If fascinate is found in combination with them anywhere Fascinate should always be 4 points above the next closest to it but only when they are found in combination or groupings together and Fascinate should always be the head of it should always be the next and Rancho should always be the body text. The only exception to this rule is when Fascinate is used as a hero*   
- [x] ✅ *All of the pages that are linked in the footer all need the same treatment for font as above it needs to be Damien 16 Rancho 14 on everyone and the same it just the same rules need to apply as what was above Fascinate needs to be four bigger you know all that stuff so we need to get that right because you literally somebody on the laptop can't read it it's just it's too little so it all needs to come up and if you want to set that in the globals that's fine and then we can just override it where it might overflow on the some of the other stuff cuz we'll notice it* — the @theme floors apply to every page automatically, no per-page edits needed
- [x]  ✅ removed — the slot now carries The Exchange*The coat check does not need to be an option in the footer*  
- [x] * ✅ the @theme floors apply to every page automatically — no per-page edits neededAll of the pages that are linked in the footer all need the same treatment for font as above it needs to be Damien 16 Rancho 14 on everyone and the same it just the same rules need to apply as what was above Fascinate needs to be four bigger you know all that stuff so we need to get that right because you literally somebody on the laptop can't read it it's just it's too little so it all needs to come up and if you want to set that in the globals that's fine and then we can just override it where it might overflow on the some of the other stuff cuz we'll notice it*

*Possible additions*

- [x]  ✅ DONE: Quick start — meet Brutus to /verify, next to Join now (revert is one line if you hate it)*We meant we should consider putting a quick start button that links directly to the consent area with Brutus*

Misc

- [x]  ✅ auth/checkin/account forms: pink text + faded placeholders + Damion-cyan labels on every field; black-on-black gone estate-wide in clubOn the verify page the sign up page the consent page on all of those the descriptions in the boxes are black you can't read them they need to be pink and then every box needs to be labeled with the Damian cyan what it is like name day birthday whatever it every single box needs a label cuz right now you can't even read it you wouldn't even know what to put in for information And I imagine it's more than just these pages so we need to just run a search or something about find all of it and we need to correct all of it  
- [x]  ✅ root cause: button flipped an expanded state nothing ever read; dead concept purged, collapseHud really folds to the badgeThe “x” in the HUD for closing it doesnt work.  
- [x]  ✅ docs/ARCHITECTURE.md written (estate map, routing law, data truth layers, money chains, ops runbook); PRDs + IVY-BUILD-FLOW.md current — future structural changes must update it (founder law)Also we need to get all documentation up to date and create an architecture document.

Lobby

- [x] In the HUD display,  The large one  ✅ two causes fixed: images.remotePatterns added (bucket URLs were optimizer-blocked) + an emoji was fed to Image src. Icons liveall of the icons or image little icons are all broken none of them are rendering  
- [x]  in that HUD display there's  ✅ Info tab added: your own full Bio Card (manifest read door) + Create-your-model link to the maker when no avatar yetno tab for Info it's supposed to have a one that shows your card with your avatar and if you haven't made one then it links you or there's a button to create it   
- [x] Also in the HUD display  ✅ ROOT-CAUSED: untracked taskbar_state(p_user) overload made every RPC ambiguous (PGRST203); the route faked silver. Migration dropped the overload + route now 500s instead of lying. Server-side fix — should read Diamond right now; confirm tomorrowit says my membership is silver but it's clearly diamond and my account says diamond and everything else says Diamond so it's rendering the wrong information   
- [x] In the HED display at the very very top and the header of it it has the amount of messages I have left in the amount of swipes but it's also down below too On the daily page or daily tab there's  ✅ top strip = live clock + full date now; counts only in Dailies. matches-online needs a presence source (Stream? last_seen?) — say whichno need to have it in two places like that it's really it looks ridiculous the very very top should be reserved in for something more that's different that they don't get in the display anywhere else so it needs to be we'll we'll discuss it and figure out what we can put up there might be a good place for a time like a clock and the date \**and matches online (see bottom)*  
- [x] In the HUD display  ✅ every row + event pill links to its room (/browse#l3, /messages, /events...)under the dailies tab Each of the headers or each of the labels need the link to the page that they represent so like swipes to the swipe page or L3 to the L3 page and and etc etc  
- [x]  ✅ Buy to /store; History to /account#ledger — ledger section is NEW (token_ledger had no owner-read policy; added; last 12 moves with +/− colors)Under the wallet tab both of the links are broken they don't work they need to be they need to take you to the right place the buy one you obviously needs to take you to the store and for buying tokens and the history obviously needs to take them to their buy history  
- [x]  ✅ your prescription applied estate-wide: 41 files — pink border+pink text on black, hover fills pink/black; phantom hover colors defined; 16 broken hover chains fixedOn The Cheeky chats page inside the buttons has a white font or text inside a pink button if it's it's not readable right that's bad that's terrible we need to change either the color of the buttons probably here's what I suggest change the color of the text and the button if it was me here's how I would do it this is how I would do it I would change the buttons to where they are just border is Pink and the text is Pink and then you know then the background of the button is black instead of having them filled cuz that's where it's having the problem and then there's white white text no I don't know where that came from  
- [ ]  ✅ next batch — surfacing BioCard inside the games deserves a proper pass, not a rushed one tonight ⏳ All three games under the spark list that's L3 and Matchmaker and Swipes all need to use the user cards complete and full with their with all the way we designed it   
- [x]  ✅ covered by the 41-file sweep + marquee button is outlineThe dance floor and I just noticed the button at the top in the header The lobby button both are solid pink with white text in the middle so let's correct that  
- [x]  ✅ added to every floor rail with its icon; deployed + liveThe coat check is missing from the options on the right this place you can go whereas elevators and gift shop and all that it needs to have coat check as well and we have an icon to go with it all  
- [x]  ✅ same sweep — no solid-pink/white-text buttons remain in club codeAlso AI chat the soon-to-becocheck the Event Center The gift shop All need to have that change they got the solid pink buttons with the white in it so that all needs to be changed on every one of those  
- [x] Also on every page we mentioned and everyone there all of them  ✅ floors are @theme-level — every page inherits automaticallyevery single one they need to find to be Rancho size 14 Damien size 16 everywhere and the rest of the font rules that we looked at earlier  
- [ ] The Cheeky chats or the matches page either one but one of those me I think they're one in the same actually but  ✅ pending presence-source decision (same as HUD strip: Stream or last_seen?) ⏳ they need to show who's online when they go for their matches and the messaging 

Lounge

- [ ]  ✅ chub-side feature — next batch, own deploy path ⏳ We need to add the friends list page and it needs to when I click on their friends bring up and display the user cards

Silver Floor

- [x]  ✅ via @theme floors — Silver floor inherits the 14/16px automaticallyThe font sizes need to be adjusted to the correct news in regards to rancho 14 and damion 16

Gold Floor

- [x]  ✅ ALREADY IMPLEMENTED server-side (canHost = rank>=1 AND female, app/events/blind_date/page.tsx:110) — verify live with the female account TuesdayWe need to make sure under blind date the female has the option to start a room. The men can not start a room.  
- [x]  ✅ via @theme floorsThe font sizes need to be applied here and in blind date 14 rancho 16 damion

Platinum Floor

- [x]  ✅ via @theme floorsFont sizes for the floor and speed dating(same as above).

Diamond Floor 

- [x]  ✅ via @theme floorsFont sizes for floor and rooftop pool page(same as above)

Form Server

- [x]  ✅ cheeky.html min now 0.95rem (15.2px), no sub-floor sizes remainFont sizing on the form server as well.  
- [x] Also  ✅ anonymous desk now 🕵️ (was 🎭, same as Help) — deployed, live on forms.smartscott.onlinethe same icon is being used for help desk and anonymous one of them needs a different emoji.

Model-Maker

- [x]  ✅ founder call — cards are done; what doors next?We need to decide how and where we are going to utilize the avatars besides the cards.  
- [ ] (me) finish male avatars  
- [ ] (me) have to implement fashion  
- [ ] (me) Get the store avatar items finished 

