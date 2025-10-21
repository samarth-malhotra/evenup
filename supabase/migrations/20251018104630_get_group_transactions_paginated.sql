create or replace function public.get_group_transactions_paginated(
  p_group_id uuid,
  p_user_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  tx_rows jsonb;
  total_spent numeric := 0;
  you_owe numeric := 0;
  friends_owe numeric := 0;
begin
  /*
    Select the page of transactions using an inner subquery to
    apply ORDER BY + LIMIT/OFFSET deterministically, then aggregate
    that subquery into jsonb.
  */
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'amount', t.amount,
    'paidBy', t.paid_by,
    'paidByName', coalesce(up.nickname, up.email, up.phone, 'Unknown'),
    'paidByAvatar', up.avatar_url,
    'createdAt', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'hasAttachment', (t.receipt_url is not null)
  )), '[]'::jsonb)
  into tx_rows
  from (
    select *
    from public.transactions tt
    where tt.group_id = p_group_id and tt.status <> 'deleted'
    order by tt.created_at desc
    limit p_limit offset p_offset
  ) t
  left join public.user_profiles up on up.id = t.paid_by;

  -- Totals (unchanged)
  select coalesce(sum(amount), 0) into total_spent
  from public.transactions
  where group_id = p_group_id and status <> 'deleted';

  with splits as (
    select ts.user_id, ts.amount, t.paid_by
    from public.transaction_splits ts
    join public.transactions t on t.id = ts.transaction_id
    where t.group_id = p_group_id and t.status <> 'deleted'
  )
  select
    coalesce(sum(case when s.user_id = p_user_id and s.user_id <> s.paid_by then s.amount end), 0),
    coalesce(sum(case when s.paid_by = p_user_id and s.user_id <> s.paid_by then s.amount end), 0)
  into you_owe, friends_owe
  from splits s;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'transactions', tx_rows,
      'summary', jsonb_build_object(
        'totalSpent', total_spent,
        'youOwe', you_owe,
        'friendsOwe', friends_owe
      )
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
