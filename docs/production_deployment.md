# 🚀 Operation Cleaner: Production Deployment Tutorial

This guide is designed for **Mobile/Dashboard** deployment. Follow these steps exactly to ensure your library works with Cloudflare Secrets and Bindings.

---

## 🛠️ Phase 1: Create Cloudflare Secrets (Dashboard)
Secrets are encrypted and never exposed in the code.
1. Go to **Cloudflare Pages** → **nightmare-library** → **Settings** → **Environment variables**.
2. Under **Production**, click **Add variable** and set type to **Secret** for each of these:

### Authentication
- `PASSWORD`: Your library login password.
- `JWT_SECRET`: A long random string for security.

### Storage Providers (Optional but Recommended)
Add any of these to enable cloud storage:
- `GDRIVE_ACCESS_TOKEN`
- `DROPBOX_ACCESS_TOKEN`
- `ONEDRIVE_ACCESS_TOKEN`
- `PCLOUD_ACCESS_TOKEN`
- `BOX_ACCESS_TOKEN`
- `YANDEX_ACCESS_TOKEN`
- `KOOFR_ACCESS_TOKEN`
- `B2_KEY_ID` & `B2_APPLICATION_KEY`
- `MEGA_EMAIL` & `MEGA_PASSWORD`
- `GITHUB_TOKEN`: For the fallback storage system.

---

## 🏗️ Phase 2: Set Up KV Namespaces
1. Go to **Cloudflare Dashboard** → **KV Namespaces**.
2. Click **Create namespace** twice:
   - `KV_SESSIONS`
   - `KV_CACHE`
3. Back in **Pages Settings** → **Functions** → **KV namespace bindings**:
   - Bind `KV_SESSIONS` to variable `KV_SESSIONS`.
   - Bind `KV_CACHE` to variable `KV_CACHE`.

---

## 🗄️ Phase 3: Set Up 10 D1 Databases
1. Go to **Cloudflare Dashboard** → **D1**.
2. Click **Create database** 10 times. Name them `db-1`, `db-2`, ..., `db-10`.
3. In **Pages Settings** → **Functions** → **D1 database bindings**:
   - Add 10 bindings. Variable names MUST be `DB_1`, `DB_2`, ..., `DB_10`.
   - Map them to the databases you just created.

---

## 🔗 Phase 4: Database Strategy (External)
### Supabase (Primary)
1. Go to **Supabase Dashboard** → **Project Settings** → **API**.
2. Add these to **Pages Environment Variables** (as Secrets):
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

### Firebase (Backup)
1. Go to **Firebase Console** → **Project Settings** → **Service Accounts**.
2. Add the JSON key content as a Secret:
   - `FIREBASE_SERVICE_ACCOUNT`

---

## ✅ Phase 5: Deployment
Once all secrets and bindings are added, simply push your code to GitHub. Cloudflare will pick up the changes, inject the secrets directly into the `env` object, and deploy your library.

**Success Check:**
- Root `index.html` loads immediately.
- Login uses the `PASSWORD` secret.
- Metadata aggregates from all 10 `DB_` bindings.
