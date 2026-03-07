import { CardItem } from './CardItem';
import type { MonitoredCardWithPrice } from './CardItem';

type CardListProps = {
  cards: MonitoredCardWithPrice[];
};

export function CardList({ cards }: CardListProps) {
  if (cards.length === 0) {
    return (
      <p className="py-8 text-center text-deep-space/60 dark:text-papaya/60">No cards found.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}
