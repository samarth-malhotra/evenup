-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_notification_templates_locale_subtype ON notification_templates (locale, subtype);

-- 3. Seed default english templates (only insert if not present)
INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'group_member_added', '{{actor.nickname}} added {{member.nickname}}', '{{actor.nickname}} added {{member.nickname}} to {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_member_added'
);

INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'group_member_deleted', '{{actor.nickname}} removed {{member.nickname}}', '{{actor.nickname}} removed {{member.nickname}} from {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_member_deleted'
);

INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'group_deleted', '{{actor.nickname}} deleted {{group.name}}', '{{actor.nickname}} deleted the group {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='group_deleted'
);

INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'expense_created', '{{actor.nickname}} added {{amount}}', '{{actor.nickname}} added {{amount}} for {{description}} to {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_created'
);

INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'expense_deleted', '{{actor.nickname}} removed an expense', '{{actor.nickname}} deleted an expense in {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_deleted'
);

INSERT INTO notification_templates (locale, subtype, title_template, body_template)
SELECT 'en', 'expense_updated', '{{actor.nickname}} updated an expense', '{{actor.nickname}} updated an expense in {{group.name}}.'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE locale='en' AND subtype='expense_updated'
);