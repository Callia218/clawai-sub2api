-- Kiro supports quota monitoring. Extend the two existing provider constraints
-- without replacing their provider lists or changing any existing provider.
DO $$
DECLARE
    target_table TEXT;
    target_constraint TEXT;
    previous_expression TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['channel_monitors', 'channel_monitor_request_templates'] LOOP
        target_constraint := target_table || '_provider_check';
        SELECT pg_get_expr(c.conbin, c.conrelid)
          INTO previous_expression
          FROM pg_constraint c
         WHERE c.conrelid = target_table::regclass
           AND c.conname = target_constraint
           AND c.contype = 'c';

        -- No constraint already permits Kiro. Preserve that state.
        IF previous_expression IS NOT NULL AND position('''kiro''' IN previous_expression) = 0 THEN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', target_table, target_constraint);
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I CHECK ((%s) OR provider = %L)',
                target_table, target_constraint, previous_expression, 'kiro'
            );
        END IF;
    END LOOP;
END $$;
