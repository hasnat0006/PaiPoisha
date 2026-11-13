# iPhone Shortcut: build it once, share the iCloud link

The Shortcut saves an expense **without opening the app**: Title → Amount → an edit menu (category, wallet,
date; starts with the last-used ones) → Save. It needs internet.
It talks to two database functions from `supabase/migrations/0003_shortcut.sql` (updated in `0006_shortcut_menu.sql`):

- `shortcut_list`: the pop-up texts in the user's language, their expense categories and wallets, and the defaults
- `shortcut_add`: saves the expense (chosen wallet and day; empty = last-used wallet, today) and returns `{ ok, message }`

Both need the user's personal key (More → Quick add → iPhone → Make my key).
The `apikey` below is the app's **public** publishable key (it already ships in the web app), not a secret.

## Values to copy

| What | Value |
| --- | --- |
| List URL | `https://fueoxqmlqbxvubrolsqw.supabase.co/rest/v1/rpc/shortcut_list` |
| Save URL | `https://fueoxqmlqbxvubrolsqw.supabase.co/rest/v1/rpc/shortcut_add` |
| Header `apikey` | `sb_publishable_-xZRKS1rw-QuDRsUJlzGeA_i_6ml1Li` |

## Build it (Shortcuts app → + → add these actions in order)

1. **Text**: type your own key for testing (later replaced, see step 9).
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
7. The starting values for the menu. For each line: **Get Dictionary Value** (key) in `Info` → **Set Variable** (name):
   `category_default` → `Category` · `wallet` → `Wallet` · `save` → `SaveText` · `cancel` → `CancelText`.
   Then **Date** (current date) → **Set Variable** → `Day`.
8. **Repeat** 20 times (the menu comes back after each change; 20 is just a safe upper limit). Inside the Repeat:
   1. **Format Date**: `Day`, Date Format **Medium**, Time Format **None** → **Set Variable** → `DayText`.
   2. **Choose from Menu**, Prompt = `৳` `Amount` ` · ` `Note`. Make 5 items (tap an item's text, then insert the variable):
      - `SaveText`
      - `🏷 ` `Category`
      - `👛 ` `Wallet`
      - `📅 ` `DayText`
      - `CancelText`
   3. Under **SaveText**:
      - **Format Date**: `Day`, Date Format **Custom** `yyyy-MM-dd` → **Set Variable** → `DayISO`
      - **Get Contents of URL** → Save URL. Method **POST**, Header `apikey` as before, Request Body **JSON** with 6 fields:
        `p_key` (Text) = `Key` · `p_amount` (**Number**) = `Amount` · `p_category` (Text) = `Category` ·
        `p_note` (Text) = `Note` · `p_wallet` (Text) = `Wallet` · `p_date` (Text) = `DayISO`
      - **Get Dictionary Value**: `message` → **Show Notification** with it (“সেভ হয়েছে: ৳১৫০ · যাতায়াত · Cash”)
      - **Stop This Shortcut**
   4. Under **🏷 Category**: **Get Dictionary Value** `category` in `Info` → **Set Variable** `Prompt`;
      **Get Dictionary Value** `categories` in `Info` → **Choose from List**, Prompt = `Prompt` → **Set Variable** → `Category`.
   5. Under **👛 Wallet**: **Get Dictionary Value** `wallet_prompt` in `Info` → **Set Variable** `Prompt`;
      **Get Dictionary Value** `wallets` in `Info` → **Choose from List**, Prompt = `Prompt` → **Set Variable** → `Wallet`.
   6. Under **📅 Date**: **Get Dictionary Value** `date_prompt` in `Info` → **Ask for Input**: Input type **Date**,
      Prompt = that Dictionary Value, Default Answer = `Day` → **Set Variable** → `Day`.
   7. Under **CancelText**: **Stop This Shortcut** (nothing is saved).

   … **End Menu**, **End Repeat**.
9. Name it **PaiPoisha** (or “খরচ যোগ”), pick an icon. Then tap ⓘ (details) → **Setup** / **Import Questions** → add a question
    for the **Text** in step 1: “Paste your PaiPoisha key (More → Quick add → iPhone)” / “পাই-পয়সার কী পেস্ট করুন (আরও → দ্রুত যোগ → আইফোন)”.

**Before sharing: replace your key in step 1 with `KEY`**, so your own key is not inside the shared file.
Then **Share → Copy iCloud Link**, and put the link in `SHORTCUT_URL` in `src/components/sync/IosShortcut.tsx`.

## Test checklist

- Wrong key → an alert “Shortcut key is not valid …”, nothing saved
- Title can be left empty (if iOS refuses an empty answer, type anything)
- Amount `150.50` → saved as ৳150.50; `0` → “The amount is not valid”
- Category list is in the account's language and follows your category order (More → Categories)
- The menu starts with the last-used category and wallet, and today
- Change category, wallet and date: the menu comes back showing the new values each time
- Cancel in the menu → nothing saved
- Pick tomorrow as the date → “The date can't be in the future”, nothing saved
- After Save: open the app → Sync now → the entry is there, in the chosen wallet and category, on the chosen day
