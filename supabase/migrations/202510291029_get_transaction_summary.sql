-- Wallet summary + chart + paginated feed in one fast RPC
create or replace function public.get_transaction_summary(
  p_user_id uuid,
  p_start   timestamptz,
  p_end     timestamptz,
  p_limit   int default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_tot_total_spent numeric := 0;
  v_tot_you_owe     numeric := 0;
  v_tot_friends_owe numeric := 0;

  v_txns jsonb := '[]'::jsonb;
  v_bars jsonb := '[]'::jsonb;
  v_next_cursor_created_at timestamptz := null;
  v_next_cursor_id uuid := null;
begin
  -- Safety
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing user');
  end if;
  if p_start is null or p_end is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing dates');
  end if;

  /* ---------------------------------------------------------------------- */
  /* Totals                                                                 */
  /* ---------------------------------------------------------------------- */
  select
    coalesce(sum(t.amount) filter (where t.paid_by = p_user_id), 0)                                           as total_spent,
    coalesce(sum(s.amount) filter (where t.paid_by <> p_user_id and s.user_id = p_user_id), 0)                as you_owe,
    coalesce(sum(s.amount) filter (where t.paid_by = p_user_id and s.user_id <> p_user_id), 0)                as friends_owe
  into v_tot_total_spent, v_tot_you_owe, v_tot_friends_owe
  from public.transactions t
  left join public.transaction_splits s on s.transaction_id = t.id
  where t.status = 'active'
    and t.created_at >= p_start and t.created_at < p_end
    and (
      t.paid_by = p_user_id
      or exists (select 1 from public.transaction_splits ss where ss.transaction_id = t.id and ss.user_id = p_user_id)
    );

  /* ---------------------------------------------------------------------- */
  /* Per-transaction "net from my perspective"                              */
  /*   net > 0  => others owe me                                             */
  /*   net < 0  => I owe                                                     */
  /* ---------------------------------------------------------------------- */
  with base as (
    select t.id, t.title, t.created_at, t.group_id, t.paid_by,
           g.name as group_name,
           -- net amount from user's perspective
           case
             when t.paid_by = p_user_id
               then coalesce(sum(s.amount) filter (where s.user_id <> p_user_id), 0)
             else -coalesce(sum(s.amount) filter (where s.user_id = p_user_id), 0)
           end as net_amount
    from public.transactions t
    left join public.transaction_splits s on s.transaction_id = t.id
    left join public.groups g on g.id = t.group_id
    where t.status = 'active'
      and t.created_at >= p_start and t.created_at < p_end
      and (
        t.paid_by = p_user_id
        or exists (select 1 from public.transaction_splits ss where ss.transaction_id = t.id and ss.user_id = p_user_id)
      )
    group by t.id, t.title, t.created_at, t.group_id, t.paid_by, g.name
  ),
  -- pagination window
  windowed as (
    select *
    from base
    where
      case
        when p_cursor_created_at is null then true
        else (created_at, id) < (p_cursor_created_at, p_cursor_id)
      end
    order by created_at desc, id desc
    limit p_limit + 1
  )
  select
    -- transactions page as json
    coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'date', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'amount', net_amount,
      'groupName', group_name
    ) order by created_at desc, id desc), '[]'::jsonb),
    -- next cursor
    (select created_at from windowed order by created_at desc, id desc offset p_limit limit 1),
    (select id         from windowed order by created_at desc, id desc offset p_limit limit 1)
  into v_txns, v_next_cursor_created_at, v_next_cursor_id
  from windowed
  where true;

  if v_txns is null then v_txns := '[]'::jsonb; end if;

  /* ---------------------------------------------------------------------- */
  /* Monthly bars (sum of ABS(net_amount) per month in [p_start, p_end) )   */
  /* ---------------------------------------------------------------------- */
  with per_tx as (
    select date_trunc('month', t.created_at) as ym,
           case
             when t.paid_by = p_user_id
               then coalesce(sum(s.amount) filter (where s.user_id <> p_user_id), 0)
             else -coalesce(sum(s.amount) filter (where s.user_id = p_user_id), 0)
           end as net_amount
    from public.transactions t
    left join public.transaction_splits s on s.transaction_id = t.id
    where t.status = 'active'
      and t.created_at >= p_start and t.created_at < p_end
      and (
        t.paid_by = p_user_id
        or exists (select 1 from public.transaction_splits ss where ss.transaction_id = t.id and ss.user_id = p_user_id)
      )
    group by date_trunc('month', t.created_at), t.id, t.paid_by
  ),
  month_totals as (
    select ym, sum(abs(net_amount)) as total
    from per_tx
    group by ym
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(ym, 'YYYY-MM'),
           'total', total
         ) order by ym), '[]'::jsonb)
  into v_bars
  from month_totals;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'totals', jsonb_build_object(
        'totalSpent', v_tot_total_spent,
        'youOwe',     v_tot_you_owe,
        'friendsOwe', v_tot_friends_owe
      ),
      'chart', v_bars,
      'transactions', v_txns,
      'nextCursor', case when v_next_cursor_created_at is null
                         then null
                         else jsonb_build_object(
                           'createdAt', to_char(v_next_cursor_created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
                           'id', v_next_cursor_id
                         ) end
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;

-- Permissions + schema refresh
grant execute on function public.get_wallet_summary(uuid, timestamptz, timestamptz, int, timestamptz, uuid) to authenticated;
notify pgrst, 'reload schema';
