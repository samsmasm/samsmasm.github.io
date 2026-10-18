# Setting up the busia-ab worker (one time, about 10 minutes)

Everything happens in the Cloudflare dashboard (dash.cloudflare.com), logged in to the account that runs unisam.nz. Nothing is recorded until this is done, and nothing is shown to students until `AB_ENABLED` is switched on in `busia/ab/assign.js`.

## 1. Create the database

1. Left menu: **Storage & Databases → D1 SQL Database → Create**.
2. Name it `busia-ab`. Leave the location as automatic. **Create**.

You do not need to create any tables. The worker does that itself.

## 2. Create the worker

1. Left menu: **Compute (Workers) → Workers & Pages → Create → Create Worker** (start from "Hello World").
2. Name it `busia-ab`. **Deploy**.
3. **Edit code**. Delete everything in the editor, paste in the whole of `busia/ab/worker/worker.js`, then **Deploy**.

## 3. Connect the database

1. In the `busia-ab` worker: **Settings → Bindings → Add → D1 database**.
2. Variable name: `DB` (exactly that, capitals). Database: `busia-ab`. **Save** (it redeploys).

## 4. Add the two secrets

In the worker: **Settings → Variables and Secrets → Add**. Choose type **Secret** for both.

| Name | Value |
|---|---|
| `BUSIA_PASSWORD` | A new password you choose. This is what you type at the Backend login. |
| `AUTH_SECRET` | Any long random string. You never type it. Mash the keyboard for 40+ characters. |

**Deploy** after adding them.

## 5. Add the route

1. In the worker: **Settings → Domains & Routes → Add → Route**.
2. Zone: `unisam.nz`. Route: `unisam.nz/busia-ab/*`. **Add route**.

## 6. Check it

1. Open `https://unisam.nz/busia-ab/`. You should see the Backend login. Log in with your new password; you should see an empty results page.
2. Logging in also marks that browser as "do not count". Do it once on every device you use (laptop, phone), or add `?nolog` to any guide page.

## Optional: rate limit

The log endpoint only accepts small, strictly checked records, so abuse is unlikely. If you want a belt-and-braces limit: **Security → WAF → Rate limiting rules → Create**: if URI path equals `/busia-ab/log`, 60 requests per 10 seconds per IP, then block.

## Updating the worker later

If `worker.js` changes in the repo, repeat step 2.3 (Edit code, paste, Deploy). The database, secrets and route stay as they are.
