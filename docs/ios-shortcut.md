# iPhone Shortcut: build it once, share the iCloud link

The Shortcut saves an expense **without opening the app**: Title → Amount → Category → Confirm → Saved.
It talks to two database functions from `supabase/migrations/0003_shortcut.sql`:

- `shortcut_list`: the pop-up texts in the user's language, their expense categories, and the wallet it will use
- `shortcut_add`: saves the expense (today, last-used wallet) and returns `{ ok, message }`

Both need the user's personal key (More → Quick add → iPhone → Make my key).
The `apikey` below is the app's **public** publishable key (it already ships in the web app), not a secret.

## Values to copy

| What | Value |
| --- | --- |
| List URL | `https://fueoxqmlqbxvubrolsqw.supabase.co/rest/v1/rpc/shortcut_list` |
| Save URL | `https://fueoxqmlqbxvubrolsqw.supabase.co/rest/v1/rpc/shortcut_add` |
| Header `apikey` | `sb_publishable_-xZRKS1rw-QuDRsUJlzGeA_i_6ml1Li` |

## Build it (Shortcuts app → + → add these actions in order)

1. **Text**: type your own key for testing (later replaced, see step 12).
   Then **Set Variable** → name it `Key`.
2. **Get Contents of URL** → List URL. Tap ▸ to expand:
   - Method: **POST**
   - Headers: add `apikey` = the publishable key
   - Request Body: **JSON**, add a field: Key `p_key`, type **Text**, value = variable `Key`

   Then **Set Variable** → `Info`.
3. **Get Dictionary Value**: Get **Value** for key `message` in `Info`.
4. **If** Dictionary Value **has any value**:
   - **Show Alert**: the Dictionary Value (turn **Show Cancel Button** off)
   - **Stop This Shortcut**
   - (leave Otherwise empty) … **End If**
5. **Get Dictionary Value**: `title` in `Info` → **Ask for Input**: Input type **Text**, Prompt = that Dictionary Value.
   Then **Set Variable** → `Note`.
6. **Get Dictionary Value**: `amount` in `Info` → **Ask for Input**: Input type **Number**, Prompt = that Dictionary Value
   (expand: Allow Decimal Numbers **on**, Allow Negative Numbers **off**). Then **Set Variable** → `Amount`.
7. **Get Dictionary Value**: `category` in `Info` → **Set Variable** → `CategoryPrompt`.
   Then **Get Dictionary Value**: `categories` in `Info` → **Choose from List**, Prompt = `CategoryPrompt`.
   Then **Set Variable** → `Category`.
8. **Get Dictionary Value**: `wallet` in `Info` → **Set Variable** → `Wallet`.
9. **Get Dictionary Value**: `confirm` in `Info` → **Show Alert**:
   - Title = that Dictionary Value
   - Message = `৳` `Amount` ` · ` `Category` ` · ` `Wallet` (and a new line with `Note`)
   - **Show Cancel Button on** (Cancel stops the Shortcut, nothing is saved)
10. **Get Contents of URL** → Save URL. Method **POST**, Header `apikey` as before, Request Body **JSON** with 4 fields:
    - `p_key` (Text) = `Key`
    - `p_amount` (**Number**) = `Amount`
    - `p_category` (Text) = `Category`
    - `p_note` (Text) = `Note`
11. **Get Dictionary Value**: `message` → **Show Notification** with it (“সেভ হয়েছে: ৳১৫০ · যাতায়াত · Cash”).
12. Name it **PaiPoisha** (or “খরচ যোগ”), pick an icon. Then tap ⓘ (details) → **Setup** / **Import Questions** → add a question
    for the **Text** in step 1: “Paste your PaiPoisha key (More → Quick add → iPhone)” / “পাই-পয়সার কী পেস্ট করুন (আরও → দ্রুত যোগ → আইফোন)”.

**Before sharing: replace your key in step 1 with `KEY`**, so your own key is not inside the shared file.
Then **Share → Copy iCloud Link**, and put the link in `SHORTCUT_URL` in `src/components/sync/IosShortcut.tsx`.

## Test checklist

- Wrong key → an alert “Shortcut key is not valid …”, nothing saved
- Title can be left empty (if iOS refuses an empty answer, type anything)
- Amount `150.50` → saved as ৳150.50; `0` → “The amount is not valid”
- Category list is in the account's language and follows your category order (More → Categories)
- Cancel on the confirm alert → nothing saved
- After Save: open the app → Sync now → the entry is there, in the last-used wallet, dated today
