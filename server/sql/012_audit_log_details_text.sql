do $$
begin
  if (select data_type from information_schema.columns where table_name = 'audit_log' and column_name = 'details') = 'jsonb' then
    alter table audit_log alter column details type text using (case when details = '{}'::jsonb then '' else details::text end);
  end if;
end $$;

alter table audit_log alter column details set default '';
alter table audit_log alter column details set not null;
