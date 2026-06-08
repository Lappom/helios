"use client";

import { useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, Gift, Tag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PricingTierCard } from "@/components/design/pricing-tier-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeCheckoutRequest,
  validatePromoCodeRequest,
  validateReferralCodeRequest,
} from "@/lib/checkout/api-client";
import { fetchAvailableSlots } from "@/lib/bookings/api-client";
import type { BookingSlotDto } from "@/lib/bookings/types";
import type { CoachServiceDto } from "@/lib/coach-profile/service";
import { formatPriceCents } from "@/lib/validators/coach-profile";
import {
  addDays,
  formatDayKey,
  getWeekDays,
  startOfWeekMonday,
  WEEKDAY_LABELS,
} from "@/lib/programs/calendar-utils";
import { cn } from "@/lib/utils";

type CheckoutFlowClientProps = {
  coachSlug: string;
  coachName: string;
  service: CoachServiceDto;
  backHref?: string;
  initialReferralCode?: string;
};

type Step = "slots" | "confirm" | "success";

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function formatSlotDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

export function CheckoutFlowClient({
  coachSlug,
  coachName,
  service,
  backHref,
  initialReferralCode,
}: CheckoutFlowClientProps) {
  const profileHref = backHref ?? `/find/coaches/${coachSlug}`;
  const { user } = useUser();
  const needsSlot = service.bookingEnabled;
  const [step, setStep] = useState<Step>(needsSlot ? "slots" : "confirm");
  const [anchorDate, setAnchorDate] = useState(() =>
    startOfWeekMonday(new Date()),
  );
  const [slots, setSlots] = useState<BookingSlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(needsSlot);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlotDto | null>(null);
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? "");
  const [referralApplied, setReferralApplied] = useState(false);
  const [discountCents, setDiscountCents] = useState(0);
  const [referralCreditCents, setReferralCreditCents] = useState(0);
  const [finalPriceCents, setFinalPriceCents] = useState(service.priceCents);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedStartAt, setConfirmedStartAt] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<
    string | null
  >(service.paymentInstructions);

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, BookingSlotDto[]>();
    for (const slot of slots) {
      const key = formatDayKey(new Date(slot.startAt));
      const bucket = map.get(key) ?? [];
      bucket.push(slot);
      map.set(key, bucket);
    }
    return map;
  }, [slots]);

  const loadSlots = useCallback(async () => {
    if (!needsSlot) return;
    try {
      const from = formatDayKey(weekDays[0]!);
      const to = formatDayKey(weekDays[6]!);
      const data = await fetchAvailableSlots(service.id, from, to);
      setSlots(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger les créneaux",
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [needsSlot, service.id, weekDays]);

  useEffect(() => {
    if (!needsSlot) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const from = formatDayKey(weekDays[0]!);
        const to = formatDayKey(weekDays[6]!);
        const data = await fetchAvailableSlots(service.id, from, to);
        if (!cancelled) {
          setSlots(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de charger les créneaux",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsSlot, service.id, weekDays]);

  useEffect(() => {
    if (!initialReferralCode?.trim()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setValidatingReferral(true);
      try {
        const result = await validateReferralCodeRequest({
          serviceId: service.id,
          code: initialReferralCode.trim(),
        });
        if (cancelled) return;
        if (result.valid) {
          setReferralApplied(true);
          setDiscountCents(result.discountCents);
          setFinalPriceCents(result.finalPriceCents);
        }
      } catch {
        // Prefill only — user can retry manually
      } finally {
        if (!cancelled) {
          setValidatingReferral(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialReferralCode, service.id]);

  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  if (user?.id && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setProspectEmail(user.primaryEmailAddress?.emailAddress ?? "");
    setProspectName(
      [user.firstName, user.lastName].filter(Boolean).join(" ") || "",
    );
  }

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const result = await validatePromoCodeRequest({
        serviceId: service.id,
        code: promoCode.trim(),
      });
      if (!result.valid) {
        setPromoApplied(false);
        setDiscountCents(0);
        setFinalPriceCents(service.priceCents);
        toast.error(result.reason ?? "Code promo invalide");
        return;
      }
      setReferralApplied(false);
      setReferralCode("");
      setPromoApplied(true);
      setDiscountCents(result.discountCents);
      setFinalPriceCents(result.finalPriceCents);
      toast.success("Code promo appliqué");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Validation impossible",
      );
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handleApplyReferral() {
    if (!referralCode.trim()) return;
    setValidatingReferral(true);
    try {
      const result = await validateReferralCodeRequest({
        serviceId: service.id,
        code: referralCode.trim(),
        prospectEmail: prospectEmail.trim() || undefined,
      });
      if (!result.valid) {
        setReferralApplied(false);
        setDiscountCents(0);
        setFinalPriceCents(service.priceCents);
        toast.error(result.reason ?? "Code parrain invalide");
        return;
      }
      setPromoApplied(false);
      setPromoCode("");
      setReferralApplied(true);
      setDiscountCents(result.discountCents);
      setFinalPriceCents(result.finalPriceCents);
      toast.success("Code parrain appliqué");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Validation impossible",
      );
    } finally {
      setValidatingReferral(false);
    }
  }

  async function handleConfirm() {
    if (needsSlot && !selectedSlot) return;

    if (!prospectEmail.trim()) {
      toast.error("Indiquez votre email");
      return;
    }
    if (!prospectName.trim()) {
      toast.error("Indiquez votre nom");
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeCheckoutRequest({
        serviceId: service.id,
        startAt: selectedSlot?.startAt,
        prospectEmail: prospectEmail.trim(),
        prospectName: prospectName.trim(),
        promoCode: promoApplied ? promoCode.trim() : undefined,
        referralCode: referralApplied ? referralCode.trim() : undefined,
      });
      setConfirmedStartAt(selectedSlot?.startAt ?? null);
      setFinalPriceCents(result.finalPriceCents);
      setDiscountCents(result.discountCents);
      setReferralCreditCents(result.referralCreditAppliedCents);
      setPaymentInstructions(result.paymentInstructions);
      setStep("success");
      toast.success("Commande confirmée");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Checkout impossible",
      );
      if (needsSlot) {
        setLoadingSlots(true);
        void loadSlots();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <div className="py-section mx-auto max-w-lg px-6 text-center">
        <div className="border-hairline bg-surface-card animate-in fade-in zoom-in-95 rounded-lg border p-10 duration-500">
          <div className="bg-primary text-on-primary mx-auto mb-6 flex size-14 items-center justify-center rounded-full text-2xl font-bold">
            ✓
          </div>
          <h2 className="text-display-sm text-on-dark mb-3 font-bold tracking-tight">
            C&apos;est confirmé
          </h2>
          <p className="text-body-md text-muted mb-2">
            {service.name} avec {coachName}
          </p>
          {confirmedStartAt ? (
            <p className="text-title-md text-on-dark mb-4 font-semibold">
              {formatSlotDate(confirmedStartAt)} à{" "}
              {formatSlotTime(confirmedStartAt)}
            </p>
          ) : null}
          <p className="text-stat-display text-primary mb-6 font-bold tracking-tight">
            {formatPriceCents(finalPriceCents, service.currency)}
            {discountCents > 0 || referralCreditCents > 0 ? (
              <span className="text-body-sm text-muted ml-2 line-through">
                {formatPriceCents(service.priceCents, service.currency)}
              </span>
            ) : null}
          </p>
          {referralCreditCents > 0 ? (
            <p className="text-body-sm text-muted mb-4">
              Crédit parrainage appliqué :{" "}
              {formatPriceCents(referralCreditCents, service.currency)}
            </p>
          ) : null}
          {paymentInstructions ? (
            <div className="bg-surface-yellow-band text-on-yellow mb-6 rounded-lg p-6 text-left">
              <p className="text-caption-uppercase mb-2 tracking-widest uppercase">
                Modalités de paiement
              </p>
              <p className="text-body-md whitespace-pre-wrap">
                {paymentInstructions}
              </p>
            </div>
          ) : null}
          <p className="text-body-sm text-muted mb-8">
            Un email d&apos;invitation au portail client vous sera envoyé si
            c&apos;est votre première commande.
          </p>
          <Button
            asChild
            className="bg-primary text-on-primary hover:bg-primary-active"
          >
            <Link href={profileHref}>Retour au profil</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-section mx-auto max-w-5xl px-6">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={profileHref}>← Retour</Link>
        </Button>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Checkout — {service.name}
        </h1>
        <p className="text-body-md text-muted mt-2">avec {coachName}</p>
      </div>

      <div className="mb-10 max-w-sm">
        <PricingTierCard
          name={service.name}
          price={formatPriceCents(service.priceCents, service.currency)}
          period=""
          description={service.description ?? `${service.durationMinutes} min`}
          features={[
            `${service.durationMinutes} minutes`,
            service.isOnline ? "En ligne" : "En présentiel",
            needsSlot ? "Réservation en ligne" : "Sans rendez-vous",
          ]}
          hideCta
          className="pointer-events-none"
        />
      </div>

      {step === "slots" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-title-lg text-on-dark font-semibold">
              Choisissez un créneau
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="border-hairline"
                onClick={() => {
                  setLoadingSlots(true);
                  setAnchorDate((d) => addDays(d, -7));
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-hairline"
                onClick={() => {
                  setLoadingSlots(true);
                  setAnchorDate((d) => addDays(d, 7));
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {loadingSlots ? (
            <p className="text-body-md text-muted">Chargement des créneaux…</p>
          ) : slots.length === 0 ? (
            <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
              <p className="text-body-md text-muted">
                Aucun créneau disponible cette semaine. Essayez la semaine
                suivante.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-7">
              {weekDays.map((day, index) => {
                const key = formatDayKey(day);
                const daySlots = slotsByDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className="border-hairline bg-surface-card animate-in fade-in slide-in-from-bottom-2 rounded-lg border p-3 fill-mode-both duration-500"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <p className="text-caption-uppercase text-muted mb-1 tracking-widest uppercase">
                      {WEEKDAY_LABELS[index]}
                    </p>
                    <p className="text-title-sm text-on-dark mb-3 font-semibold">
                      {day.getDate()}
                    </p>
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <button
                          key={slot.startAt}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep("confirm");
                          }}
                          className={cn(
                            "border-hairline hover:border-primary/50 hover:bg-primary/10 w-full rounded-md border px-2 py-2 text-sm font-semibold transition-colors",
                            selectedSlot?.startAt === slot.startAt &&
                              "border-primary bg-primary/15 text-primary",
                          )}
                        >
                          {formatSlotTime(slot.startAt)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="border-hairline bg-surface-card mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-lg border p-8 duration-300">
          <h2 className="text-title-lg text-on-dark mb-4 font-semibold">
            Confirmer votre commande
          </h2>
          {selectedSlot ? (
            <p className="text-body-md text-muted mb-6">
              {formatSlotDate(selectedSlot.startAt)} à{" "}
              {formatSlotTime(selectedSlot.startAt)}
            </p>
          ) : null}

          <div className="mb-4 space-y-3">
            <Input
              placeholder="Votre nom"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              className="bg-surface-elevated border-hairline"
            />
            <Input
              type="email"
              placeholder="Votre email"
              value={prospectEmail}
              onChange={(e) => setProspectEmail(e.target.value)}
              className="bg-surface-elevated border-hairline"
              required
            />
          </div>

          <div className="mb-4 space-y-2">
            <label className="text-title-sm text-on-dark flex items-center gap-2 font-semibold">
              <Tag className="size-4" />
              Code promo
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="PROMO2026"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoApplied(false);
                  if (e.target.value) {
                    setReferralApplied(false);
                    setReferralCode("");
                  }
                }}
                disabled={referralApplied}
                className="bg-surface-elevated border-hairline uppercase"
              />
              <Button
                type="button"
                variant="outline"
                className="border-hairline shrink-0"
                disabled={
                  validatingPromo || !promoCode.trim() || referralApplied
                }
                onClick={() => void handleApplyPromo()}
              >
                {validatingPromo ? "…" : "Appliquer"}
              </Button>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <label className="text-title-sm text-on-dark flex items-center gap-2 font-semibold">
              <Gift className="size-4" />
              Code parrain
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="REF-ABC123"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setReferralApplied(false);
                  if (e.target.value) {
                    setPromoApplied(false);
                    setPromoCode("");
                  }
                }}
                disabled={promoApplied}
                className="bg-surface-elevated border-hairline font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                className="border-hairline shrink-0"
                disabled={
                  validatingReferral || !referralCode.trim() || promoApplied
                }
                onClick={() => void handleApplyReferral()}
              >
                {validatingReferral ? "…" : "Appliquer"}
              </Button>
            </div>
          </div>

          <div className="border-hairline mb-6 flex items-baseline justify-between border-t pt-4">
            <span className="text-body-md text-muted">Total</span>
            <div className="text-right">
              <p className="text-title-lg text-primary font-bold">
                {formatPriceCents(finalPriceCents, service.currency)}
              </p>
              {discountCents > 0 || referralCreditCents > 0 ? (
                <p className="text-body-sm text-muted line-through">
                  {formatPriceCents(service.priceCents, service.currency)}
                </p>
              ) : null}
              {referralCreditCents > 0 ? (
                <p className="text-body-sm text-muted">
                  Crédit parrain : -
                  {formatPriceCents(referralCreditCents, service.currency)}
                </p>
              ) : null}
            </div>
          </div>

          {service.paymentInstructions ? (
            <p className="text-body-sm text-muted mb-6">
              {service.paymentInstructions}
            </p>
          ) : null}

          <div className="flex gap-3">
            {needsSlot ? (
              <Button
                variant="outline"
                className="border-hairline flex-1"
                onClick={() => setStep("slots")}
              >
                Retour
              </Button>
            ) : null}
            <Button
              className="bg-primary text-on-primary hover:bg-primary-active flex-1"
              disabled={submitting}
              onClick={() => void handleConfirm()}
            >
              {submitting ? "Confirmation…" : "Confirmer"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
