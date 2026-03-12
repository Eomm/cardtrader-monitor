import { useState } from 'react';
import { Link } from 'react-router';
import type {
  FixedPriceRule,
  NotificationRule,
  StabilityRule,
  ThresholdRule,
} from '../lib/cardtrader-types';
import {
  createDefaultFixedPriceRule,
  createDefaultNotificationRule,
  createDefaultStabilityRule,
} from '../lib/cardtrader-utils';
import { supabase } from '../lib/supabase';

type RuleEditorProps = {
  cardId: string;
  rules: NotificationRule[];
  onSave: () => void;
};

type ActiveTab = 'threshold' | 'stability' | 'fixed_price';

export function RuleEditor({ cardId, rules, onSave }: RuleEditorProps) {
  const [localRules, setLocalRules] = useState<NotificationRule[]>(
    Array.isArray(rules) ? rules : rules ? [rules] : [],
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('threshold');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const thresholdRules = localRules.filter((r): r is ThresholdRule => r.type === 'threshold');
  const stabilityRules = localRules.filter((r): r is StabilityRule => r.type === 'stability');
  const fixedPriceRules = localRules.filter((r): r is FixedPriceRule => r.type === 'fixed_price');

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

  function addFixedPriceRule() {
    setLocalRules((prev) => [...prev, createDefaultFixedPriceRule()]);
    setActiveTab('fixed_price');
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
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Notification Rules
        </h3>
        <Link
          to="/how-it-works#rules"
          className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-xs text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-400"
          aria-label="Learn how notification rules work"
        >
          ?
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('threshold')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'threshold'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Threshold ({thresholdRules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stability')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'stability'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Stability ({stabilityRules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fixed_price')}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'fixed_price'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Fixed Price ({fixedPriceRules.length})
        </button>
      </div>

      {/* Threshold tab */}
      {activeTab === 'threshold' && (
        <div className="space-y-3">
          {thresholdRules.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No threshold rules</p>
          ) : (
            thresholdRules.map((rule) => {
              const idx = getGlobalIndex(rule);
              return (
                <div key={idx} className="rounded-lg border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Percentage */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-slate-400">%</span>
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
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-600"
                      />
                    </label>

                    {/* Direction */}
                    <div className="flex overflow-hidden rounded border border-slate-700">
                      {(['up', 'down', 'both'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => updateRule(idx, { ...rule, direction: dir })}
                          className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                            rule.direction === dir
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
                        rule.enabled ? 'bg-blue-500' : 'bg-slate-600'
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
                      className="ml-auto text-sm text-red-400 transition-colors hover:text-red-500"
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
            className="w-full rounded border border-dashed border-slate-600 px-3 py-2 text-sm text-blue-500 transition-colors hover:border-slate-500 hover:text-blue-400"
          >
            + Add Threshold Rule
          </button>
        </div>
      )}

      {/* Stability tab */}
      {activeTab === 'stability' && (
        <div className="space-y-3">
          {stabilityRules.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No stability rules</p>
          ) : (
            stabilityRules.map((rule) => {
              const idx = getGlobalIndex(rule);
              return (
                <div key={idx} className="rounded-lg border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Range % */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-slate-400">Range %</span>
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
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-600"
                      />
                    </label>

                    {/* Consecutive days */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-slate-400">Days</span>
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
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-600"
                      />
                    </label>

                    {/* Enabled toggle */}
                    <button
                      type="button"
                      onClick={() => updateRule(idx, { ...rule, enabled: !rule.enabled })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        rule.enabled ? 'bg-blue-500' : 'bg-slate-600'
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
                      className="ml-auto text-sm text-red-400 transition-colors hover:text-red-500"
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
            className="w-full rounded border border-dashed border-slate-600 px-3 py-2 text-sm text-blue-500 transition-colors hover:border-slate-500 hover:text-blue-400"
          >
            + Add Stability Rule
          </button>
        </div>
      )}

      {/* Fixed Price tab */}
      {activeTab === 'fixed_price' && (
        <div className="space-y-3">
          {fixedPriceRules.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No fixed price rules</p>
          ) : (
            fixedPriceRules.map((rule) => {
              const idx = getGlobalIndex(rule);
              return (
                <div key={idx} className="rounded-lg border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* EUR amount */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <span className="text-slate-400">EUR</span>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={rule.price_eur}
                        onChange={(e) =>
                          updateRule(idx, {
                            ...rule,
                            price_eur: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-600"
                      />
                    </label>

                    {/* Direction */}
                    <div className="flex overflow-hidden rounded border border-slate-700">
                      {(['up', 'down', 'both'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => updateRule(idx, { ...rule, direction: dir })}
                          className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                            rule.direction === dir
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
                        rule.enabled ? 'bg-blue-500' : 'bg-slate-600'
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
                      className="ml-auto text-sm text-red-400 transition-colors hover:text-red-500"
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
            onClick={addFixedPriceRule}
            className="w-full rounded border border-dashed border-slate-600 px-3 py-2 text-sm text-blue-500 transition-colors hover:border-slate-500 hover:text-blue-400"
          >
            + Add Fixed Price Rule
          </button>
        </div>
      )}

      {/* Save button + feedback */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
        {feedback && (
          <span
            className={`text-sm font-medium ${
              feedback.startsWith('Error') ? 'text-red-500' : 'text-green-400'
            }`}
          >
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
