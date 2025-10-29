CREATE OR REPLACE FUNCTION public.get_user_groups(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  groups jsonb;
BEGIN
  -- Ensure deterministic schema resolution
  PERFORM set_config('search_path', 'public', true);

  SELECT COALESCE(jsonb_agg(group_row), '[]'::jsonb)
  INTO groups
  FROM (
    SELECT
      g.id,
      g.name,
      g.avatar_url,
      g.created_at,
      g.created_by,
      g.simplified,
      g.updated_at,
      -- transactions_net: net contribution from transactions for this user in this group
      COALESCE(tx.transactions_net, 0)::numeric AS transactions_net,
      -- settlements_net: positive if others paid you, negative if you paid others
      COALESCE(st.settlements_net, 0)::numeric AS settlements_net,
      -- final net amount = transactions_net - settlements_net (settlements reduce outstanding)
      round(COALESCE(tx.transactions_net, 0) - COALESCE(st.settlements_net, 0), 2)::numeric AS net_amount,
      -- build balance_summary JSON
      jsonb_build_object(
        'net_amount', round(COALESCE(tx.transactions_net, 0) - COALESCE(st.settlements_net, 0), 2)::numeric,
        'abs_amount', round(abs(COALESCE(tx.transactions_net, 0) - COALESCE(st.settlements_net, 0)), 2)::numeric,
        -- fallback to user's currency from profile, default INR
        'currency', COALESCE((SELECT currency FROM public.user_profiles up WHERE up.id = p_user_id LIMIT 1), 'INR'),
        'status',
          CASE
            WHEN (COALESCE(tx.transactions_net, 0) - COALESCE(st.settlements_net, 0)) > 0 THEN 'friends_owe'
            WHEN (COALESCE(tx.transactions_net, 0) - COALESCE(st.settlements_net, 0)) < 0 THEN 'you_owe'
            ELSE 'settled'
          END
      ) AS balance_summary
    FROM public.groups g
    -- lateral subquery: transactions contribution for this user in this group
    LEFT JOIN LATERAL (
      SELECT SUM(
        CASE
          WHEN t.paid_by = p_user_id THEN (t.amount - COALESCE(us.us_share, 0))    -- payer: others owe payer (minus their own share)
          ELSE - COALESCE(us.us_share, 0)                                         -- non-payer: owes their share
        END
      )::numeric AS transactions_net
      FROM public.transactions t
      LEFT JOIN LATERAL (
        SELECT SUM(ts.amount) AS us_share
        FROM public.transaction_splits ts
        WHERE ts.transaction_id = t.id
          AND ts.user_id = p_user_id
      ) us ON true
      WHERE t.group_id = g.id
        AND t.status <> 'deleted'
    ) tx ON true
    -- lateral subquery: settlements contribution for this user in this group
    LEFT JOIN LATERAL (
      SELECT SUM(
        CASE
          WHEN s.receiver_id = p_user_id THEN s.payment_amount
          WHEN s.payer_id = p_user_id THEN - s.payment_amount
          ELSE 0
        END
      )::numeric AS settlements_net
      FROM public.settlements s
      WHERE s.group_id = g.id
        AND s.status = 'active'
    ) st ON true
    WHERE g.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.group_members gm2
        WHERE gm2.group_id = g.id
          AND gm2.user_id = p_user_id
          AND gm2.left_at IS NULL
          AND (gm2.status IS NULL OR gm2.status NOT IN ('deleted','left'))
      )
    ORDER BY g.updated_at DESC NULLS LAST
  ) AS group_row;

  RETURN jsonb_build_object(
    'ok', true,
    'data', groups
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to fetch user groups'
    );
END;
$$;
