CREATE OR REPLACE FUNCTION public.get_group_transactions_paginated(
  p_group_id uuid,
  p_user_id uuid,
  p_limit integer default 10,
  p_offset integer default 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tx_rows jsonb;
  total_spent numeric := 0;
  you_owe numeric := 0;
  friends_owe numeric := 0;
  transactions_net numeric := 0;
  settlements_net numeric := 0;
  net_amount numeric := 0;
  v_simplified boolean := false;
BEGIN
  -- Ensure deterministic schema resolution
  PERFORM set_config('search_path', 'public', true);

  -- fetch simplified flag for the group (if group missing, that'll be NULL -> treated as false)
  SELECT simplified INTO v_simplified FROM public.groups WHERE id = p_group_id LIMIT 1;

  /*
    Select the page of transactions using an inner subquery to
    apply ORDER BY + LIMIT/OFFSET deterministically, then aggregate
    that subquery into jsonb.
  */
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'amount', round(t.amount::numeric, 2)::numeric,
    'paidBy', t.paid_by,
    'paidByName', COALESCE(up.nickname, up.email, up.phone, 'Unknown'),
    'paidByAvatar', up.avatar_url,
    'createdAt', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'hasAttachment', (t.receipt_url IS NOT NULL)
  )), '[]'::jsonb)
  INTO tx_rows
  FROM (
    SELECT *
    FROM public.transactions tt
    WHERE tt.group_id = p_group_id
      AND tt.status <> 'deleted'
    ORDER BY tt.created_at DESC, tt.id DESC
    LIMIT p_limit OFFSET p_offset
  ) t
  LEFT JOIN public.user_profiles up ON up.id = t.paid_by;

  -- Totals (total group expense)
  SELECT COALESCE(SUM(amount), 0) INTO total_spent
  FROM public.transactions
  WHERE group_id = p_group_id
    AND status <> 'deleted';

  -- transactions_net: net contribution from transactions for this user in the group
  SELECT COALESCE(SUM(
    CASE
      WHEN t.paid_by = p_user_id THEN (t.amount - COALESCE(us.us_share, 0))
      ELSE - COALESCE(us.us_share, 0)
    END
  ), 0)::numeric
  INTO transactions_net
  FROM public.transactions t
  LEFT JOIN LATERAL (
    SELECT SUM(ts.amount) AS us_share
    FROM public.transaction_splits ts
    WHERE ts.transaction_id = t.id
      AND ts.user_id = p_user_id
  ) us ON true
  WHERE t.group_id = p_group_id
    AND t.status <> 'deleted';

  -- settlements_net: positive if others paid you, negative if you paid others
  SELECT COALESCE(SUM(
    CASE
      WHEN s.receiver_id = p_user_id THEN s.payment_amount
      WHEN s.payer_id = p_user_id THEN - s.payment_amount
      ELSE 0
    END
  ), 0)::numeric
  INTO settlements_net
  FROM public.settlements s
  WHERE s.group_id = p_group_id
    AND s.status = 'active';

  -- net_amount = transactions_net - settlements_net (settlements reduce outstanding)
  net_amount := round(transactions_net - settlements_net, 2);

  IF v_simplified THEN
    -- simplified view: single net number split into youOwe / friendsOwe
    IF net_amount > 0 THEN
      friends_owe := net_amount;
      you_owe := 0;
    ELSIF net_amount < 0 THEN
      you_owe := abs(net_amount);
      friends_owe := 0;
    ELSE
      you_owe := 0;
      friends_owe := 0;
    END IF;
  ELSE
    -- detailed view: compute you_owe and friends_owe from splits (exclude payer->self splits)
    WITH splits AS (
      SELECT ts.user_id, ts.amount, t.paid_by
      FROM public.transaction_splits ts
      JOIN public.transactions t ON t.id = ts.transaction_id
      WHERE t.group_id = p_group_id
        AND t.status <> 'deleted'
    )
    SELECT
      COALESCE(SUM(CASE WHEN s.user_id = p_user_id AND s.user_id <> s.paid_by THEN s.amount END), 0),
      COALESCE(SUM(CASE WHEN s.paid_by = p_user_id AND s.user_id <> s.paid_by THEN s.amount END), 0)
    INTO you_owe, friends_owe
    FROM splits s;

    -- include settlements effect into net (we already computed net_amount above)
    -- keep you_owe and friends_owe as-is but present net too (net already includes settlements)
    you_owe := round(you_owe, 2);
    friends_owe := round(friends_owe, 2);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'transactions', tx_rows,
      'summary', jsonb_build_object(
        'totalSpent', round(total_spent, 2)::numeric,
        'simplified', v_simplified,
        'transactionsNet', round(transactions_net, 2)::numeric,
        'settlementsNet', round(settlements_net, 2)::numeric,
        'net', net_amount::numeric,
        'youOwe', round(you_owe, 2)::numeric,
        'friendsOwe', round(friends_owe, 2)::numeric,
        'currency', COALESCE((SELECT currency FROM public.user_profiles up WHERE up.id = p_user_id LIMIT 1), 'INR')
      )
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
END;
$$;
