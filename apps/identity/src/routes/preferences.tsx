import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

import { ProtectedShell } from '@/components/ProtectedShell';
import { Panel, SelectField, Submit, Notice } from '@/components/ui';
import { messages } from '@/lib/messages';
import { usePreferences, useSavePreferences } from '@/features/queries';

import { RootRoute } from './__root';
import { createRoute } from '@tanstack/react-router';

export const PreferencesRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/preferences',
  component: () => (
    <ProtectedShell>
      <PreferencesScreen />
    </ProtectedShell>
  ),
});

const BOOLEAN_KEYS = [
  'notifications.product_updates',
  'notifications.organization_activity',
  'notifications.security_alerts',
  'notifications.connected_apps',
  'notifications.email_verification',
];

function PreferencesScreen() {
  const { data: prefs, isLoading } = usePreferences();
  const save = useSavePreferences();
  const preferenceValues = prefs?.preferences ?? {};

  const form = useForm<any>({
    defaultValues: {
      appearance: {
        dark_mode: preferenceValues['appearance.dark_mode'] ?? 'system',
        accent: preferenceValues['appearance.accent'] ?? 'red',
        motion: preferenceValues['appearance.motion'] ?? 'system',
      },
      notifications: Object.fromEntries(
        BOOLEAN_KEYS.map((key) => [
          key.replace('notifications.', ''),
          preferenceValues[key] ?? false,
        ]),
      ),
    },
    mode: 'onChange',
  });

  const { watch, formState } = form;
  const values = watch();
  const appearance = values.appearance ?? {};

  useEffect(() => {
    if (prefs) {
      form.reset({
        appearance: {
          dark_mode: prefs.preferences['appearance.dark_mode'] ?? 'system',
          accent: prefs.preferences['appearance.accent'] ?? 'red',
          motion: prefs.preferences['appearance.motion'] ?? 'system',
        },
        notifications: Object.fromEntries(
          BOOLEAN_KEYS.map((key) => [
            key.replace('notifications.', ''),
            prefs.preferences[key] ?? false,
          ]),
        ),
      });
    }
  }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    const accent = appearance.accent;
    if (accent === 'red' || accent === 'amber' || accent === 'green' || accent === 'cyan') {
      root.dataset.accent = accent;
    }
    const darkMode = appearance.dark_mode;
    root.dataset.theme =
      darkMode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
      darkMode === 'dark' ? 'dark' : 'light';
  }, [appearance.accent, appearance.dark_mode]);

  const onSubmit = async () => {
    const preferences = {
      'appearance.dark_mode': values.appearance?.dark_mode ?? 'system',
      'appearance.accent': values.appearance?.accent ?? 'red',
      'appearance.motion': values.appearance?.motion ?? 'system',
      ...Object.fromEntries(
        BOOLEAN_KEYS.map((key) => [key, values.notifications?.[key.replace('notifications.', '')] ?? false]),
      ),
    };
    await save.mutateAsync(preferences);
    form.reset(values);
  };

  if (isLoading || !prefs) {
    return (
      <Panel title={messages.nav.appearance} bracketed={false}>
        <Notice tone="info">Loading preferences...</Notice>
      </Panel>
    );
  }

  return (
    <Panel
      title={messages.nav.appearance}
      description="How the interface looks and behaves."
      bracketed
      action={
        <Submit variant="primary" pending={save.isPending} disabled={!formState.isDirty} onPress={onSubmit}>
          {save.isPending ? 'Saving' : 'Save'}
        </Submit>
      }
    >
      <h3 className="panel__section">{messages.preferences.darkMode}</h3>
      <SelectField
        label={messages.preferences.darkModeSystem}
        name="appearance.dark_mode"
        value={values.appearance?.dark_mode ?? 'system'}
        options={[
          { value: 'system', label: 'System' },
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
        onChange={(v) => form.setValue('appearance.dark_mode', v, { shouldDirty: true })}
      />

      <h3 className="panel__section">{messages.preferences.accent}</h3>
      <div className="field">
        <label className="field__label">{messages.preferences.accent}</label>
        <select
          className="field__input"
          value={values.appearance?.accent ?? 'red'}
          onChange={(e) => form.setValue('appearance.accent', e.target.value, { shouldDirty: true })}
        >
          <option value="red">Red</option>
          <option value="amber">Amber</option>
          <option value="green">Green</option>
        </select>
      </div>

      <h3 className="panel__section">{messages.preferences.motion}</h3>
      <div className="field">
        <label className="field__label">{messages.preferences.motion}</label>
        <select
          className="field__input"
          value={values.appearance?.motion ?? 'system'}
          onChange={(e) => form.setValue('appearance.motion', e.target.value, { shouldDirty: true })}
        >
          <option value="system">{messages.preferences.motionSystem}</option>
          <option value="full">{messages.preferences.motionFull}</option>
          <option value="reduced">{messages.preferences.motionReduced}</option>
        </select>
      </div>

      <h3 className="panel__section">{messages.preferences.notifications}</h3>
      {BOOLEAN_KEYS.map((key) => (
        <SelectField
          key={key}
          label={key.replace('notifications.', '').replace(/_/g, ' ')}
          name={key}
          value={values.notifications?.[key.replace('notifications.', '')] ? 'enabled' : 'disabled'}
          options={[
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ]}
          onChange={(v) => form.setValue(
            `notifications.${key.replace('notifications.', '')}`,
            v === 'enabled',
            { shouldDirty: true },
          )}
        />
      ))}
    </Panel>
  );
}
