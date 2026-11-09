# Last Fling Airways · Flight LF-001

Prajakta's bachelorette invite: 17 Dec 2026, Sangli, right after the Haldi.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The whole invite (intro, passes, games, RSVP, gate check) |
| `config.js` | The one setting you edit: where RSVPs are saved |
| `dc-lite.js`, `vendor/preact.umd.js` | The small engine that runs the page |
| `aws/bucket-policy.json`, `aws/cors.json` | Copy-paste settings for the S3 bucket |

## 1. Put the site on GitHub Pages (about 5 minutes)

1. On github.com, create a new **public** repository, named `prajakta-sanket-wedding` (already created: https://github.com/YashDahat/prajakta-sanket-wedding).
2. Click **Add file → Upload files** and drag in everything from this folder (keep the `vendor` and `aws` folders).
3. Commit.
4. Open **Settings → Pages**. Under *Build and deployment*, pick **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
5. After a minute the site is live at `https://yashdahat.github.io/prajakta-sanket-wedding/`.

## 2. Create the S3 bucket for RSVPs (about 5 minutes)

1. In the AWS console, open **S3 → Create bucket**.
   - Name: something unique, such as `last-fling-rsvp-yash`
   - Region: **Asia Pacific (Mumbai) ap-south-1**
   - Untick **Block all public access**, and tick the box acknowledging it
   - Leave everything else as it is, and create the bucket
2. Open the bucket → **Permissions**:
   - **Bucket policy → Edit**: paste `aws/bucket-policy.json`, replace both `BUCKET-NAME` with your bucket name, and save.
   - **Cross-origin resource sharing (CORS) → Edit**: paste `aws/cors.json` (already set to `https://yashdahat.github.io`) and save.

What this allows: anyone can **add** and **read** RSVPs, messages and photos (that's the shared seat map and Prajakta's flight log). Nobody can list or delete files except you.

## 3. Switch on live RSVPs

On GitHub, open `config.js`, click the pencil icon, and change it to:

```js
window.LF_CONFIG = { rsvpBase: 'https://BUCKET-NAME.s3.ap-south-1.amazonaws.com/' };
```

Commit. The seat map now fills in for everyone, refreshing every minute.

## Where responses are saved

- `rsvp/LF001-03-PCF5.json`: each guest's latest answer (name, yes/no, time)
- `rsvp-log/LF001-03-PCF5-<time>.json`: every tap, so you can see if someone changed their mind
- `messages/LF001-03-PCF5.json`: each friend's message for Prajakta
- `photos/LF001-03-PCF5-<time>.jpg`: each friend's photo with her (resized to 1200px before upload; older versions are kept)

You can browse both folders in the S3 console.

## Architecture

There is no server. The invite runs in each friend's browser and talks straight to one S3 bucket.

```mermaid
flowchart LR
  GH["GitHub Pages<br/>index.html · config.js"] -->|1 · loads the invite| Phone["Friend's phone<br/>RSVP · message · photo"]
  Phone -->|2 · saves (PUT)| S3
  S3 -->|3 · reads every minute (GET)| Phone
  subgraph S3["S3 bucket · ap-south-1"]
    R["rsvp/&lt;code&gt;.json<br/>latest yes / no"]
    L["rsvp-log/&lt;code&gt;-&lt;time&gt;.json<br/>every tap · only you can read"]
    M["messages/&lt;code&gt;.json<br/>message + photo name"]
    P["photos/&lt;code&gt;-&lt;time&gt;.jpg<br/>new file per upload"]
  end
  You["You · AWS console"] -->|full access| S3
```

| Step | What happens |
|---|---|
| 1 · Load | GitHub Pages serves the page. `config.js` tells it the bucket address. |
| 2 · Save | Tapping *I'm on board* writes `rsvp/<code>.json` and a time-stamped copy in `rsvp-log/`. *Save to my pass* uploads the photo to `photos/` first, then writes `messages/<code>.json` pointing at it. |
| 3 · Read | Every open invite reads the 10 `rsvp/` and `messages/` files (and their photos) once a minute, so the seat map, passes and flight log match for everyone. |
| Guard | The bucket policy lets anyone read `rsvp/`, `messages/` and `photos/` and add files to all four folders. Only you can list, delete or read `rsvp-log/`. CORS lets browsers call the bucket only from your github.io site. |

## Personal links

Each friend's link opens straight to their surprise box after the champagne intro:

| Friend | Link ending |
|---|---|
| Niranjana | `#niranjana` |
| Pratiksha | `#pratiksha` |
| Reena | `#reena` |
| Achintya | `#achintya` |
| Akash | `#akash` |
| Deepak | `#deepak` |
| Prateek | `#prateek` |
| Sriram | `#sriram` |
| Yash | `#yash` |
| Gaurav | `#gaurav` |

Example: `https://yashdahat.github.io/prajakta-sanket-wedding/#sriram`

---

# Wedding website · प्राजक्ता ❦ संकेत

Lives in the `wedding/` folder of the same repo, so it is published at
`https://yashdahat.github.io/prajakta-sanket-wedding/wedding/`.

| File | What it is |
|---|---|
| `wedding/index.html` | The guest site: Marathi + English invitation, 4-day timeline, venues, live updates, guest sign-up |
| `wedding/admin.html` | The family's control room: guest list, announcements, WhatsApp forwarding. Not linked from the guest site. |
| `wedding/config.js` | Where the bucket address goes |
| `wedding/img/` | The couple's photos (bride and groom portraits, gallery) |
| `wedding/sigv4.js` | Signs the admin page's requests to S3 (checked against AWS's own library) |

## Setup (about 10 minutes, after the bachelorette setup above)

1. **Update the bucket.** In S3 → your bucket → Permissions, replace the **bucket policy** with the new `aws/bucket-policy.json` and the **CORS** settings with the new `aws/cors.json` (fill in BUCKET-NAME again). The new versions keep everything the bachelorette invite needs and add the wedding folder.
2. **Create the admin key.** In AWS → IAM → Users → Create user `wedding-admin` (no console access). Attach an inline policy: paste `aws/wedding-admin-iam-policy.json` with your bucket name. Then Security credentials → Create access key → "Application running outside AWS". Keep the key ID and secret safe; share them only with whoever runs announcements.
3. **Connect the site.** Edit `wedding/config.js` on GitHub and set `bucketBase` to the same bucket address as the main `config.js`.
4. **Open the control room** at `…/wedding/admin.html`, paste the key ID and secret, and tap Connect.

## How it works

```mermaid
flowchart LR
  Guest["Guest's phone<br/>wedding/index.html"] -->|signs up (PUT)| Subs["wedding/subscribers/91XXXXXXXXXX.json<br/>private"]
  Admin["Family's phone<br/>admin.html + wedding-admin key"] -->|reads list (signed)| Subs
  Admin -->|posts announcement (signed PUT)| Feed["wedding/broadcasts.json<br/>public read"]
  Feed -->|checked every 30 s| Guest
  Admin -->|one tap per guest| WA["WhatsApp<br/>wa.me link with the message"]
```

- **Guest sign-up:** name, WhatsApp number, bride's or groom's side, number of people and which ceremonies. Saved as one file per phone number, so signing up twice just updates it. Guests can add files but can't read anyone else's.
- **Announcements:** posted from the control room into `wedding/broadcasts.json`. Every open guest site checks it every 30 seconds and shows new ones, with a phone notification if the guest tapped "Turn on alerts". The feed is public; only the admin key can change it.
- **WhatsApp:** the control room lists every guest with a **Send on WhatsApp** button that opens WhatsApp with the message ready. It remembers who you've already sent each message to. Or tap **Copy message** and paste it into a WhatsApp broadcast list.
- **Guest list:** counts per ceremony and per side, search, remove, and **Download CSV**.

## Still to fill in

Search `index.html` for `[` to find them: Mehendi and Gaav Dev times, the Satara venue, the Sangli venue name, and both families' names for the invitation.
