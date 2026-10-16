/**
 * MIGRATION 06: FINANCIAL ATOMIC COMMISSION & WALLET (HARDENED WITH STRICT RPC AUTHORIZATION)
 * 
 * 1. Adds purchase_tx_id foreign key reference to transactions table.
 * 2. Enforces strict uniqueness to prevent duplicate referral commissions per purchase & tier.
 * 3. Add constraint to enforce non-negative transaction amounts.
 * 4. Provide PostgreSQL atomic procedure for plan purchase approval with row-level locks (FOR UPDATE)
 *    and strict session authorization check (auth.uid() == p_user_id or service_role).
 * 5. Provide PostgreSQL atomic function for withdrawal requests with user row locks (FOR UPDATE)
 *    and strict session authorization check (auth.uid() == p_user_id or service_role)
 *    to prevent concurrent overdraw race conditions.
 * 6. Preserve all historical data with zero destructive alterations.
 * 
 * STATUS: Local preparation. DO NOT EXECUTE AUTOMATICALLY AGAINST PRODUCTION.
 */

BEGIN;

-- --------------------------------------------------------------------------------
-- PART 1: SCHEMA ENHANCEMENT FOR COMMISSION TRACEABILITY & IDEMPOTENCY
-- --------------------------------------------------------------------------------

-- 1. Add purchase_tx_id foreign key column to track the exact plan purchase
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS purchase_tx_id uuid REFERENCES public.transactions(id) ON DELETE RESTRICT;

-- Index for fast lookup of commissions by purchase transaction
CREATE INDEX IF NOT EXISTS idx_transactions_purchase_tx_id ON public.transactions(purchase_tx_id) WHERE purchase_tx_id IS NOT NULL;

-- 2. Unique partial constraint: Prevents duplicate commissions for the same purchase, beneficiary, and network level
-- Note: Applies only to rows where purchase_tx_id is set, preserving backwards compatibility for legacy data
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_commission_purchase_level 
ON public.transactions (purchase_tx_id, user_id, nivel_red) 
WHERE type = 'referral_commission' AND purchase_tx_id IS NOT NULL;

-- 3. Check constraint on amount: Amounts cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount_positive'
  ) THEN
    ALTER TABLE public.transactions 
    ADD CONSTRAINT chk_transactions_amount_positive 
    CHECK (amount >= 0);
  END IF;
END $$;


-- --------------------------------------------------------------------------------
-- PART 2: ATOMIC WITHDRAWAL RESERVATION FUNCTION (WITH STRICT AUTHORIZATION)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_withdrawal_atomic(
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_user_row public.users%ROWTYPE;
  v_total_earnings numeric;
  v_total_withdrawals numeric;
  v_total_wallet_purchases numeric;
  v_available_balance numeric;
  v_tx_id uuid;
  v_jwt_role text;
  v_auth_uid uuid;
BEGIN
  -- Strict Authorization Check against Supabase JWT context
  v_jwt_role := current_setting('request.jwt.claim.role', true);
  v_auth_uid := auth.uid();

  IF v_jwt_role = 'authenticated' AND (v_auth_uid IS NULL OR v_auth_uid IS DISTINCT FROM p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Acceso denegado: la identidad autenticada no coincide con el usuario solicitado'
    );
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount < 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El monto mínimo de retiro es $10.000 COP');
  END IF;

  -- 1. Acquire pessimistic row-level exclusive lock on the user's record
  SELECT * INTO v_user_row
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- 2. Authoritative ledger balance calculation inside the locked transaction
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'referral_commission' AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'withdrawal' AND status != 'rejected';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_wallet_purchases
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'plan_purchase' AND status = 'completed' AND receipt_url = 'wallet';

  v_available_balance := FLOOR(v_total_earnings - v_total_withdrawals - v_total_wallet_purchases);

  -- 3. Verify sufficient available balance
  IF p_amount > v_available_balance THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Saldo insuficiente para retiro',
      'available_balance', v_available_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- 4. Insert pending withdrawal transaction (immediately reserves the balance)
  INSERT INTO public.transactions (
    user_id,
    amount,
    commission,
    type,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    0,
    'withdrawal',
    'pending'
  ) RETURNING id INTO v_tx_id;

  -- 5. Update user cached wallet_balance immediately
  UPDATE public.users
  SET wallet_balance = v_available_balance - p_amount
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_available_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.request_withdrawal_atomic(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_withdrawal_atomic(uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_atomic(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_atomic(uuid, numeric) TO service_role;


-- --------------------------------------------------------------------------------
-- PART 3: ATOMIC PLAN PURCHASE WITH WALLET BALANCE (WITH STRICT AUTHORIZATION)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_plan_with_balance_atomic(
  p_user_id uuid,
  p_plan_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_row public.users%ROWTYPE;
  v_plan_row public.plans%ROWTYPE;
  v_total_earnings numeric;
  v_total_withdrawals numeric;
  v_total_wallet_purchases numeric;
  v_available_balance numeric;
  v_tx_id uuid;
  v_jwt_role text;
  v_auth_uid uuid;
BEGIN
  -- Strict Authorization Check against Supabase JWT context
  v_jwt_role := current_setting('request.jwt.claim.role', true);
  v_auth_uid := auth.uid();

  IF v_jwt_role = 'authenticated' AND (v_auth_uid IS NULL OR v_auth_uid IS DISTINCT FROM p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Acceso denegado: la identidad autenticada no coincide con el usuario solicitado'
    );
  END IF;

  -- 1. Fetch and validate plan
  SELECT * INTO v_plan_row
  FROM public.plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan no encontrado');
  END IF;

  -- 2. Acquire exclusive lock on user
  SELECT * INTO v_user_row
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- 3. Calculate authoritative available balance
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earnings
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'referral_commission' AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'withdrawal' AND status != 'rejected';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_wallet_purchases
  FROM public.transactions
  WHERE user_id = p_user_id AND type = 'plan_purchase' AND status = 'completed' AND receipt_url = 'wallet';

  v_available_balance := FLOOR(v_total_earnings - v_total_withdrawals - v_total_wallet_purchases);

  IF v_available_balance < v_plan_row.price THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Saldo insuficiente en billetera',
      'available_balance', v_available_balance,
      'plan_price', v_plan_row.price
    );
  END IF;

  -- 4. Insert completed plan purchase transaction with receipt_url = 'wallet'
  INSERT INTO public.transactions (
    user_id,
    amount,
    commission,
    type,
    status,
    receipt_url
  ) VALUES (
    p_user_id,
    v_plan_row.price,
    0,
    'plan_purchase',
    'completed',
    'wallet'
  ) RETURNING id INTO v_tx_id;

  -- 5. Update user plan and deducted wallet balance
  UPDATE public.users
  SET plan = v_plan_row.name,
      plan_id = v_plan_row.id,
      wallet_balance = v_available_balance - v_plan_row.price
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'plan_name', v_plan_row.name,
    'new_balance', v_available_balance - v_plan_row.price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.purchase_plan_with_balance_atomic(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_plan_with_balance_atomic(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_plan_with_balance_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_plan_with_balance_atomic(uuid, uuid) TO service_role;

COMMIT;
