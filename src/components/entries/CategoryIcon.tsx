// Renders a wallet/category icon stored as a lucide name. A static map keeps the bundle small.
import {
  ArrowLeftRight, Baby, Banknote, BookOpen, Bus, Car, Circle, CircleEllipsis, Coffee, CreditCard, Dumbbell, Film,
  Flame, Gift, GraduationCap, HandHeart, Heart, House, Landmark, Laptop, PiggyBank, Plane, Receipt, Scale, Shirt,
  ShoppingBag, ShoppingBasket, Smartphone, Stethoscope, Utensils, Wallet, Wifi, Zap, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wallet: Wallet, smartphone: Smartphone, landmark: Landmark, "credit-card": CreditCard, "piggy-bank": PiggyBank,
  "shopping-basket": ShoppingBasket, bus: Bus, house: House, zap: Zap, flame: Flame, wifi: Wifi, utensils: Utensils,
  "graduation-cap": GraduationCap, stethoscope: Stethoscope, "hand-heart": HandHeart, banknote: Banknote,
  "book-open": BookOpen, laptop: Laptop, receipt: Receipt, "circle-ellipsis": CircleEllipsis, "shopping-bag": ShoppingBag,
  shirt: Shirt, car: Car, plane: Plane, coffee: Coffee, film: Film, gift: Gift, heart: Heart, baby: Baby,
  dumbbell: Dumbbell, scale: Scale, "arrow-left-right": ArrowLeftRight,
};

/** Icons a user can pick (the last two are for system rows only). */
export const ICON_NAMES = Object.keys(ICONS).slice(0, -2);

/** `small`: the compact grid on Home's spending card. */
export function CategoryIcon({ name, color, small }: { name: string; color?: string; small?: boolean }) {
  const Icon = ICONS[name] ?? Circle;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-muted ${small ? "size-8" : "size-10"}`}
      style={color ? { color } : undefined}
      aria-hidden
    >
      <Icon className={small ? "size-4" : "size-5"} />
    </span>
  );
}
