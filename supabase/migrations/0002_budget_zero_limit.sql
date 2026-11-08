-- 0002_budget_zero_limit: the app removes a budget by saving limit 0 (so earlier months'
-- budgets stop carrying forward; see decisions.md, step 5). 0001 required limit > 0, which
-- would reject those rows on sync. Mirrors src/lib/budgets.ts `activeBudgets`.

alter table public.budgets drop constraint budgets_limit_paisa_check;
alter table public.budgets add constraint budgets_limit_paisa_check check (limit_paisa >= 0);
