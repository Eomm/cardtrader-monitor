import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { MonitoredCardWithPrice, NotificationRule } from '../lib/cardtrader-types';
import { languageToFlag } from '../lib/cardtrader-utils';
import { supabase } from '../lib/supabase';
import { PriceChange, formatEur } from './PriceDisplay';

type CardRowProps = {
  card: MonitoredCardWithPrice;
  wishlistName?: string;
  onRuleSaved?: () => void;
};

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-700">
      <svg
        aria-hidden="true"
        className="h-6 w-6 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
        />
      </svg>
    </div>
  );
}

function directionEmoji(direction: 'up' | 'down' | 'both'): string {
  if (direction === 'down') return '\u25BC';
  if (direction === 'up') return '\u25B2';
  return '\u2195';
}

type InlineRuleInputProps = {
  card: MonitoredCardWithPrice;
  onSaved: () => void;
};

function InlineRuleInput({ card, onSaved }: InlineRuleInputProps) {
  const firstRule = card.notification_rule?.[0] ?? null;

  if (!firstRule) {
    return <span className="text-xs text-slate-500 italic">---</span>;
  }

  let primaryField: 'threshold_percent' | 'price_eur' | 'range_percent';
  let suffix: string;

  if (firstRule.type === 'threshold') {
    primaryField = 'threshold_percent';
    suffix = '%';
  } else if (firstRule.type === 'fixed_price') {
    primaryField = 'price_eur';
    suffix = 'EUR';
  } else {
    primaryField = 'range_percent';
    suffix = '%';
  }

  const initialValue =
    firstRule.type === 'fixed_price'
      ? firstRule.price_eur.toFixed(2)
      : String(
          (firstRule as { threshold_percent?: number; range_percent?: number })[
            primaryField as 'threshold_percent' | 'range_percent'
          ] ?? 0,
        );

  return (
    <InlineRuleInputInner
      card={card}
      firstRule={firstRule}
      primaryField={primaryField}
      suffix={suffix}
      initialValue={initialValue}
      onSaved={onSaved}
    />
  );
}

type InlineRuleInputInnerProps = {
  card: MonitoredCardWithPrice;
  firstRule: NonNullable<MonitoredCardWithPrice['notification_rule']>[number];
  primaryField: 'threshold_percent' | 'price_eur' | 'range_percent';
  suffix: string;
  initialValue: string;
  onSaved: () => void;
};

function InlineRuleInputInner({
  card,
  firstRule,
  primaryField,
  suffix,
  initialValue,
  onSaved,
}: InlineRuleInputInnerProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const emoji = 'direction' in firstRule ? directionEmoji(firstRule.direction) : '';

  async function handleSave() {
    if (saving) return;
    const parsed = Number.parseFloat(localValue);
    if (Number.isNaN(parsed)) return;

    setSaving(true);
    const updatedRules: NotificationRule[] = (card.notification_rule ?? []).map((rule, i) => {
      if (i !== 0) return rule;
      return { ...rule, [primaryField]: parsed } as NotificationRule;
    });

    const { error } = await supabase
      .from('monitored_cards')
      .update({ notification_rule: updatedRules })
      .eq('id', card.id);

    setSaving(false);

    if (!error) {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div
      className="flex flex-shrink-0 items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {emoji && <span className="text-xs text-slate-400">{emoji}</span>}
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
        }}
        className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-600"
        aria-label={`Rule value (${suffix})`}
      />
      <span className="text-xs text-slate-400">{suffix}</span>
      {saved && <span className="text-xs text-green-400">&#10003;</span>}
    </div>
  );
}

export function CardRow({ card, wishlistName, onRuleSaved }: CardRowProps) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/cards/${card.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/cards/${card.id}`);
      }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-700 px-3 py-2 text-left transition-colors hover:bg-slate-700 ${
        !card.is_active ? 'opacity-50' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Name + flag */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-100">
          {card.card_name} <span className="text-sm">{languageToFlag(card.language_required)}</span>
        </p>
        <p className="truncate text-sm text-slate-400">
          {card.ct_expansions?.name ?? '---'}
          {wishlistName ? ` · ${wishlistName}` : ''}
        </p>
      </div>

      {/* Inline rule input */}
      <InlineRuleInput card={card} onSaved={onRuleSaved ?? (() => {})} />

      {/* Price + change */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-medium text-slate-100">
          {card.latest_price_cents !== null ? formatEur(card.latest_price_cents) : '---'}
        </span>
        <PriceChange baseline={card.baseline_price_cents} current={card.latest_price_cents} />
      </div>
    </div>
  );
}
