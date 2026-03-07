import { useState } from 'react';
import type { NotificationRule, StabilityRule, ThresholdRule } from '../lib/cardtrader-types';
import { createDefaultNotificationRule, createDefaultStabilityRule } from '../lib/cardtrader-utils';
import { supabase } from '../lib/supabase';

type RuleEditorProps = {
  cardId: string;
  rules: NotificationRule[];
  onSave: () => void;
};

type ActiveTab = 'threshold' | 'stability';

export function RuleEditor({ cardId, rules, onSave }: RuleEditorProps) {
  const [localRules, setLocalRules] = useState<NotificationRule[]>(rules);
  const [activeTab, setActiveTab] = useState<ActiveTab>('threshold');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const thresholdRules = localRules.filter((r): r is ThresholdRule => r.type === 'threshold');
  const stabilityRules = localRules.filter((r): r is StabilityRule => r.type === 'stability');

  function updateRule(index: number, updated: NotificationRule) {
    setLocalRules((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setFeedback(null);
  }

  function removeRule(index: number) {
    setLocalRules((prev) => prev.filter((_, i) => i !== index));
    setFeedback(null);
  }

  function addThresholdRule() {
    setLocalRules((prev) => [...prev, createDefaultNotificationRule()]);
    setActiveTab('threshold');
    setFeedback(null);
  }

  function addStabilityRule() {
    setLocalRules((prev) => [...prev, createDefaultStabilityRule()]);
    setActiveTab('stability');
    setFeedback(null);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('monitored_cards')
      .update({ notification_rule: localRules })
      .eq('id', cardId);

    setSaving(false);

    if (error) {
      setFeedback(`Error: ${error.message}`);
      return;
    }

    setFeedback('Saved!');
    onSave();

    // Clear feedback after 2 seconds
    setTimeout(() => setFeedback(null), 2000);
  }

  // Get the global index in localRules for a filtered rule
  function getGlobalIndex(rule: NotificationRule): number {
    return localRules.indexOf(rule);
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-deep-space/60 dark:text-papaya/60">
        Notification Rules
      </h3>

      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('threshold')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'threshold'
              ? 'bg-steel text-white'
              : 'bg-steel/10 text-deep-space/70 hover:bg-steel/20 dark:text-papaya/70'
          }`}
        >
          Threshold ({thresholdRules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stability')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'stability'
              ? 'bg-steel text-white'
              : 'bg-steel/10 text-deep-space/70 hover:bg-steel/20 dark:text-papaya/70'
          }`}
        >
          Stability ({stabilityRules.length})
        </button>
      </div>

      {/* Threshold tab */}
      {activeTab === 'threshold' && (
        <div className="space-y-3">
          {thresholdRules.length === 0 ? (
            <p className="py-4 text-center text-sm text-deep-space/50 dark:text-papaya/50">
              No threshold rules
            </p>
          ) : (
            thresholdRules.map((rule) => {
              const idx = getGlobalIndex(rule);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-steel/20 p-3 dark:border-steel/10"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Percentage */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-deep-space/60 dark:text-papaya/60">%</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={rule.threshold_percent}
                        onChange={(e) =>
                          updateRule(idx, {
                            ...rule,
                            threshold_percent: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded border border-steel/20 bg-white px-3 py-1.5 text-sm text-deep-space outline-none focus:border-steel/40 dark:border-steel/10 dark:bg-deep-space/60 dark:text-papaya"
                      />
                    </label>

                    {/* Direction */}
                    <div className="flex overflow-hidden rounded border border-steel/20 dark:border-steel/10">
                      {(['up', 'down', 'both'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => updateRule(idx, { ...rule, direction: dir })}
                          className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                            rule.direction === dir
                              ? 'bg-steel text-white'
                              : 'bg-white text-deep-space/70 hover:bg-steel/10 dark:bg-deep-space/60 dark:text-papaya/70'
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>

                    {/* Enabled toggle */}
                    <button
                      type="button"
                      onClick={() => updateRule(idx, { ...rule, enabled: !rule.enabled })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        rule.enabled ? 'bg-steel' : 'bg-steel/30'
                      }`}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="ml-auto text-sm text-flag-red/70 transition-colors hover:text-flag-red"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={addThresholdRule}
            className="w-full rounded border border-dashed border-steel/30 px-3 py-2 text-sm text-steel transition-colors hover:border-steel/50 hover:text-steel/80"
          >
            + Add Threshold Rule
          </button>
        </div>
      )}

      {/* Stability tab */}
      {activeTab === 'stability' && (
        <div className="space-y-3">
          {stabilityRules.length === 0 ? (
            <p className="py-4 text-center text-sm text-deep-space/50 dark:text-papaya/50">
              No stability rules
            </p>
          ) : (
            stabilityRules.map((rule) => {
              const idx = getGlobalIndex(rule);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-steel/20 p-3 dark:border-steel/10"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Range % */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-deep-space/60 dark:text-papaya/60">Range %</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={rule.range_percent}
                        onChange={(e) =>
                          updateRule(idx, {
                            ...rule,
                            range_percent: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded border border-steel/20 bg-white px-3 py-1.5 text-sm text-deep-space outline-none focus:border-steel/40 dark:border-steel/10 dark:bg-deep-space/60 dark:text-papaya"
                      />
                    </label>

                    {/* Consecutive days */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-deep-space/60 dark:text-papaya/60">Days</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={rule.consecutive_days}
                        onChange={(e) =>
                          updateRule(idx, {
                            ...rule,
                            consecutive_days: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded border border-steel/20 bg-white px-3 py-1.5 text-sm text-deep-space outline-none focus:border-steel/40 dark:border-steel/10 dark:bg-deep-space/60 dark:text-papaya"
                      />
                    </label>

                    {/* Enabled toggle */}
                    <button
                      type="button"
                      onClick={() => updateRule(idx, { ...rule, enabled: !rule.enabled })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        rule.enabled ? 'bg-steel' : 'bg-steel/30'
                      }`}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="ml-auto text-sm text-flag-red/70 transition-colors hover:text-flag-red"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={addStabilityRule}
            className="w-full rounded border border-dashed border-steel/30 px-3 py-2 text-sm text-steel transition-colors hover:border-steel/50 hover:text-steel/80"
          >
            + Add Stability Rule
          </button>
        </div>
      )}

      {/* Save button + feedback */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-steel px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-steel/80 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
        {feedback && (
          <span
            className={`text-sm font-medium ${
              feedback.startsWith('Error') ? 'text-flag-red' : 'text-green-600 dark:text-green-400'
            }`}
          >
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
