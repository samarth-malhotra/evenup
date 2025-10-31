-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_notification_templates_locale_subtype ON notification_templates (locale, subtype);

-- Group deleted
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'group_deleted',
  '{{actor.nickname}} deleted {{group.name}} 🗑️',
  '{{actor.nickname}} deleted the group {{group.name}}. 🗑️'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_deleted'
);

-- Group member added
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'group_member_added',
  '{{actor.nickname}} added {{member.nickname}} ➕👤',
  '{{actor.nickname}} added {{member.nickname}} to {{group.name}}. ➕👥'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_member_added'
);

-- Group member deleted (removed)
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'group_member_deleted',
  '{{actor.nickname}} removed {{member.nickname}} ➖',
  '{{actor.nickname}} removed {{member.nickname}} from {{group.name}}. ➖'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_member_deleted'
);

-- Group member left
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'group_member_left',
  '{{actor.nickname}} left {{group.name}} 👋',
  '{{actor.nickname}} left the group {{group.name}}. 👋'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_member_left'
);

-- Expense created
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'expense_created',
  '{{actor.nickname}} added an expense of {{amount}} 💸',
  '{{actor.nickname}} added an expense "{{description}}" of {{amount}} in {{group.name}}. 🧾💸'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_created'
);

-- Expense deleted
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'expense_deleted',
  '{{actor.nickname}} deleted an expense ❌🧾',
  '{{actor.nickname}} deleted an expense "{{description}}" in {{group.name}}. ❌'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_deleted'
);

-- Expense updated
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'expense_updated',
  '{{actor.nickname}} updated an expense ✏️🧾',
  '{{actor.nickname}} updated the expense "{{description}}" in {{group.name}}. ✏️'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_updated'
);

-- Balance settled
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'balance_settled',
  '{{actor.nickname}} settled up with {{member.nickname}} ✅',
  '{{actor.nickname}} settled all balances with {{member.nickname}} in {{group.name}}. ✅💱'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='balance_settled'
);

-- Payment recorded
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'payment_recorded',
  '{{actor.nickname}} recorded a payment of {{amount}} 💰',
  '{{actor.nickname}} recorded a payment of {{amount}} to {{member.nickname}} in {{group.name}}. 💰➡️{{member.nickname}}'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='payment_recorded'
);

-- System announcement
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'system_announcement',
  '📢 {{title}}',
  '📢 {{body}}'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='system_announcement'
);

-- System info
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'system_info',
  'ℹ️ {{title}}',
  'ℹ️ {{body}}'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='system_info'
);

-- Payment reminder
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'payment_reminder',
  '⏰ You owe {{member.nickname}} {{amount}}',
  '⏰ Reminder: you owe {{member.nickname}} {{amount}} in {{group.name}}. Please settle soon. 💸'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='payment_reminder'
);

-- Weekly summary
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 
  'en',
  'weekly_summary',
  '📆 Your weekly summary is ready',
  '📊 Here’s your summary of expenses and balances for this week.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='weekly_summary'
);
